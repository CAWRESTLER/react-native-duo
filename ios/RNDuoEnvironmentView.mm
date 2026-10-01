#import "RNDuoEnvironmentView.h"
#import "RNDuoUtilities.h"

#import <AVFoundation/AVFoundation.h>
#import <React/RCTComponentViewProtocol.h>
#import <React/RCTMountingTransactionObserving.h>

#import <react/renderer/components/ReactNativeDuoViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/EventEmitters.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/Props.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;
static void *RNDuoGeometryScrollContext = &RNDuoGeometryScrollContext;

static NSDictionary *RNDuoRectDictionary(CGRect rect)
{
  return @{ @"x": @(rect.origin.x), @"y": @(rect.origin.y), @"width": @(rect.size.width), @"height": @(rect.size.height) };
}

static NSDictionary *RNDuoInsetsDictionary(UIEdgeInsets insets)
{
  return @{ @"top": @(insets.top), @"right": @(insets.right), @"bottom": @(insets.bottom), @"left": @(insets.left) };
}

static NSString *RNDuoSizeClassName(UIUserInterfaceSizeClass sizeClass)
{
  if (sizeClass == UIUserInterfaceSizeClassCompact) return @"compact";
  if (sizeClass == UIUserInterfaceSizeClassRegular) return @"regular";
  return @"unspecified";
}

static BOOL RNDuoScrollViewIsActive(UIScrollView *scrollView)
{
  UIGestureRecognizerState state = scrollView.panGestureRecognizer.state;
  return scrollView && (scrollView.isTracking || scrollView.isDragging || scrollView.isDecelerating
      || state == UIGestureRecognizerStateBegan || state == UIGestureRecognizerStateChanged);
}

static BOOL RNDuoContainsActiveScrollView(UIView *view)
{
  if ([view isKindOfClass:UIScrollView.class] && RNDuoScrollViewIsActive((UIScrollView *)view)) return YES;
  for (UIView *child in view.subviews) {
    if (RNDuoContainsActiveScrollView(child)) return YES;
  }
  return NO;
}

@interface RNDuoEnvironmentView () <RCTMountingTransactionObserving>
@end

@implementation RNDuoEnvironmentView {
  UIView *_sensorView;
  UIView<RCTComponentViewProtocol> *_reactChild;
  BOOL _includeInactiveRegions;
  UIHingeInteraction *_hingeInteraction API_AVAILABLE(ios(27.1));
  UIHinge *_hinge API_AVAILABLE(ios(27.1));
  NSDictionary *_lastPayloadObject;
  __weak UIScrollView *_observedScrollView;
  NSMapTable *_regionIdentifiers;
  NSUInteger _nextRegionIdentifier;
  NSUInteger _updateGeneration;
  NSUInteger _regionReconciliationGeneration;
  BOOL _environmentUpdateScheduled;
  BOOL _hasObservedSensorFrame;
  CGRect _lastSensorFrameInWindow;
  NSArray *_windowRegionSnapshot;
  NSArray *_cameraSnapshot;
  __weak UIWindow *_snapshotWindow;
  BOOL _snapshotIncludeInactiveRegions;
  BOOL _needsNativeSnapshotRefresh;
  BOOL _snapshotRefreshScheduled;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNDuoEnvironmentViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RNDuoEnvironmentViewProps>();
    _props = defaultProps;
    _sensorView = [[UIView alloc] init];
    _sensorView.backgroundColor = UIColor.clearColor;
    self.contentView = _sensorView;
    // Object personality uses hash/isEqual without copying opaque UIKit keys.
    _regionIdentifiers = [NSMapTable strongToStrongObjectsMapTable];
    _windowRegionSnapshot = @[];
    _needsNativeSnapshotRefresh = YES;

    if (@available(iOS 27.1, *)) {
      __weak __typeof(self) weakSelf = self;
      _hingeInteraction = [[UIHingeInteraction alloc] initWithUpdateHandler:^(UIHingeInteraction *interaction, UIHingeInteractionUpdate *update) {
        __strong __typeof(weakSelf) self = weakSelf;
        if (!self) return;
        self->_hinge = update.hinge;
        self->_needsNativeSnapshotRefresh = YES;
        [self scheduleEnvironmentUpdate];
        [self scheduleRegionReconciliation];
      }];
      [_sensorView addInteraction:_hingeInteraction];
    }
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newProps = *std::static_pointer_cast<RNDuoEnvironmentViewProps const>(props);
  if (_includeInactiveRegions != newProps.includeInactiveRegions) _needsNativeSnapshotRefresh = YES;
  _includeInactiveRegions = newProps.includeInactiveRegions;
  [super updateProps:props oldProps:oldProps];
  [self scheduleEnvironmentUpdate];
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  if (self.window && self.window != _snapshotWindow) {
    // Snapshots belong to a specific window's coordinate space. Never reuse
    // another scene's frames if this observer is reparented between windows.
    _windowRegionSnapshot = @[];
    _cameraSnapshot = nil;
    _snapshotWindow = nil;
  }
  _needsNativeSnapshotRefresh = YES;
  [self updateScrollObservation];
  [self scheduleEnvironmentUpdate];
  [self scheduleRegionReconciliation];
}

- (void)updateScrollObservation
{
  UIScrollView *scrollView = nil;
  if (self.window) {
    UIView *ancestor = self.superview;
    while (ancestor && ![ancestor isKindOfClass:UIScrollView.class]) ancestor = ancestor.superview;
    scrollView = (UIScrollView *)ancestor;
  }
  if (scrollView == _observedScrollView) return;
  [self stopObservingScrollView];
  _observedScrollView = scrollView;
  [_observedScrollView addObserver:self forKeyPath:@"contentOffset" options:NSKeyValueObservingOptionNew context:RNDuoGeometryScrollContext];
}

- (void)stopObservingScrollView
{
  [_observedScrollView removeObserver:self forKeyPath:@"contentOffset" context:RNDuoGeometryScrollContext];
  _observedScrollView = nil;
}

- (void)observeValueForKeyPath:(NSString *)keyPath ofObject:(id)object change:(NSDictionary *)change context:(void *)context
{
  if (context == RNDuoGeometryScrollContext) {
    // UIScrollView may still be updating its bounds while KVO fires. Read
    // coordinates after that update, never reenter its layout synchronously.
    [self scheduleEnvironmentUpdate];
  } else {
    [super observeValueForKeyPath:keyPath ofObject:object change:change context:context];
  }
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  if (!_hasObservedSensorFrame || !CGSizeEqualToSize(_sensorView.bounds.size, _lastSensorFrameInWindow.size)) {
    _needsNativeSnapshotRefresh = YES;
  }
  _reactChild.frame = _sensorView.bounds;
  [self scheduleEnvironmentUpdate];
}

- (void)mountingTransactionDidMount:(const MountingTransaction &)transaction
               withSurfaceTelemetry:(const SurfaceTelemetry &)surfaceTelemetry
{
  // A parent can move this sensor without changing its own size. Its
  // layoutSubviews is then not called, but local region coordinates do change.
  [self updateScrollObservation];
  if (!self.window) return;
  CGRect frame = [_sensorView convertRect:_sensorView.bounds toView:self.window];
  if (!_hasObservedSensorFrame || !CGRectEqualToRect(frame, _lastSensorFrameInWindow)) {
    [self scheduleEnvironmentUpdate];
  }
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  // Keep React descendants inside the sensor. If the transparent sensor remains
  // a sibling above them, it wins hit testing and blocks every tap and swipe.
  _reactChild = childComponentView;
  [_sensorView insertSubview:childComponentView atIndex:MIN(index, _sensorView.subviews.count)];
  [self setNeedsLayout];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  [childComponentView removeFromSuperview];
  if (childComponentView == _reactChild) _reactChild = nil;
}

- (void)safeAreaInsetsDidChange
{
  [super safeAreaInsetsDidChange];
  [self scheduleEnvironmentUpdate];
}

- (void)traitCollectionDidChange:(UITraitCollection *)previousTraitCollection
{
  [super traitCollectionDidChange:previousTraitCollection];
  _needsNativeSnapshotRefresh = YES;
  [self scheduleEnvironmentUpdate];
}

- (NSArray *)windowRegionsOfKind:(UIViewReservedRegionKind *)kind name:(NSString *)name API_AVAILABLE(ios(27.1))
{
  UIViewReservedRegionQueryOptions options = _includeInactiveRegions
      ? UIViewReservedRegionQueryOptionsIncludeInactive
      : UIViewReservedRegionQueryOptionsNone;
  NSMutableArray *result = [NSMutableArray array];
  // SwiftUI's GeometryProxy retains window regions even outside the queried
  // view. UIKit filters a small sensor's query to intersecting regions, so query
  // the host window and convert every frame into the sensor's coordinates.
  // Keep negative/off-bounds frames: clipping them would hide the fold/camera
  // context from a card wholly contained in the opposite physical pane.
  UIView *queryView = self.window ?: _sensorView;
  for (UIViewReservedRegion *region in [queryView reservedRegionsOfKind:kind options:options]) {
    // The identifier is opaque. NSObject's description may contain a new
    // address on each query; it is not a stable React key. Preserve UIKit's
    // identifier equality instead of serializing that debug description.
    NSString *identifier = [_regionIdentifiers objectForKey:region.identifier];
    if (!identifier) {
      identifier = [NSString stringWithFormat:@"%@-%lu", name, (unsigned long)_nextRegionIdentifier++];
      [_regionIdentifiers setObject:identifier forKey:region.identifier];
    }
    [result addObject:@{
      @"id": identifier,
      @"kind": name,
      @"frame": RNDuoRectDictionary(region.frame),
      @"margins": RNDuoInsetsDictionary(region.margins),
      @"isActive": @(region.isActive),
    }];
  }
  return result;
}

- (NSArray *)localRegionsFromWindowSnapshot
{
  NSMutableArray *regions = [NSMutableArray arrayWithCapacity:_windowRegionSnapshot.count];
  for (NSDictionary *region in _windowRegionSnapshot) {
    NSDictionary *frame = region[@"frame"];
    CGRect windowFrame = CGRectMake([frame[@"x"] doubleValue], [frame[@"y"] doubleValue],
                                   [frame[@"width"] doubleValue], [frame[@"height"] doubleValue]);
    NSMutableDictionary *localRegion = [region mutableCopy];
    localRegion[@"frame"] = RNDuoRectDictionary([_sensorView convertRect:windowFrame fromView:self.window]);
    [regions addObject:localRegion];
  }
  return regions;
}

- (NSArray *)duoCameras API_AVAILABLE(ios(27.1))
{
  AVCaptureDeviceDiscoverySession *session = [AVCaptureDeviceDiscoverySession
      discoverySessionWithDeviceTypes:@[
        AVCaptureDeviceTypeBuiltInInnerUltraWideCamera,
        AVCaptureDeviceTypeBuiltInOuterUltraWideCamera,
        AVCaptureDeviceTypeBuiltInWideAngleCamera,
        AVCaptureDeviceTypeBuiltInUltraWideCamera,
        AVCaptureDeviceTypeBuiltInDualWideCamera,
        AVCaptureDeviceTypeBuiltInTripleCamera,
      ]
      mediaType:AVMediaTypeVideo
      position:AVCaptureDevicePositionUnspecified];
  NSMutableArray *cameras = [NSMutableArray array];
  for (AVCaptureDevice *device in session.devices) {
    NSString *location = @"other";
    if ([device.deviceType isEqualToString:AVCaptureDeviceTypeBuiltInInnerUltraWideCamera]) location = @"inner";
    if ([device.deviceType isEqualToString:AVCaptureDeviceTypeBuiltInOuterUltraWideCamera]) location = @"outer";
    NSString *position = @"unspecified";
    if (device.position == AVCaptureDevicePositionFront) position = @"front";
    if (device.position == AVCaptureDevicePositionBack) position = @"back";
    [cameras addObject:@{
      @"id": device.uniqueID,
      @"name": device.localizedName,
      @"location": location,
      @"position": position,
      @"deviceType": device.deviceType,
      @"isVirtual": @(device.isVirtualDevice),
    }];
  }
  return cameras;
}

- (void)scheduleEnvironmentUpdate
{
  if (_environmentUpdateScheduled) return;
  _environmentUpdateScheduled = YES;
  NSUInteger generation = _updateGeneration;
  __weak __typeof(self) weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{
    __strong __typeof(weakSelf) self = weakSelf;
    if (!self || generation != self->_updateGeneration) return;
    self->_environmentUpdateScheduled = NO;
    [self emitEnvironmentIfNeeded];
  });
}

- (void)scheduleSnapshotRefreshAfterScrolling
{
  if (_snapshotRefreshScheduled) return;
  _snapshotRefreshScheduled = YES;
  NSUInteger generation = _updateGeneration;
  __weak __typeof(self) weakSelf = self;
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.05 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
    __strong __typeof(weakSelf) self = weakSelf;
    if (!self || generation != self->_updateGeneration) return;
    self->_snapshotRefreshScheduled = NO;
    [self scheduleEnvironmentUpdate];
  });
}

- (void)scheduleRegionReconciliation
{
  NSUInteger generation = ++_regionReconciliationGeneration;
  if (!self.window) return;
  __weak __typeof(self) weakSelf = self;
  __weak UIWindow *window = self.window;
  // A hinge update can precede UIKit's settled reserved-region state, while
  // this observer's bounds remain unchanged. A bounded follow-up reconciles
  // the query-only API without continuous polling or rediscovering cameras.
  for (NSNumber *delay in @[@0.05, @0.2, @0.6]) {
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(delay.doubleValue * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
      __strong __typeof(weakSelf) self = weakSelf;
      if (!self || generation != self->_regionReconciliationGeneration || self.window != window) return;
      [self scheduleEnvironmentUpdate];
    });
  }
}

- (void)emitEnvironmentIfNeeded
{
  if (!_eventEmitter || !self.window) return;
  _lastSensorFrameInWindow = [_sensorView convertRect:_sensorView.bounds toView:self.window];
  _hasObservedSensorFrame = YES;

  BOOL supportsDuoApis = NO;
  BOOL hingeAvailable = NO;
  NSString *hingeStatus = @"unavailable";
  NSNumber *angleRadians = (NSNumber *)NSNull.null;
  NSNumber *angleDegrees = (NSNumber *)NSNull.null;
  NSMutableArray *regions = [NSMutableArray array];
  NSArray *cameras = @[];

  if (@available(iOS 27.1, *)) {
    supportsDuoApis = YES;
    if (_hinge != nil) {
      hingeAvailable = YES;
      switch (_hinge.status) {
        case UIHingeStatusClosed: hingeStatus = @"closed"; break;
        case UIHingeStatusPartiallyOpen: hingeStatus = @"partiallyOpen"; break;
        case UIHingeStatusFullyOpen: hingeStatus = @"fullyOpen"; break;
        case UIHingeStatusUnknown: hingeStatus = @"unknown"; break;
      }
      angleRadians = @(_hinge.angle);
      angleDegrees = @(_hinge.angle * 180.0 / M_PI);
    }
    // Window regions can settle after the hinge callback, without changing
    // this sensor's bounds. Requery on every idle layout/trait/safe-area update
    // rather than relying on a camera-style dirty flag for their active state.
    // During scrolling, only convert cached frames and refresh once settled.
    BOOL scrolling = RNDuoScrollViewIsActive(_observedScrollView) || RNDuoContainsActiveScrollView(self.window);
    if (scrolling) {
      [self scheduleSnapshotRefreshAfterScrolling];
    } else {
      BOOL needsCameraSnapshot = _needsNativeSnapshotRefresh || _snapshotWindow != self.window
          || _snapshotIncludeInactiveRegions != _includeInactiveRegions || !_cameraSnapshot;
      NSMutableArray *snapshot = [NSMutableArray array];
      [snapshot addObjectsFromArray:[self windowRegionsOfKind:UIViewReservedRegionKind.divisionRegionKind name:@"division"]];
      [snapshot addObjectsFromArray:[self windowRegionsOfKind:UIViewReservedRegionKind.occlusionRegionKind name:@"occlusion"]];
      _windowRegionSnapshot = snapshot;
      if (needsCameraSnapshot) _cameraSnapshot = [self duoCameras];
      _snapshotWindow = self.window;
      _snapshotIncludeInactiveRegions = _includeInactiveRegions;
      _needsNativeSnapshotRefresh = NO;
    }
    [regions addObjectsFromArray:[self localRegionsFromWindowSnapshot]];
    cameras = _cameraSnapshot ?: @[];
  }

  UIScreen *screen = self.window.screen ?: UIScreen.mainScreen;
  BOOL hasDuoCamera = NO;
  for (NSDictionary *camera in cameras) {
    if (![camera[@"location"] isEqualToString:@"other"]) hasDuoCamera = YES;
  }
  BOOL isDuo = hingeAvailable || regions.count > 0 || hasDuoCamera;
  NSDictionary *payloadObject = @{
    @"supportsDuoApis": @(supportsDuoApis),
    @"isDuo": @(isDuo),
    @"platform": @"ios",
    @"horizontalSizeClass": RNDuoSizeClassName(self.traitCollection.horizontalSizeClass),
    @"verticalSizeClass": RNDuoSizeClassName(self.traitCollection.verticalSizeClass),
    @"supportsMultipleWindows": @(UIApplication.sharedApplication.supportsMultipleScenes),
    @"geometry": @{
      @"native": @YES,
      @"width": @(_sensorView.bounds.size.width),
      @"height": @(_sensorView.bounds.size.height),
      @"safeAreaInsets": RNDuoInsetsDictionary(_sensorView.safeAreaInsets),
      @"reservedRegions": regions,
    },
    @"hinge": @{
      @"available": @(hingeAvailable),
      @"status": hingeStatus,
      @"angleRadians": angleRadians,
      @"angleDegrees": angleDegrees,
    },
    @"reservedRegions": regions,
    @"verticalBarEdge": RNDuoVerticalBarEdgeName(self.traitCollection),
    @"cameras": cameras,
    @"window": @{
      @"width": @(self.window.bounds.size.width ?: self.bounds.size.width),
      @"height": @(self.window.bounds.size.height ?: self.bounds.size.height),
      @"scale": @(screen.scale),
      @"safeAreaInsets": RNDuoInsetsDictionary(self.safeAreaInsets),
    },
  };
  // Dictionary key order in JSON is not semantic. Compare native values before
  // encoding so a render/layout pass with unchanged geometry cannot emit again.
  if ([_lastPayloadObject isEqualToDictionary:payloadObject]) return;
  _lastPayloadObject = payloadObject;
  NSString *payload = RNDuoJSONString(payloadObject);
  auto emitter = std::static_pointer_cast<const RNDuoEnvironmentViewEventEmitter>(_eventEmitter);
  emitter->onEnvironmentChange({ .payload = std::string(payload.UTF8String) });
}

- (void)prepareForRecycle
{
  [self stopObservingScrollView];
  _updateGeneration++;
  _regionReconciliationGeneration++;
  _environmentUpdateScheduled = NO;
  _hasObservedSensorFrame = NO;
  _windowRegionSnapshot = @[];
  _cameraSnapshot = nil;
  _snapshotWindow = nil;
  _needsNativeSnapshotRefresh = YES;
  _snapshotRefreshScheduled = NO;
  [_regionIdentifiers removeAllObjects];
  _nextRegionIdentifier = 0;
  [super prepareForRecycle];
  _lastPayloadObject = nil;
  _reactChild = nil;
  if (@available(iOS 27.1, *)) _hinge = nil;
}

- (void)dealloc
{
  [self stopObservingScrollView];
}

@end
