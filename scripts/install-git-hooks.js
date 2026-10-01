const { spawnSync } = require('node:child_process');
const { existsSync, readFileSync, realpathSync } = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const hookCommand = 'git config --local core.hooksPath .githooks';
const repositoryEnvironment = new Set([
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_COMMON_DIR',
  'GIT_INDEX_FILE',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_NAMESPACE',
  'GIT_PREFIX',
  'GIT_CONFIG',
]);

function installGitHooks() {
  const isEnabled = (value) => value && !/^(?:false|0)$/i.test(value);
  if (isEnabled(process.env.CI) || isEnabled(process.env.GITHUB_ACTIONS)) {
    console.log('[git-hooks] Skipping local Git hooks in CI.');
    return 0;
  }

  // Published packages include this lifecycle helper, but omit the hooks.
  // A dependency install must never configure its consumer's repository.
  if (
    !existsSync(path.join(projectRoot, '.git')) ||
    !existsSync(path.join(projectRoot, '.githooks', 'pre-push')) ||
    !existsSync(path.join(projectRoot, 'scripts', 'check-push.js'))
  ) {
    return 0;
  }
  try {
    const metadata = JSON.parse(
      readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
    );
    if (metadata.name !== '@cawrestler/react-native-duo') return 0;
  } catch {
    return 0;
  }

  // Ignore repository overrides inherited from another Git process so every
  // lookup and config write stays in the checkout containing this script.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !repositoryEnvironment.has(key)
    )
  );
  const git = (args) =>
    spawnSync('git', ['-C', projectRoot, ...args], {
      env,
      encoding: 'utf8',
    });
  const checkout = git(['rev-parse', '--show-toplevel']);
  if (checkout.error || checkout.status !== 0) {
    console.log(
      '[git-hooks] Skipping local Git hooks: a Git checkout is unavailable.'
    );
    return 0;
  }
  try {
    if (realpathSync(checkout.stdout.trim()) !== realpathSync(projectRoot)) {
      return 0;
    }
  } catch {
    return 0;
  }

  const existing = git(['config', '--get', 'core.hooksPath']);
  if (existing.error || ![0, 1].includes(existing.status)) {
    console.error('[git-hooks] Unable to read the existing Git hook settings.');
    return 1;
  }
  const existingPath = existing.stdout.replace(/\r?\n$/, '');
  if (existing.status === 0 && existingPath !== '.githooks') {
    console.log(
      `[git-hooks] Keeping your existing core.hooksPath (${JSON.stringify(existingPath)}). To opt into this repository's hooks, run from its root: ${hookCommand}`
    );
    return 0;
  }

  const installed = git(['config', '--local', 'core.hooksPath', '.githooks']);
  if (installed.error || installed.status !== 0) {
    console.error(
      `[git-hooks] Unable to install local Git hooks. Run from the repository root: ${hookCommand}`
    );
    return 1;
  }
  console.log(
    '[git-hooks] Repository-local pre-push safeguards are installed.'
  );
  return 0;
}

if (require.main === module) process.exitCode = installGitHooks();

module.exports = { installGitHooks };
