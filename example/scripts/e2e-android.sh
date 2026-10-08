#!/usr/bin/env bash
# Runs the Android Maestro flows on a booted foldable emulator (for example a Pixel Fold AVD),
# setting the hinge angle through the emulator console before each pass.
set -euo pipefail

adb="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
flows="$(dirname "$0")/../.maestro/android"

run_pass() {
  local angle="$1" expected="$2"
  "$adb" emu sensor set hinge-angle0 "$angle" >/dev/null
  echo "Hinge at ${angle}°: expecting \"${expected}\""
  maestro test --platform android -e EXPECTED_STATUS="$expected" "$flows"
}

run_pass 180 "Fully open"
run_pass 90 "Partially open"
"$adb" emu sensor set hinge-angle0 180 >/dev/null
