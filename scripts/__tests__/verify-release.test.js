const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  validateContext,
  selectCIRun,
  validateJobs,
  verifyReleaseTag,
  requiredJobs,
} = require('../verify-release');

const sha = 'a'.repeat(40);
const context = {
  repository: 'CAWRESTLER/react-native-duo',
  event: 'workflow_dispatch',
  ref: 'refs/heads/main',
  sha,
  confirmTesting: 'true',
  distTag: 'next',
};
const metadata = {
  name: '@cawrestler/react-native-duo',
  version: '0.1.0-next.0',
};
const successfulRun = {
  id: 1,
  head_sha: sha,
  head_branch: 'main',
  event: 'push',
  status: 'completed',
  conclusion: 'success',
};
const successfulJobs = requiredJobs.map((name) => ({
  name,
  status: 'completed',
  conclusion: 'success',
}));

test('accepts an explicitly confirmed prerelease from main', () => {
  assert.deepEqual(validateContext(context, metadata), {
    version: metadata.version,
    tag: 'v0.1.0-next.0',
    distTag: 'next',
  });
});

test('allows an absent tag but fails closed on Git lookup errors', () => {
  const commands = [];
  verifyReleaseTag(
    (args) => {
      commands.push(args);
      throw Object.assign(new Error('Absent ref'), { status: 1 });
    },
    'v0.1.0',
    sha
  );
  assert.deepEqual(commands, [
    ['show-ref', '--verify', '--quiet', 'refs/tags/v0.1.0'],
  ]);
  assert.throws(() =>
    verifyReleaseTag(
      () => {
        throw Object.assign(new Error('Git error'), { status: 128 });
      },
      'v0.1.0',
      sha
    )
  );
});

test('an existing tag must identify the exact commit, not another commit or a blob', () => {
  const git = (target) => (args) => (args[0] === 'show-ref' ? '' : target);
  verifyReleaseTag(git(sha), 'v0.1.0', sha);
  assert.throws(() => verifyReleaseTag(git('b'.repeat(40)), 'v0.1.0', sha));
  assert.throws(() =>
    verifyReleaseTag(
      (args) => {
        if (args[0] === 'show-ref') return '';
        throw Object.assign(new Error('Not a commit'), { status: 128 });
      },
      'v0.1.0',
      sha
    )
  );
});

test('rejects publishing from a fork, branch, automatic event, or unconfirmed run', () => {
  for (const changes of [
    { repository: 'other/fork' },
    { ref: 'refs/heads/feature' },
    { event: 'push' },
    { sha: 'invalid' },
    { confirmTesting: 'false' },
    { distTag: 'custom' },
  ])
    assert.throws(() => validateContext({ ...context, ...changes }, metadata));
});

test('prevents a prerelease from replacing latest and rejects ambiguous versions', () => {
  assert.throws(() =>
    validateContext({ ...context, distTag: 'latest' }, metadata)
  );
  for (const version of [
    '01.0.0',
    '0.1.0-next.01',
    '0.1.0+build',
    'not-a-version',
  ]) {
    assert.throws(() => validateContext(context, { ...metadata, version }));
  }
  assert.equal(
    validateContext(
      { ...context, distTag: 'latest' },
      { ...metadata, version: '0.1.0' }
    ).distTag,
    'latest'
  );
});

test('requires CI for the exact main commit, not a pull request or another SHA', () => {
  assert.equal(selectCIRun([successfulRun], sha).id, 1);
  for (const changes of [
    { head_sha: 'b'.repeat(40) },
    { head_branch: 'feature' },
    { event: 'pull_request' },
  ]) {
    assert.throws(() => selectCIRun([{ ...successfulRun, ...changes }], sha));
  }
});

test('does not accept an old success while a newer run is pending or failed', () => {
  for (const changes of [
    { status: 'in_progress', conclusion: null },
    { conclusion: 'failure' },
    { conclusion: 'cancelled' },
  ]) {
    assert.throws(() =>
      selectCIRun([successfulRun, { ...successfulRun, id: 2, ...changes }], sha)
    );
  }
});

test('requires every job, including native builds and the merge gate, to succeed', () => {
  validateJobs(successfulJobs);
  for (const name of requiredJobs) {
    assert.throws(() =>
      validateJobs(successfulJobs.filter((job) => job.name !== name))
    );
    for (const conclusion of ['failure', 'skipped', 'cancelled']) {
      assert.throws(() =>
        validateJobs(
          successfulJobs.map((job) =>
            job.name === name ? { ...job, conclusion } : job
          )
        )
      );
    }
  }
});
