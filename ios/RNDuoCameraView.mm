#import "RNDuoCameraView.h"
#import "RNDuoUtilities.h"

#import <AVFoundation/AVFoundation.h>
#import <AVKit/AVKit.h>
#include <atomic>

#import <react/renderer/components/ReactNativeDuoViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/EventEmitters.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/Props.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

static void *RNDuoSmartFramingContext = &RNDuoSmartFramingContext;
static void *RNDuoRotationContext = &RNDuoRotationContext;

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
  AVCapturePhotoOutput *_photoOutput;
  AVCaptureDeviceRotationCoordinator *_rotationCoordinator API_AVAILABLE(ios(17.0));
  AVCaptureDeviceDirectionCoordinator *_directionCoordinator API_AVAILABLE(ios(27.1));
  AVCaptureDeviceDirectionMap *_directionMap API_AVAILABLE(ios(27.1));
  AVCaptureSmartFramingMonitor *_smartFramingMonitor API_AVAILABLE(ios(26.0));
  dispatch_queue_t _sessionQueue;
  NSString *_location;
  NSString *_direction;
  NSString *_cameraSource;
  NSString *_dynamicAspectRatio;
  BOOL _sensorOrientationCompensation;
  NSString *_smartFramingMode;
  NSString *_configuredSmartFramingMode;
  std::atomic<uint64_t> _configurationGeneration;
  BOOL _active;
  BOOL _requestPermission;
  BOOL _mirrored;
  NSString *_resizeMode;
  NSString *_errorMessage;
  NSString *_lastPayload;
  BOOL _observingSmartFraming;
  BOOL _observingRotation;
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
    _cameraSource = @"";
    _dynamicAspectRatio = @"";
    _sensorOrientationCompensation = YES;
    _smartFramingMode = @"off";
    _configuredSmartFramingMode = @"off";
    _configurationGeneration.store(0);
    _active = YES;
    _resizeMode = @"cover";
    _sessionQueue = dispatch_queue_create("dev.cawrestler.react-native-duo.camera", DISPATCH_QUEUE_SERIAL);
    _session = [[AVCaptureSession alloc] init];
    _photoOutput = [[AVCapturePhotoOutput alloc] init];
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
                         AVCaptureDeviceTypeBuiltInOuterUltraWideCamera,
                         AVCaptureDeviceTypeBuiltInWideAngleCamera,
                         AVCaptureDeviceTypeBuiltInUltraWideCamera,
                         AVCaptureDeviceTypeBuiltInDualWideCamera,
                         AVCaptureDeviceTypeBuiltInTripleCamera ]
          changeHandler:^(AVCaptureDeviceDirectionMap *deviceDirections) {
            __strong __typeof(weakSelf) self = weakSelf;
            if (!self) return;
            dispatch_async(dispatch_get_main_queue(), ^{
              self->_directionMap = deviceDirections;
              if (self->_direction.length && self->_active && self.window &&
                  [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo] == AVAuthorizationStatusAuthorized) {
                [self configureAndRun];
              } else {
                [self emitStateIfNeeded];
              }
            });
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
  NSString *nextSource = newProps.cameraSource.empty() ? @"" : @(newProps.cameraSource.c_str());
  NSString *nextAspectRatio = newProps.dynamicAspectRatio.empty() ? @"" : @(newProps.dynamicAspectRatio.c_str());
  NSString *nextSmartFraming = newProps.smartFraming.empty() ? @"off" : @(newProps.smartFraming.c_str());
  BOOL selectionChanged = ![_location isEqualToString:nextLocation] || ![_direction isEqualToString:nextDirection] ||
      ![_cameraSource isEqualToString:nextSource];
  BOOL smartFramingChanged = ![_smartFramingMode isEqualToString:nextSmartFraming];
  BOOL aspectRatioChanged = ![_dynamicAspectRatio isEqualToString:nextAspectRatio];
  BOOL sensorCompensationChanged = _sensorOrientationCompensation != newProps.sensorOrientationCompensation;
  BOOL activeChanged = _active != newProps.active;
  BOOL permissionRequestedNow = newProps.requestPermission && !_requestPermission;
  _location = nextLocation;
  _direction = nextDirection;
  _cameraSource = nextSource;
  _dynamicAspectRatio = nextAspectRatio;
  _sensorOrientationCompensation = newProps.sensorOrientationCompensation;
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
        if (granted && self->_active && self.window) [self configureAndRun];
        else [self emitStateIfNeeded];
      });
    }];
  } else if (status == AVAuthorizationStatusAuthorized &&
      (selectionChanged || smartFramingChanged || aspectRatioChanged || sensorCompensationChanged || activeChanged)) {
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
  } else {
    // Props can arrive before Fabric installs the event emitter. Report an
    // idle/denied/restricted mount too, not only an authorized capture session.
    dispatch_async(dispatch_get_main_queue(), ^{ [self emitStateIfNeeded]; });
  }
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  _previewView.previewLayer.frame = _previewView.bounds;
  [self updateMirroring];
  [self updatePreviewRotation];
}

- (void)updatePreviewRotation
{
  if (@available(iOS 17.0, *)) {
    AVCaptureConnection *connection = _previewView.previewLayer.connection;
    CGFloat angle = _rotationCoordinator.videoRotationAngleForHorizonLevelPreview;
    if (_rotationCoordinator && [connection isVideoRotationAngleSupported:angle]) connection.videoRotationAngle = angle;
  }
}

- (void)installRotationCoordinatorForDevice:(AVCaptureDevice *)device
{
  [self teardownRotationCoordinator];
  if (@available(iOS 17.0, *)) {
    if (!device || !self.window || !_active) return;
    _rotationCoordinator = [[AVCaptureDeviceRotationCoordinator alloc] initWithDevice:device previewLayer:_previewView.previewLayer];
    [_rotationCoordinator addObserver:self forKeyPath:@"videoRotationAngleForHorizonLevelPreview"
                             options:NSKeyValueObservingOptionInitial | NSKeyValueObservingOptionNew context:RNDuoRotationContext];
    _observingRotation = YES;
  }
}

- (void)teardownRotationCoordinator
{
  if (@available(iOS 17.0, *)) {
    if (_observingRotation) [_rotationCoordinator removeObserver:self forKeyPath:@"videoRotationAngleForHorizonLevelPreview" context:RNDuoRotationContext];
    _observingRotation = NO;
    _rotationCoordinator = nil;
  }
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
    AVCaptureDevice *resolvedDevice = [self resolveDeviceForLocation:_location];
    NSString *aspectRatio = [_dynamicAspectRatio copy];
    NSString *smartFramingMode = [_smartFramingMode copy];
    BOOL sensorCompensation = _sensorOrientationCompensation;
    BOOL shouldRun = _active && self.window != nil;
    uint64_t generation = ++_configurationGeneration;
    [self teardownRotationCoordinator];
    dispatch_async(_sessionQueue, ^{
      if (generation != self->_configurationGeneration.load()) return;
      AVCaptureDevice *device = resolvedDevice;
      [self teardownSmartFraming];
      self->_configuredSmartFramingMode = smartFramingMode;
      [self->_session beginConfiguration];
      for (AVCaptureInput *input in self->_session.inputs) [self->_session removeInput:input];
      self->_device = nil;
      self->_errorMessage = nil;
      if (device) {
        NSError *error = nil;
        AVCaptureDeviceInput *input = [AVCaptureDeviceInput deviceInputWithDevice:device error:&error];
        if (input && [self->_session canAddInput:input]) {
          [self->_session addInput:input];
          self->_device = device;
          if (![self->_session.outputs containsObject:self->_photoOutput] && [self->_session canAddOutput:self->_photoOutput]) {
            [self->_session addOutput:self->_photoOutput];
          }
          if (self->_photoOutput.isCameraSensorOrientationCompensationSupported) {
            self->_photoOutput.cameraSensorOrientationCompensationEnabled = sensorCompensation;
          }
        } else {
          self->_errorMessage = error.localizedDescription ?: @"Unable to attach the Duo camera.";
        }
      } else {
        self->_errorMessage = @"This Duo camera is not available in the current environment.";
      }
      [self->_session commitConfiguration];
      device = self->_device;
      if (device && shouldRun) [self configureSmartFramingForDevice:device];
      if (device && aspectRatio.length) {
        if ([device.activeFormat.supportedDynamicAspectRatios containsObject:aspectRatio]) {
          NSError *aspectError = nil;
          if ([device lockForConfiguration:&aspectError]) {
            [device setDynamicAspectRatio:aspectRatio completionHandler:nil];
            [device unlockForConfiguration];
          } else {
            self->_errorMessage = aspectError.localizedDescription;
          }
        } else {
          self->_errorMessage = @"The requested dynamic aspect ratio is not supported by the selected camera.";
        }
      }
      if (device && shouldRun && generation == self->_configurationGeneration.load() &&
          !self->_session.isRunning) [self->_session startRunning];
      if ((!shouldRun || !device) && self->_session.isRunning) [self->_session stopRunning];
      dispatch_async(dispatch_get_main_queue(), ^{
        if (generation != self->_configurationGeneration.load()) return;
        [self updateMirroring];
        [self installRotationCoordinatorForDevice:device];
        [self emitStateIfNeeded];
      });
    });
  } else {
    dispatch_async(_sessionQueue, ^{
      self->_errorMessage = @"Duo cameras require iOS 27.1 or later.";
      [self emitStateIfNeeded];
    });
  }
}

- (void)stopSession
{
  uint64_t generation = ++_configurationGeneration;
  [self teardownRotationCoordinator];
  dispatch_async(_sessionQueue, ^{
    if (generation != self->_configurationGeneration.load()) return;
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
    return descriptor ? [AVCaptureDevice deviceWithUniqueID:descriptor.uniqueID] : nil;
  }
  if (_cameraSource.length) {
    NSArray<AVCaptureDeviceType> *types;
    AVCaptureDevicePosition position = AVCaptureDevicePositionFront;
    if ([_cameraSource isEqualToString:@"virtualFront"]) {
      types = @[ AVCaptureDeviceTypeBuiltInWideAngleCamera, AVCaptureDeviceTypeBuiltInUltraWideCamera ];
    } else if ([_cameraSource isEqualToString:@"rear"]) {
      types = @[ AVCaptureDeviceTypeBuiltInTripleCamera, AVCaptureDeviceTypeBuiltInDualWideCamera, AVCaptureDeviceTypeBuiltInWideAngleCamera ];
      position = AVCaptureDevicePositionBack;
    } else {
      types = @[ [_cameraSource isEqualToString:@"innerFront"] ? AVCaptureDeviceTypeBuiltInInnerUltraWideCamera : AVCaptureDeviceTypeBuiltInOuterUltraWideCamera ];
    }
    NSArray<AVCaptureDevice *> *devices = [AVCaptureDeviceDiscoverySession discoverySessionWithDeviceTypes:types
        mediaType:AVMediaTypeVideo position:position].devices;
    if ([_cameraSource isEqualToString:@"virtualFront"]) {
      for (AVCaptureDevice *device in devices) if (device.isVirtualDevice) return device;
    }
    return devices.firstObject;
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
  if ([_configuredSmartFramingMode isEqualToString:@"off"]) return;
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
  if (context == RNDuoRotationContext) {
    dispatch_async(dispatch_get_main_queue(), ^{
      if (object != self->_rotationCoordinator) return;
      [self updatePreviewRotation];
      [self emitStateIfNeeded];
    });
    return;
  }
  if (context != RNDuoSmartFramingContext) {
    [super observeValueForKeyPath:keyPath ofObject:object change:change context:context];
    return;
  }
  if (@available(iOS 26.0, *)) {
    AVCaptureSmartFramingMonitor *monitor = object;
    uint64_t generation = _configurationGeneration.load();
    dispatch_async(_sessionQueue, ^{
      if (generation != self->_configurationGeneration.load() || monitor != self->_smartFramingMonitor) return;
      AVCaptureFraming *framing = monitor.recommendedFraming;
      if (framing && [self->_configuredSmartFramingMode isEqualToString:@"apply"]) {
        AVCaptureDevice *device = self->_device;
        AVCaptureAspectRatio aspectRatio = framing.aspectRatio;
        CGFloat zoomFactor = framing.zoomFactor;
        if ([device.activeFormat.supportedDynamicAspectRatios containsObject:aspectRatio]) {
          NSError *error = nil;
          if ([device lockForConfiguration:&error]) {
            [device setDynamicAspectRatio:aspectRatio completionHandler:nil];
            device.videoZoomFactor = MAX(device.minAvailableVideoZoomFactor,
                MIN(device.maxAvailableVideoZoomFactor, zoomFactor));
            [device unlockForConfiguration];
          }
        }
      }
      [self emitStateIfNeeded];
    });
  }
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
  if (![NSThread isMainThread]) {
    dispatch_async(dispatch_get_main_queue(), ^{ [self emitStateIfNeeded]; });
    return;
  }
  if (!_eventEmitter) return;
  uint64_t generation = _configurationGeneration.load();
  BOOL supported = NO;
  NSArray *forwardCameraIds = @[];
  NSArray *backwardCameraIds = @[];
  if (@available(iOS 27.1, *)) supported = YES;
  if (@available(iOS 27.1, *)) {
    forwardCameraIds = [self identifiersForDescriptors:_directionMap.forwardFacingDeviceDescriptors ?: @[]];
    backwardCameraIds = [self identifiersForDescriptors:_directionMap.backwardFacingDeviceDescriptors ?: @[]];
  }
  NSString *location = [_location copy];
  NSString *direction = [_direction copy];
  NSString *source = [_cameraSource copy];
  NSString *smartFramingMode = [_smartFramingMode copy];
  id previewRotation = NSNull.null;
  if (@available(iOS 17.0, *)) {
    if (_rotationCoordinator) previewRotation = @(_rotationCoordinator.videoRotationAngleForHorizonLevelPreview);
  }
  dispatch_async(_sessionQueue, ^{
    if (generation != self->_configurationGeneration.load()) return;
    AVCaptureDevice *device = self->_device;
    BOOL smartFramingSupported = NO;
    BOOL smartFramingMonitoring = NO;
    BOOL sensorCompensationSupported = NO;
    BOOL sensorCompensationDisabled = NO;
    NSArray *aspectRatios = @[];
    id selectedAspectRatio = NSNull.null;
    id recommendedFraming = NSNull.null;
    if (@available(iOS 26.0, *)) {
      sensorCompensationSupported = device && self->_photoOutput.isCameraSensorOrientationCompensationSupported;
      sensorCompensationDisabled = sensorCompensationSupported && !self->_photoOutput.isCameraSensorOrientationCompensationEnabled;
      aspectRatios = device.activeFormat.supportedDynamicAspectRatios ?: @[];
      selectedAspectRatio = device.dynamicAspectRatio ?: (id)NSNull.null;
      smartFramingSupported = device.activeFormat.isSmartFramingSupported;
      smartFramingMonitoring = self->_smartFramingMonitor.isMonitoring;
      AVCaptureFraming *framing = self->_smartFramingMonitor.recommendedFraming;
      if (framing) {
        recommendedFraming = @{
          @"aspectRatio": (NSString *)framing.aspectRatio,
          @"zoomFactor": @(framing.zoomFactor),
        };
      }
    }
    NSString *payload = RNDuoJSONString(@{
      @"supported": @(supported),
      @"available": @(device != nil),
      @"running": @(self->_session.isRunning),
      @"permission": [self permissionName],
      @"location": location,
      @"direction": direction.length ? direction : (id)NSNull.null,
      @"source": source.length ? source : (id)NSNull.null,
      @"forwardCameraIds": forwardCameraIds,
      @"backwardCameraIds": backwardCameraIds,
      @"deviceId": device.uniqueID ?: (id)NSNull.null,
      @"deviceName": device.localizedName ?: (id)NSNull.null,
      @"previewRotation": previewRotation,
      @"sensorCompensationSupported": @(sensorCompensationSupported),
      @"sensorCompensationDisabled": @(sensorCompensationDisabled),
      @"aspectRatios": aspectRatios,
      @"selectedAspectRatio": selectedAspectRatio,
      @"smartFraming": @{
        @"supported": @(smartFramingSupported),
        @"monitoring": @(smartFramingMonitoring),
        @"mode": smartFramingMode,
        @"recommended": recommendedFraming,
      },
      @"error": self->_errorMessage ?: (id)NSNull.null,
    });
    dispatch_async(dispatch_get_main_queue(), ^{
      if (generation != self->_configurationGeneration.load() || !self->_eventEmitter ||
          [self->_lastPayload isEqualToString:payload]) return;
      self->_lastPayload = payload;
      auto emitter = std::static_pointer_cast<const RNDuoCameraViewEventEmitter>(self->_eventEmitter);
      emitter->onStateChange({ .payload = std::string(payload.UTF8String) });
    });
  });
}

- (void)prepareForRecycle
{
  [self stopSession];
  [super prepareForRecycle];
  _lastPayload = nil;
}

- (void)dealloc
{
  [self teardownRotationCoordinator];
  [self teardownSmartFraming];
}

@end
