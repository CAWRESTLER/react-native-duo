#import "RNDuoCameraView.h"
#import "RNDuoUtilities.h"
#include "RNDuoCameraLifecycle.h"

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
  std::atomic<bool> _mounted;
  std::atomic<bool> _foreground;
  std::atomic<bool> _wantsRunning;
  RNDuoCameraLifecycle _lifecycle;
  NSMutableArray<id> *_notificationObservers;
  BOOL _active;
  BOOL _requestPermission;
  BOOL _mirrored;
  NSString *_resizeMode;
  NSString *_errorMessage;
  NSDictionary *_errorDetails;
  NSString *_cameraStatus;
  NSString *_interruptionReason;
  NSNumber *_interruptionReasonCode;
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
    _mounted.store(false);
    _foreground.store(UIApplication.sharedApplication.applicationState != UIApplicationStateBackground);
    _wantsRunning.store(false);
    _cameraStatus = @"idle";
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
              if (!self->_mounted.load()) return;
              if (self->_direction.length && self->_active && self.window &&
                  [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo] == AVAuthorizationStatusAuthorized) {
                [self configureAndRunResetRecovery:NO];
              } else {
                [self emitStateIfNeeded];
              }
            });
          }];
    }
  }
  return self;
}

- (void)installNotificationObservers
{
  if (_notificationObservers) return;
  _notificationObservers = [NSMutableArray array];
  NSNotificationCenter *center = NSNotificationCenter.defaultCenter;
  __weak __typeof(self) weakSelf = self;
  for (NSNotificationName name in @[ AVCaptureSessionWasInterruptedNotification,
                                     AVCaptureSessionInterruptionEndedNotification,
                                     AVCaptureSessionRuntimeErrorNotification,
                                     AVCaptureSessionDidStartRunningNotification,
                                     AVCaptureSessionDidStopRunningNotification ]) {
    id token = [center addObserverForName:name object:_session queue:nil usingBlock:^(NSNotification *notification) {
      __strong __typeof(weakSelf) self = weakSelf;
      if (!self || !self->_mounted.load()) return;
      uint64_t generation = self->_configurationGeneration.load();
      dispatch_async(self->_sessionQueue, ^{
        if (!RNDuoCameraLifecycle::acceptsCallback(generation, self->_configurationGeneration.load(), self->_mounted.load())) return;
        [self handleSessionNotification:notification];
      });
    }];
    [_notificationObservers addObject:token];
  }
  for (NSNotificationName name in @[ UIApplicationDidEnterBackgroundNotification, UIApplicationDidBecomeActiveNotification ]) {
    id token = [center addObserverForName:name object:nil queue:NSOperationQueue.mainQueue usingBlock:^(NSNotification *notification) {
      __strong __typeof(weakSelf) self = weakSelf;
      if (!self || !self->_mounted.load()) return;
      BOOL foreground = [notification.name isEqualToString:UIApplicationDidBecomeActiveNotification];
      self->_foreground.store(foreground);
      if (!foreground) [self stopSession];
      else if (self->_active && self.window &&
          [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo] == AVAuthorizationStatusAuthorized) {
        [self configureAndRunResetRecovery:NO];
      } else [self emitStateIfNeeded];
    }];
    [_notificationObservers addObject:token];
  }
}

- (void)removeNotificationObservers
{
  for (id token in _notificationObservers) [NSNotificationCenter.defaultCenter removeObserver:token];
  _notificationObservers = nil;
}

- (void)setCameraError:(NSString *)message code:(NSString *)code nativeError:(NSError *)error recoverable:(BOOL)recoverable
{
  // Session state is owned by _sessionQueue, never changed by UI callbacks.
  _errorMessage = message;
  _errorDetails = @{
    @"code": code,
    @"nativeDomain": error.domain ?: (id)NSNull.null,
    @"nativeCode": error ? @(error.code) : (id)NSNull.null,
    @"recoverable": @(recoverable),
  };
}

- (NSString *)nameForInterruptionReason:(NSInteger)reason
{
  switch (reason) {
    case AVCaptureSessionInterruptionReasonVideoDeviceNotAvailableInBackground: return @"background";
    case AVCaptureSessionInterruptionReasonAudioDeviceInUseByAnotherClient: return @"audioDeviceInUse";
    case AVCaptureSessionInterruptionReasonVideoDeviceInUseByAnotherClient: return @"videoDeviceInUse";
    case AVCaptureSessionInterruptionReasonVideoDeviceNotAvailableWithMultipleForegroundApps: return @"multipleForegroundApps";
    case AVCaptureSessionInterruptionReasonVideoDeviceNotAvailableDueToSystemPressure: return @"systemPressure";
    default:
      if (@available(iOS 26.0, *)) {
        if (reason == AVCaptureSessionInterruptionReasonSensitiveContentMitigationActivated) return @"sensitiveContent";
      }
      return @"unknown";
  }
}

- (void)startSessionIfPermitted
{
  _lifecycle.setDesiredRunning(_wantsRunning.load());
  if (!_mounted.load() || !_foreground.load() || !_device || !_lifecycle.shouldStart() ||
      _session.isInterrupted || _session.isRunning ||
      [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo] != AVAuthorizationStatusAuthorized) return;
  _cameraStatus = @"configuring";
  [_session startRunning];
}

- (void)setDynamicAspectRatio:(NSString *)aspectRatio forDevice:(AVCaptureDevice *)device errorCode:(NSString *)code API_AVAILABLE(ios(26.0))
{
  // Called on _sessionQueue while the device is locked. AVFoundation's
  // completion may arrive on any queue, after props change or view recycling.
  uint64_t generation = _configurationGeneration.load();
  __weak __typeof(self) weakSelf = self;
  __weak AVCaptureDevice *weakDevice = device;
  [device setDynamicAspectRatio:aspectRatio completionHandler:^(CMTime syncTime, NSError *error) {
    (void)syncTime;
    __strong __typeof(weakSelf) self = weakSelf;
    if (!self) return;
    dispatch_async(self->_sessionQueue, ^{
      if (!RNDuoCameraLifecycle::acceptsCallback(generation, self->_configurationGeneration.load(), self->_mounted.load()) ||
          weakDevice != self->_device) return;
      if (error) {
        [self setCameraError:error.localizedDescription ?: @"Unable to apply the camera aspect ratio."
                        code:code nativeError:error recoverable:YES];
      }
      [self emitStateIfNeeded];
    });
  }];
}

- (void)handleSessionNotification:(NSNotification *)notification
{
  _lifecycle.setDesiredRunning(_wantsRunning.load());
  if ([notification.name isEqualToString:AVCaptureSessionWasInterruptedNotification]) {
    _lifecycle.interrupt();
    _interruptionReasonCode = notification.userInfo[AVCaptureSessionInterruptionReasonKey];
    _interruptionReason = [self nameForInterruptionReason:_interruptionReasonCode.integerValue];
    _cameraStatus = @"interrupted";
  } else if ([notification.name isEqualToString:AVCaptureSessionInterruptionEndedNotification]) {
    _interruptionReason = nil;
    _interruptionReasonCode = nil;
    _cameraStatus = _session.isRunning ? @"running" : (_errorMessage ? @"error" : @"stopped");
    // AVFoundation normally resumes on its own. Only start if it did not and
    // the view is still active, mounted, authorized, and in the foreground.
    if (_lifecycle.endInterruption()) [self startSessionIfPermitted];
  } else if ([notification.name isEqualToString:AVCaptureSessionRuntimeErrorNotification]) {
    NSError *error = notification.userInfo[AVCaptureSessionErrorKey];
    BOOL mediaReset = [error.domain isEqualToString:AVFoundationErrorDomain] && error.code == AVErrorMediaServicesWereReset;
    BOOL restart = _lifecycle.runtimeError(mediaReset);
    [self setCameraError:error.localizedDescription ?: @"The camera capture session failed."
                    code:mediaReset ? @"mediaServicesReset" : @"runtimeError"
             nativeError:error recoverable:mediaReset];
    _cameraStatus = @"error";
    // At most one reset restart per explicit activation/configuration. A
    // successful start does not refill this budget and cannot create a loop.
    if (restart) [self startSessionIfPermitted];
  } else if ([notification.name isEqualToString:AVCaptureSessionDidStartRunningNotification]) {
    // A late start cannot resurrect a paused/unmounted view.
    if (!_wantsRunning.load() || !_foreground.load()) {
      if (_session.isRunning) [_session stopRunning];
      _cameraStatus = @"stopped";
    } else if (_session.isRunning && !_session.isInterrupted) {
      _cameraStatus = @"running";
      // Retain the last diagnostic until an explicit configuration/retry, so
      // an immediately recovered reset cannot disappear before JS sees it.
      // `running`/`status` identify recovery; `error` is not a running flag.
    } else {
      _cameraStatus = _session.isInterrupted ? @"interrupted" : (_errorMessage ? @"error" : @"stopped");
    }
  } else if ([notification.name isEqualToString:AVCaptureSessionDidStopRunningNotification]) {
    _cameraStatus = _session.isInterrupted ? @"interrupted" : (_session.isRunning ? @"running" : (_errorMessage ? @"error" : @"stopped"));
  }
  [self emitStateIfNeeded];
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
  _wantsRunning.store(_active && _mounted.load() && _foreground.load());
  [super updateProps:props oldProps:oldProps];

  _previewView.previewLayer.videoGravity = [_resizeMode isEqualToString:@"contain"]
      ? AVLayerVideoGravityResizeAspect : AVLayerVideoGravityResizeAspectFill;
  [self updateMirroring];

  AVAuthorizationStatus status = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
  if (permissionRequestedNow && status == AVAuthorizationStatusNotDetermined) {
    __weak __typeof(self) weakSelf = self;
    [AVCaptureDevice requestAccessForMediaType:AVMediaTypeVideo completionHandler:^(BOOL granted) {
      dispatch_async(dispatch_get_main_queue(), ^{
        __strong __typeof(weakSelf) self = weakSelf;
        if (!self || !self->_mounted.load()) return;
        if (granted && self->_active && self.window && self->_foreground.load()) [self configureAndRunResetRecovery:YES];
        else [self emitStateIfNeeded];
      });
    }];
  } else if (status == AVAuthorizationStatusAuthorized &&
      (selectionChanged || smartFramingChanged || aspectRatioChanged || sensorCompensationChanged || activeChanged)) {
    [self configureAndRunResetRecovery:YES];
  } else if (!_active) {
    [self stopSession];
  } else {
    [self emitStateIfNeeded];
  }
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  _mounted.store(self.window != nil);
  _foreground.store(UIApplication.sharedApplication.applicationState != UIApplicationStateBackground);
  _wantsRunning.store(_active && _mounted.load() && _foreground.load());
  if (self.window) [self installNotificationObservers];
  if (self.window && _active && _foreground.load() &&
      [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo] == AVAuthorizationStatusAuthorized) {
    [self configureAndRunResetRecovery:YES];
  } else if (!self.window) {
    [self removeNotificationObservers];
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

- (void)configureAndRunResetRecovery:(BOOL)resetRecovery
{
  BOOL shouldRun = _active && _mounted.load() && _foreground.load() && self.window != nil;
  _wantsRunning.store(shouldRun);
  if (!shouldRun) {
    [self stopSession];
    return;
  }
  if (@available(iOS 27.1, *)) {
    AVCaptureDevice *resolvedDevice = [self resolveDeviceForLocation:_location];
    NSString *aspectRatio = [_dynamicAspectRatio copy];
    NSString *smartFramingMode = [_smartFramingMode copy];
    BOOL sensorCompensation = _sensorOrientationCompensation;
    uint64_t generation = ++_configurationGeneration;
    [self teardownRotationCoordinator];
    dispatch_async(_sessionQueue, ^{
      if (generation != self->_configurationGeneration.load()) return;
      self->_lifecycle.setDesiredRunning(self->_wantsRunning.load());
      if (resetRecovery) self->_lifecycle.beginExplicitConfiguration(self->_wantsRunning.load());
      else if (self->_lifecycle.hasFailed()) {
        [self emitStateIfNeeded];
        return;
      }
      if (self->_session.isInterrupted) self->_lifecycle.interrupt();
      else {
        self->_lifecycle.endInterruption();
        self->_interruptionReason = nil;
        self->_interruptionReasonCode = nil;
      }
      AVCaptureDevice *device = resolvedDevice;
      [self teardownSmartFraming];
      self->_configuredSmartFramingMode = smartFramingMode;
      [self->_session beginConfiguration];
      for (AVCaptureInput *input in self->_session.inputs) [self->_session removeInput:input];
      self->_device = nil;
      if (resetRecovery || ![self->_errorDetails[@"code"] isEqualToString:@"mediaServicesReset"]) {
        self->_errorMessage = nil;
        self->_errorDetails = nil;
      }
      self->_cameraStatus = @"configuring";
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
          [self setCameraError:error.localizedDescription ?: @"Unable to attach the Duo camera."
                          code:@"configurationFailed" nativeError:error recoverable:YES];
        }
      } else {
        [self setCameraError:@"This Duo camera is not available in the current environment."
                        code:@"deviceUnavailable" nativeError:nil recoverable:YES];
      }
      [self->_session commitConfiguration];
      device = self->_device;
      if (device && shouldRun) [self configureSmartFramingForDevice:device];
      if (device && aspectRatio.length) {
        if ([device.activeFormat.supportedDynamicAspectRatios containsObject:aspectRatio]) {
          NSError *aspectError = nil;
          if ([device lockForConfiguration:&aspectError]) {
            [self setDynamicAspectRatio:aspectRatio forDevice:device errorCode:@"aspectRatioFailed"];
            [device unlockForConfiguration];
          } else {
            [self setCameraError:aspectError.localizedDescription ?: @"Unable to configure the camera aspect ratio."
                            code:@"aspectRatioFailed" nativeError:aspectError recoverable:YES];
          }
        } else {
          [self setCameraError:@"The requested dynamic aspect ratio is not supported by the selected camera."
                          code:@"aspectRatioUnsupported" nativeError:nil recoverable:NO];
        }
      }
      if (device && shouldRun && generation == self->_configurationGeneration.load()) [self startSessionIfPermitted];
      if ((!shouldRun || !device) && self->_session.isRunning) [self->_session stopRunning];
      if (self->_session.isInterrupted) self->_cameraStatus = @"interrupted";
      else if (self->_session.isRunning) self->_cameraStatus = @"running";
      else if (self->_errorMessage) self->_cameraStatus = @"error";
      dispatch_async(dispatch_get_main_queue(), ^{
        if (generation != self->_configurationGeneration.load()) return;
        [self updateMirroring];
        [self installRotationCoordinatorForDevice:device];
        [self emitStateIfNeeded];
      });
    });
  } else {
    dispatch_async(_sessionQueue, ^{
      if (!self->_mounted.load()) return;
      [self setCameraError:@"Duo cameras require iOS 27.1 or later."
                      code:@"unsupportedOS" nativeError:nil recoverable:NO];
      self->_cameraStatus = @"unsupported";
      [self emitStateIfNeeded];
    });
  }
}

- (void)stopSession
{
  _wantsRunning.store(false);
  uint64_t generation = ++_configurationGeneration;
  [self teardownRotationCoordinator];
  dispatch_async(_sessionQueue, ^{
    if (generation != self->_configurationGeneration.load()) return;
    self->_lifecycle.setDesiredRunning(false);
    [self teardownSmartFraming];
    if (self->_session.isRunning) [self->_session stopRunning];
    self->_cameraStatus = self->_session.isInterrupted ? @"interrupted" : (self->_errorMessage ? @"error" : @"stopped");
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
    } else if (configurationError) {
      [self setCameraError:configurationError.localizedDescription ?: @"Unable to configure smart framing."
                      code:@"smartFramingFailed" nativeError:configurationError recoverable:YES];
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
      [self setCameraError:monitorError.localizedDescription ?: @"Unable to start smart framing."
                      code:@"smartFramingFailed" nativeError:monitorError recoverable:YES];
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
      if (!self->_mounted.load() || object != self->_rotationCoordinator) return;
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
      if (!self->_mounted.load() || generation != self->_configurationGeneration.load() || monitor != self->_smartFramingMonitor) return;
      AVCaptureFraming *framing = monitor.recommendedFraming;
      if (framing && [self->_configuredSmartFramingMode isEqualToString:@"apply"]) {
        AVCaptureDevice *device = self->_device;
        AVCaptureAspectRatio aspectRatio = framing.aspectRatio;
        CGFloat zoomFactor = framing.zoomFactor;
        if ([device.activeFormat.supportedDynamicAspectRatios containsObject:aspectRatio]) {
          NSError *error = nil;
          if ([device lockForConfiguration:&error]) {
            [self setDynamicAspectRatio:aspectRatio forDevice:device errorCode:@"smartFramingFailed"];
            device.videoZoomFactor = MAX(device.minAvailableVideoZoomFactor,
                MIN(device.maxAvailableVideoZoomFactor, zoomFactor));
            [device unlockForConfiguration];
          } else {
            [self setCameraError:error.localizedDescription ?: @"Unable to apply smart framing."
                            code:@"smartFramingFailed" nativeError:error recoverable:YES];
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
  if (!_mounted.load() || !_eventEmitter) return;
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
    if (!self->_mounted.load() || generation != self->_configurationGeneration.load()) return;
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
      @"status": self->_cameraStatus ?: @"idle",
      @"interrupted": @(self->_session.isInterrupted),
      @"interruptionReason": self->_interruptionReason ?: (id)NSNull.null,
      @"interruptionReasonCode": self->_interruptionReasonCode ?: (id)NSNull.null,
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
      @"errorDetails": self->_errorDetails ?: (id)NSNull.null,
    });
    dispatch_async(dispatch_get_main_queue(), ^{
      if (!self->_mounted.load() || generation != self->_configurationGeneration.load() || !self->_eventEmitter ||
          [self->_lastPayload isEqualToString:payload]) return;
      self->_lastPayload = payload;
      auto emitter = std::static_pointer_cast<const RNDuoCameraViewEventEmitter>(self->_eventEmitter);
      emitter->onStateChange({ .payload = std::string(payload.UTF8String) });
    });
  });
}

- (void)prepareForRecycle
{
  _mounted.store(false);
  [self removeNotificationObservers];
  [self stopSession];
  [super prepareForRecycle];
  _lastPayload = nil;
}

- (void)dealloc
{
  _mounted.store(false);
  _wantsRunning.store(false);
  [self removeNotificationObservers];
  [self teardownRotationCoordinator];
  [self teardownSmartFraming];
  _previewView.previewLayer.session = nil;
  // Do not block the UI thread in stopRunning, and do not retain a deallocating
  // component. Pending session-queue blocks retain self, so none remain here.
  AVCaptureSession *session = _session;
  dispatch_async(_sessionQueue, ^{ if (session.isRunning) [session stopRunning]; });
}

@end
