#import "RNDuoArrangementView.h"
#import "RNDuoUtilities.h"

#import <React/RCTComponentViewProtocol.h>

#import <react/renderer/components/ReactNativeDuoViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/EventEmitters.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/Props.h>
#import <react/renderer/components/ReactNativeDuoViewSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

static UIAxis RNDuoAxes(NSString *value)
{
  if ([value isEqualToString:@"horizontal"]) return UIAxisHorizontal;
  if ([value isEqualToString:@"vertical"]) return UIAxisVertical;
  return UIAxisBoth;
}

static NSDirectionalRectEdge RNDuoOverlayEdge(NSString *value)
{
  if ([value isEqualToString:@"top"]) return NSDirectionalRectEdgeTop;
  if ([value isEqualToString:@"leading"]) return NSDirectionalRectEdgeLeading;
  if ([value isEqualToString:@"bottom"]) return NSDirectionalRectEdgeBottom;
  return NSDirectionalRectEdgeTrailing;
}

@implementation RNDuoArrangementView {
  UIArrangementViewController *_arrangementController API_AVAILABLE(ios(27.1));
  UIViewController *_primaryController;
  UIViewController *_secondaryController;
  UIView *_fallbackContainer;
  UIView<RCTComponentViewProtocol> *_primaryChild;
  UIView<RCTComponentViewProtocol> *_secondaryChild;
  __weak UIViewController *_hostController;
  NSString *_arrangement;
  NSString *_axes;
  NSString *_overlayEdge;
  CGFloat _primaryFraction;
  BOOL _animated;
  NSString *_lastPayload;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<RNDuoArrangementViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RNDuoArrangementViewProps>();
    _props = defaultProps;
    _arrangement = @"split";
    _axes = @"automatic";
    _overlayEdge = @"trailing";
    _primaryFraction = 0.5;
    _animated = YES;
    _primaryController = [[UIViewController alloc] init];
    _secondaryController = [[UIViewController alloc] init];
    _primaryController.view.backgroundColor = UIColor.clearColor;
    _secondaryController.view.backgroundColor = UIColor.clearColor;

    if (@available(iOS 27.1, *)) {
      _arrangementController = [[UIArrangementViewController alloc] init];
      [_arrangementController setViewController:_primaryController
                                   forPlacement:UIArrangementViewControllerViewPlacementPrimary];
      [_arrangementController setViewController:_secondaryController
                                   forPlacement:UIArrangementViewControllerViewPlacementSecondary];
      self.contentView = _arrangementController.view;
      [self applyNativeArrangement];
    } else {
      _fallbackContainer = [[UIView alloc] init];
      _fallbackContainer.backgroundColor = UIColor.clearColor;
      self.contentView = _fallbackContainer;
    }
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newProps = *std::static_pointer_cast<RNDuoArrangementViewProps const>(props);
  _arrangement = newProps.arrangement.empty() ? @"split" : @(newProps.arrangement.c_str());
  _axes = newProps.axes.empty() ? @"automatic" : @(newProps.axes.c_str());
  _overlayEdge = newProps.overlayEdge.empty() ? @"trailing" : @(newProps.overlayEdge.c_str());
  _primaryFraction = MAX(0.05, MIN(0.95, newProps.primaryFraction ?: 0.5));
  _animated = newProps.animated;
  [super updateProps:props oldProps:oldProps];
  if (@available(iOS 27.1, *)) [self applyNativeArrangement];
  [self setNeedsLayout];
}

- (void)applyNativeArrangement API_AVAILABLE(ios(27.1))
{
  if ([_arrangement isEqualToString:@"overlay"]) {
    UIOverlayArrangement *overlay = [UIOverlayArrangement overlayArrangement];
    overlay.axes = RNDuoAxes(_axes);
    UIOverlayArrangementViewProperties *properties = overlay.defaultViewProperties;
    properties.edge = RNDuoOverlayEdge(_overlayEdge);
    [overlay setViewProperties:properties forPlacement:UIArrangementViewControllerViewPlacementSecondary];
    [_arrangementController updateArrangement:overlay animated:_animated];
  } else {
    UISplitArrangement *split = [UISplitArrangement splitArrangement];
    split.axes = RNDuoAxes(_axes);
    UISplitArrangementViewProperties *primary = split.defaultViewProperties;
    primary.width.preferred = [UISplitArrangementDimension fractionalDimension:_primaryFraction];
    primary.height.preferred = [UISplitArrangementDimension fractionalDimension:_primaryFraction];
    primary.layoutPriority = 1;
    [split setViewProperties:primary forPlacement:UIArrangementViewControllerViewPlacementPrimary];

    UISplitArrangementViewProperties *secondary = split.defaultViewProperties;
    secondary.width.preferred = [UISplitArrangementDimension fractionalDimension:1.0 - _primaryFraction];
    secondary.height.preferred = [UISplitArrangementDimension fractionalDimension:1.0 - _primaryFraction];
    [split setViewProperties:secondary forPlacement:UIArrangementViewControllerViewPlacementSecondary];
    [_arrangementController updateArrangement:split animated:_animated];
  }
  dispatch_async(dispatch_get_main_queue(), ^{ [self emitStateIfNeeded]; });
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  if (@available(iOS 27.1, *)) {
    if (self.window && !_arrangementController.parentViewController) {
      UIViewController *host = RNDuoFindViewController(self);
      if (host && host != _arrangementController) {
        _hostController = host;
        [host addChildViewController:_arrangementController];
        [_arrangementController didMoveToParentViewController:host];
      }
    } else if (!self.window && _arrangementController.parentViewController) {
      [_arrangementController willMoveToParentViewController:nil];
      [_arrangementController removeFromParentViewController];
      _hostController = nil;
    }
  }
}

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  if (index == 0) {
    _primaryChild = childComponentView;
  } else if (index == 1) {
    _secondaryChild = childComponentView;
  }

  UIView *destination = _fallbackContainer;
  if (@available(iOS 27.1, *)) {
    destination = index == 0 ? _primaryController.view : _secondaryController.view;
  }
  [destination insertSubview:childComponentView atIndex:MIN(index, destination.subviews.count)];
  [self setNeedsLayout];
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView index:(NSInteger)index
{
  [childComponentView removeFromSuperview];
  if (childComponentView == _primaryChild) _primaryChild = nil;
  if (childComponentView == _secondaryChild) _secondaryChild = nil;
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  if (@available(iOS 27.1, *)) {
    _arrangementController.view.frame = self.bounds;
    _primaryChild.frame = _primaryController.view.bounds;
    _secondaryChild.frame = _secondaryController.view.bounds;
  } else {
    [self layoutFallback];
  }
  [self emitStateIfNeeded];
}

- (void)layoutFallback
{
  CGRect bounds = _fallbackContainer.bounds;
  if ([_arrangement isEqualToString:@"overlay"]) {
    _primaryChild.frame = bounds;
    CGFloat width = bounds.size.width * 0.46;
    CGFloat height = bounds.size.height * 0.46;
    CGRect secondary = CGRectMake(bounds.size.width - width - 12, 12, width, bounds.size.height - 24);
    if ([_overlayEdge isEqualToString:@"leading"]) secondary.origin.x = 12;
    if ([_overlayEdge isEqualToString:@"top"]) secondary = CGRectMake(12, 12, bounds.size.width - 24, height);
    if ([_overlayEdge isEqualToString:@"bottom"]) secondary = CGRectMake(12, bounds.size.height - height - 12, bounds.size.width - 24, height);
    _secondaryChild.frame = secondary;
    [_fallbackContainer bringSubviewToFront:_secondaryChild];
    return;
  }

  BOOL vertical = [_axes isEqualToString:@"vertical"] ||
      ([_axes isEqualToString:@"automatic"] && bounds.size.height > bounds.size.width);
  if (vertical) {
    CGFloat primaryHeight = bounds.size.height * _primaryFraction;
    _primaryChild.frame = CGRectMake(0, 0, bounds.size.width, primaryHeight);
    _secondaryChild.frame = CGRectMake(0, primaryHeight, bounds.size.width, bounds.size.height - primaryHeight);
  } else {
    CGFloat primaryWidth = bounds.size.width * _primaryFraction;
    _primaryChild.frame = CGRectMake(0, 0, primaryWidth, bounds.size.height);
    _secondaryChild.frame = CGRectMake(primaryWidth, 0, bounds.size.width - primaryWidth, bounds.size.height);
  }
}

- (NSDictionary *)paneState:(BOOL)primary
{
  if (@available(iOS 27.1, *)) {
    UIArrangementViewState *state = [_arrangementController stateForPlacement:primary
        ? UIArrangementViewControllerViewPlacementPrimary
        : UIArrangementViewControllerViewPlacementSecondary];
    if (state) {
      return @{ @"zIndex": @(state.zIndex), @"splitAxis": RNDuoAxisName(state.splitAxis), @"isHidden": @(state.isHidden) };
    }
  }
  return @{
    @"zIndex": @((!primary && [_arrangement isEqualToString:@"overlay"]) ? 1 : 0),
    @"splitAxis": @"none",
    @"isHidden": @NO,
  };
}

- (void)emitStateIfNeeded
{
  if (!_eventEmitter) return;
  BOOL native = NO;
  if (@available(iOS 27.1, *)) native = YES;
  NSString *payload = RNDuoJSONString(@{
    @"native": @(native),
    @"arrangement": _arrangement,
    @"primary": [self paneState:YES],
    @"secondary": [self paneState:NO],
  });
  if ([_lastPayload isEqualToString:payload]) return;
  _lastPayload = payload;
  auto emitter = std::static_pointer_cast<const RNDuoArrangementViewEventEmitter>(_eventEmitter);
  emitter->onStateChange({ .payload = std::string(payload.UTF8String) });
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  _lastPayload = nil;
  _primaryChild = nil;
  _secondaryChild = nil;
}

@end
