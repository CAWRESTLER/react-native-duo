#import "RNDuoEnvironmentView.h"
#import "RNDuoUtilities.h"

#import <AVFoundation/AVFoundation.h>
#import <React/RCTComponentViewProtocol.h>

#import <react/renderer/components/ReactNativeDuoViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/EventEmitters.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/Props.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

static NSDictionary *RNDuoRectDictionary(CGRect rect)
{
  return @{ @"x": @(rect.origin.x), @"y": @(rect.origin.y), @"width": @(rect.size.width), @"height": @(rect.size.height) };
}

static NSDictionary *RNDuoInsetsDictionary(UIEdgeInsets insets)
{
  return @{ @"top": @(insets.top), @"right": @(insets.right), @"bottom": @(insets.bottom), @"left": @(insets.left) };
}

@implementation RNDuoEnvironmentView {
  UIView *_sensorView;
  UIView<RCTComponentViewProtocol> *_reactChild;
  BOOL _includeInactiveRegions;
  UIHingeInteraction *_hingeInteraction API_AVAILABLE(ios(27.1));
  UIHinge *_hinge API_AVAILABLE(ios(27.1));
  NSString *_lastPayload;
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

    if (@available(iOS 27.1, *)) {
      __weak __typeof(self) weakSelf = self;
      _hingeInteraction = [[UIHingeInteraction alloc] initWithUpdateHandler:^(UIHingeInteraction *interaction, UIHingeInteractionUpdate *update) {
        __strong __typeof(weakSelf) self = weakSelf;
        if (!self) return;
        self->_hinge = update.hinge;
        [self emitEnvironmentIfNeeded];
      }];
      [_sensorView addInteraction:_hingeInteraction];
    }
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newProps = *std::static_pointer_cast<RNDuoEnvironmentViewProps const>(props);
  _includeInactiveRegions = newProps.includeInactiveRegions;
  [super updateProps:props oldProps:oldProps];
  [self emitEnvironmentIfNeeded];
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  dispatch_async(dispatch_get_main_queue(), ^{ [self emitEnvironmentIfNeeded]; });
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  _reactChild.frame = _sensorView.bounds;
  [self emitEnvironmentIfNeeded];
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
  [self emitEnvironmentIfNeeded];
}

- (void)traitCollectionDidChange:(UITraitCollection *)previousTraitCollection
{
  [super traitCollectionDidChange:previousTraitCollection];
  [self emitEnvironmentIfNeeded];
}

- (NSArray *)regionsOfKind:(UIViewReservedRegionKind *)kind name:(NSString *)name API_AVAILABLE(ios(27.1))
{
  UIViewReservedRegionQueryOptions options = _includeInactiveRegions
      ? UIViewReservedRegionQueryOptionsIncludeInactive
      : UIViewReservedRegionQueryOptionsNone;
  NSMutableArray *result = [NSMutableArray array];
  for (UIViewReservedRegion *region in [_sensorView reservedRegionsOfKind:kind options:options]) {
    [result addObject:@{
      @"id": region.identifier.description ?: @"region",
      @"kind": name,
      @"frame": RNDuoRectDictionary(region.frame),
      @"margins": RNDuoInsetsDictionary(region.margins),
      @"isActive": @(region.isActive),
    }];
  }
  return result;
}

- (NSArray *)duoCameras API_AVAILABLE(ios(27.1))
{
  AVCaptureDeviceDiscoverySession *session = [AVCaptureDeviceDiscoverySession
      discoverySessionWithDeviceTypes:@[
        AVCaptureDeviceTypeBuiltInInnerUltraWideCamera,
        AVCaptureDeviceTypeBuiltInOuterUltraWideCamera,
      ]
      mediaType:AVMediaTypeVideo
      position:AVCaptureDevicePositionUnspecified];
  NSMutableArray *cameras = [NSMutableArray array];
  for (AVCaptureDevice *device in session.devices) {
    NSString *location = [device.deviceType isEqualToString:AVCaptureDeviceTypeBuiltInInnerUltraWideCamera]
        ? @"inner" : @"outer";
    NSString *position = @"unspecified";
    if (device.position == AVCaptureDevicePositionFront) position = @"front";
    if (device.position == AVCaptureDevicePositionBack) position = @"back";
    [cameras addObject:@{
      @"id": device.uniqueID,
      @"name": device.localizedName,
      @"location": location,
      @"position": position,
    }];
  }
  return cameras;
}

- (void)emitEnvironmentIfNeeded
{
  if (!_eventEmitter) return;

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
    [regions addObjectsFromArray:[self regionsOfKind:UIViewReservedRegionKind.divisionRegionKind name:@"division"]];
    [regions addObjectsFromArray:[self regionsOfKind:UIViewReservedRegionKind.occlusionRegionKind name:@"occlusion"]];
    cameras = [self duoCameras];
  }

  UIScreen *screen = self.window.screen ?: UIScreen.mainScreen;
  BOOL isDuo = hingeAvailable || regions.count > 0 || cameras.count > 0;
  NSDictionary *payloadObject = @{
    @"supportsDuoApis": @(supportsDuoApis),
    @"isDuo": @(isDuo),
    @"platform": @"ios",
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
  NSString *payload = RNDuoJSONString(payloadObject);
  if ([_lastPayload isEqualToString:payload]) return;
  _lastPayload = payload;
  auto emitter = std::static_pointer_cast<const RNDuoEnvironmentViewEventEmitter>(_eventEmitter);
  emitter->onEnvironmentChange({ .payload = std::string(payload.UTF8String) });
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  _lastPayload = nil;
  _reactChild = nil;
  if (@available(iOS 27.1, *)) _hinge = nil;
}

@end
