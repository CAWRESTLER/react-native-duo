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
    path.join(os.tmpdir(), 'rn-duo-toolbar-visibility-')
  );
  executable = path.join(temporaryDirectory, 'toolbar-visibility');
  execFileSync(
    process.env.CXX || 'c++',
    [
      '-std=c++17',
      '-Wall',
      '-Wextra',
      '-Werror',
      '-I',
      projectRoot,
      path.join(
        __dirname,
        '..',
        '__fixtures__',
        'navigation-toolbar-visibility.cpp'
      ),
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
  [
    'plain-screen',
    'an outgoing adapter removes its empty rail on a plain incoming screen',
  ],
  [
    'handoff',
    'adapter handoff preserves the original navigation-wide visibility',
  ],
  [
    'empty-handoff',
    'an empty incoming adapter remains owner while hiding its toolbar',
  ],
  [
    'original-visible',
    'handoff preserves an originally visible native toolbar',
  ],
  [
    'external-change',
    'external native visibility changes are not overwritten or reclaimed',
  ],
  ['external-handoff', 'new adapters snapshot externally replaced visibility'],
  [
    'foreign-items',
    'outgoing adapters do not hide foreign incoming toolbar items',
  ],
  [
    'stale-owner',
    'late outgoing updates and cleanup cannot affect the incoming owner',
  ],
  [
    'axis-presentation',
    'inline/vertical transitions retain one owner and the original visibility baseline',
  ],
]) {
  test(description, () => {
    assert.doesNotThrow(() => execFileSync(executable, [scenario]));
  });
}
