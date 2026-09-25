#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

UIViewController *_Nullable RNDuoFindViewController(UIView *view);
NSDictionary *RNDuoParseDictionary(NSString *json);
NSArray *RNDuoParseArray(NSString *json);
NSString *RNDuoJSONString(id value);
NSString *RNDuoVerticalBarEdgeName(UITraitCollection *traits);
NSString *RNDuoAxisName(UIAxis axis);
UIColor *RNDuoColor(NSString *_Nullable value, UIColor *fallback);

NS_ASSUME_NONNULL_END
