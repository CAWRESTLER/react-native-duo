const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');

const projectRoot = path.resolve(__dirname, '..', '..');
let temporaryDirectory;
let executable;

before(() => {
  temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'rn-duo-camera-lifecycle-')
  );
  executable = path.join(temporaryDirectory, 'camera-lifecycle');
  // CI's macOS/Linux images provide a C++ compiler. Do not silently skip the
  // native restart-policy tests if the local toolchain is missing.
  execFileSync(
    process.env.CXX || 'c++',
    [
      '-std=c++17',
      '-Wall',
      '-Wextra',
      '-Werror',
      '-I',
      projectRoot,
      path.join(__dirname, '..', '__fixtures__', 'camera-lifecycle.cpp'),
      '-o',
      executable,
    ],
    { stdio: 'pipe' }
  );
});

after(() => {
  if (temporaryDirectory) {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

for (const [scenario, description] of [
  ['inactive', 'an inactive or unmounted camera does not restart'],
  ['interruption', 'a normal interruption can resume the desired session'],
  ['pause', 'ending an interruption does not undo an explicit pause'],
  ['fatal', 'non-reset runtime failures require an explicit retry'],
  ['reset-budget', 'media-services reset recovery is bounded to one retry'],
  ['deferred-reset', 'a background reset waits for foreground without looping'],
  ['interrupted-reset', 'a reset cannot start capture during an interruption'],
  [
    'stale-callback',
    'old or unmounted callbacks cannot poison the new session',
  ],
  ['fatal-then-reset', 'a reset cannot override a prior fatal runtime failure'],
  [
    'deferred-then-fatal',
    'foreground cannot revive a deferred retry after a fatal failure',
  ],
]) {
  test(description, () => {
    assert.doesNotThrow(() => execFileSync(executable, [scenario]));
  });
}
