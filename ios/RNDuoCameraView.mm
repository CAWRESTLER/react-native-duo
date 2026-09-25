#import "RNDuoCameraView.h"
#import "RNDuoUtilities.h"

#import <AVFoundation/AVFoundation.h>
#import <AVKit/AVKit.h>

#import <react/renderer/components/ReactNativeDuoViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/EventEmitters.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/Props.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

static void *RNDuoSmartFramingContext = &RNDuoSmartFramingContext;

@interface RNDuoCameraPreviewView : UIView
@property (nonatomic, readonly) AVCaptureVideoPreviewLayer *previewLayer;
@end

@implementation RNDuoCameraPreviewView
+ (Class)layerClass { return AVCaptureVideoPreviewLayer.class; }
- (AVCaptureVideoPreviewLayer *)previewLayer { return (AVCaptureVideoPreviewLayer *)self.layer; }
@end

@implementation RNDuoCameraView {
  RNDuoCameraPreviewView *_previewView;
  AVCaptureSession *_session;
  AVCaptureDevice *_device;
  AVCaptureDeviceDirectionCoordinator *_directionCoordinator API_AVAILABLE(ios(27.1));
  AVCaptureDeviceDirectionMap *_directionMap API_AVAILABLE(ios(27.1));
  AVCaptureSmartFramingMonitor *_smartFramingMonitor API_AVAILABLE(ios(26.0));
  dispatch_queue_t _sessionQueue;
  NSString *_location;
  NSString *_direction;
  NSString *_smartFramingMode;
  BOOL _active;
  BOOL _requestPermission;
  BOOL _mirrored;
  NSString *_resizeMode;
  NSString *_errorMessage;
  NSString *_lastPayload;
  BOOL _observingSmartFraming;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNDuoCameraViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RNDuoCameraViewProps>();
    _props = defaultProps;
    _location = @"outer";
    _direction = @"";
    _smartFramingMode = @"off";
    _active = YES;
    _resizeMode = @"cover";
    _sessionQueue = dispatch_queue_create("dev.cawrestler.react-native-duo.camera", DISPATCH_QUEUE_SERIAL);
    _session = [[AVCaptureSession alloc] init];
    _previewView = [[RNDuoCameraPreviewView alloc] init];
    _previewView.backgroundColor = UIColor.blackColor;
    _previewView.previewLayer.session = _session;
    _previewView.previewLayer.videoGravity = AVLayerVideoGravityResizeAspectFill;
    self.contentView = _previewView;
    if (@available(iOS 27.1, *)) {
      __weak __typeof(self) weakSelf = self;
      _directionCoordinator = [[AVCaptureDeviceDirectionCoordinator alloc]
          initWithView:_previewView
          deviceTypes:@[ AVCaptureDeviceTypeBuiltInInnerUltraWideCamera,
                         AVCaptureDeviceTypeBuiltInOuterUltraWideCamera ]
          changeHandler:^(AVCaptureDeviceDirectionMap *deviceDirections) {
            __strong __typeof(weakSelf) self = weakSelf;
            if (!self) return;
            self->_directionMap = deviceDirections;
            if (self->_direction.length && self->_active &&
                [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo] == AVAuthorizationStatusAuthorized) {
              [self configureAndRun];
            } else {
              [self emitStateIfNeeded];
            }
          }];
    }
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newProps = *std::static_pointer_cast<RNDuoCameraViewProps const>(props);
  NSString *nextLocation = newProps.location.empty() ? @"outer" : @(newProps.location.c_str());
  NSString *nextDirection = newProps.direction.empty() ? @"" : @(newProps.direction.c_str());
  NSString *nextSmartFraming = newProps.smartFraming.empty() ? @"off" : @(newProps.smartFraming.c_str());
  BOOL selectionChanged = ![_location isEqualToString:nextLocation] || ![_direction isEqualToString:nextDirection];
  BOOL smartFramingChanged = ![_smartFramingMode isEqualToString:nextSmartFraming];
  BOOL permissionRequestedNow = newProps.requestPermission && !_requestPermission;
  _location = nextLocation;
  _direction = nextDirection;
  _smartFramingMode = nextSmartFraming;
  _active = newProps.active;
  _requestPermission = newProps.requestPermission;
  _mirrored = newProps.mirrored;
  _resizeMode = newProps.resizeMode.empty() ? @"cover" : @(newProps.resizeMode.c_str());
  [super updateProps:props oldProps:oldProps];

  _previewView.previewLayer.videoGravity = [_resizeMode isEqualToString:@"contain"]
      ? AVLayerVideoGravityResizeAspect : AVLayerVideoGravityResizeAspectFill;
  [self updateMirroring];

  AVAuthorizationStatus status = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
  if (permissionRequestedNow && status == AVAuthorizationStatusNotDetermined) {
    [AVCaptureDevice requestAccessForMediaType:AVMediaTypeVideo completionHandler:^(BOOL granted) {
      dispatch_async(dispatch_get_main_queue(), ^{
        if (granted) [self configureAndRun];
        else [self emitStateIfNeeded];
      });
    }];
  } else if (status == AVAuthorizationStatusAuthorized && (selectionChanged || smartFramingChanged || _active)) {
    [self configureAndRun];
  } else if (!_active) {
    [self stopSession];
  } else {
    [self emitStateIfNeeded];
  }
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  if (self.window && _active && [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo] == AVAuthorizationStatusAuthorized) {
    [self configureAndRun];
  } else if (!self.window) {
    [self stopSession];
  }
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  _previewView.previewLayer.frame = _previewView.bounds;
  [self updateMirroring];
}

- (void)updateMirroring
{
  AVCaptureConnection *connection = _previewView.previewLayer.connection;
  if (connection.isVideoMirroringSupported) {
    connection.automaticallyAdjustsVideoMirroring = NO;
    connection.videoMirrored = _mirrored;
  }
}

- (void)configureAndRun
{
  if (@available(iOS 27.1, *)) {
    NSString *location = [_location copy];
    BOOL shouldRun = _active && self.window != nil;
    dispatch_async(_sessionQueue, ^{
      AVCaptureDevice *device = [self resolveDeviceForLocation:location];
      [self teardownSmartFraming];
      [self->_session beginConfiguration];
      for (AVCaptureInput *input in self->_session.inputs) [self->_session removeInput:input];
      self->_device = device;
      self->_errorMessage = nil;
      if (device) {
        NSError *error = nil;
        AVCaptureDeviceInput *input = [AVCaptureDeviceInput deviceInputWithDevice:device error:&error];
        if (input && [self->_session canAddInput:input]) {
          [self->_session addInput:input];
        } else {
          self->_errorMessage = error.localizedDescription ?: @"Unable to attach the Duo camera.";
        }
      } else {
        self->_errorMessage = @"This Duo camera is not available in the current environment.";
      }
      [self->_session commitConfiguration];
      if (device) [self configureSmartFramingForDevice:device];
      if (device && shouldRun && !self->_session.isRunning) [self->_session startRunning];
      if ((!shouldRun || !device) && self->_session.isRunning) [self->_session stopRunning];
      dispatch_async(dispatch_get_main_queue(), ^{
        [self updateMirroring];
        [self emitStateIfNeeded];
      });
    });
  } else {
    _errorMessage = @"Duo cameras require iOS 27.1 or later.";
    [self emitStateIfNeeded];
  }
}

- (void)stopSession
{
  dispatch_async(_sessionQueue, ^{
    [self teardownSmartFraming];
    if (self->_session.isRunning) [self->_session stopRunning];
    dispatch_async(dispatch_get_main_queue(), ^{ [self emitStateIfNeeded]; });
  });
}

- (AVCaptureDevice *)resolveDeviceForLocation:(NSString *)location API_AVAILABLE(ios(27.1))
{
  if (_direction.length) {
    NSArray<AVCaptureDeviceDescriptor *> *descriptors = [_direction isEqualToString:@"forward"]
        ? _directionMap.forwardFacingDeviceDescriptors
        : _directionMap.backwardFacingDeviceDescriptors;
    AVCaptureDeviceDescriptor *descriptor = descriptors.firstObject;
    if (descriptor) return [AVCaptureDevice deviceWithUniqueID:descriptor.uniqueID];
  }
  AVCaptureDeviceType type = [location isEqualToString:@"inner"]
      ? AVCaptureDeviceTypeBuiltInInnerUltraWideCamera
      : AVCaptureDeviceTypeBuiltInOuterUltraWideCamera;
  AVCaptureDeviceDiscoverySession *discovery = [AVCaptureDeviceDiscoverySession
      discoverySessionWithDeviceTypes:@[ type ]
      mediaType:AVMediaTypeVideo
      position:AVCaptureDevicePositionUnspecified];
  return discovery.devices.firstObject;
}

- (void)configureSmartFramingForDevice:(AVCaptureDevice *)device
{
  if ([_smartFramingMode isEqualToString:@"off"]) return;
  if (@available(iOS 26.0, *)) {
    AVCaptureDeviceFormat *format = nil;
    for (AVCaptureDeviceFormat *candidate in device.formats) {
      if (candidate.isSmartFramingSupported) {
        format = candidate;
        break;
      }
    }
    NSError *configurationError = nil;
    if (format && [device lockForConfiguration:&configurationError]) {
      device.activeFormat = format;
      [device unlockForConfiguration];
    }
    AVCaptureSmartFramingMonitor *monitor = device.smartFramingMonitor;
    if (!monitor || monitor.supportedFramings.count == 0) return;
    monitor.enabledFramings = monitor.supportedFramings;
    _smartFramingMonitor = monitor;
    [monitor addObserver:self
              forKeyPath:@"recommendedFraming"
                 options:NSKeyValueObservingOptionInitial | NSKeyValueObservingOptionNew
                 context:RNDuoSmartFramingContext];
    _observingSmartFraming = YES;
    NSError *monitorError = nil;
    if (![monitor startMonitoringWithError:&monitorError]) {
      _errorMessage = monitorError.localizedDescription ?: @"Unable to start smart framing.";
    }
  }
}

- (void)teardownSmartFraming
{
  if (@available(iOS 26.0, *)) {
    if (_observingSmartFraming && _smartFramingMonitor) {
      [_smartFramingMonitor removeObserver:self forKeyPath:@"recommendedFraming" context:RNDuoSmartFramingContext];
    }
    _observingSmartFraming = NO;
    [_smartFramingMonitor stopMonitoring];
    _smartFramingMonitor = nil;
  }
}

- (void)observeValueForKeyPath:(NSString *)keyPath
                      ofObject:(id)object
                        change:(NSDictionary<NSKeyValueChangeKey, id> *)change
                       context:(void *)context
{
  if (context != RNDuoSmartFramingContext) {
    [super observeValueForKeyPath:keyPath ofObject:object change:change context:context];
    return;
  }
  if (@available(iOS 26.0, *)) {
    AVCaptureFraming *framing = _smartFramingMonitor.recommendedFraming;
    if (framing && [_smartFramingMode isEqualToString:@"apply"]) {
      AVCaptureAspectRatio aspectRatio = framing.aspectRatio;
      CGFloat zoomFactor = framing.zoomFactor;
      dispatch_async(_sessionQueue, ^{
        NSError *error = nil;
        if ([self->_device lockForConfiguration:&error]) {
          [self->_device setDynamicAspectRatio:aspectRatio completionHandler:nil];
          self->_device.videoZoomFactor = MAX(self->_device.minAvailableVideoZoomFactor,
              MIN(self->_device.maxAvailableVideoZoomFactor, zoomFactor));
          [self->_device unlockForConfiguration];
        }
      });
    }
  }
  dispatch_async(dispatch_get_main_queue(), ^{ [self emitStateIfNeeded]; });
}

- (NSArray<NSString *> *)identifiersForDescriptors:(NSArray<AVCaptureDeviceDescriptor *> *)descriptors API_AVAILABLE(ios(27.1))
{
  NSMutableArray<NSString *> *identifiers = [NSMutableArray arrayWithCapacity:descriptors.count];
  for (AVCaptureDeviceDescriptor *descriptor in descriptors) [identifiers addObject:descriptor.uniqueID];
  return identifiers;
}

- (NSString *)permissionName
{
  switch ([AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo]) {
    case AVAuthorizationStatusAuthorized: return @"granted";
    case AVAuthorizationStatusDenied: return @"denied";
    case AVAuthorizationStatusRestricted: return @"restricted";
    case AVAuthorizationStatusNotDetermined: return @"undetermined";
  }
}

- (void)emitStateIfNeeded
{
  if (!_eventEmitter) return;
  BOOL supported = NO;
  NSArray *forwardCameraIds = @[];
  NSArray *backwardCameraIds = @[];
  if (@available(iOS 27.1, *)) supported = YES;
  if (@available(iOS 27.1, *)) {
    forwardCameraIds = [self identifiersForDescriptors:_directionMap.forwardFacingDeviceDescriptors ?: @[]];
    backwardCameraIds = [self identifiersForDescriptors:_directionMap.backwardFacingDeviceDescriptors ?: @[]];
  }
  BOOL smartFramingSupported = NO;
  BOOL smartFramingMonitoring = NO;
  id recommendedFraming = NSNull.null;
  if (@available(iOS 26.0, *)) {
    smartFramingSupported = _device.activeFormat.isSmartFramingSupported;
    smartFramingMonitoring = _smartFramingMonitor.isMonitoring;
    AVCaptureFraming *framing = _smartFramingMonitor.recommendedFraming;
    if (framing) {
      recommendedFraming = @{
        @"aspectRatio": (NSString *)framing.aspectRatio,
        @"zoomFactor": @(framing.zoomFactor),
      };
    }
  }
  NSString *payload = RNDuoJSONString(@{
    @"supported": @(supported),
    @"available": @(_device != nil),
    @"running": @(_session.isRunning),
    @"permission": [self permissionName],
    @"location": _location,
    @"direction": _direction.length ? _direction : (id)NSNull.null,
    @"forwardCameraIds": forwardCameraIds,
    @"backwardCameraIds": backwardCameraIds,
    @"deviceId": _device.uniqueID ?: (id)NSNull.null,
    @"deviceName": _device.localizedName ?: (id)NSNull.null,
    @"smartFraming": @{
      @"supported": @(smartFramingSupported),
      @"monitoring": @(smartFramingMonitoring),
      @"mode": _smartFramingMode,
      @"recommended": recommendedFraming,
    },
    @"error": _errorMessage ?: (id)NSNull.null,
  });
  if ([_lastPayload isEqualToString:payload]) return;
  _lastPayload = payload;
  auto emitter = std::static_pointer_cast<const RNDuoCameraViewEventEmitter>(_eventEmitter);
  emitter->onStateChange({ .payload = std::string(payload.UTF8String) });
}

- (void)prepareForRecycle
{
  [self stopSession];
  [super prepareForRecycle];
  _lastPayload = nil;
}

- (void)dealloc
{
  [self teardownSmartFraming];
}

@end
