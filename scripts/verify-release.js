const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const repository = 'CAWRESTLER/react-native-duo';
const requiredJobs = [
  'lint',
  'test',
  'build-library',
  'build-android',
  'build-ios',
  'build-web',
  'CI Required',
];

function validateContext(context, metadata) {
  assert.equal(
    context.repository,
    repository,
    'Publish only from the canonical repository.'
  );
  assert.equal(
    context.event,
    'workflow_dispatch',
    'Publishing requires a manual workflow run.'
  );
  assert.equal(
    context.ref,
    'refs/heads/main',
    'Select main when running the publishing workflow.'
  );
  assert.match(
    context.sha ?? '',
    /^[a-f\d]{40}$/,
    'A full GitHub commit SHA is required.'
  );
  assert.equal(
    context.confirmTesting,
    'true',
    'Confirm the native/device release testing first.'
  );
  assert(
    ['next', 'latest'].includes(context.distTag),
    'Choose the next or latest npm channel.'
  );
  assert.equal(metadata.name, '@cawrestler/react-native-duo');
  assert.match(
    metadata.version ?? '',
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[\dA-Za-z-]+(\.[\dA-Za-z-]+)*)?$/,
    'The committed package must have a release version without build metadata.'
  );
  const prerelease = metadata.version.split('-').slice(1).join('-');
  if (prerelease) {
    for (const identifier of prerelease.split('.')) {
      assert(
        !/^0\d+$/.test(identifier),
        'Numeric prerelease identifiers cannot have leading zeroes.'
      );
    }
    assert.equal(
      context.distTag,
      'next',
      'Prereleases cannot be published to latest.'
    );
  }
  return {
    version: metadata.version,
    tag: `v${metadata.version}`,
    distTag: context.distTag,
  };
}

function selectCIRun(runs, sha) {
  const matching = runs
    .filter(
      (run) =>
        run.head_sha === sha &&
        run.head_branch === 'main' &&
        run.event === 'push'
    )
    .sort((a, b) => b.id - a.id);
  const run = matching[0];
  assert(run, 'No main-branch CI run exists for this exact commit.');
  assert.equal(
    run.status,
    'completed',
    'Wait for the latest CI run on this commit to finish.'
  );
  assert.equal(
    run.conclusion,
    'success',
    'The latest main CI run must pass before publication.'
  );
  return run;
}

function validateJobs(jobs) {
  for (const name of requiredJobs) {
    const job = jobs.find((entry) => entry.name === name);
    assert(job, `Missing required CI job: ${name}`);
    assert.equal(job.status, 'completed', `${name} has not completed.`);
    assert.equal(job.conclusion, 'success', `${name} did not succeed.`);
  }
}

function verifyReleaseTag(git, tag, sha) {
  const ref = `refs/tags/${tag}`;
  try {
    git(['show-ref', '--verify', '--quiet', ref]);
  } catch (error) {
    if (error.status === 1) return;
    throw error;
  }
  // An existing tag must peel to a commit. A tree/blob tag is not a missing tag.
  const target = git(['rev-parse', '--verify', `${ref}^{commit}`]);
  assert.equal(
    target,
    sha,
    'The release tag already points to a different commit.'
  );
}

function verifyRelease() {
  const projectRoot = path.resolve(__dirname, '..');
  const metadata = JSON.parse(
    readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
  );
  const context = {
    repository: process.env.GITHUB_REPOSITORY,
    event: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    sha: process.env.GITHUB_SHA,
    confirmTesting: process.env.CONFIRM_TESTING,
    distTag: process.env.DIST_TAG,
  };
  const release = validateContext(context, metadata);
  const git = (args) =>
    execFileSync('git', args, { cwd: projectRoot, encoding: 'utf8' }).trim();
  assert.equal(
    git(['rev-parse', 'HEAD']),
    context.sha,
    'The checkout must match the requested commit.'
  );
  git(['merge-base', '--is-ancestor', context.sha, 'origin/main']);

  const api = (endpoint) =>
    JSON.parse(
      execFileSync('gh', ['api', '--method', 'GET', endpoint], {
        cwd: projectRoot,
        encoding: 'utf8',
      })
    );
  const runs = api(
    `repos/${repository}/actions/workflows/ci.yml/runs?head_sha=${context.sha}&event=push&per_page=100`
  );
  const run = selectCIRun(runs.workflow_runs, context.sha);
  validateJobs(
    api(`repos/${repository}/actions/runs/${run.id}/jobs?per_page=100`).jobs
  );

  verifyReleaseTag(git, release.tag, context.sha);
  console.log(
    `Verified ${metadata.name}@${release.version}: ${context.sha}, CI run ${run.id}, npm ${release.distTag}.`
  );
  return release;
}

if (require.main === module) {
  try {
    verifyRelease();
  } catch (error) {
    console.error(`Release blocked: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  validateContext,
  selectCIRun,
  validateJobs,
  verifyReleaseTag,
  requiredJobs,
};
