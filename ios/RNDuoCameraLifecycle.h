#pragma once
#include <cstdint>

// Access only on the camera's serial session queue. Keeping restart policy
// independent of AVFoundation makes interruption/error transitions testable.
class RNDuoCameraLifecycle final {
 public:
  static bool acceptsCallback(uint64_t expectedGeneration, uint64_t currentGeneration, bool mounted) {
    return mounted && expectedGeneration == currentGeneration;
  }

  void setDesiredRunning(bool desired) { desiredRunning_ = desired; }

  void beginExplicitConfiguration(bool desired) {
    desiredRunning_ = desired;
    failed_ = false;
    resetRetryAvailable_ = true;
  }

  void interrupt() { interrupted_ = true; }

  bool endInterruption() {
    interrupted_ = false;
    return shouldStart();
  }

  bool runtimeError(bool mediaServicesWereReset) {
    failed_ = true;
    if (!mediaServicesWereReset) resetRetryAvailable_ = false;
    if (mediaServicesWereReset && resetRetryAvailable_) {
      // Consume the budget even when restart must wait for foreground or the
      // interruption to end. didStartRunning must never replenish this budget.
      resetRetryAvailable_ = false;
      failed_ = false;
      return shouldStart();
    }
    return false;
  }

  bool shouldStart() const {
    return desiredRunning_ && !interrupted_ && !failed_;
  }

  bool hasFailed() const { return failed_; }

 private:
  bool desiredRunning_ = false;
  bool interrupted_ = false;
  bool failed_ = false;
  bool resetRetryAvailable_ = true;
};
