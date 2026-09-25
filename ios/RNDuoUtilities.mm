#import "RNDuoUtilities.h"

UIViewController *_Nullable RNDuoFindViewController(UIView *view)
{
  UIResponder *responder = view;
  while (responder != nil) {
    if ([responder isKindOfClass:[UIViewController class]]) {
      return (UIViewController *)responder;
    }
    responder = responder.nextResponder;
  }
  return nil;
}

NSDictionary *RNDuoParseDictionary(NSString *json)
{
  if (json.length == 0) return @{};
  NSData *data = [json dataUsingEncoding:NSUTF8StringEncoding];
  id value = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
  return [value isKindOfClass:[NSDictionary class]] ? value : @{};
}

NSArray *RNDuoParseArray(NSString *json)
{
  if (json.length == 0) return @[];
  NSData *data = [json dataUsingEncoding:NSUTF8StringEncoding];
  id value = data ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
  return [value isKindOfClass:[NSArray class]] ? value : @[];
}

NSString *RNDuoJSONString(id value)
{
  if (![NSJSONSerialization isValidJSONObject:value]) return @"{}";
  NSData *data = [NSJSONSerialization dataWithJSONObject:value options:0 error:nil];
  return data ? [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding] : @"{}";
}

NSString *RNDuoVerticalBarEdgeName(UITraitCollection *traits)
{
  if (@available(iOS 27.1, *)) {
    switch (traits.verticalBarEdge) {
      case UIVerticalBarEdgeLeading: return @"leading";
      case UIVerticalBarEdgeTrailing: return @"trailing";
      case UIVerticalBarEdgeUnspecified: return @"unspecified";
    }
  }
  return @"unavailable";
}

NSString *RNDuoAxisName(UIAxis axis)
{
  if (axis == UIAxisHorizontal) return @"horizontal";
  if (axis == UIAxisVertical) return @"vertical";
  if (axis == UIAxisBoth) return @"both";
  return @"none";
}

UIColor *RNDuoColor(NSString *_Nullable value, UIColor *fallback)
{
  if (![value isKindOfClass:[NSString class]]) return fallback;
  NSString *hex = [[value stringByReplacingOccurrencesOfString:@"#" withString:@""] uppercaseString];
  if (hex.length != 6 && hex.length != 8) return fallback;
  unsigned long long raw = 0;
  if (![[NSScanner scannerWithString:hex] scanHexLongLong:&raw]) return fallback;
  CGFloat alpha = hex.length == 8 ? ((raw >> 24) & 0xFF) / 255.0 : 1.0;
  CGFloat red = ((raw >> (hex.length == 8 ? 16 : 16)) & 0xFF) / 255.0;
  CGFloat green = ((raw >> 8) & 0xFF) / 255.0;
  CGFloat blue = (raw & 0xFF) / 255.0;
  return [UIColor colorWithRed:red green:green blue:blue alpha:alpha];
}
