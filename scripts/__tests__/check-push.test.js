const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { parsePushInput, getPushPolicy } = require('../check-push');

const projectRoot = path.resolve(__dirname, '../..');
const localObject = 'a'.repeat(40);
const remoteObject = 'b'.repeat(40);
const zeroObject = '0'.repeat(40);
const update = (
  localRef = 'refs/heads/feature',
  remoteRef = 'refs/heads/feature',
  local = localObject,
  remote = remoteObject
) => `${localRef} ${local} ${remoteRef} ${remote}\n`;
const deletion = (remoteRef) =>
  update('(delete)', remoteRef, zeroObject, remoteObject);

function temporaryDirectory(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'react-native-duo-hooks-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function validationFixture(t) {
  const directory = temporaryDirectory(t);
  const bin = path.join(directory, 'bin');
  mkdirSync(bin);
  const invocation = path.join(directory, 'invocations.jsonl');
  const fakeCorepack = path.join(bin, 'corepack');
  writeFileSync(
    fakeCorepack,
    `#!/usr/bin/env node
const { appendFileSync } = require('node:fs');
appendFileSync(process.env.HOOK_TEST_INVOCATION, JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }) + '\\n');
if (process.env.HOOK_TEST_SIGNAL) process.kill(process.pid, process.env.HOOK_TEST_SIGNAL);
process.exit(Number(process.env.HOOK_TEST_STATUS || 0));
`,
    { mode: 0o755 }
  );
  if (process.platform === 'win32') {
    writeFileSync(
      `${fakeCorepack}.cmd`,
      `@"${process.execPath}" "${fakeCorepack}" %*\r\n`
    );
  }
  return {
    directory,
    invocation,
    env: {
      ...process.env,
      PATH: `${bin}${path.delimiter}${path.dirname(process.execPath)}`,
      HOOK_TEST_INVOCATION: invocation,
    },
  };
}

function runCheck(input, fixture, overrides = {}) {
  return spawnSync(
    process.execPath,
    [path.join(projectRoot, 'scripts', 'check-push.js')],
    {
      cwd: fixture.directory,
      input,
      encoding: 'utf8',
      env: { ...fixture.env, ...overrides },
    }
  );
}

test('parses Git updates and skips an empty or unchanged push', () => {
  assert.deepEqual(parsePushInput(''), []);
  assert.equal(getPushPolicy(parsePushInput('')), 'skip');
  assert.equal(
    getPushPolicy(
      parsePushInput(update(undefined, undefined, localObject, localObject))
    ),
    'skip'
  );
  assert.equal(parsePushInput(update())[0].remoteRef, 'refs/heads/feature');
  assert.equal(parsePushInput(update().replace(/\n$/, '\r\n')).length, 1);
  assert.equal(parsePushInput(update().trimEnd()).length, 1);
});

test('protects the destination main ref for creates, updates, forces, and deletions', () => {
  for (const input of [
    update('refs/heads/main', 'refs/heads/main'),
    update('refs/heads/feature', 'refs/heads/main'),
    update('HEAD~1', 'refs/heads/main'),
    update(localObject, 'refs/heads/main', localObject, zeroObject),
    deletion('refs/heads/main'),
    update() + deletion('refs/heads/main'),
  ]) {
    assert.equal(getPushPolicy(parsePushInput(input)), 'block-main');
  }
});

test('validates feature and tag updates, including a feature push from local main', () => {
  for (const input of [
    update(),
    update('refs/heads/main', 'refs/heads/feature'),
    update('HEAD', 'refs/heads/feature', localObject, zeroObject),
    update('refs/tags/v1.0.0', 'refs/tags/v1.0.0'),
    deletion('refs/tags/v1.0.0'),
    deletion('refs/heads/old-feature') + update(),
    update('refs/heads/feature', 'refs/heads/main-backup'),
  ]) {
    assert.equal(getPushPolicy(parsePushInput(input)), 'validate');
  }
  assert.equal(
    getPushPolicy(parsePushInput(deletion('refs/heads/feature'))),
    'skip'
  );
});

test('supports SHA-256 object names and rejects malformed input', () => {
  assert.equal(
    getPushPolicy(
      parsePushInput(
        update('HEAD', 'refs/heads/feature', 'a'.repeat(64), '0'.repeat(64))
      )
    ),
    'validate'
  );
  for (const input of [
    '\n',
    ' \n',
    `${update()}\n`,
    update().replace(localObject, 'bad-object'),
    update().replace(remoteObject, 'b'.repeat(64)),
    update().replace('refs/heads/feature', '\u0000feature'),
    update('HEAD', 'main'),
    update('HEAD', 'refs/heads/../main'),
    update('HEAD', 'refs/heads/main.lock'),
    update('(delete)'),
    update('HEAD', 'refs/heads/feature', zeroObject),
    update('(delete)', 'refs/heads/feature', zeroObject, zeroObject),
    update().replace(` ${remoteObject}`, ''),
    update().replace('\n', ' extra\n'),
    update() +
      update('HEAD', 'refs/heads/other', 'a'.repeat(64), 'b'.repeat(64)),
  ]) {
    assert.throws(() => parsePushInput(input), /Invalid Git update on line/);
  }
});

test('the actual check process blocks main before launching validation', (t) => {
  const fixture = validationFixture(t);
  for (const input of [
    update('HEAD', 'refs/heads/main'),
    deletion('refs/heads/main'),
    update() + update('HEAD', 'refs/heads/main'),
  ]) {
    const result = runCheck(input, fixture);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /direct updates to main/);
    assert.equal(existsSync(fixture.invocation), false);
  }
});

test('the actual check process validates once from the repository root', (t) => {
  const fixture = validationFixture(t);
  const result = runCheck(
    update('refs/heads/main', 'refs/heads/feature') +
      update('refs/tags/v1.0.0', 'refs/tags/v1.0.0'),
    fixture
  );
  assert.equal(result.status, 0, result.stderr);
  const invocations = readFileSync(fixture.invocation, 'utf8')
    .trim()
    .split('\n');
  assert.equal(invocations.length, 1);
  assert.deepEqual(JSON.parse(invocations[0]), {
    args: ['yarn', 'validate'],
    cwd: projectRoot,
  });
  assert.match(result.stderr, /Validation passed/);
});

test('no-op pushes and feature-only deletions do not launch validation', (t) => {
  const fixture = validationFixture(t);
  for (const input of ['', deletion('refs/heads/feature')]) {
    const result = runCheck(input, fixture);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(fixture.invocation), false);
  }
});

test('malformed input and failed or unavailable validation fail closed', (t) => {
  const fixture = validationFixture(t);
  const malformed = runCheck(update() + 'bad input\n', fixture);
  assert.equal(malformed.status, 1);
  assert.match(malformed.stderr, /could not read Git's update list/);
  assert.equal(existsSync(fixture.invocation), false);

  const failed = runCheck(update(), fixture, { HOOK_TEST_STATUS: '7' });
  assert.equal(failed.status, 7);
  assert.match(failed.stderr, /validation did not pass/);

  const interrupted = runCheck(update(), fixture, {
    HOOK_TEST_SIGNAL: 'SIGTERM',
  });
  assert.equal(interrupted.status, 1);
  assert.match(interrupted.stderr, /validation did not pass/);

  const unavailable = runCheck(update(), fixture, { PATH: fixture.directory });
  assert.equal(unavailable.status, 1);
  assert.match(
    unavailable.stderr,
    /Corepack could not start|validation did not pass/
  );
});

test('the executable hook forwards stdin when invoked outside the checkout', (t) => {
  if (process.platform === 'win32') return t.skip('Requires a POSIX shell.');
  const fixture = validationFixture(t);
  const result = spawnSync(
    path.join(projectRoot, '.githooks', 'pre-push'),
    ['origin', 'unused'],
    {
      cwd: fixture.directory,
      input: update('HEAD', 'refs/heads/main'),
      encoding: 'utf8',
      env: fixture.env,
    }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /direct updates to main/);
});

test('the executable hook fails closed with a helpful message when Node is missing', (t) => {
  if (process.platform === 'win32') return t.skip('Requires a POSIX shell.');
  const directory = temporaryDirectory(t);
  const result = spawnSync(path.join(projectRoot, '.githooks', 'pre-push'), {
    input: update(),
    encoding: 'utf8',
    env: { ...process.env, PATH: directory },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Node.js is required/);
});

function checkoutFixture(t, parent) {
  const directory = parent || temporaryDirectory(t);
  execFileSync('git', ['init', '--quiet', directory]);
  mkdirSync(path.join(directory, 'scripts'), { recursive: true });
  cpSync(
    path.join(projectRoot, 'scripts', 'install-git-hooks.js'),
    path.join(directory, 'scripts', 'install-git-hooks.js')
  );
  cpSync(
    path.join(projectRoot, 'scripts', 'check-push.js'),
    path.join(directory, 'scripts', 'check-push.js')
  );
  cpSync(
    path.join(projectRoot, '.githooks'),
    path.join(directory, '.githooks'),
    { recursive: true }
  );
  writeFileSync(
    path.join(directory, 'package.json'),
    JSON.stringify({ name: '@cawrestler/react-native-duo' })
  );
  return directory;
}

function runInstaller(directory, overrides = {}) {
  return spawnSync(
    process.execPath,
    [path.join(directory, 'scripts', 'install-git-hooks.js')],
    {
      cwd: directory,
      encoding: 'utf8',
      env: {
        ...process.env,
        CI: 'false',
        GITHUB_ACTIONS: 'false',
        ...overrides,
      },
    }
  );
}

function hooksPath(directory) {
  return spawnSync(
    'git',
    ['-C', directory, 'config', '--local', '--get', 'core.hooksPath'],
    { encoding: 'utf8' }
  );
}

test('installation writes repository-local hooks and is repeatable', (t) => {
  const directory = checkoutFixture(t);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = runInstaller(directory);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(hooksPath(directory).stdout.trim(), '.githooks');
  }
});

test('installation preserves custom hooksPath and gives an explicit opt-in command', (t) => {
  const directory = checkoutFixture(t);
  for (const customPath of ['custom-hooks', '', ' .githooks', '.githooks ']) {
    execFileSync('git', [
      '-C',
      directory,
      'config',
      '--local',
      'core.hooksPath',
      customPath,
    ]);
    const result = runInstaller(directory);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(hooksPath(directory).stdout.replace(/\r?\n$/, ''), customPath);
    assert.match(
      result.stdout,
      /git config --local core\.hooksPath \.githooks/
    );
  }
});

test('installation also preserves an inherited global hooksPath', (t) => {
  const directory = checkoutFixture(t);
  const configuration = path.join(directory, 'global.gitconfig');
  writeFileSync(configuration, '[core]\n  hooksPath = shared-hooks\n');
  const result = runInstaller(directory, { GIT_CONFIG_GLOBAL: configuration });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(hooksPath(directory).status, 1);
  assert.match(result.stdout, /Keeping your existing core.hooksPath/);
});

test('installation skips CI and packaged consumers inside another checkout', (t) => {
  const directory = checkoutFixture(t);
  assert.equal(runInstaller(directory, { CI: 'true' }).status, 0);
  assert.equal(hooksPath(directory).status, 1);

  const consumer = path.join(directory, 'node_modules', 'react-native-duo');
  mkdirSync(path.join(consumer, 'scripts'), { recursive: true });
  cpSync(
    path.join(projectRoot, 'scripts', 'install-git-hooks.js'),
    path.join(consumer, 'scripts', 'install-git-hooks.js')
  );
  assert.equal(runInstaller(consumer).status, 0);
  assert.equal(hooksPath(directory).status, 1);
});

test('installation ignores Git environment overrides pointing to another checkout', (t) => {
  const directory = checkoutFixture(t);
  const other = checkoutFixture(t);
  const result = runInstaller(directory, {
    GIT_DIR: path.join(other, '.git'),
    GIT_WORK_TREE: other,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(hooksPath(directory).stdout.trim(), '.githooks');
  assert.equal(hooksPath(other).status, 1);
});

test('installation skips a Git checkout belonging to a different package', (t) => {
  const directory = checkoutFixture(t);
  writeFileSync(
    path.join(directory, 'package.json'),
    JSON.stringify({ name: 'consumer-project' })
  );
  assert.equal(runInstaller(directory).status, 0);
  assert.equal(hooksPath(directory).status, 1);
});
