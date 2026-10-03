#import "RNDuoNavigationToolbarView.h"
#import "RNDuoNavigationToolbarVisibility.h"
#import "RNDuoUtilities.h"
#import <objc/runtime.h>
#import <UIKit/UIBarButtonItemBadge.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/EventEmitters.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/Props.h>
#include <cmath>

using namespace facebook::react;
static char RNDuoNavigationToolbarOwnerKey;
static char RNDuoNavigationToolbarVisibilityKey;

@interface RNDuoNavigationToolbarVisibilityCoordinator : NSObject {
@public
  RNDuoNavigationToolbarVisibility visibility;
}
@property (nonatomic, weak) RNDuoNavigationToolbarView *owner;
@end

@implementation RNDuoNavigationToolbarVisibilityCoordinator
@end

static RNDuoNavigationToolbarVisibilityCoordinator *RNDuoVisibilityCoordinator(UINavigationController *navigation, BOOL create)
{
  if (!navigation) return nil;
  RNDuoNavigationToolbarVisibilityCoordinator *coordinator = objc_getAssociatedObject(navigation, &RNDuoNavigationToolbarVisibilityKey);
  if (!coordinator && create) {
    coordinator = [RNDuoNavigationToolbarVisibilityCoordinator new];
    objc_setAssociatedObject(navigation, &RNDuoNavigationToolbarVisibilityKey, coordinator, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
  }
  return coordinator;
}

static RNDuoNavigationToolbarVisibility::Owner RNDuoVisibilityOwner(RNDuoNavigationToolbarView *view)
{
  // A weak owner may already be zeroed during dealloc. The identity token is
  // used only for equality, never to message/dereference a destroyed view.
  return reinterpret_cast<RNDuoNavigationToolbarVisibility::Owner>((__bridge void *)view);
}

@implementation RNDuoNavigationToolbarView {
  UIView *_container;
  UIView<RCTComponentViewProtocol> *_reactChild;
  __weak UIViewController *_screen;
  __weak UINavigationController *_navigation;
  __weak UIViewController *_visibilityConflictScreen;
  NSArray<UIBarButtonItem *> *_installedItems;
  NSArray<UIBarButtonItem *> *_previousItems;
  NSInteger _previousCompression;
  NSInteger _installedCompression;
  BOOL _active;
  NSString *_itemsJSON;
  NSString *_tint;
  NSString *_compression;
  NSString *_attachment;
  NSDictionary *_lastState;
  BOOL _configurationDirty;
  NSString *_configuredVerticalBarEdge;
  UIUserInterfaceSizeClass _configuredHorizontalSizeClass;
  UIUserInterfaceSizeClass _configuredVerticalSizeClass;
  NSString *_horizontalPresentation;
  UIToolbar *_inlineToolbar;
  BOOL _usesInlineToolbar;
  CGFloat _inlineToolbarHeight;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNDuoNavigationToolbarViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _props = std::make_shared<const RNDuoNavigationToolbarViewProps>();
    _container = [[UIView alloc] init];
    _container.backgroundColor = UIColor.clearColor;
    self.contentView = _container;
    _active = YES;
    _horizontalPresentation = @"navigator";
    _attachment = @"inactive";
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &next = *std::static_pointer_cast<RNDuoNavigationToolbarViewProps const>(props);
  NSString *items = @(next.itemsJson.c_str());
  NSString *tint = @(next.barTintColor.c_str());
  NSString *compression = @(next.compressionBehavior.c_str());
  NSString *horizontalPresentation = next.horizontalPresentation.empty() ? @"navigator" : @(next.horizontalPresentation.c_str());
  _configurationDirty |= ![_itemsJSON isEqualToString:items] || ![_tint isEqualToString:tint] ||
      ![_compression isEqualToString:compression] || ![_horizontalPresentation isEqualToString:horizontalPresentation];
  _itemsJSON = items;
  _tint = tint;
  _compression = compression;
  _horizontalPresentation = horizontalPresentation;
  if (_active != next.active) _visibilityConflictScreen = nil;
  _active = next.active;
  [super updateProps:props oldProps:oldProps];
  [self updateAttachment];
  [self setNeedsLayout];
}

- (void)invalidateVerticalBarsForScreen:(UIViewController *)screen navigation:(UINavigationController *)navigation
{
  if (@available(iOS 27.1, *)) {
    [screen setNeedsUpdateOfVerticalBarConfiguration];
    [navigation setNeedsUpdateOfVerticalBarConfiguration];
    // Existing native tabs/root controllers own their bars. Ask UIKit to
    // coordinate them without replacing their controllers or delegates.
    [navigation.tabBarController setNeedsUpdateOfVerticalBarConfiguration];
    UIWindow *window = self.window ?: navigation.viewIfLoaded.window;
    [window.rootViewController setNeedsUpdateOfVerticalBarConfiguration];
  }
}

- (void)releaseOwnership
{
  // Inline actions are package-owned content, never an existing controller's
  // toolbar. Hide them immediately when focus/native ownership is relinquished.
  [_inlineToolbar setItems:nil animated:NO];
  _inlineToolbar.hidden = YES;
  _usesInlineToolbar = NO;
  _inlineToolbarHeight = 0;
  UIViewController *screen = _screen;
  UINavigationController *navigation = _navigation;
  BOOL stillOwnsItems = !screen;
  BOOL changedScreenConfiguration = NO;
  if (screen && objc_getAssociatedObject(screen, &RNDuoNavigationToolbarOwnerKey) == self) {
    // Do not overwrite a navigator/consumer that replaced our items meanwhile.
    stillOwnsItems = screen.toolbarItems == _installedItems;
    if (stillOwnsItems) {
      [screen setToolbarItems:_previousItems animated:NO];
      changedScreenConfiguration = YES;
    }
    if (@available(iOS 27.1, *)) {
      if (stillOwnsItems && screen.navigationItem.verticalBarCompressionBehavior == _installedCompression) screen.navigationItem.verticalBarCompressionBehavior =
          (UIVerticalBarCompressionBehavior)_previousCompression;
    }
    objc_setAssociatedObject(screen, &RNDuoNavigationToolbarOwnerKey, nil, OBJC_ASSOCIATION_ASSIGN);
  }
  RNDuoNavigationToolbarVisibilityCoordinator *coordinator = RNDuoVisibilityCoordinator(navigation, NO);
  if (coordinator) {
    // Restore a plain incoming screen too, but never clobber an incoming
    // adapter (different coordinator owner) or a foreign screen's items.
    BOOL incomingHasForeignItems = navigation.topViewController != screen && navigation.topViewController.toolbarItems.count > 0;
    auto decision = coordinator->visibility.release(RNDuoVisibilityOwner(self), navigation.toolbarHidden,
        stillOwnsItems && !incomingHasForeignItems);
    if (decision.shouldSetHidden) {
      [navigation setToolbarHidden:decision.hidden animated:NO];
      changedScreenConfiguration = YES;
    }
    if (!coordinator->visibility.hasOwner()) {
      coordinator.owner = nil;
      objc_setAssociatedObject(navigation, &RNDuoNavigationToolbarVisibilityKey, nil, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    }
  }
  if (changedScreenConfiguration) [self invalidateVerticalBarsForScreen:screen navigation:navigation];
  _screen = nil;
  _navigation = nil;
  _installedItems = nil;
  _previousItems = nil;
}

- (void)updateAttachment
{
  if (!_active || !self.window) {
    [self releaseOwnership];
    _visibilityConflictScreen = nil;
    _attachment = @"inactive";
    return;
  }
  UIViewController *screen = RNDuoFindViewController(self);
  // Resolve a screen's containing stack, never replace its controllers/delegate.
  while (screen && !screen.navigationController) screen = screen.parentViewController;
  UINavigationController *navigation = screen.navigationController;
  if (!screen || !navigation || screen == navigation) {
    [self releaseOwnership];
    _visibilityConflictScreen = nil;
    _attachment = @"missingNativeStack";
    return;
  }
  if (navigation.topViewController != screen) {
    [self releaseOwnership];
    _visibilityConflictScreen = nil;
    _attachment = @"inactive";
    return;
  }
  if (_visibilityConflictScreen == screen) {
    // An external native visibility change wins until this screen loses
    // focus/re-enters the hierarchy. Do not fight it on every layout pass.
    _attachment = @"conflict";
    return;
  }
  _visibilityConflictScreen = nil;
  if (_screen != screen) {
    [self releaseOwnership];
    id owner = objc_getAssociatedObject(screen, &RNDuoNavigationToolbarOwnerKey);
    if ((owner && owner != self) || screen.toolbarItems.count > 0) {
      _attachment = @"conflict";
      return;
    }
    objc_setAssociatedObject(screen, &RNDuoNavigationToolbarOwnerKey, self, OBJC_ASSOCIATION_ASSIGN);
    _screen = screen;
    _navigation = navigation;
    _previousItems = screen.toolbarItems;
    if (@available(iOS 27.1, *)) _previousCompression = screen.navigationItem.verticalBarCompressionBehavior;
    _configurationDirty = YES;
  }
  if (_installedItems && screen.toolbarItems != _installedItems) {
    // Empty/nil replacement is still an external ownership decision. Without
    // this latch the next layout would immediately reclaim its empty array.
    _visibilityConflictScreen = screen;
    [self releaseOwnership];
    _attachment = @"conflict";
    return;
  }
  RNDuoNavigationToolbarVisibilityCoordinator *coordinator = RNDuoVisibilityCoordinator(navigation, YES);
  auto identity = RNDuoVisibilityOwner(self);
  if (!coordinator->visibility.owns(identity)) {
    // Transfer the original navigation-wide snapshot before installing this
    // screen's items. A late outgoing cleanup must not erase the new owner.
    coordinator->visibility.acquire(identity, navigation.toolbarHidden);
    coordinator.owner = self;
  }
  auto currentVisibility = coordinator->visibility.update(identity, navigation.toolbarHidden, navigation.toolbarHidden);
  if (currentVisibility.externalOverride) {
    _visibilityConflictScreen = screen;
    [self releaseOwnership];
    _attachment = @"conflict";
    return;
  }
  BOOL changedConfiguration = NO;
  NSString *edge = RNDuoVerticalBarEdgeName(self.traitCollection);
  BOOL isVertical = [edge isEqualToString:@"leading"] || [edge isEqualToString:@"trailing"];
  BOOL useInlineToolbar = [_horizontalPresentation isEqualToString:@"inline"] && !isVertical;
  if (_usesInlineToolbar != useInlineToolbar) _configurationDirty = YES;
  _usesInlineToolbar = useInlineToolbar;
  if (!useInlineToolbar) {
    [_inlineToolbar setItems:nil animated:NO];
    _inlineToolbar.hidden = YES;
    _inlineToolbarHeight = 0;
  }
  if (_configurationDirty) {
    NSMutableArray<UIBarButtonItem *> *buttons = [NSMutableArray array];
    NSMutableArray<UIBarButtonItem *> *inlineButtons = [NSMutableArray array];
    for (NSDictionary *item in RNDuoParseArray(_itemsJSON)) {
      if (![item isKindOfClass:NSDictionary.class]) continue;
      NSString *placement = item[@"placement"];
      // Runtime safety for JS consumers: tabs/headers are navigator-owned.
      if (placement && ![placement isEqual:@"bottomBar"] && ![placement isEqual:@"overflow"]) continue;
      [buttons addObject:[self buttonForItem:item]];
      // Do not move the same UIBarButtonItem presentation between two bars.
      // Both independent instances dispatch through the same ownership guards.
      if (useInlineToolbar) [inlineButtons addObject:[self buttonForItem:item]];
    }
    _installedItems = [buttons copy];
    // Refresh the existing controller's public toolbar model, including after
    // a vertical/horizontal transition. Never mutate its UIToolbar directly.
    [screen setToolbarItems:_installedItems animated:NO];
    // Keep the actual installed model identity so a later foreign replacement
    // (including nil/empty items) still relinquishes ownership before refresh.
    _installedItems = screen.toolbarItems;
    if (useInlineToolbar) {
      if (!_inlineToolbar) {
        _inlineToolbar = [[UIToolbar alloc] initWithFrame:CGRectZero];
        _inlineToolbar.hidden = YES;
        [_container addSubview:_inlineToolbar];
      }
      [_inlineToolbar setItems:inlineButtons animated:NO];
    }
    if (@available(iOS 27.1, *)) {
      screen.navigationItem.verticalBarCompressionBehavior = [_compression isEqual:@"preferBarItems"]
          ? UIVerticalBarCompressionBehaviorPrefersBarItems
          : [_compression isEqual:@"preferTabBar"] ? UIVerticalBarCompressionBehaviorPrefersTabBar
          : UIVerticalBarCompressionBehaviorAutomatic;
      _installedCompression = screen.navigationItem.verticalBarCompressionBehavior;
    }
    _configurationDirty = NO;
    changedConfiguration = YES;
  }
  // Wrapped NativeTabs can leave the controller-managed horizontal toolbar
  // detached. The explicit inline opt-in owns only these local action controls;
  // headers, back, tabs, and the vertical native rail remain navigator-owned.
  auto visibility = coordinator->visibility.update(identity, navigation.toolbarHidden, useInlineToolbar || _installedItems.count == 0);
  if (visibility.externalOverride) {
    _visibilityConflictScreen = screen;
    [self releaseOwnership];
    _attachment = @"conflict";
    return;
  }
  if (visibility.shouldSetHidden || changedConfiguration) {
    // Axis changes may leave UIKit's horizontal toolbar detached even while
    // toolbarHidden still reports NO. Reassert the public visibility request
    // only after our owned model refresh and external-override checks; never
    // toggle hidden state or take over a foreign controller/toolbar.
    [navigation setToolbarHidden:visibility.hidden animated:NO];
    changedConfiguration = YES;
  }
  if (changedConfiguration) [self invalidateVerticalBarsForScreen:screen navigation:navigation];
  _attachment = @"attached";
}

- (UIBarButtonItem *)buttonForItem:(NSDictionary *)item
{
  __weak __typeof(self) weakSelf = self;
  NSString *identifier = [item[@"id"] isKindOfClass:NSString.class] ? item[@"id"] : @"item";
  NSString *title = [item[@"title"] isKindOfClass:NSString.class] ? item[@"title"] : identifier;
  NSString *symbol = [item[@"systemImage"] isKindOfClass:NSString.class] ? item[@"systemImage"] : nil;
  NSString *edge = RNDuoVerticalBarEdgeName(self.traitCollection);
  BOOL vertical = [edge isEqual:@"leading"] || [edge isEqual:@"trailing"];
  if (vertical && [item[@"verticalSystemImage"] isKindOfClass:NSString.class]) symbol = item[@"verticalSystemImage"];
  UIImage *image = symbol.length ? [UIImage systemImageNamed:symbol] : nil;
  UIBarButtonItem *button;
  if ([item[@"placement"] isEqual:@"overflow"] && [item[@"menuItems"] isKindOfClass:NSArray.class]) {
    NSMutableArray<UIMenuElement *> *actions = [NSMutableArray array];
    for (NSDictionary *entry in item[@"menuItems"]) {
      if (![entry isKindOfClass:NSDictionary.class]) continue;
      NSString *actionID = [entry[@"id"] isKindOfClass:NSString.class] ? entry[@"id"] : @"menuItem";
      NSString *actionTitle = [entry[@"title"] isKindOfClass:NSString.class] ? entry[@"title"] : actionID;
      UIImage *actionImage = [entry[@"systemImage"] isKindOfClass:NSString.class]
          ? [UIImage systemImageNamed:entry[@"systemImage"]] : nil;
      UIAction *action = [UIAction actionWithTitle:actionTitle image:actionImage identifier:nil handler:^(__kindof UIAction *action) {
        [weakSelf emitPress:actionID];
      }];
      action.attributes = [entry[@"disabled"] boolValue] || [item[@"disabled"] boolValue] ? UIMenuElementAttributesDisabled : 0;
      [actions addObject:action];
    }
    button = [[UIBarButtonItem alloc] initWithImage:image ?: [UIImage systemImageNamed:@"ellipsis.circle"] menu:[UIMenu menuWithTitle:@"" children:actions]];
  } else {
    button = [[UIBarButtonItem alloc] initWithPrimaryAction:[UIAction actionWithTitle:title image:image identifier:nil handler:^(__kindof UIAction *action) {
      [weakSelf emitPress:identifier];
    }]];
  }
  button.accessibilityLabel = title;
  button.enabled = ![item[@"disabled"] boolValue];
  if (_tint.length) button.tintColor = RNDuoColor(_tint, UIColor.systemBlueColor);
  if (@available(iOS 15.0, *)) button.selected = [item[@"selected"] boolValue];
  if (@available(iOS 26.0, *)) {
    id badge = item[@"badge"];
    if ([badge isKindOfClass:NSNumber.class]) button.badge = [UIBarButtonItemBadge badgeWithCount:[badge unsignedIntegerValue]];
    else if ([badge isKindOfClass:NSString.class]) button.badge = [badge length] ? [UIBarButtonItemBadge badgeWithString:badge] : [UIBarButtonItemBadge indicatorBadge];
  }
  if (@available(iOS 27.1, *)) {
    button.axisBehavior = [item[@"axisBehavior"] isEqual:@"horizontalOnly"] ? UIBarButtonItemAxisBehaviorHorizontalOnly
        : [item[@"axisBehavior"] isEqual:@"verticalPreferred"] ? UIBarButtonItemAxisBehaviorVerticalPreferred : UIBarButtonItemAxisBehaviorAutomatic;
  }
  if (@available(iOS 27.0, *)) {
    button.visibilityPriority = [item[@"visibilityPriority"] isEqual:@"low"] ? UIBarButtonItemVisibilityPriorityLow
        : [item[@"visibilityPriority"] isEqual:@"high"] ? UIBarButtonItemVisibilityPriorityHigh : UIBarButtonItemVisibilityPriorityStandard;
  }
  return button;
}

- (void)emitPress:(NSString *)identifier
{
  if (!_active || !self.window || ![_attachment isEqual:@"attached"] ||
      _navigation.topViewController != _screen ||
      objc_getAssociatedObject(_screen, &RNDuoNavigationToolbarOwnerKey) != self ||
      _screen.toolbarItems != _installedItems || !_eventEmitter) return;
  auto emitter = std::static_pointer_cast<const RNDuoNavigationToolbarViewEventEmitter>(_eventEmitter);
  emitter->onItemPress({ .payload = std::string(RNDuoJSONString(@{ @"id": identifier }).UTF8String) });
}

- (void)emitState
{
  if (!_eventEmitter) return;
  UIEdgeInsets insets = self.safeAreaInsets;
  if (_usesInlineToolbar && !_inlineToolbar.hidden) insets.bottom += _inlineToolbarHeight;
  NSString *edge = RNDuoVerticalBarEdgeName(self.traitCollection);
  BOOL native = NO;
  if (@available(iOS 27.1, *)) native = YES;
  NSString *actionPresentation = @"none";
  if ([_attachment isEqualToString:@"attached"] && _installedItems.count > 0) {
    if (_usesInlineToolbar) {
      if (!_inlineToolbar.hidden && _inlineToolbarHeight > 0) actionPresentation = @"inline";
    } else actionPresentation = @"navigationController";
  }
  NSDictionary *state = @{
    @"native": @(native), @"attachment": _attachment, @"verticalBarEdge": edge,
    @"actionPresentation": actionPresentation,
    @"isVertical": @([edge isEqual:@"leading"] || [edge isEqual:@"trailing"]),
    @"contentInsets": @{ @"top": @(insets.top), @"left": @(insets.left), @"bottom": @(insets.bottom), @"right": @(insets.right) },
    @"contentSize": @{ @"width": @(CGRectGetWidth(self.bounds)), @"height": @(CGRectGetHeight(self.bounds)) }
  };
  if ([_lastState isEqualToDictionary:state]) return;
  _lastState = state;
  auto emitter = std::static_pointer_cast<const RNDuoNavigationToolbarViewEventEmitter>(_eventEmitter);
  emitter->onStateChange({ .payload = std::string(RNDuoJSONString(state).UTF8String) });
}

- (void)layoutInlineToolbar
{
  _inlineToolbarHeight = 0;
  if (!_usesInlineToolbar || ![_attachment isEqualToString:@"attached"] ||
      !_inlineToolbar || _installedItems.count == 0 || !_active || !self.window) {
    _inlineToolbar.hidden = YES;
    return;
  }
  // The existing navigator still owns status/header/tab safe areas. Place our
  // explicitly opted-in local action bar inside that measured safe rectangle;
  // report its extra obstruction, without changing any controller safe areas.
  UIEdgeInsets insets = self.safeAreaInsets;
  CGRect bounds = _container.bounds;
  CGFloat width = MAX(0, CGRectGetWidth(bounds) - insets.left - insets.right);
  CGFloat availableHeight = MAX(0, CGRectGetHeight(bounds) - insets.top - insets.bottom);
  CGSize fitting = [_inlineToolbar sizeThatFits:CGSizeMake(width, availableHeight)];
  CGFloat height = std::isfinite(fitting.height) ? MAX(0, MIN(availableHeight, fitting.height)) : 0;
  if (width <= 0 || height <= 0) {
    _inlineToolbar.hidden = YES;
    return;
  }
  _inlineToolbarHeight = height;
  _inlineToolbar.frame = CGRectMake(CGRectGetMinX(bounds) + insets.left,
      CGRectGetMaxY(bounds) - insets.bottom - height, width, height);
  _inlineToolbar.hidden = NO;
  [_container bringSubviewToFront:_inlineToolbar];
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  _container.frame = self.bounds;
  _reactChild.frame = _container.bounds;
  // Native-stack/tab wrappers can propagate the final axis/size classes after
  // the deprecated trait callback. Compare the traits actually used for layout
  // so an unchanged JS items array still rebuilds its horizontal presentation.
  NSString *edge = RNDuoVerticalBarEdgeName(self.traitCollection);
  UIUserInterfaceSizeClass horizontal = self.traitCollection.horizontalSizeClass;
  UIUserInterfaceSizeClass vertical = self.traitCollection.verticalSizeClass;
  if (![_configuredVerticalBarEdge isEqualToString:edge] ||
      _configuredHorizontalSizeClass != horizontal || _configuredVerticalSizeClass != vertical) {
    _configuredVerticalBarEdge = [edge copy];
    _configuredHorizontalSizeClass = horizontal;
    _configuredVerticalSizeClass = vertical;
    _configurationDirty = YES;
  }
  [self updateAttachment];
  [self layoutInlineToolbar];
  [self emitState];
}
- (void)didMoveToWindow
{
  [super didMoveToWindow];
  [self updateAttachment];
  [self setNeedsLayout];
}
- (void)safeAreaInsetsDidChange
{
  [super safeAreaInsetsDidChange];
  [self setNeedsLayout];
}
- (void)traitCollectionDidChange:(UITraitCollection *)previous
{
  [super traitCollectionDidChange:previous];
  if (![RNDuoVerticalBarEdgeName(previous) isEqual:RNDuoVerticalBarEdgeName(self.traitCollection)]) _configurationDirty = YES;
  [self setNeedsLayout];
}
- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index
{
  _reactChild = child;
  [_container addSubview:child];
  [self setNeedsLayout];
}
- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)child index:(NSInteger)index
{
  [child removeFromSuperview];
  if (_reactChild == child) _reactChild = nil;
}
- (void)prepareForRecycle
{
  [self releaseOwnership];
  _reactChild = nil;
  _itemsJSON = nil;
  _tint = nil;
  _compression = nil;
  _horizontalPresentation = @"navigator";
  _configurationDirty = NO;
  _configuredVerticalBarEdge = nil;
  _configuredHorizontalSizeClass = UIUserInterfaceSizeClassUnspecified;
  _configuredVerticalSizeClass = UIUserInterfaceSizeClassUnspecified;
  _visibilityConflictScreen = nil;
  _lastState = nil;
  _attachment = @"inactive";
  _active = NO;
  [super prepareForRecycle];
}
- (void)dealloc
{
  [self releaseOwnership];
}
@end
