#include "ios/RNDuoCameraLifecycle.h"
#include <cassert>
#include <cstring>

int main(int argc, char **argv) {
  assert(argc == 2);
  RNDuoCameraLifecycle lifecycle;
  if (std::strcmp(argv[1], "inactive") == 0) {
    assert(!lifecycle.shouldStart());
    assert(!lifecycle.runtimeError(true));
    assert(!lifecycle.endInterruption());
  } else if (std::strcmp(argv[1], "interruption") == 0) {
    lifecycle.beginExplicitConfiguration(true);
    assert(lifecycle.shouldStart());
    lifecycle.interrupt();
    assert(!lifecycle.shouldStart());
    assert(lifecycle.endInterruption());
  } else if (std::strcmp(argv[1], "pause") == 0) {
    lifecycle.beginExplicitConfiguration(true);
    lifecycle.interrupt();
    lifecycle.setDesiredRunning(false);
    assert(!lifecycle.endInterruption());
    assert(!lifecycle.shouldStart());
  } else if (std::strcmp(argv[1], "fatal") == 0) {
    lifecycle.beginExplicitConfiguration(true);
    assert(!lifecycle.runtimeError(false));
    assert(lifecycle.hasFailed());
    lifecycle.setDesiredRunning(false);
    lifecycle.setDesiredRunning(true);
    assert(!lifecycle.endInterruption());
    assert(!lifecycle.shouldStart());
    lifecycle.beginExplicitConfiguration(true);
    assert(lifecycle.shouldStart());
    assert(!lifecycle.hasFailed());
  } else if (std::strcmp(argv[1], "reset-budget") == 0) {
    lifecycle.beginExplicitConfiguration(true);
    assert(lifecycle.runtimeError(true));
    assert(lifecycle.shouldStart());
    // Reporting a successful start or automatic foreground/direction updates
    // do not replenish the budget. A second reset must wait for explicit retry.
    lifecycle.setDesiredRunning(true);
    assert(!lifecycle.runtimeError(true));
    assert(!lifecycle.shouldStart());
    assert(!lifecycle.runtimeError(true));
    lifecycle.beginExplicitConfiguration(true);
    assert(lifecycle.runtimeError(true));
  } else if (std::strcmp(argv[1], "deferred-reset") == 0) {
    lifecycle.beginExplicitConfiguration(true);
    lifecycle.setDesiredRunning(false);
    assert(!lifecycle.runtimeError(true));
    assert(!lifecycle.hasFailed());
    lifecycle.setDesiredRunning(true);
    assert(lifecycle.shouldStart());
    assert(!lifecycle.runtimeError(true));
    assert(lifecycle.hasFailed());
  } else if (std::strcmp(argv[1], "interrupted-reset") == 0) {
    lifecycle.beginExplicitConfiguration(true);
    lifecycle.interrupt();
    assert(!lifecycle.runtimeError(true));
    assert(lifecycle.endInterruption());
    assert(!lifecycle.runtimeError(true));
    assert(!lifecycle.endInterruption());
  } else if (std::strcmp(argv[1], "stale-callback") == 0) {
    assert(RNDuoCameraLifecycle::acceptsCallback(4, 4, true));
    assert(!RNDuoCameraLifecycle::acceptsCallback(3, 4, true));
    assert(!RNDuoCameraLifecycle::acceptsCallback(4, 4, false));
    // An older configuration's fatal error must not poison the new session.
    lifecycle.beginExplicitConfiguration(true);
    if (RNDuoCameraLifecycle::acceptsCallback(3, 4, true)) lifecycle.runtimeError(false);
    assert(lifecycle.shouldStart());
  } else if (std::strcmp(argv[1], "fatal-then-reset") == 0) {
    lifecycle.beginExplicitConfiguration(true);
    assert(!lifecycle.runtimeError(false));
    assert(!lifecycle.runtimeError(true));
    assert(lifecycle.hasFailed());
    lifecycle.beginExplicitConfiguration(true);
    assert(lifecycle.runtimeError(true));
  } else if (std::strcmp(argv[1], "deferred-then-fatal") == 0) {
    lifecycle.beginExplicitConfiguration(true);
    lifecycle.setDesiredRunning(false);
    assert(!lifecycle.runtimeError(true));
    assert(!lifecycle.runtimeError(false));
    lifecycle.setDesiredRunning(true);
    assert(!lifecycle.shouldStart());
    assert(!lifecycle.endInterruption());
  } else {
    return 2;
  }
  return 0;
}
