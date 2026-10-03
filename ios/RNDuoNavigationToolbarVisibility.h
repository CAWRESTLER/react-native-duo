#pragma once

#include <cstdint>

// UINavigationController.toolbarHidden is shared by every screen in a stack.
// Keep its original value through adapter handoffs instead of treating an
// outgoing adapter's visible toolbar as the incoming screen's baseline.
class RNDuoNavigationToolbarVisibility {
public:
  using Owner = std::uintptr_t;

  struct Decision {
    bool shouldSetHidden = false;
    bool hidden = true;
    bool externalOverride = false;
  };

  void acquire(Owner owner, bool currentHidden) {
    if (owner_ == owner) return;
    if (owner_ == 0 || externallyOverridden_ || currentHidden != installedHidden_) {
      originalHidden_ = currentHidden;
    }
    owner_ = owner;
    installedHidden_ = currentHidden;
    externallyOverridden_ = false;
  }

  Decision update(Owner owner, bool currentHidden, bool desiredHidden) {
    if (!owns(owner)) return {};
    if (externallyOverridden_ || currentHidden != installedHidden_) {
      externallyOverridden_ = true;
      return {false, currentHidden, true};
    }
    installedHidden_ = desiredHidden;
    return {currentHidden != desiredHidden, desiredHidden, false};
  }

  Decision release(Owner owner, bool currentHidden, bool mayRestore) {
    if (!owns(owner)) return {};
    Decision decision{
      mayRestore && !externallyOverridden_ && currentHidden == installedHidden_ && currentHidden != originalHidden_,
      originalHidden_,
      false
    };
    owner_ = 0;
    externallyOverridden_ = false;
    return decision;
  }

  bool owns(Owner owner) const { return owner != 0 && owner_ == owner; }
  bool hasOwner() const { return owner_ != 0; }

private:
  Owner owner_ = 0;
  bool originalHidden_ = true;
  bool installedHidden_ = true;
  bool externallyOverridden_ = false;
};
