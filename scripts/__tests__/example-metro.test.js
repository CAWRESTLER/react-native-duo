const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

test('the example watches live library source without replacing Expo defaults', () => {
  const exampleRoot = path.resolve(__dirname, '..', '..', 'example');
  const { getDefaultConfig } = require(
    path.join(exampleRoot, 'node_modules', 'expo', 'metro-config')
  );
  const defaults = getDefaultConfig(exampleRoot);
  const config = require(path.join(exampleRoot, 'metro.config.js'));

  assert.equal(config.projectRoot, exampleRoot);
  assert.ok(
    config.watchFolders.includes(path.resolve(exampleRoot, '..', 'src'))
  );
  for (const folder of defaults.watchFolders ?? []) {
    assert.ok(config.watchFolders.includes(folder));
  }
  assert.equal(new Set(config.watchFolders).size, config.watchFolders.length);
  assert.ok(
    config.resolver.unstable_conditionNames.includes(
      'cawrestler-react-native-duo-source'
    )
  );
});
