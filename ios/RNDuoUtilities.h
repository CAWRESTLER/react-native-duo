#import <UIKit/UIKit.h>

#define RNDUO_HAS_IOS_27_SDK (__IPHONE_OS_VERSION_MAX_ALLOWED >= 270000)
#define RNDUO_HAS_IOS_27_1_SDK (__IPHONE_OS_VERSION_MAX_ALLOWED >= 270100)

NS_ASSUME_NONNULL_BEGIN

UIViewController *_Nullable RNDuoFindViewController(UIView *view);
NSDictionary *RNDuoParseDictionary(NSString *json);
NSArray *RNDuoParseArray(NSString *json);
NSString *RNDuoJSONString(id value);
NSString *RNDuoVerticalBarEdgeName(UITraitCollection *traits);
NSString *RNDuoAxisName(UIAxis axis);
UIColor *RNDuoColor(NSString *_Nullable value, UIColor *fallback);

NS_ASSUME_NONNULL_END
