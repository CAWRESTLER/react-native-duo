# Contributing

The repository contains the library at the root and the official Duo Lab RN application in `example/`. Follow the [code of conduct](./CODE_OF_CONDUCT.md) when discussing or contributing changes.

## Development

Use the Node version in [`.nvmrc`](./.nvmrc) and the checked-in Yarn version. Install from the repository root:

```sh
corepack enable
yarn install --immutable
```

The example consumes the local library workspace. JavaScript changes reload through Metro; changes under `ios/`, codegen specifications, or the config plugin require a new development build.

```sh
yarn example start
yarn example ios --device "iPhone Duo"
```

The native Duo implementation needs Xcode 27.1+, the iOS 27.1 SDK, the New Architecture, and an iPhone Duo simulator or device for hardware behavior. Its runtime availability checks do not make the native source compile with an older SDK. See the [README requirements](./README.md#requirements) for the tested React Native/Expo versions.

After native changes, regenerate and rebuild the example:

```sh
yarn example:ios:clean --device "iPhone Duo"
```

`expo prebuild --clean` recreates generated platform projects. Keep manual native experiments in the package's `ios/` source or a config plugin so prebuild can reproduce them. To use Xcode, open the generated `example/ios/*.xcworkspace`; the library appears under the `ReactNativeDuo` development pod.

Other development commands:

```sh
yarn example android
yarn example web
yarn example build:web
yarn typecheck
yarn lint
yarn test --runInBand
yarn example typecheck
yarn pack:check
```

`pack:check` builds the distributable output, extracts a real npm tarball into a temporary directory, validates its entry points/types/native sources, and runs the packed Expo config plugin. It checks that the example application and native build outputs stay out of the npm package. It never publishes anything.

## Validation before a release

Run `yarn prepublishOnly` and the example's type check. Build the native example with Xcode 27.1+ and verify all seven screens against the Swift lab in Open, partial/Book, and compact poses. Test scrolling, navigation, tab selection, toolbar actions, overflow, arrangement controls, scene accessory registration, and user-triggered camera permission. Camera discovery and accessory availability depend on simulator/device support; record unavailable hardware paths rather than describing them as fully tested.

CI checks package lint/types/tests, distribution contents, and example builds on Android, iOS, and web. The iOS job requires a runner image that includes Xcode 27.1; GitHub runner availability is separate from the source code's SDK support. A passing JavaScript distribution check alone does not establish native or visual parity.

## Publishing

The package publishes publicly as `@cawrestler/react-native-duo`. A release also pushes a `v<version>` git tag and creates a matching GitHub release. Setup needed before the first publication:

- Push the reviewed source to `CAWRESTLER/react-native-duo` on GitHub.
- Confirm the npm account can publish under the `@cawrestler` scope, then authenticate with `npm login` and satisfy npm's publishing authentication requirements.
- Supply `GITHUB_TOKEN` with access to create repository releases.
- Work from a clean, current `main` branch and review the [changelog](./CHANGELOG.md).

Verify the package and inspect the proposed release:

```sh
yarn install --immutable
yarn prepublishOnly
yarn example typecheck
yarn release:dry-run --no-increment
```

The initial version in `package.json` is `0.1.0`. Publish that version using the no-increment flow once the source is committed and all release checks pass:

```sh
yarn release --no-increment
```

Subsequent releases increment the version:

```sh
yarn release patch
```

Use `minor`, `major`, or an exact version as appropriate. `release-it` prompts for the version and release operations, updates the package/changelog, commits, tags, publishes to npm with public access, pushes, and creates the GitHub release. `--only-version` means only the version is prompted for and the remaining operations are automated; it is not a preview or version-only edit. Preview operations with `release:dry-run`. See the [release-it documentation](https://github.com/release-it/release-it#interactive-vs-ci-mode).

Do not reuse an already published version. If npm publishing succeeds and a later GitHub step fails, inspect the recorded state before retrying; do not blindly publish again. For an initial SDK preview release, choose a prerelease version and npm `next` tag if the support policy should remain experimental.

The npm tarball includes the native podspec and config plugin. The example lives on GitHub, and the host application installs pods normally; there is no separate CocoaPods registry publication to perform. Nothing in CI publishes automatically.

## Pull requests

Describe the observable behavior and how you verified it. Include the affected screen and fold pose for UI changes, and note any capability that could only be tested on hardware. Use conventional commit titles (`fix:`, `feat:`, `docs:`, and similar) so release notes can be generated. Keep changes focused and update usage documentation when the public API changes.
