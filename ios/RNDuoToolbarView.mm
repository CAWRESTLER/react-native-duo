#import "RNDuoToolbarView.h"
#import "RNDuoUtilities.h"

#import <React/RCTComponentViewProtocol.h>
#import <UIKit/UIBarButtonItemBadge.h>
#import <UIKit/UITab.h>

#import <react/renderer/components/ReactNativeDuoViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/EventEmitters.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/Props.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/RCTComponentViewHelpers.h>

#include <cmath>

using namespace facebook::react;

static UIEdgeInsets RNDuoValidatedBarInsets(UIEdgeInsets insets, CGRect bounds)
{
  CGFloat width = CGRectGetWidth(bounds);
  CGFloat height = CGRectGetHeight(bounds);
  if (width <= 0 || height <= 0) return UIEdgeInsetsZero;
  insets.top = std::isfinite(insets.top) ? MAX(0, MIN(insets.top, height)) : 0;
  insets.bottom = std::isfinite(insets.bottom) ? MAX(0, MIN(insets.bottom, height)) : 0;
  insets.left = std::isfinite(insets.left) ? MAX(0, MIN(insets.left, width)) : 0;
  insets.right = std::isfinite(insets.right) ? MAX(0, MIN(insets.right, width)) : 0;
  if (insets.top + insets.bottom >= height) insets.top = insets.bottom = 0;
  if (insets.left + insets.right >= width) insets.left = insets.right = 0;
  return insets;
}

@interface RNDuoToolbarContentController : UIViewController
@property (nonatomic) BOOL disablesVerticalBar;
@property (nonatomic, copy) NSString *duoIdentifier;
@end

@implementation RNDuoToolbarContentController
- (UIVerticalBarBehavior)preferredVerticalBarBehavior API_AVAILABLE(ios(27.1))
{
  return self.disablesVerticalBar ? UIVerticalBarBehaviorDisabled : UIVerticalBarBehaviorAutomatic;
}
@end

@interface RNDuoToolbarNavigationController : UINavigationController
@property (nonatomic) BOOL disablesVerticalBar;
@end

@implementation RNDuoToolbarNavigationController
- (UIVerticalBarBehavior)preferredVerticalBarBehavior API_AVAILABLE(ios(27.1))
{
  return self.disablesVerticalBar ? UIVerticalBarBehaviorDisabled : UIVerticalBarBehaviorAutomatic;
}
- (UIViewController *)childViewControllerForPreferredVerticalBarBehavior API_AVAILABLE(ios(27.1))
{
  // The package applies one preference consistently to the whole bar host.
  // Own it here instead of relying on forwarding through transient children.
  return nil;
}
@end

@interface RNDuoToolbarTabController : UITabBarController
@property (nonatomic) BOOL disablesVerticalBar;
@end

@implementation RNDuoToolbarTabController
- (UIVerticalBarBehavior)preferredVerticalBarBehavior API_AVAILABLE(ios(27.1))
{
  return self.disablesVerticalBar ? UIVerticalBarBehaviorDisabled : UIVerticalBarBehaviorAutomatic;
}
- (UIViewController *)childViewControllerForPreferredVerticalBarBehavior API_AVAILABLE(ios(27.1))
{
  return nil;
}
@end

@interface RNDuoToolbarView () <UITabBarControllerDelegate, UITabBarDelegate>
@end

@implementation RNDuoToolbarView {
  UIView *_containerView;
  RNDuoToolbarTabController *_tabBarController;
  UINavigationBar *_horizontalNavigationBar;
  UINavigationItem *_horizontalNavigationItem;
  UIToolbar *_horizontalToolbar;
  UITabBar *_horizontalTabBar;
  BOOL _usesHorizontalChrome;
  NSMutableDictionary<NSString *, RNDuoToolbarContentController *> *_contentControllers;
  NSMutableDictionary<NSString *, RNDuoToolbarNavigationController *> *_navigationControllers;
  NSMutableDictionary<NSString *, id> *_nativeTabs;
  NSArray<NSString *> *_tabIdentifiers;
  NSSet<NSString *> *_disabledTabIdentifiers;
  NSInteger _controlledSelectedTabIndex;
  UIView<RCTComponentViewProtocol> *_reactChild;
  __weak UIViewController *_hostController;
  NSArray *_items;
  NSString *_itemsJSON;
  NSString *_title;
  NSString *_barTintColor;
  NSString *_verticalBehavior;
  NSString *_compressionBehavior;
  BOOL _showsNavigationBar;
  NSString *_configuredVerticalBarEdge;
  UIUserInterfaceSizeClass _configuredHorizontalSizeClass;
  UIUserInterfaceSizeClass _configuredVerticalSizeClass;
  NSDictionary *_lastPayloadObject;
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
    _contentControllers = [NSMutableDictionary dictionary];
    _navigationControllers = [NSMutableDictionary dictionary];
    _nativeTabs = [NSMutableDictionary dictionary];
    _tabIdentifiers = @[];
    _disabledTabIdentifiers = [NSSet set];
    _controlledSelectedTabIndex = 0;
    _containerView = [[UIView alloc] init];
    _containerView.backgroundColor = UIColor.clearColor;
    _tabBarController = [[RNDuoToolbarTabController alloc] init];
    _tabBarController.delegate = self;
    _tabBarController.view.backgroundColor = UIColor.clearColor;
    // Keep the navigation controller inside its owning tab. UIKit coordinates
    // tab and toolbar compression through this standard container hierarchy;
    // an outer navigation controller has no tabBarController ancestor.
    [self applyTabs:@[]];
    [_containerView addSubview:_tabBarController.view];
    self.contentView = _containerView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newProps = *std::static_pointer_cast<RNDuoToolbarViewProps const>(props);
  NSString *itemsJSON = @(newProps.itemsJson.c_str());
  NSString *title = newProps.title.empty() ? @"" : @(newProps.title.c_str());
  NSString *barTintColor = newProps.barTintColor.empty() ? @"" : @(newProps.barTintColor.c_str());
  NSString *verticalBehavior = newProps.verticalBehavior.empty() ? @"automatic" : @(newProps.verticalBehavior.c_str());
  NSString *compressionBehavior = newProps.compressionBehavior.empty() ? @"automatic" : @(newProps.compressionBehavior.c_str());
  BOOL configurationChanged = ![_itemsJSON isEqualToString:itemsJSON] ||
      ![_title isEqualToString:title] || ![_barTintColor isEqualToString:barTintColor] ||
      ![_verticalBehavior isEqualToString:verticalBehavior] ||
      ![_compressionBehavior isEqualToString:compressionBehavior] ||
      _showsNavigationBar != newProps.showsNavigationBar;
  if (configurationChanged) {
    if (![_itemsJSON isEqualToString:itemsJSON]) _items = RNDuoParseArray(itemsJSON);
    _itemsJSON = [itemsJSON copy];
    _title = [title copy];
    _barTintColor = [barTintColor copy];
    _verticalBehavior = [verticalBehavior copy];
    _compressionBehavior = [compressionBehavior copy];
    _showsNavigationBar = newProps.showsNavigationBar;
    _containerView.tintColor = barTintColor.length
        ? RNDuoColor(barTintColor, UIColor.systemBlueColor) : nil;
  }
  // Fabric may update event handlers or content styles while a native menu is
  // presented. Those updates still belong to the superclass, but must not
  // replace the UIBarButtonItem that owns the live menu presentation.
  [super updateProps:props oldProps:oldProps];
  if (configurationChanged) [self applyToolbarConfiguration];
  else {
    [self setNeedsLayout];
    [self emitStateIfNeeded];
  }
}

- (void)applyToolbarConfiguration
{
  _configuredVerticalBarEdge = [RNDuoVerticalBarEdgeName(self.traitCollection) copy];
  _configuredHorizontalSizeClass = self.traitCollection.horizontalSizeClass;
  _configuredVerticalSizeClass = self.traitCollection.verticalSizeClass;
  _tabBarController.disablesVerticalBar = [_verticalBehavior isEqualToString:@"disabled"];
  BOOL usesHorizontalChrome = NO;
  if (@available(iOS 27.1, *)) usesHorizontalChrome = _tabBarController.disablesVerticalBar;
  [self setUsesHorizontalChrome:usesHorizontalChrome];
  NSMutableArray<NSDictionary *> *tabItems = [NSMutableArray array];
  for (NSDictionary *item in _items) {
    if (![item isKindOfClass:[NSDictionary class]]) continue;
    NSString *placement = [item[@"placement"] isKindOfClass:[NSString class]] ? item[@"placement"] : @"bottomBar";
    if ([placement isEqualToString:@"tab"]) [tabItems addObject:item];
  }

  [self applyTabs:tabItems];
  if (_usesHorizontalChrome) {
    RNDuoToolbarContentController *contentController = [self selectedContentController];
    [self applyToolbarItemsToContentController:contentController
                         navigationController:_navigationControllers[contentController.duoIdentifier]];
  } else {
    for (NSString *identifier in _contentControllers) {
      [self applyToolbarItemsToContentController:_contentControllers[identifier]
                           navigationController:_navigationControllers[identifier]];
    }
  }
  if (@available(iOS 27.1, *)) {
    [_tabBarController setNeedsUpdateOfVerticalBarConfiguration];
    [_hostController setNeedsUpdateOfVerticalBarConfiguration];
    [self.window.rootViewController setNeedsUpdateOfVerticalBarConfiguration];
  }
  if (_usesHorizontalChrome) [self layoutHorizontalChrome];
  [self moveReactChildToSelectedController];
  [self setNeedsLayout];
  [self emitStateIfNeeded];
}

- (RNDuoToolbarContentController *)contentControllerForIdentifier:(NSString *)identifier
{
  RNDuoToolbarContentController *contentController = _contentControllers[identifier];
  if (contentController) return contentController;

  contentController = [[RNDuoToolbarContentController alloc] init];
  contentController.duoIdentifier = identifier;
  contentController.view.backgroundColor = UIColor.clearColor;
  RNDuoToolbarNavigationController *navigationController = [[RNDuoToolbarNavigationController alloc] initWithRootViewController:contentController];
  navigationController.view.backgroundColor = UIColor.clearColor;
  _contentControllers[identifier] = contentController;
  _navigationControllers[identifier] = navigationController;
  return contentController;
}

- (void)setUsesHorizontalChrome:(BOOL)usesHorizontalChrome
{
  if (_usesHorizontalChrome == usesHorizontalChrome) return;
  _usesHorizontalChrome = usesHorizontalChrome;
  if (usesHorizontalChrome) {
    // The RN host may not forward window-wide bar preferences through its
    // custom controller. Detach adaptive controllers instead of claiming
    // their ignored preference changed the axis. These are real, standalone
    // UIKit bars; only their local controls are opted out. The app host still
    // owns the status-bar policy.
    if (_tabBarController.parentViewController) {
      [_tabBarController willMoveToParentViewController:nil];
      [_tabBarController.view removeFromSuperview];
      [_tabBarController removeFromParentViewController];
      _hostController = nil;
    } else {
      [_tabBarController.view removeFromSuperview];
    }
    if (!_horizontalNavigationBar) {
      _horizontalNavigationBar = [[UINavigationBar alloc] init];
      _horizontalNavigationBar.translucent = YES;
      _horizontalNavigationItem = [[UINavigationItem alloc] init];
      _horizontalToolbar = [[UIToolbar alloc] init];
      _horizontalToolbar.translucent = YES;
      _horizontalTabBar = [[UITabBar alloc] init];
      _horizontalTabBar.translucent = YES;
      _horizontalTabBar.delegate = self;
    }
    [_containerView addSubview:_horizontalNavigationBar];
    [_containerView addSubview:_horizontalToolbar];
    [_containerView addSubview:_horizontalTabBar];
  } else {
    [_horizontalNavigationBar removeFromSuperview];
    [_horizontalToolbar removeFromSuperview];
    [_horizontalTabBar removeFromSuperview];
    [_containerView addSubview:_tabBarController.view];
    [self updateAdaptiveControllerHosting];
  }
}

- (void)updateAdaptiveControllerHosting
{
  if (_usesHorizontalChrome || !self.window) {
    if (_tabBarController.parentViewController) {
      [_tabBarController willMoveToParentViewController:nil];
      [_tabBarController removeFromParentViewController];
      _hostController = nil;
    }
    return;
  }
  if (!_tabBarController.parentViewController) {
    UIViewController *host = RNDuoFindViewController(self);
    if (host && host != _tabBarController) {
      _hostController = host;
      [host addChildViewController:_tabBarController];
      if (_tabBarController.view.superview != _containerView) [_containerView addSubview:_tabBarController.view];
      [_tabBarController didMoveToParentViewController:host];
    }
  }
}

- (void)applyTabs:(NSArray<NSDictionary *> *)tabItems
{
  NSMutableArray<UINavigationController *> *viewControllers = [NSMutableArray array];
  NSMutableArray *nativeTabs = [NSMutableArray array];
  NSMutableArray<UITabBarItem *> *horizontalTabItems = [NSMutableArray array];
  NSMutableArray<NSString *> *identifiers = [NSMutableArray array];
  NSMutableSet<NSString *> *disabledIdentifiers = [NSMutableSet set];
  NSInteger selectedIndex = NSNotFound;

  NSArray<NSDictionary *> *destinations = tabItems.count
      ? tabItems
      : @[ @{ @"id": @"__content", @"title": @"" } ];
  for (NSDictionary *item in destinations) {
      NSString *identifier = [item[@"id"] isKindOfClass:[NSString class]] ? item[@"id"] : @"tab";
      NSString *title = [item[@"title"] isKindOfClass:[NSString class]] ? item[@"title"] : identifier;
      NSString *symbol = [item[@"systemImage"] isKindOfClass:[NSString class]] ? item[@"systemImage"] : nil;
      UIImage *image = symbol.length ? [UIImage systemImageNamed:symbol] : nil;
      [self contentControllerForIdentifier:identifier];
      UINavigationController *navigationController = _navigationControllers[identifier];
      UITabBarItem *tabBarItem = [[UITabBarItem alloc] initWithTitle:title image:image selectedImage:image];
      id badge = item[@"badge"];
      if ([badge isKindOfClass:[NSString class]]) {
        tabBarItem.badgeValue = badge;
      } else if ([badge isKindOfClass:[NSNumber class]]) {
        tabBarItem.badgeValue = [(NSNumber *)badge stringValue];
      }
      navigationController.tabBarItem = tabBarItem;
      if (_usesHorizontalChrome && tabItems.count) {
        UITabBarItem *horizontalItem = [[UITabBarItem alloc] initWithTitle:title image:image selectedImage:image];
        horizontalItem.badgeValue = tabBarItem.badgeValue;
        horizontalItem.enabled = ![item[@"disabled"] boolValue];
        horizontalItem.tag = horizontalTabItems.count;
        [horizontalTabItems addObject:horizontalItem];
      }
      [viewControllers addObject:navigationController];
      if (tabItems.count) [identifiers addObject:identifier];
      if ([item[@"disabled"] boolValue]) [disabledIdentifiers addObject:identifier];
      if ([item[@"selected"] boolValue]) selectedIndex = viewControllers.count - 1;

      if (@available(iOS 18.0, *)) {
        UITab *tab = _nativeTabs[identifier];
        if (!tab) {
          tab = [[UITab alloc] initWithTitle:title image:image identifier:identifier
                    viewControllerProvider:^UIViewController *(__kindof UITab *requestedTab) {
            return navigationController;
          }];
          _nativeTabs[identifier] = tab;
        }
        tab.title = title;
        tab.image = image;
        tab.badgeValue = tabBarItem.badgeValue;
        if (@available(iOS 18.4, *)) tab.enabled = ![item[@"disabled"] boolValue];
        [nativeTabs addObject:tab];
      }
    }

  _tabIdentifiers = identifiers;
  _disabledTabIdentifiers = disabledIdentifiers;
  if (@available(iOS 18.0, *)) {
    // Do not mix modern tabs with the legacy viewControllers selection API.
    // Native TabView uses these tab objects as well, including its badges and
    // the combined vertical bar's tab compression behavior.
    _tabBarController.mode = UITabBarControllerModeTabBar;
    if (![_tabBarController.tabs isEqualToArray:nativeTabs]) {
      [_tabBarController setTabs:nativeTabs animated:NO];
    }
  } else if (![_tabBarController.viewControllers isEqualToArray:viewControllers]) {
    [_tabBarController setViewControllers:viewControllers animated:NO];
  }
  BOOL hidesTabBar = tabItems.count == 0;
  if (@available(iOS 18.0, *)) {
    [_tabBarController setTabBarHidden:hidesTabBar animated:NO];
  } else {
    _tabBarController.tabBar.hidden = hidesTabBar;
  }

  if (selectedIndex == NSNotFound && _controlledSelectedTabIndex < (NSInteger)viewControllers.count) {
    selectedIndex = _controlledSelectedTabIndex;
  }
  if (selectedIndex == NSNotFound || selectedIndex >= (NSInteger)viewControllers.count) selectedIndex = 0;
  _controlledSelectedTabIndex = selectedIndex;
  if (viewControllers.count > 0) {
    if (@available(iOS 18.0, *)) {
      _tabBarController.selectedTab = nativeTabs[selectedIndex];
    } else {
      _tabBarController.selectedIndex = selectedIndex;
    }
  }
  if (_usesHorizontalChrome) {
    _horizontalTabBar.items = horizontalTabItems;
    _horizontalTabBar.hidden = horizontalTabItems.count == 0;
    _horizontalTabBar.selectedItem = selectedIndex < (NSInteger)horizontalTabItems.count
        ? horizontalTabItems[selectedIndex] : nil;
  }

  NSSet<NSString *> *activeIdentifiers = tabItems.count == 0
      ? [NSSet setWithObject:@"__content"]
      : [NSSet setWithArray:_tabIdentifiers];
  for (NSString *identifier in [_contentControllers.allKeys copy]) {
    if (![activeIdentifiers containsObject:identifier]) {
      [_contentControllers removeObjectForKey:identifier];
      [_navigationControllers removeObjectForKey:identifier];
      [_nativeTabs removeObjectForKey:identifier];
    }
  }
}

- (void)applyToolbarItemsToContentController:(RNDuoToolbarContentController *)contentController
                         navigationController:(RNDuoToolbarNavigationController *)navigationController
{
  BOOL disablesVerticalBar = [_verticalBehavior isEqualToString:@"disabled"];
  contentController.disablesVerticalBar = disablesVerticalBar;
  navigationController.disablesVerticalBar = disablesVerticalBar;
  UINavigationItem *navigationItem = _usesHorizontalChrome ? _horizontalNavigationItem : contentController.navigationItem;
  navigationItem.title = _title;
  if (!_usesHorizontalChrome) [navigationController setNavigationBarHidden:!_showsNavigationBar animated:NO];
  NSMutableArray<UIBarButtonItem *> *leadingItems = [NSMutableArray array];
  NSMutableArray<UIBarButtonItem *> *pinnedItems = [NSMutableArray array];
  NSMutableArray<UIBarButtonItem *> *barItems = [NSMutableArray array];
  NSMutableArray<UIMenuElement *> *overflowItems = [NSMutableArray array];
  NSString *edge = RNDuoVerticalBarEdgeName(self.traitCollection);
  BOOL isVertical = ![_verticalBehavior isEqualToString:@"disabled"] &&
      ([edge isEqualToString:@"leading"] || [edge isEqualToString:@"trailing"]);
  // UIKit's pinned navigation groups cannot overflow. With tabs on the same
  // vertical edge, keep every app action in the native toolbar's coordinated
  // compression set so Automatic/PreferTabBar can preserve navigation. This
  // affects only the vertical-with-tabs case: horizontal and toolbar-only
  // screens keep their native leading/pinned navigation placements.
  BOOL sharesVerticalTabRail = isVertical && _tabIdentifiers.count > 0;
  for (NSDictionary *item in _items) {
    if (![item isKindOfClass:[NSDictionary class]]) continue;
    NSString *placement = [item[@"placement"] isKindOfClass:[NSString class]] ? item[@"placement"] : @"bottomBar";
    if ([placement isEqualToString:@"tab"]) continue;
    // A text-only horizontal action must not leave a floating horizontal
    // toolbar under content while the native bar is on the vertical axis.
    NSString *axis = [item[@"axisBehavior"] isKindOfClass:[NSString class]] ? item[@"axisBehavior"] : @"automatic";
    if (isVertical && [axis isEqualToString:@"horizontalOnly"]) continue;
    if ([placement isEqualToString:@"overflow"] && _showsNavigationBar && !sharesVerticalTabRail) {
      if (@available(iOS 16.0, *)) {
        [overflowItems addObjectsFromArray:[self menuActionsForItem:item]];
        continue;
      }
    }
    UIBarButtonItem *button = [self barButtonItemForItem:item];
    if (sharesVerticalTabRail) {
      [barItems addObject:button];
    } else if ([placement isEqualToString:@"cancellationAction"]) {
      [leadingItems addObject:button];
    } else if ([placement isEqualToString:@"pinnedTrailing"]) {
      [pinnedItems addObject:button];
    } else {
      [barItems addObject:button];
    }
  }

  navigationItem.leftBarButtonItems = leadingItems;
  navigationItem.rightBarButtonItems = nil;
  if (@available(iOS 16.0, *)) {
    navigationItem.pinnedTrailingGroup = pinnedItems.count
        ? [[UIBarButtonItemGroup alloc] initWithBarButtonItems:pinnedItems representativeItem:nil]
        : nil;
    navigationItem.additionalOverflowItems = overflowItems.count
        ? [UIDeferredMenuElement elementWithUncachedProvider:^(void (^completion)(NSArray<UIMenuElement *> *)) {
            completion(overflowItems);
          }]
        : nil;
  } else {
    navigationItem.rightBarButtonItems = pinnedItems;
  }
  if (_usesHorizontalChrome) {
    _horizontalNavigationBar.items = @[ navigationItem ];
    _horizontalNavigationBar.hidden = !_showsNavigationBar;
    _horizontalToolbar.items = barItems;
    _horizontalToolbar.hidden = barItems.count == 0;
  } else {
    contentController.toolbarItems = barItems;
    [navigationController setToolbarHidden:barItems.count == 0 animated:NO];
  }

  if (@available(iOS 27.1, *)) {
    if ([_compressionBehavior isEqualToString:@"preferBarItems"]) {
      navigationItem.verticalBarCompressionBehavior = UIVerticalBarCompressionBehaviorPrefersBarItems;
    } else if ([_compressionBehavior isEqualToString:@"preferTabBar"]) {
      navigationItem.verticalBarCompressionBehavior = UIVerticalBarCompressionBehaviorPrefersTabBar;
    } else {
      navigationItem.verticalBarCompressionBehavior = UIVerticalBarCompressionBehaviorAutomatic;
    }
    [contentController setNeedsUpdateOfVerticalBarConfiguration];
    [navigationController setNeedsUpdateOfVerticalBarConfiguration];
  }
}

- (NSArray<UIMenuElement *> *)menuActionsForItem:(NSDictionary *)item
{
  __weak __typeof(self) weakSelf = self;
  NSArray *menuItems = [item[@"menuItems"] isKindOfClass:[NSArray class]] ? item[@"menuItems"] : @[];
  NSMutableArray<UIMenuElement *> *actions = [NSMutableArray array];
  for (NSDictionary *menuItem in menuItems) {
    if (![menuItem isKindOfClass:[NSDictionary class]]) continue;
    NSString *identifier = [menuItem[@"id"] isKindOfClass:[NSString class]] ? menuItem[@"id"] : @"menuItem";
    NSString *title = [menuItem[@"title"] isKindOfClass:[NSString class]] ? menuItem[@"title"] : identifier;
    NSString *symbol = [menuItem[@"systemImage"] isKindOfClass:[NSString class]] ? menuItem[@"systemImage"] : nil;
    UIImage *image = symbol.length ? [UIImage systemImageNamed:symbol] : nil;
    UIAction *action = [UIAction actionWithTitle:title image:image identifier:nil handler:^(__kindof UIAction *action) {
      [weakSelf emitItemPress:identifier];
    }];
    action.attributes = [item[@"disabled"] boolValue] || [menuItem[@"disabled"] boolValue]
        ? UIMenuElementAttributesDisabled : 0;
    [actions addObject:action];
  }
  return actions;
}

- (UIBarButtonItem *)barButtonItemForItem:(NSDictionary *)item
{
  __weak __typeof(self) weakSelf = self;
  NSString *identifier = [item[@"id"] isKindOfClass:[NSString class]] ? item[@"id"] : @"item";
  NSString *title = [item[@"title"] isKindOfClass:[NSString class]] ? item[@"title"] : identifier;
  NSString *symbol = [item[@"systemImage"] isKindOfClass:[NSString class]] ? item[@"systemImage"] : nil;
  if (@available(iOS 27.1, *)) {
    NSString *edge = RNDuoVerticalBarEdgeName(self.traitCollection);
    if (![_verticalBehavior isEqualToString:@"disabled"] &&
        ([edge isEqualToString:@"leading"] || [edge isEqualToString:@"trailing"]) &&
        [item[@"verticalSystemImage"] isKindOfClass:[NSString class]]) {
      symbol = item[@"verticalSystemImage"];
    }
  }
  UIImage *image = symbol.length ? [UIImage systemImageNamed:symbol] : nil;
  NSString *placement = [item[@"placement"] isKindOfClass:[NSString class]] ? item[@"placement"] : @"bottomBar";
  UIBarButtonItem *button;

  NSArray *menuItems = [item[@"menuItems"] isKindOfClass:[NSArray class]] ? item[@"menuItems"] : @[];
  if ([placement isEqualToString:@"overflow"] && menuItems.count > 0) {
    UIMenu *menu = [UIMenu menuWithTitle:@"" children:[self menuActionsForItem:item]];
    UIImage *overflowImage = image ?: [UIImage systemImageNamed:@"ellipsis.circle"];
    button = [[UIBarButtonItem alloc] initWithImage:overflowImage menu:menu];
    button.accessibilityLabel = title;
  } else {
    UIAction *action = [UIAction actionWithTitle:title image:image identifier:nil handler:^(__kindof UIAction *action) {
      [weakSelf emitItemPress:identifier];
    }];
    button = [[UIBarButtonItem alloc] initWithPrimaryAction:action];
  }

  button.enabled = ![item[@"disabled"] boolValue];
  if (@available(iOS 15.0, *)) button.selected = [item[@"selected"] boolValue];
  if (@available(iOS 26.0, *)) {
    id badgeValue = item[@"badge"];
    if ([badgeValue isKindOfClass:[NSNumber class]]) {
      button.badge = [UIBarButtonItemBadge badgeWithCount:[(NSNumber *)badgeValue unsignedIntegerValue]];
    } else if ([badgeValue isKindOfClass:[NSString class]]) {
      button.badge = [(NSString *)badgeValue length]
          ? [UIBarButtonItemBadge badgeWithString:badgeValue]
          : [UIBarButtonItemBadge indicatorBadge];
    }
  }
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
  return button;
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  [self updateAdaptiveControllerHosting];
  if (@available(iOS 27.1, *)) {
    if (self.window) {
      [_tabBarController setNeedsUpdateOfVerticalBarConfiguration];
      [_hostController setNeedsUpdateOfVerticalBarConfiguration];
      [self.window.rootViewController setNeedsUpdateOfVerticalBarConfiguration];
    }
  }
  dispatch_async(dispatch_get_main_queue(), ^{ [self emitStateIfNeeded]; });
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  _reactChild = childComponentView;
  [self moveReactChildToSelectedController];
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
  _containerView.frame = self.bounds;
  if (_usesHorizontalChrome) {
    [self layoutHorizontalChrome];
  } else {
    _tabBarController.view.frame = _containerView.bounds;
    [_tabBarController.view layoutIfNeeded];
  }
  [self layoutReactChild];
  [self emitStateIfNeeded];
}

- (void)safeAreaInsetsDidChange
{
  [super safeAreaInsetsDidChange];
  // A status-bar/camera change need not change the preferred bar edge or the
  // host bounds. Refresh the reported insets after UIKit's next layout pass.
  [self setNeedsLayout];
}

- (void)traitCollectionDidChange:(UITraitCollection *)previousTraitCollection
{
  [super traitCollectionDidChange:previousTraitCollection];
  NSString *edge = RNDuoVerticalBarEdgeName(self.traitCollection);
  BOOL barConfigurationChanged = ![_configuredVerticalBarEdge isEqualToString:edge] ||
      _configuredHorizontalSizeClass != self.traitCollection.horizontalSizeClass ||
      _configuredVerticalSizeClass != self.traitCollection.verticalSizeClass;
  // Menu/popover presentation can change unrelated traits (appearance,
  // activity, elevation). UIKit updates those automatically; rebuilding its
  // menu's source item here would dismiss the menu before it can be used.
  if (barConfigurationChanged) [self applyToolbarConfiguration];
  [self setNeedsLayout];
  [self emitStateIfNeeded];
}

- (RNDuoToolbarContentController *)selectedContentController
{
  UIViewController *contentController = [self selectedNavigationController].topViewController;
  return [contentController isKindOfClass:[RNDuoToolbarContentController class]]
      ? (RNDuoToolbarContentController *)contentController
      : nil;
}

- (UINavigationController *)selectedNavigationController
{
  UIViewController *selectedController;
  if (@available(iOS 18.0, *)) {
    selectedController = _tabBarController.selectedTab.viewController;
  } else {
    selectedController = _tabBarController.selectedViewController;
  }
  return [selectedController isKindOfClass:[UINavigationController class]]
      ? (UINavigationController *)selectedController : nil;
}

- (void)moveReactChildToSelectedController
{
  if (!_reactChild) return;
  // Fabric component views cannot be safely reparented between UIKit view
  // controllers. Keep React on one stable layer behind the tab controller's
  // native navigation, toolbar, and tab chrome.
  if (_reactChild.superview != _containerView) {
    [_reactChild removeFromSuperview];
    [_containerView insertSubview:_reactChild atIndex:0];
  }
  [_containerView sendSubviewToBack:_reactChild];
  [self layoutReactChild];
  __weak __typeof(self) weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{
    [weakSelf setNeedsLayout];
    [weakSelf layoutIfNeeded];
  });
}

- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event
{
  if (self.hidden || self.alpha < 0.01 || !self.userInteractionEnabled) return nil;
  // Preserve the directly sized React child's existing hit-test path before
  // inspecting UIKit's overlaid chrome.
  UIView *reactHit = nil;
  if (_reactChild && !_reactChild.hidden && _reactChild.userInteractionEnabled) {
    // Fabric's layout bounds can lag behind the native host during folding.
    // Always try the directly sized React child, even when super returns nil.
    CGPoint childPoint = [_reactChild convertPoint:point fromView:self];
    reactHit = [_reactChild hitTest:childPoint withEvent:event];
  }
  UIView *nativeHit = [super hitTest:point withEvent:event];
  if (!_reactChild || ![nativeHit isDescendantOfView:_reactChild]) {
    // React deliberately occupies the whole host, including the area behind
    // floating bars. Give real native controls first refusal so edge-to-edge
    // content cannot steal tab, toolbar, navigation, or overflow-menu taps.
    // Do not give clear controller/transition surfaces the same priority:
    // they cover the entire host and otherwise prevent React from scrolling.
    for (UIView *candidate = nativeHit; candidate && candidate != _containerView;
         candidate = candidate.superview) {
      if ([candidate isKindOfClass:[UIControl class]] ||
          (candidate.isAccessibilityElement &&
           (candidate.accessibilityTraits & UIAccessibilityTraitButton) != 0)) {
        return nativeHit;
      }
    }
  }
  return reactHit ?: nativeHit;
}

- (void)layoutReactChild
{
  if (!_reactChild) return;
  CGRect bounds = _containerView.bounds;
  _reactChild.frame = CGRectMake(0, 0, CGRectGetWidth(bounds), CGRectGetHeight(bounds));
}

- (void)layoutHorizontalChrome
{
  CGRect bounds = _containerView.bounds;
  UIEdgeInsets safe = _containerView.safeAreaInsets;
  CGFloat width = MAX(0, CGRectGetWidth(bounds) - safe.left - safe.right);
  CGFloat top = CGRectGetMinY(bounds) + safe.top;
  CGFloat bottom = CGRectGetMaxY(bounds) - safe.bottom;
  if (!_horizontalNavigationBar.hidden) {
    CGFloat height = [_horizontalNavigationBar sizeThatFits:CGSizeMake(width, CGRectGetHeight(bounds))].height;
    _horizontalNavigationBar.frame = CGRectMake(safe.left, top, width, height);
    [_horizontalNavigationBar layoutIfNeeded];
  }
  if (!_horizontalTabBar.hidden) {
    CGFloat height = [_horizontalTabBar sizeThatFits:CGSizeMake(width, CGRectGetHeight(bounds))].height;
    _horizontalTabBar.frame = CGRectMake(safe.left, bottom - height, width, height);
    [_horizontalTabBar layoutIfNeeded];
    bottom -= height;
  }
  if (!_horizontalToolbar.hidden) {
    CGFloat height = [_horizontalToolbar sizeThatFits:CGSizeMake(width, CGRectGetHeight(bounds))].height;
    _horizontalToolbar.frame = CGRectMake(safe.left, bottom - height, width, height);
    [_horizontalToolbar layoutIfNeeded];
  }
}

- (UIEdgeInsets)resolvedContentInsets
{
  if (_usesHorizontalChrome) {
    // Measure the UIKit views we actually display, not the detached adaptive
    // controller's guides or the window's still-preferred vertical edge.
    CGRect bounds = _containerView.bounds;
    UIEdgeInsets insets = _containerView.safeAreaInsets;
    if (!_horizontalNavigationBar.hidden) {
      insets.top = MAX(insets.top, CGRectGetMaxY(_horizontalNavigationBar.frame) - CGRectGetMinY(bounds));
    }
    if (!_horizontalTabBar.hidden) {
      insets.bottom = MAX(insets.bottom, CGRectGetMaxY(bounds) - CGRectGetMinY(_horizontalTabBar.frame));
    }
    if (!_horizontalToolbar.hidden) {
      insets.bottom = MAX(insets.bottom, CGRectGetMaxY(bounds) - CGRectGetMinY(_horizontalToolbar.frame));
    }
    return RNDuoValidatedBarInsets(insets, bounds);
  }
  RNDuoToolbarContentController *contentController = [self selectedContentController];
  if (!contentController) return RNDuoValidatedBarInsets(_containerView.safeAreaInsets, _containerView.bounds);
  [contentController.view layoutIfNeeded];
  NSString *edge = RNDuoVerticalBarEdgeName(contentController.traitCollection);
  BOOL isVertical = ![_verticalBehavior isEqualToString:@"disabled"] &&
      ([edge isEqualToString:@"leading"] || [edge isEqualToString:@"trailing"]);
  if (!isVertical) edge = @"unspecified";
  UIView *rootView = _tabBarController.view;
  CGRect bounds = rootView.bounds;
  if (CGRectIsEmpty(bounds) || CGRectIsNull(bounds)) return UIEdgeInsetsZero;
  // This stable sibling layer inherits the host's system safe area without
  // the child tab/navigation controller's additional app-bar contributions.
  // Never zero it just because an app toolbar happens to be absent.
  UIEdgeInsets systemInsets = RNDuoValidatedBarInsets(_containerView.safeAreaInsets, bounds);
  UINavigationController *navigationController = [self selectedNavigationController];
  BOOL hasNavigationBar = navigationController && !navigationController.navigationBarHidden;
  BOOL hasToolbar = navigationController && !navigationController.toolbarHidden &&
      contentController.toolbarItems.count > 0;
  BOOL hasTabBar = _tabIdentifiers.count > 0;
  BOOL hasAppChrome = hasNavigationBar || hasToolbar || hasTabBar;
  // verticalBarEdge describes a preferred edge even if no app bar is visible.
  // In particular, items=[] plus showsNavigationBar=false must not reserve an
  // invented 84-point app rail. Camera/status/home-indicator protection remains.
  if (!hasAppChrome) return systemInsets;
  CGRect safeFrame = contentController.view.safeAreaLayoutGuide.layoutFrame;
  CGRect unobscuredFrame = [contentController.view convertRect:safeFrame toView:rootView];
  unobscuredFrame = CGRectIntersection(bounds, unobscuredFrame);
  if (CGRectIsNull(unobscuredFrame) || CGRectIsEmpty(unobscuredFrame)) {
    unobscuredFrame = bounds;
  }
  if (@available(iOS 26.0, *)) {
    if (!isVertical) {
      CGRect tabFrame = [_tabBarController.view convertRect:_tabBarController.contentLayoutGuide.layoutFrame toView:rootView];
      CGRect intersection = CGRectIntersection(unobscuredFrame, tabFrame);
      if (!CGRectIsNull(intersection) && !CGRectIsEmpty(intersection)) unobscuredFrame = intersection;
    }
  }

  UIEdgeInsets insets = UIEdgeInsetsMake(
      MAX(0, CGRectGetMinY(unobscuredFrame) - CGRectGetMinY(bounds)),
      MAX(0, CGRectGetMinX(unobscuredFrame) - CGRectGetMinX(bounds)),
      MAX(0, CGRectGetMaxY(bounds) - CGRectGetMaxY(unobscuredFrame)),
      MAX(0, CGRectGetMaxX(bounds) - CGRectGetMaxX(unobscuredFrame)));

  // UIKit can retain the previous horizontal bar's safe-area contribution
  // during open/book transitions. In vertical mode start from the stable host
  // system insets, then add only the current app chrome below.
  if (isVertical) insets = systemInsets;
  else {
    insets.top = MAX(insets.top, systemInsets.top);
    insets.left = MAX(insets.left, systemInsets.left);
    insets.bottom = MAX(insets.bottom, systemInsets.bottom);
    insets.right = MAX(insets.right, systemInsets.right);
  }

  if (hasNavigationBar) {
    CGRect navigationFrame = [navigationController.view convertRect:navigationController.navigationBar.frame
                                                               toView:rootView];
    BOOL horizontalNavigationFrame = CGRectGetWidth(navigationFrame) > CGRectGetHeight(navigationFrame) &&
        CGRectGetHeight(navigationFrame) <= MAX(88.0, CGRectGetHeight(bounds) * 0.35) &&
        CGRectGetMinY(navigationFrame) < CGRectGetMidY(bounds) &&
        CGRectIntersectsRect(bounds, navigationFrame);
    if (horizontalNavigationFrame) {
      insets.top = MAX(insets.top, CGRectGetMaxY(navigationFrame) - CGRectGetMinY(bounds));
    }
  }
  // A vertical arrangement keeps the horizontal toolbar object alive, but its
  // transition frame does not describe an obscured bottom region.
  if (hasToolbar && !isVertical) {
    CGRect toolbarFrame = [navigationController.view convertRect:navigationController.toolbar.frame
                                                            toView:rootView];
    BOOL horizontalToolbarFrame = CGRectGetWidth(toolbarFrame) > CGRectGetHeight(toolbarFrame) &&
        CGRectGetHeight(toolbarFrame) <= MAX(88.0, CGRectGetHeight(bounds) * 0.35) &&
        CGRectGetMinY(toolbarFrame) > CGRectGetMidY(bounds) &&
        CGRectIntersectsRect(bounds, toolbarFrame);
    if (horizontalToolbarFrame) {
      insets.bottom = MAX(insets.bottom, CGRectGetMaxY(bounds) - CGRectGetMinY(toolbarFrame));
    }
  }

  // The combined bar can settle after the content controller's safe-area pass.
  // Keep the established header fallback while its navigation bar is visible.
  if (hasNavigationBar && isVertical) {
    insets.top = MAX(insets.top, 80.0);
  }
  if (isVertical) {
    BOOL leading = [edge isEqualToString:@"leading"];
    CGFloat systemClearance = leading ? systemInsets.left : systemInsets.right;
    CGFloat railClearance = 84.0;
    if (@available(iOS 26.0, *)) {
      // Prefer UIKit's actual unobscured content guide when it describes the
      // current vertical edge. Reject stale horizontal/oversized guides rather
      // than allowing a pose transition to collapse the React content width.
      CGRect guide = [rootView convertRect:_tabBarController.contentLayoutGuide.layoutFrame toView:rootView];
      CGRect clippedGuide = CGRectIntersection(bounds, guide);
      CGFloat clearance = leading
          ? CGRectGetMinX(clippedGuide) - CGRectGetMinX(bounds)
          : CGRectGetMaxX(bounds) - CGRectGetMaxX(clippedGuide);
      CGFloat oppositeClearance = leading
          ? CGRectGetMaxX(bounds) - CGRectGetMaxX(clippedGuide)
          : CGRectGetMinX(clippedGuide) - CGRectGetMinX(bounds);
      CGFloat systemOpposite = leading ? systemInsets.right : systemInsets.left;
      BOOL usableGuide = !CGRectIsNull(clippedGuide) && !CGRectIsEmpty(clippedGuide) &&
          std::isfinite(clearance) && std::isfinite(oppositeClearance) &&
          CGRectGetWidth(clippedGuide) >= CGRectGetWidth(bounds) * 0.5 &&
          CGRectGetHeight(clippedGuide) >= CGRectGetHeight(bounds) * 0.5 &&
          clearance > systemClearance + 0.5 &&
          clearance <= MAX(160.0, CGRectGetWidth(bounds) * 0.25) &&
          oppositeClearance <= MAX(16.0, systemOpposite + 8.0);
      if (usableGuide) railClearance = clearance;
    }
    if (leading) insets.left = MAX(systemInsets.left, railClearance);
    else insets.right = MAX(systemInsets.right, railClearance);
  }
  // UIKit can temporarily report the old axis's content guides during a bar
  // transition. Never send a negative/empty React content rectangle: reject
  // stale aggregates and let the next settled layout supply the real insets.
  return RNDuoValidatedBarInsets(insets, bounds);
}

- (void)tabBar:(UITabBar *)tabBar didSelectItem:(UITabBarItem *)item
{
  if (tabBar != _horizontalTabBar || item.tag < 0 || item.tag >= (NSInteger)_tabIdentifiers.count) return;
  NSString *identifier = _tabIdentifiers[item.tag];
  if ([_disabledTabIdentifiers containsObject:identifier]) return;
  _controlledSelectedTabIndex = item.tag;
  if (@available(iOS 18.0, *)) _tabBarController.selectedTab = _nativeTabs[identifier];
  [self emitItemPress:identifier];
}

- (BOOL)tabBarController:(UITabBarController *)tabBarController
    shouldSelectViewController:(UIViewController *)viewController
{
  NSUInteger index = [tabBarController.viewControllers indexOfObject:viewController];
  if (index == NSNotFound || index >= _tabIdentifiers.count) return YES;
  NSString *identifier = _tabIdentifiers[index];
  if ([_disabledTabIdentifiers containsObject:identifier]) return NO;
  _controlledSelectedTabIndex = index;
  [self emitItemPress:identifier];
  return YES;
}

- (BOOL)tabBarController:(UITabBarController *)tabBarController shouldSelectTab:(UITab *)tab API_AVAILABLE(ios(18.0))
{
  NSUInteger index = [_tabIdentifiers indexOfObject:tab.identifier];
  if (index == NSNotFound) return YES;
  if ([_disabledTabIdentifiers containsObject:tab.identifier]) return NO;
  _controlledSelectedTabIndex = index;
  [self emitItemPress:tab.identifier];
  return YES;
}

- (void)tabBarController:(UITabBarController *)tabBarController
           didSelectTab:(UITab *)selectedTab
            previousTab:(UITab *)previousTab API_AVAILABLE(ios(18.0))
{
  NSUInteger index = [_tabIdentifiers indexOfObject:selectedTab.identifier];
  if (index != NSNotFound) _controlledSelectedTabIndex = index;
  [self moveReactChildToSelectedController];
  [self emitStateIfNeeded];
}

- (void)tabBarController:(UITabBarController *)tabBarController
 didSelectViewController:(UIViewController *)viewController
{
  [self moveReactChildToSelectedController];
  NSUInteger index = [tabBarController.viewControllers indexOfObject:viewController];
  if (index != NSNotFound) _controlledSelectedTabIndex = index;
  [self emitStateIfNeeded];
  __weak __typeof(self) weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{
    [weakSelf moveReactChildToSelectedController];
  });
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
  RNDuoToolbarContentController *contentController = [self selectedContentController];
  UITraitCollection *traits = _usesHorizontalChrome ? self.traitCollection
      : (contentController ? contentController.traitCollection : _tabBarController.traitCollection);
  NSString *edge = RNDuoVerticalBarEdgeName(traits);
  UIEdgeInsets contentInsets = [self resolvedContentInsets];
  CGSize contentSize = _containerView.bounds.size;
  BOOL native = NO;
  if (@available(iOS 27.1, *)) native = YES;
  NSDictionary *payloadObject = @{
    @"native": @(native),
    @"verticalBarEdge": edge,
    @"isVertical": @(![_verticalBehavior isEqualToString:@"disabled"] &&
        ([edge isEqualToString:@"leading"] || [edge isEqualToString:@"trailing"])),
    @"contentInsets": @{
      @"top": @(contentInsets.top),
      @"right": @(contentInsets.right),
      @"bottom": @(contentInsets.bottom),
      @"left": @(contentInsets.left),
    },
    @"contentSize": @{
      @"width": @(std::isfinite(contentSize.width) ? MAX(0, contentSize.width) : 0),
      @"height": @(std::isfinite(contentSize.height) ? MAX(0, contentSize.height) : 0),
    },
  };
  // Bounds can change with a Duo pose even when every bar inset stays equal.
  // Compare native values, not JSON key order, to emit exactly those changes.
  if ([_lastPayloadObject isEqualToDictionary:payloadObject]) return;
  _lastPayloadObject = payloadObject;
  NSString *payload = RNDuoJSONString(payloadObject);
  auto emitter = std::static_pointer_cast<const RNDuoToolbarViewEventEmitter>(_eventEmitter);
  emitter->onStateChange({ .payload = std::string(payload.UTF8String) });
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  _itemsJSON = nil;
  _barTintColor = nil;
  _configuredVerticalBarEdge = nil;
  _lastPayloadObject = nil;
  _reactChild = nil;
}

@end
