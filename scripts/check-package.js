const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const {
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
} = require('node:fs');
const { createRequire } = require('node:module');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { validateReleaseNotes } = require('./verify-release');

// Inspect the actual consumer artifact rather than the workspace symlink.
const projectRoot = path.resolve(__dirname, '..');

async function checkPackage() {
  const temporaryDirectory = realpathSync(
    mkdtempSync(path.join(tmpdir(), 'react-native-duo-pack-'))
  );
  try {
    const [artifact] = JSON.parse(
      execFileSync(
        'npm',
        [
          'pack',
          '--ignore-scripts',
          // Older npm versions still run prepare while packing. Keep any
          // lifecycle output off stdout so it cannot corrupt the JSON result.
          '--foreground-scripts=false',
          '--json',
          '--pack-destination',
          temporaryDirectory,
        ],
        { cwd: projectRoot, encoding: 'utf8' }
      )
    );
    assert(artifact, 'npm pack must produce one package');
    const files = new Set(artifact.files.map((file) => file.path));
    const contains = (file) =>
      assert(files.has(file.replace(/^\.\//, '')), `Missing ${file}`);

    execFileSync('tar', [
      '-xf',
      path.join(temporaryDirectory, artifact.filename),
      '-C',
      temporaryDirectory,
    ]);
    const packageRoot = path.join(temporaryDirectory, 'package');
    const metadata = JSON.parse(
      readFileSync(path.join(packageRoot, 'package.json'), 'utf8')
    );

    contains(metadata.main);
    contains(metadata.types);
    const checkExports = (value) => {
      if (typeof value === 'string') contains(value);
      else Object.values(value).forEach(checkExports);
    };
    checkExports(metadata.exports);
    for (const file of [
      'LICENSE',
      'README.md',
      'CHANGELOG.md',
      'RELEASE_NOTES.md',
      'ReactNativeDuo.podspec',
      'ios/RNDuoUtilities.h',
      'ios/RNDuoUtilities.mm',
      'ios/RNDuoCameraLifecycle.h',
      'ios/RNDuoNavigationToolbarVisibility.h',
      'docs/NAVIGATION.md',
      'docs/COMPATIBILITY.md',
      'docs/API_COVERAGE.md',
      'docs/compatibility-baseline.json',
      'app.plugin.js',
      'scripts/install-git-hooks.js',
      'lib/module/package.json',
      'lib/typescript/src/types.d.ts',
      'lib/module/context.js',
      'lib/module/native/events.js',
      'lib/module/native/layout.js',
      'src/index.tsx',
      'android/build.gradle',
      'android/src/main/AndroidManifest.xml',
      'android/src/main/java/com/cawrestler/reactnativeduo/ReactNativeDuoPackage.kt',
    ])
      contains(file);
    for (const component of Object.values(
      metadata.codegenConfig.ios.components
    )) {
      contains(`ios/${component.className}.h`);
      contains(`ios/${component.className}.mm`);
    }
    for (const component of [
      'Provider',
      'GeometryView',
      'ArrangementView',
      'AdaptiveToolbar',
      'NavigationToolbar',
      'CameraView',
      'SceneAccessory',
    ]) {
      contains(`lib/module/Duo${component}.js`);
      contains(`lib/module/Duo${component}.ios.js`);
    }
    for (const spec of [
      'Environment',
      'Arrangement',
      'Toolbar',
      'NavigationToolbar',
      'Camera',
      'SceneAccessory',
    ]) {
      contains(
        `${metadata.codegenConfig.jsSrcsDir}/native/Duo${spec}NativeComponent.ts`
      );
      // Bob preserves codegen specs as TypeScript so the consuming Metro/Babel
      // pipeline can apply React Native's codegen transform.
      contains(`lib/module/native/Duo${spec}NativeComponent.ts`);
    }
    for (const file of files) {
      assert(
        !/(^|\/)(example|node_modules|Pods|build|generated|\.github|\.git|__tests__|__fixtures__|__mocks__)(\/|$)/.test(
          file
        ),
        `Development or generated files leaked into the package: ${file}`
      );
      assert(
        !/\.(tgz|ipa|apk|aab|xcarchive)$/.test(file),
        `Build artifact leaked into the package: ${file}`
      );
    }
    assert.equal(metadata.publishConfig.access, 'public');
    assert.equal(
      metadata.publishConfig.registry,
      'https://registry.npmjs.org/'
    );
    if (metadata.version.includes('-')) {
      assert.equal(
        metadata.publishConfig.tag,
        'next',
        'Preview tarballs must default to the next npm channel.'
      );
    }
    validateReleaseNotes(
      readFileSync(path.join(packageRoot, 'RELEASE_NOTES.md'), 'utf8'),
      metadata
    );
    assert(
      readFileSync(path.join(packageRoot, 'CHANGELOG.md'), 'utf8')
        .split(/\r?\n/)
        .some((line) => {
          if (!/^#{1,3} /.test(line)) return false;
          const heading = line.replace(/^#{1,3} /, '');
          return (
            heading === metadata.version ||
            heading.startsWith(`${metadata.version} `) ||
            heading.startsWith(`[${metadata.version}](`)
          );
        }),
      'The packed changelog must include the exact release version.'
    );
    for (const file of files) {
      assert(
        !file.startsWith('scripts/') || file === 'scripts/install-git-hooks.js',
        `Repository tooling leaked into the package: ${file}`
      );
    }
    execFileSync(
      process.execPath,
      [path.join(packageRoot, 'scripts', 'install-git-hooks.js')],
      { cwd: packageRoot, env: { ...process.env, CI: '', GITHUB_ACTIONS: '' } }
    );

    // Dependencies come from the checkout, but all package entry points and plugin
    // code come from the extracted tarball. No network install is needed.
    symlinkSync(
      path.join(projectRoot, 'node_modules'),
      path.join(packageRoot, 'node_modules'),
      'junction'
    );
    const consumerRequire = createRequire(
      path.join(packageRoot, 'package.json')
    );
    assert.equal(
      consumerRequire.resolve(metadata.name),
      path.join(packageRoot, metadata.main)
    );
    for (const subpath of [
      'app.plugin',
      'app.plugin.js',
      'jest',
      'package.json',
    ]) {
      consumerRequire.resolve(`${metadata.name}/${subpath}`);
    }
    const { withPlugins } = consumerRequire('@expo/config-plugins');
    const runPlugin = async (options, infoPlist) => {
      const config = withPlugins(
        {
          name: 'Package smoke test',
          slug: 'package-smoke-test',
          _internal: { projectRoot: packageRoot },
        },
        [[metadata.name, options]]
      );
      const result = await config.mods.ios.infoPlist({
        ...config,
        modResults: infoPlist,
        modRequest: {
          projectRoot: packageRoot,
          platform: 'ios',
          modName: 'infoPlist',
        },
      });
      return result.modResults.NSCameraUsageDescription;
    };
    assert.equal(
      await runPlugin({ cameraPermission: 'Use the Duo cameras.' }, {}),
      'Use the Duo cameras.'
    );
    assert.equal(
      await runPlugin({}, { NSCameraUsageDescription: 'Existing permission.' }),
      'Existing permission.'
    );
    assert.equal(typeof (await runPlugin({}, {})), 'string');

    console.log(
      `Validated ${metadata.name}@${metadata.version}: ${files.size} files, ${(artifact.size / 1024).toFixed(1)} kB packed.`
    );
    console.log(
      'JavaScript, platform variants, types, codegen, native sources, podspec, Expo plugin, and version-matched release notes passed. Demo and build outputs are excluded.'
    );
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

checkPackage().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
