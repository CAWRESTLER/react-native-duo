const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const objectNamePattern = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i;
const isZeroObject = (objectName) => /^0+$/.test(objectName);
const hasControlOrSpace = (value) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 32 || code === 127;
  });

function isRemoteRef(ref) {
  return (
    ref.startsWith('refs/') &&
    !hasControlOrSpace(ref) &&
    !/[~^:?*[\]\\]/.test(ref) &&
    !ref.includes('..') &&
    !ref.includes('@{') &&
    !ref.endsWith('.') &&
    ref
      .split('/')
      .every((part) => part && !part.startsWith('.') && !part.endsWith('.lock'))
  );
}

// Git sends all proposed destinations on stdin, including explicit refspecs,
// force pushes, tags, and deletions. The current branch cannot identify them.
function parsePushInput(input) {
  if (input === '') return [];
  const lines = input.split(/\r?\n/);
  if (lines[lines.length - 1] === '') lines.pop();
  let objectNameLength;

  return lines.map((line, index) => {
    const fields = line.split(/[ \t]+/);
    const [localRef, localObject, remoteRef, remoteObject] = fields;
    const malformed = () => {
      throw new Error(`Invalid Git update on line ${index + 1}.`);
    };
    if (
      fields.length !== 4 ||
      !localRef ||
      hasControlOrSpace(localRef) ||
      !objectNamePattern.test(localObject) ||
      !objectNamePattern.test(remoteObject) ||
      localObject.length !== remoteObject.length ||
      !isRemoteRef(remoteRef) ||
      (objectNameLength && localObject.length !== objectNameLength)
    ) {
      malformed();
    }
    objectNameLength = localObject.length;
    if (
      (localRef === '(delete)') !== isZeroObject(localObject) ||
      (isZeroObject(localObject) && isZeroObject(remoteObject))
    ) {
      malformed();
    }
    return { localRef, localObject, remoteRef, remoteObject };
  });
}

function getPushPolicy(updates) {
  if (updates.some((update) => update.remoteRef === 'refs/heads/main')) {
    return 'block-main';
  }
  const needsValidation = updates.some(
    ({ localObject, remoteObject, remoteRef }) =>
      localObject !== remoteObject &&
      !(isZeroObject(localObject) && remoteRef.startsWith('refs/heads/'))
  );
  return needsValidation ? 'validate' : 'skip';
}

function checkPush() {
  let updates;
  try {
    updates = parsePushInput(readFileSync(0, 'utf8'));
  } catch (error) {
    console.error(
      `[pre-push] Push blocked: could not read Git's update list. ${error.message}`
    );
    return 1;
  }

  const policy = getPushPolicy(updates);
  if (policy === 'block-main') {
    console.error(
      '[pre-push] Push blocked: direct updates to main, including force pushes and deletions, are disabled. Push a feature branch and open a pull request.'
    );
    return 1;
  }
  if (policy === 'skip') return 0;

  console.error('[pre-push] Running corepack yarn validate before pushing...');
  const result = spawnSync('corepack', ['yarn', 'validate'], {
    cwd: projectRoot,
    stdio: 'inherit',
    // Corepack is a command shim on Windows; these arguments are fixed.
    shell: process.platform === 'win32',
  });
  if (result.error) {
    console.error(
      `[pre-push] Push blocked: Corepack could not start (${result.error.message}). Use the Node version in .nvmrc and install dependencies with corepack yarn install.`
    );
    return 1;
  }
  if (result.signal || result.status !== 0) {
    console.error(
      '[pre-push] Push blocked: validation did not pass. Fix the reported issues and run corepack yarn validate before trying again.'
    );
    return result.status || 1;
  }
  console.error('[pre-push] Validation passed. Continuing the push.');
  return 0;
}

if (require.main === module) process.exitCode = checkPush();

module.exports = { parsePushInput, getPushPolicy };
