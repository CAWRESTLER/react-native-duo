#include "ios/RNDuoNavigationToolbarVisibility.h"
#include <cassert>
#include <cstring>

int main(int argc, char **argv) {
  assert(argc == 2);
  RNDuoNavigationToolbarVisibility policy;
  constexpr auto a = 1;
  constexpr auto b = 2;
  if (std::strcmp(argv[1], "plain-screen") == 0) {
    policy.acquire(a, true);
    auto visible = policy.update(a, true, false);
    assert(visible.shouldSetHidden && !visible.hidden);
    // A is no longer top, but B has no adapter/actions: remove A's empty rail.
    auto restore = policy.release(a, false, true);
    assert(restore.shouldSetHidden && restore.hidden);
    assert(!policy.hasOwner());
  } else if (std::strcmp(argv[1], "handoff") == 0) {
    policy.acquire(a, true);
    assert(policy.update(a, true, false).shouldSetHidden);
    policy.acquire(b, false);
    assert(!policy.update(b, false, false).shouldSetHidden);
    assert(!policy.release(a, false, true).shouldSetHidden);
    assert(policy.owns(b));
    // B must restore pre-A's hidden=true, not A's intermediate visible value.
    auto restore = policy.release(b, false, true);
    assert(restore.shouldSetHidden && restore.hidden);
  } else if (std::strcmp(argv[1], "empty-handoff") == 0) {
    policy.acquire(a, true);
    policy.update(a, true, false);
    policy.acquire(b, false);
    auto hidden = policy.update(b, false, true);
    assert(hidden.shouldSetHidden && hidden.hidden);
    assert(!policy.release(a, true, true).shouldSetHidden);
    assert(policy.owns(b));
    assert(!policy.release(b, true, true).shouldSetHidden);
    assert(!policy.hasOwner());
  } else if (std::strcmp(argv[1], "original-visible") == 0) {
    policy.acquire(a, false);
    auto hidden = policy.update(a, false, true);
    assert(hidden.shouldSetHidden && hidden.hidden);
    policy.acquire(b, true);
    policy.update(b, true, false);
    assert(!policy.release(a, false, true).shouldSetHidden);
    assert(!policy.release(b, false, true).shouldSetHidden);
  } else if (std::strcmp(argv[1], "external-change") == 0) {
    policy.acquire(a, true);
    policy.update(a, true, false);
    auto external = policy.update(a, true, false);
    assert(!external.shouldSetHidden && external.externalOverride);
    // Even if another native consumer changes it back, do not reclaim it.
    assert(policy.update(a, false, false).externalOverride);
    assert(!policy.release(a, false, true).shouldSetHidden);
    assert(!policy.hasOwner());
  } else if (std::strcmp(argv[1], "external-handoff") == 0) {
    policy.acquire(a, false);
    policy.update(a, false, true);
    assert(policy.update(a, false, true).externalOverride);
    // An incoming adapter starts from the external consumer's current value.
    policy.acquire(b, true);
    policy.update(b, true, false);
    auto restore = policy.release(b, false, true);
    assert(restore.shouldSetHidden && restore.hidden);
  } else if (std::strcmp(argv[1], "foreign-items") == 0) {
    policy.acquire(a, true);
    policy.update(a, true, false);
    // B owns native toolbarItems outside Duo: do not hide B's toolbar.
    assert(!policy.release(a, false, false).shouldSetHidden);
    assert(!policy.hasOwner());
  } else if (std::strcmp(argv[1], "axis-presentation") == 0) {
    policy.acquire(a, true);
    // Inline horizontal actions hide the stack's toolbar, not its header/tabs.
    assert(!policy.update(a, true, true).shouldSetHidden);
    auto vertical = policy.update(a, true, false);
    assert(vertical.shouldSetHidden && !vertical.hidden && !vertical.externalOverride);
    auto horizontal = policy.update(a, false, true);
    assert(horizontal.shouldSetHidden && horizontal.hidden && !horizontal.externalOverride);
    assert(policy.owns(a));
    policy.update(a, true, false);
    auto restore = policy.release(a, false, true);
    assert(restore.shouldSetHidden && restore.hidden);
  } else if (std::strcmp(argv[1], "stale-owner") == 0) {
    policy.acquire(a, true);
    policy.update(a, true, false);
    policy.acquire(b, false);
    assert(!policy.update(a, false, true).shouldSetHidden);
    assert(!policy.release(a, false, true).shouldSetHidden);
    assert(policy.owns(b));
    auto restore = policy.release(b, false, true);
    assert(restore.shouldSetHidden && restore.hidden);
    assert(!policy.release(b, true, true).shouldSetHidden);
  } else {
    return 2;
  }
  return 0;
}
