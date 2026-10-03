const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  readLockResolutions,
  validateCompatibility,
} = require('../check-compatibility');

function fixture() {
  const baseline = {
    schemaVersion: 1,
    node: 'v24.21.0',
    packageManager: 'yarn@4.11.0',
    react: '19.3.0',
    reactNative: '0.88.0-rc.1',
    expo: { declaration: '~58.0.0-preview.7', resolution: '58.0.0' },
    navigation: {
      'expo-router': { declaration: '~58.0.8', resolution: '58.0.10' },
      'react-native-screens': { declaration: '~4.28.0', resolution: '4.28.0' },
      'react-native-safe-area-context': {
        declaration: '~5.9.1',
        resolution: '5.9.1',
      },
    },
  };
  const root = {
    name: 'library',
    packageManager: baseline.packageManager,
    devDependencies: {
      'react': baseline.react,
      'react-native': baseline.reactNative,
      'react-test-renderer': baseline.react,
      '@react-native/babel-preset': baseline.reactNative,
      '@react-native/eslint-config': baseline.reactNative,
      '@react-native/jest-preset': baseline.reactNative,
    },
  };
  const example = {
    name: 'example',
    dependencies: {
      'react': baseline.react,
      'react-dom': baseline.react,
      'react-native': baseline.reactNative,
      'expo': baseline.expo.declaration,
      ...Object.fromEntries(
        Object.entries(baseline.navigation).map(([name, { declaration }]) => [
          name,
          declaration,
        ])
      ),
    },
    devDependencies: { '@react-native/metro-config': baseline.reactNative },
  };
  const declarations = new Map(
    [
      root.devDependencies,
      example.dependencies,
      example.devDependencies,
    ].flatMap((dependencies) => Object.entries(dependencies))
  );
  const lock = [...declarations]
    .map(([name, declaration]) => {
      const version =
        name === 'expo'
          ? baseline.expo.resolution
          : (baseline.navigation[name]?.resolution ?? declaration);
      return `"${name}@npm:${declaration}":\n  version: ${version}\n  resolution: "${name}@npm:${version}"\n`;
    })
    .join('\n');
  return { baseline, root, example, lock, nodeVersion: baseline.node };
}

test('accepts the locked preview declaration resolving to the recorded Expo release', () => {
  const inputs = fixture();
  assert.equal(validateCompatibility(inputs), inputs.baseline);
});

test('reads grouped Yarn descriptors and CRLF without confusing nested dependencies', () => {
  const lock =
    '"react@npm:19.3.0, react@npm:^19.3.0":\r\n  version: 19.3.0\r\n  resolution: "react@npm:19.3.0"\r\n  dependencies:\r\n    other: "npm:1.0.0"\r\n';
  assert.deepEqual(
    [...readLockResolutions(lock)],
    [
      ['react@npm:19.3.0', 'react@npm:19.3.0'],
      ['react@npm:^19.3.0', 'react@npm:19.3.0'],
    ]
  );
});

test('blocks runtime, renderer, tooling, and Expo declaration drift', () => {
  for (const [owner, section, dependency] of [
    ['root', 'devDependencies', 'react'],
    ['example', 'dependencies', 'react-native'],
    ['example', 'dependencies', 'react-dom'],
    ['root', 'devDependencies', 'react-test-renderer'],
    ['root', 'devDependencies', '@react-native/jest-preset'],
    ['example', 'devDependencies', '@react-native/metro-config'],
    ['example', 'dependencies', 'expo'],
  ]) {
    const inputs = fixture();
    inputs[owner][section][dependency] = '99.0.0';
    assert.throws(() => validateCompatibility(inputs), /declaration drifted/);
  }
});

test('blocks missing entries and changed range resolutions even with unchanged manifests', () => {
  const missing = fixture();
  missing.lock = missing.lock.replace(
    'expo@npm:~58.0.0-preview.7',
    'other@npm:1.0.0'
  );
  assert.throws(
    () => validateCompatibility(missing),
    /missing or changed Yarn resolution/
  );
  const changed = fixture();
  changed.lock = changed.lock.replace(
    'resolution: "expo@npm:58.0.0"',
    'resolution: "expo@npm:58.0.1"'
  );
  assert.throws(
    () => validateCompatibility(changed),
    /missing or changed Yarn resolution/
  );
});

test('checks each navigation declaration and its locked version independently', () => {
  for (const name of Object.keys(fixture().baseline.navigation)) {
    const declarationDrift = fixture();
    declarationDrift.example.dependencies[name] = '^99.0.0';
    assert.throws(
      () => validateCompatibility(declarationDrift),
      /declaration drifted/
    );

    const lockDrift = fixture();
    const expected = lockDrift.baseline.navigation[name];
    lockDrift.lock = lockDrift.lock.replace(
      `resolution: "${name}@npm:${expected.resolution}"`,
      `resolution: "${name}@npm:99.0.0"`
    );
    assert.throws(
      () => validateCompatibility(lockDrift),
      /missing or changed Yarn resolution/
    );

    const missing = fixture();
    missing.lock = missing.lock.replace(
      `${name}@npm:${expected.declaration}`,
      'other@npm:99.0.0'
    );
    assert.throws(
      () => validateCompatibility(missing),
      /missing or changed Yarn resolution/
    );
  }
});

test('checks installed example navigation metadata after installation without requiring it before installation', () => {
  const inputs = fixture();
  validateCompatibility(inputs);
  inputs.installedExampleDependencies = Object.fromEntries(
    Object.entries(inputs.baseline.navigation).map(([name, { resolution }]) => [
      name,
      resolution,
    ])
  );
  validateCompatibility(inputs);
  for (const name of Object.keys(inputs.baseline.navigation)) {
    const changed = JSON.parse(JSON.stringify(inputs));
    changed.installedExampleDependencies[name] = '99.0.0';
    assert.throws(
      () => validateCompatibility(changed),
      /installed example version differs/
    );
    const missing = JSON.parse(JSON.stringify(inputs));
    delete missing.installedExampleDependencies[name];
    assert.throws(
      () => validateCompatibility(missing),
      /installed example version differs/
    );
  }
});

test('records the direct example screens version rather than claiming its transitive range is identical', () => {
  const inputs = fixture();
  inputs.lock +=
    '\n"react-native-screens@npm:^4.28.0 || ^5.0.0-alpha.3":\n  version: 5.0.0-alpha.3\n  resolution: "react-native-screens@npm:5.0.0-alpha.3"\n';
  validateCompatibility(inputs);
});

test('blocks a second locked React or React Native runtime', () => {
  for (const name of ['react', 'react-native']) {
    const inputs = fixture();
    inputs.lock += `\n"${name}@npm:99.0.0":\n  version: 99.0.0\n  resolution: "${name}@npm:99.0.0"\n`;
    assert.throws(
      () => validateCompatibility(inputs),
      /Multiple or unexpected/
    );
  }
});

test('fails closed for duplicate descriptors and missing or ambiguous resolution scalars', () => {
  for (const lock of [
    '"react@npm:19.3.0":\n  version: 19.3.0\n',
    '"react@npm:19.3.0":\n  resolution: "react@npm:19.3.0"\n  resolution: "react@npm:19.3.1"\n',
    '"react@npm:19.3.0":\n  resolution: "react@npm:19.3.0"\n\n"react@npm:19.3.0":\n  resolution: "react@npm:19.3.0"\n',
  ])
    assert.throws(() => readLockResolutions(lock));
});

test('blocks baseline schema, Node-file, and package-manager drift', () => {
  for (const mutate of [
    (inputs) => {
      inputs.baseline.schemaVersion = 2;
    },
    (inputs) => {
      inputs.nodeVersion = 'v22.0.0';
    },
    (inputs) => {
      inputs.root.packageManager = 'yarn@5.0.0';
    },
  ]) {
    const inputs = fixture();
    mutate(inputs);
    assert.throws(() => validateCompatibility(inputs));
  }
});
