const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const navigationDependencies = [
  'expo-router',
  'react-native-screens',
  'react-native-safe-area-context',
];

// Read only the quoted descriptors and resolution scalars that Yarn 4 emits.
// This is not a general YAML parser; missing/ambiguous entries fail closed.
function readLockResolutions(lock) {
  const resolutions = new Map();
  const blocks = lock
    .replace(/\r\n?/g, '\n')
    .matchAll(/^("[^\n]+"):\n((?:[ \t][^\n]*\n|\n)*)/gm);
  for (const [, key, body] of blocks) {
    const resolutionLines = [
      ...body.matchAll(/^ {2}resolution: ("[^\n]+")$/gm),
    ];
    assert.equal(
      resolutionLines.length,
      1,
      `Expected one Yarn resolution for ${key}.`
    );
    const resolution = JSON.parse(resolutionLines[0][1]);
    for (const descriptor of JSON.parse(key).split(', ')) {
      assert(
        !resolutions.has(descriptor),
        `Duplicate Yarn entry: ${descriptor}`
      );
      resolutions.set(descriptor, resolution);
    }
  }
  return resolutions;
}

function validateCompatibility({
  baseline,
  root,
  example,
  lock,
  nodeVersion,
  installedExampleDependencies,
}) {
  assert.equal(
    baseline.schemaVersion,
    1,
    'Unknown compatibility baseline schema.'
  );
  for (const value of [
    baseline.react,
    baseline.reactNative,
    baseline.expo?.resolution,
    ...navigationDependencies.map(
      (name) => baseline.navigation?.[name]?.resolution
    ),
  ]) {
    assert.equal(
      typeof value,
      'string',
      'Baseline runtime versions are required.'
    );
    assert.match(value, /^\d+\.\d+\.\d+(?:-[\dA-Za-z.-]+)?$/);
  }
  assert.equal(
    nodeVersion.trim(),
    baseline.node,
    '.nvmrc drifted from the baseline.'
  );
  assert.equal(
    root.packageManager,
    baseline.packageManager,
    'Yarn version drifted from the baseline.'
  );

  const resolutions = readLockResolutions(lock);
  const requireDependency = (
    metadata,
    section,
    name,
    declaration,
    resolved
  ) => {
    assert.equal(
      metadata[section]?.[name],
      declaration,
      `${metadata.name}: ${name} declaration drifted from the baseline.`
    );
    assert.equal(
      resolutions.get(`${name}@npm:${declaration}`),
      `${name}@npm:${resolved}`,
      `${name}: missing or changed Yarn resolution; review the compatibility baseline.`
    );
  };

  for (const [name, version] of [
    ['react', baseline.react],
    ['react-native', baseline.reactNative],
  ]) {
    requireDependency(root, 'devDependencies', name, version, version);
    requireDependency(example, 'dependencies', name, version, version);
    const runtimeResolutions = new Set(
      [...resolutions.values()].filter((resolution) =>
        resolution.startsWith(`${name}@npm:`)
      )
    );
    assert.deepEqual(
      [...runtimeResolutions],
      [`${name}@npm:${version}`],
      `Multiple or unexpected ${name} runtimes are locked in the workspace.`
    );
  }
  requireDependency(
    example,
    'dependencies',
    'react-dom',
    baseline.react,
    baseline.react
  );
  requireDependency(
    root,
    'devDependencies',
    'react-test-renderer',
    baseline.react,
    baseline.react
  );
  for (const name of [
    '@react-native/babel-preset',
    '@react-native/eslint-config',
    '@react-native/jest-preset',
  ]) {
    requireDependency(
      root,
      'devDependencies',
      name,
      baseline.reactNative,
      baseline.reactNative
    );
  }
  requireDependency(
    example,
    'devDependencies',
    '@react-native/metro-config',
    baseline.reactNative,
    baseline.reactNative
  );
  requireDependency(
    example,
    'dependencies',
    'expo',
    baseline.expo.declaration,
    baseline.expo.resolution
  );
  for (const name of navigationDependencies) {
    const expected = baseline.navigation[name];
    assert.equal(
      typeof expected.declaration,
      'string',
      `${name}: baseline declaration is required.`
    );
    requireDependency(
      example,
      'dependencies',
      name,
      expected.declaration,
      expected.resolution
    );
    if (installedExampleDependencies !== undefined) {
      assert.equal(
        installedExampleDependencies[name],
        expected.resolution,
        `${name}: installed example version differs from the baseline; install the reviewed lockfile.`
      );
    }
  }
  return baseline;
}

function checkCompatibility(
  projectRoot = path.resolve(__dirname, '..'),
  { verifyInstalled = false } = {}
) {
  const read = (file) => readFileSync(path.join(projectRoot, file), 'utf8');
  // The release verifier runs before installation. The CLI/CI guard runs after
  // immutable installation and also checks what resolves from the example.
  const installedExampleDependencies = verifyInstalled
    ? Object.fromEntries(
        navigationDependencies.map((name) => {
          const metadataPath = require.resolve(`${name}/package.json`, {
            paths: [path.join(projectRoot, 'example')],
          });
          const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
          assert.equal(
            metadata.name,
            name,
            `Unexpected installed package: ${name}`
          );
          return [name, metadata.version];
        })
      )
    : undefined;
  return validateCompatibility({
    baseline: JSON.parse(read('docs/compatibility-baseline.json')),
    root: JSON.parse(read('package.json')),
    example: JSON.parse(read('example/package.json')),
    lock: read('yarn.lock'),
    nodeVersion: read('.nvmrc'),
    installedExampleDependencies,
  });
}

if (require.main === module) {
  try {
    const baseline = checkCompatibility(undefined, { verifyInstalled: true });
    console.log(
      `Compatibility baseline aligned: React ${baseline.react}, RN ${baseline.reactNative}, Expo ${baseline.expo.resolution}, ${baseline.node}, ${baseline.packageManager}.`
    );
    console.log(
      `Installed example navigation aligned: ${navigationDependencies.map((name) => `${name} ${baseline.navigation[name].resolution}`).join(', ')}.`
    );
    console.log(
      'Metadata/lockfile/installed-version consistency only; no app, UI, or hardware certification.'
    );
  } catch (error) {
    console.error(`Compatibility baseline blocked: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  checkCompatibility,
  readLockResolutions,
  validateCompatibility,
};
