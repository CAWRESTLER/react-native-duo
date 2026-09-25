#import "RNDuoToolbarView.h"
#import "RNDuoUtilities.h"

#import <React/RCTComponentViewProtocol.h>

#import <react/renderer/components/ReactNativeDuoViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/EventEmitters.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/Props.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

@interface RNDuoToolbarContentController : UIViewController
@property (nonatomic) BOOL disablesVerticalBar;
@end

@implementation RNDuoToolbarContentController
- (UIVerticalBarBehavior)preferredVerticalBarBehavior API_AVAILABLE(ios(27.1))
{
  return self.disablesVerticalBar ? UIVerticalBarBehaviorDisabled : UIVerticalBarBehaviorAutomatic;
}
@end

@implementation RNDuoToolbarView {
  RNDuoToolbarContentController *_contentController;
  UINavigationController *_navigationController;
  UIView<RCTComponentViewProtocol> *_reactChild;
  __weak UIViewController *_hostController;
  NSArray *_items;
  NSString *_title;
  NSString *_verticalBehavior;
  NSString *_compressionBehavior;
  BOOL _showsNavigationBar;
  NSString *_lastPayload;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNDuoToolbarViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RNDuoToolbarViewProps>();
    _props = defaultProps;
    _items = @[];
    _title = @"";
    _verticalBehavior = @"automatic";
    _compressionBehavior = @"automatic";
    _showsNavigationBar = YES;
    _contentController = [[RNDuoToolbarContentController alloc] init];
    _contentController.view.backgroundColor = UIColor.clearColor;
    _navigationController = [[UINavigationController alloc] initWithRootViewController:_contentController];
    _navigationController.view.backgroundColor = UIColor.clearColor;
    [_navigationController setToolbarHidden:NO animated:NO];
    self.contentView = _navigationController.view;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newProps = *std::static_pointer_cast<RNDuoToolbarViewProps const>(props);
  NSString *itemsJSON = @(newProps.itemsJson.c_str());
  _items = RNDuoParseArray(itemsJSON);
  _title = newProps.title.empty() ? @"" : @(newProps.title.c_str());
  _verticalBehavior = newProps.verticalBehavior.empty() ? @"automatic" : @(newProps.verticalBehavior.c_str());
  _compressionBehavior = newProps.compressionBehavior.empty() ? @"automatic" : @(newProps.compressionBehavior.c_str());
  _showsNavigationBar = newProps.showsNavigationBar;
  [super updateProps:props oldProps:oldProps];
  [self applyToolbarConfiguration];
}

- (void)applyToolbarConfiguration
{
  _contentController.title = _title;
  [_navigationController setNavigationBarHidden:!_showsNavigationBar animated:NO];
  NSMutableArray<UIBarButtonItem *> *barItems = [NSMutableArray array];
  __weak __typeof(self) weakSelf = self;

  for (NSDictionary *item in _items) {
    if (![item isKindOfClass:[NSDictionary class]]) continue;
    NSString *identifier = [item[@"id"] isKindOfClass:[NSString class]] ? item[@"id"] : @"item";
    NSString *title = [item[@"title"] isKindOfClass:[NSString class]] ? item[@"title"] : identifier;
    NSString *symbol = [item[@"systemImage"] isKindOfClass:[NSString class]] ? item[@"systemImage"] : nil;
    UIImage *image = symbol.length ? [UIImage systemImageNamed:symbol] : nil;
    UIAction *action = [UIAction actionWithTitle:title image:image identifier:nil handler:^(__kindof UIAction *action) {
      [weakSelf emitItemPress:identifier];
    }];
    UIBarButtonItem *button = [[UIBarButtonItem alloc] initWithPrimaryAction:action];
    button.enabled = ![item[@"disabled"] boolValue];
    if (@available(iOS 15.0, *)) button.selected = [item[@"selected"] boolValue];
    if (@available(iOS 27.1, *)) {
      NSString *axis = [item[@"axisBehavior"] isKindOfClass:[NSString class]] ? item[@"axisBehavior"] : @"automatic";
      if ([axis isEqualToString:@"horizontalOnly"]) {
        button.axisBehavior = UIBarButtonItemAxisBehaviorHorizontalOnly;
      } else if ([axis isEqualToString:@"verticalPreferred"]) {
        button.axisBehavior = UIBarButtonItemAxisBehaviorVerticalPreferred;
      } else {
        button.axisBehavior = UIBarButtonItemAxisBehaviorAutomatic;
      }
    }
    if (@available(iOS 27.0, *)) {
      NSString *priority = [item[@"visibilityPriority"] isKindOfClass:[NSString class]]
          ? item[@"visibilityPriority"] : @"standard";
      if ([priority isEqualToString:@"low"]) {
        button.visibilityPriority = UIBarButtonItemVisibilityPriorityLow;
      } else if ([priority isEqualToString:@"high"]) {
        button.visibilityPriority = UIBarButtonItemVisibilityPriorityHigh;
      } else {
        button.visibilityPriority = UIBarButtonItemVisibilityPriorityStandard;
      }
    }
    [barItems addObject:button];
  }

  _contentController.toolbarItems = barItems;
  if (@available(iOS 27.1, *)) {
    _contentController.disablesVerticalBar = [_verticalBehavior isEqualToString:@"disabled"];
    if ([_compressionBehavior isEqualToString:@"preferBarItems"]) {
      _contentController.navigationItem.verticalBarCompressionBehavior = UIVerticalBarCompressionBehaviorPrefersBarItems;
    } else if ([_compressionBehavior isEqualToString:@"preferTabBar"]) {
      _contentController.navigationItem.verticalBarCompressionBehavior = UIVerticalBarCompressionBehaviorPrefersTabBar;
    } else {
      _contentController.navigationItem.verticalBarCompressionBehavior = UIVerticalBarCompressionBehaviorAutomatic;
    }
    [_contentController setNeedsUpdateOfVerticalBarConfiguration];
  }
  [_navigationController setToolbarHidden:barItems.count == 0 animated:NO];
  [self emitStateIfNeeded];
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  if (self.window && !_navigationController.parentViewController) {
    UIViewController *host = RNDuoFindViewController(self);
    if (host && host != _navigationController) {
      _hostController = host;
      [host addChildViewController:_navigationController];
      [_navigationController didMoveToParentViewController:host];
    }
  } else if (!self.window && _navigationController.parentViewController) {
    [_navigationController willMoveToParentViewController:nil];
    [_navigationController removeFromParentViewController];
    _hostController = nil;
  }
  dispatch_async(dispatch_get_main_queue(), ^{ [self emitStateIfNeeded]; });
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  _reactChild = childComponentView;
  [_contentController.view insertSubview:childComponentView atIndex:0];
  [self setNeedsLayout];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  [childComponentView removeFromSuperview];
  if (childComponentView == _reactChild) _reactChild = nil;
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  _navigationController.view.frame = self.bounds;
  _reactChild.frame = _contentController.view.bounds;
  [self emitStateIfNeeded];
}

- (void)traitCollectionDidChange:(UITraitCollection *)previousTraitCollection
{
  [super traitCollectionDidChange:previousTraitCollection];
  [self emitStateIfNeeded];
}

- (void)emitItemPress:(NSString *)identifier
{
  if (!_eventEmitter) return;
  NSString *payload = RNDuoJSONString(@{ @"id": identifier });
  auto emitter = std::static_pointer_cast<const RNDuoToolbarViewEventEmitter>(_eventEmitter);
  emitter->onItemPress({ .payload = std::string(payload.UTF8String) });
}

- (void)emitStateIfNeeded
{
  if (!_eventEmitter) return;
  NSString *edge = RNDuoVerticalBarEdgeName(_contentController.traitCollection);
  BOOL native = NO;
  if (@available(iOS 27.1, *)) native = YES;
  NSString *payload = RNDuoJSONString(@{
    @"native": @(native),
    @"verticalBarEdge": edge,
    @"isVertical": @(![edge isEqualToString:@"unavailable"] && ![edge isEqualToString:@"unspecified"]),
  });
  if ([_lastPayload isEqualToString:payload]) return;
  _lastPayload = payload;
  auto emitter = std::static_pointer_cast<const RNDuoToolbarViewEventEmitter>(_eventEmitter);
  emitter->onStateChange({ .payload = std::string(payload.UTF8String) });
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  _lastPayload = nil;
  _reactChild = nil;
}

@end
