#import "RNDuoSceneAccessoryView.h"
#import "RNDuoUtilities.h"
#import <QuartzCore/CAGradientLayer.h>

#import <react/renderer/components/ReactNativeDuoViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/EventEmitters.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/Props.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

static CGFloat RNDuoAccessoryDimension(NSDictionary *content, NSString *key,
                                      CGFloat fallback, CGFloat minimum, CGFloat maximum)
{
  NSNumber *number = [content[key] isKindOfClass:[NSNumber class]] ? content[key] : nil;
  return number ? MAX(minimum, MIN(maximum, number.doubleValue)) : fallback;
}

static BOOL RNDuoAccessoryFlag(NSDictionary *content, NSString *key)
{
  return [content[key] isKindOfClass:[NSNumber class]] && [content[key] boolValue];
}

@interface RNDuoAccessoryBackgroundView : UIView
@end

@implementation RNDuoAccessoryBackgroundView
+ (Class)layerClass { return CAGradientLayer.class; }
@end

@interface RNDuoAccessoryContentViewController : UIViewController
- (instancetype)initWithContent:(NSDictionary *)content;
@end

@implementation RNDuoAccessoryContentViewController {
  NSDictionary *_content;
}

- (instancetype)initWithContent:(NSDictionary *)content
{
  if (self = [super init]) _content = content;
  return self;
}

- (void)loadView
{
  UIView *root = [[RNDuoAccessoryBackgroundView alloc] init];
  root.backgroundColor = RNDuoColor(_content[@"backgroundColor"], [UIColor colorWithRed:0.04 green:0.08 blue:0.14 alpha:1]);
  if ([_content[@"gradientEndColor"] isKindOfClass:[NSString class]]) {
    CAGradientLayer *gradient = (CAGradientLayer *)root.layer;
    UIColor *end = RNDuoColor(_content[@"gradientEndColor"], root.backgroundColor);
    gradient.colors = @[ (__bridge id)root.backgroundColor.CGColor, (__bridge id)end.CGColor ];
    gradient.startPoint = CGPointMake(0, 0);
    gradient.endPoint = CGPointMake(1, 1);
  }

  UIStackView *stack = [[UIStackView alloc] init];
  stack.axis = UILayoutConstraintAxisVertical;
  stack.alignment = UIStackViewAlignmentCenter;
  stack.spacing = RNDuoAccessoryDimension(_content, @"spacing", 14, 0, 100);
  stack.translatesAutoresizingMaskIntoConstraints = NO;

  NSString *symbolName = [_content[@"systemImage"] isKindOfClass:[NSString class]] ? _content[@"systemImage"] : @"rectangle.on.rectangle";
  UIImageView *image = [[UIImageView alloc] initWithImage:[UIImage systemImageNamed:symbolName]];
  image.contentMode = UIViewContentModeScaleAspectFit;
  image.tintColor = RNDuoColor(_content[@"foregroundColor"], UIColor.whiteColor);
  image.translatesAutoresizingMaskIntoConstraints = NO;
  CGFloat symbolSize = RNDuoAccessoryDimension(_content, @"symbolSize", 72, 1, 240);
  image.preferredSymbolConfiguration = [UIImageSymbolConfiguration configurationWithPointSize:symbolSize];
  [NSLayoutConstraint activateConstraints:@[
    [image.widthAnchor constraintEqualToConstant:symbolSize],
    [image.heightAnchor constraintEqualToConstant:symbolSize],
  ]];

  UILabel *title = [[UILabel alloc] init];
  title.text = [_content[@"title"] isKindOfClass:[NSString class]] ? _content[@"title"] : @"Duo scene";
  title.textColor = RNDuoColor(_content[@"foregroundColor"], UIColor.whiteColor);
  title.font = [UIFont preferredFontForTextStyle:UIFontTextStyleLargeTitle];
  if ([_content[@"titleFontSize"] isKindOfClass:[NSNumber class]]) {
    title.font = [UIFont boldSystemFontOfSize:RNDuoAccessoryDimension(_content, @"titleFontSize", 34, 1, 160)];
  }
  if (RNDuoAccessoryFlag(_content, @"titleRounded")) {
    UIFontDescriptor *rounded = [title.font.fontDescriptor fontDescriptorWithDesign:UIFontDescriptorSystemDesignRounded];
    if (rounded) title.font = [UIFont fontWithDescriptor:rounded size:title.font.pointSize];
  }
  title.textAlignment = NSTextAlignmentCenter;
  title.numberOfLines = 0;

  UILabel *subtitle = [[UILabel alloc] init];
  subtitle.text = [_content[@"subtitle"] isKindOfClass:[NSString class]] ? _content[@"subtitle"] : @"";
  subtitle.textColor = [title.textColor colorWithAlphaComponent:RNDuoAccessoryDimension(_content, @"subtitleOpacity", 0.72, 0, 1)];
  subtitle.font = [UIFont preferredFontForTextStyle:UIFontTextStyleTitle3];
  if ([_content[@"subtitleFontSize"] isKindOfClass:[NSNumber class]] || RNDuoAccessoryFlag(_content, @"subtitleSemibold")) {
    CGFloat size = RNDuoAccessoryDimension(_content, @"subtitleFontSize", subtitle.font.pointSize, 1, 100);
    subtitle.font = [UIFont systemFontOfSize:size
                                    weight:RNDuoAccessoryFlag(_content, @"subtitleSemibold") ? UIFontWeightSemibold : UIFontWeightRegular];
  }
  subtitle.textAlignment = NSTextAlignmentCenter;
  subtitle.numberOfLines = 0;

  if (!RNDuoAccessoryFlag(_content, @"hideSymbol")) [stack addArrangedSubview:image];
  NSString *eyebrow = [_content[@"eyebrow"] isKindOfClass:[NSString class]] ? _content[@"eyebrow"] : @"";
  if (eyebrow.length) {
    UILabel *label = [[UILabel alloc] init];
    label.textAlignment = NSTextAlignmentCenter;
    label.numberOfLines = 0;
    label.attributedText = [[NSAttributedString alloc] initWithString:eyebrow attributes:@{
      NSFontAttributeName: [UIFont boldSystemFontOfSize:12],
      NSForegroundColorAttributeName: RNDuoColor(_content[@"eyebrowColor"], title.textColor),
      NSKernAttributeName: @3,
    }];
    [stack addArrangedSubview:label];
  }
  [stack addArrangedSubview:title];
  if (subtitle.text.length) [stack addArrangedSubview:subtitle];
  [root addSubview:stack];
  [NSLayoutConstraint activateConstraints:@[
    [stack.centerXAnchor constraintEqualToAnchor:root.centerXAnchor],
    [stack.centerYAnchor constraintEqualToAnchor:root.centerYAnchor],
    [stack.leadingAnchor constraintGreaterThanOrEqualToAnchor:root.leadingAnchor constant:32],
    [stack.trailingAnchor constraintLessThanOrEqualToAnchor:root.trailingAnchor constant:-32],
  ]];
  self.view = root;
}

@end

@interface RNDuoAccessorySceneDelegate : UIResponder <UIWindowSceneDelegate>
@property (nonatomic, strong) UIWindow *window;
@end

@implementation RNDuoAccessorySceneDelegate

- (void)scene:(UIScene *)scene
    willConnectToSession:(UISceneSession *)session
                 options:(UISceneConnectionOptions *)connectionOptions API_AVAILABLE(ios(27.0))
{
  if (![scene isKindOfClass:[UIWindowScene class]]) return;
  NSDictionary *userInfo = [connectionOptions.sceneAccessoryUserInfo isKindOfClass:[NSDictionary class]]
      ? connectionOptions.sceneAccessoryUserInfo : @{};
  NSDictionary *content = [userInfo[@"content"] isKindOfClass:[NSDictionary class]] ? userInfo[@"content"] : @{};
  UIWindow *window = [[UIWindow alloc] initWithWindowScene:(UIWindowScene *)scene];
  window.rootViewController = [[RNDuoAccessoryContentViewController alloc] initWithContent:content];
  self.window = window;
  window.hidden = NO;
}

- (void)sceneDidDisconnect:(UIScene *)scene
{
  self.window = nil;
}

@end

@implementation RNDuoSceneAccessoryView {
  UIView *_emptyView;
  UISceneAccessoryRegistration *_registration API_AVAILABLE(ios(27.0));
  __weak UIViewController *_registrationHost;
  NSString *_kind;
  NSDictionary *_content;
  BOOL _enabled;
  NSString *_configurationFingerprint;
  NSString *_lastPayload;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNDuoSceneAccessoryViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RNDuoSceneAccessoryViewProps>();
    _props = defaultProps;
    _kind = @"externalDisplay";
    _content = @{};
    _enabled = YES;
    _emptyView = [[UIView alloc] init];
    _emptyView.hidden = YES;
    self.contentView = _emptyView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newProps = *std::static_pointer_cast<RNDuoSceneAccessoryViewProps const>(props);
  NSString *nextKind = newProps.kind.empty() ? @"externalDisplay" : @(newProps.kind.c_str());
  NSDictionary *nextContent = RNDuoParseDictionary(@(newProps.contentJson.c_str()));
  BOOL shouldReregister = ![_kind isEqualToString:nextKind] || ![_content isEqualToDictionary:nextContent];
  _kind = nextKind;
  _content = nextContent;
  _enabled = newProps.enabled;
  [super updateProps:props oldProps:oldProps];
  if (shouldReregister) [self unregisterAccessory];
  [self registerAccessoryIfPossible];
  if (@available(iOS 27.0, *)) _registration.enabled = _enabled;
  [self emitStateIfNeeded];
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  if (self.window) {
    [self registerAccessoryIfPossible];
  } else {
    [self unregisterAccessory];
  }
  [self emitStateIfNeeded];
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  [self emitStateIfNeeded];
}

- (void)updateProperties API_AVAILABLE(ios(26.0))
{
  [super updateProperties];
  [self emitStateIfNeeded];
}

- (void)registerAccessoryIfPossible
{
  if (!self.window || _registration) return;
  if (@available(iOS 27.1, *)) {
    UIViewController *host = RNDuoFindViewController(self);
    if (!host) return;
    UISceneConfiguration *configuration = [[UISceneConfiguration alloc] init];
    configuration.delegateClass = RNDuoAccessorySceneDelegate.class;
    NSDictionary *userInfo = @{ @"content": _content, @"kind": _kind };
    UISceneAccessory *accessory = [_kind isEqualToString:@"cameraCapture"]
        ? [UISceneAccessory cameraCaptureSceneAccessoryWithConfiguration:configuration userInfo:userInfo]
        : [UISceneAccessory externalNonInteractiveSceneAccessoryWithConfiguration:configuration userInfo:userInfo];
    _registrationHost = host;
    _registration = [host registerSceneAccessory:accessory];
    _registration.enabled = _enabled;
  }
}

- (void)unregisterAccessory
{
  if (@available(iOS 27.0, *)) {
    if (_registration && _registrationHost) {
      [_registrationHost unregisterSceneAccessory:_registration];
    }
    _registration = nil;
    _registrationHost = nil;
  }
}

- (void)emitStateIfNeeded
{
  if (!_eventEmitter) return;
  BOOL supported = NO;
  BOOL registered = NO;
  BOOL available = NO;
  if (@available(iOS 27.1, *)) {
    supported = YES;
    registered = _registration != nil;
    available = _registration.isAvailable;
  }
  NSString *payload = RNDuoJSONString(@{
    @"supported": @(supported),
    @"registered": @(registered),
    @"available": @(available),
    @"enabled": @(_enabled),
    @"kind": _kind,
  });
  if ([_lastPayload isEqualToString:payload]) return;
  _lastPayload = payload;
  auto emitter = std::static_pointer_cast<const RNDuoSceneAccessoryViewEventEmitter>(_eventEmitter);
  emitter->onStateChange({ .payload = std::string(payload.UTF8String) });
}

- (void)prepareForRecycle
{
  [self unregisterAccessory];
  [super prepareForRecycle];
  _lastPayload = nil;
}

- (void)dealloc
{
  [self unregisterAccessory];
}

@end
