# Contributing

The repository contains the library at the root and the official Duo Lab RN application in `example/`. Follow the [code of conduct](./CODE_OF_CONDUCT.md) when discussing or contributing changes.

## Development

Use Node 24.21.0 from [`.nvmrc`](./.nvmrc) and the checked-in Yarn version. Install from the repository root:

```sh
corepack enable
yarn install --immutable
```

Installation configures the repository-local hooks in `.githooks/`. Reinstall them with `yarn hooks:install` if needed. The installer skips CI and packaged consumers. It preserves an existing custom `core.hooksPath` and prints an explicit opt-in command instead of replacing it.

The pre-push hook blocks any destination update to `main`, including force pushes and deletions. Feature branch and tag updates run `corepack yarn validate` before pushing; pushing commits from local `main` to a feature branch is allowed. Empty pushes and feature-branch deletions skip validation. Missing tools, malformed Git input, and failed or interrupted validation block the push.

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
yarn validate
yarn typecheck
yarn lint
yarn test:tooling
yarn test --runInBand
yarn example typecheck
yarn pack:check
```

`validate` runs the compatibility baseline guard, lint, library and example type checks, the repository/release tooling tests, library tests, and `pack:check`. `prepublishOnly` runs the same validation. `pack:check` builds the distributable output, extracts a real npm tarball into a temporary directory, validates its entry points/types/native sources, and runs the packed Expo config plugin. It checks that the example application and native build outputs stay out of the npm package. These commands do not publish.

The camera and navigation visibility policy tests compile the same C++ helpers used by the native views. They need a C++17 compiler (`c++` by default, or the compiler executable selected by `CXX`). Xcode's command-line tools provide it on macOS; install a C++ build toolchain for Linux development. These policy tests are not a substitute for UIKit/AVFoundation interaction tests.

## Pull requests and protected main

Work on a feature branch, push it, and open a pull request targeting `main`. The `Protect main` server ruleset requires a pull request, resolved review conversations, an up-to-date branch, and a successful `CI Required` check. That check requires all six jobs to succeed: `lint`, `test`, `build-library`, `build-android`, `build-ios`, and `build-web`. Failed, cancelled, and skipped jobs cannot authorize a merge. Squash merging preserves the required linear history; main deletions and force updates are blocked.

The solo maintainer can merge their own pull request after those requirements pass: the required approving review count is zero, so a second person's approval is not required. The ruleset has no owner or administrator bypass. Local hooks can be bypassed on a developer's machine; the server rule remains the merge authority.

Describe the observable behavior and how you verified it. Include the affected screen and fold pose for UI changes, and note any capability that could only be tested on hardware. Use conventional pull request titles (`fix:`, `feat:`, `docs:`, and similar) so squash commits produce useful release notes. Keep changes focused and update usage documentation when the public API changes.

## Validation before a release

Run `yarn validate`. Build the native example with Xcode 27.1+ and verify all seven screens against the Swift lab in Open, partial/Book, and compact poses. Test scrolling, navigation, tab selection, toolbar actions, overflow, arrangement controls, scene accessory registration, and user-triggered camera permission. Record the tested commit, device/simulator, and results in the release pull request. Camera discovery and accessory availability depend on simulator/device support; record unavailable hardware paths rather than describing them as fully tested.

CI checks package lint/types/tests, distribution contents, and example builds on Android, iOS, and web. The required iOS job uses the `xcode-27` runner label and needs Xcode 27.1 with its SDK. An unavailable runner leaves CI pending and blocks merge/publication. Passing automated checks alone does not establish native behavior or visual parity.

## Publishing

The public package name is `@cawrestler/react-native-duo`. npm keeps a `latest` tag on every package; an attempt to remove the first preview's alias returned HTTP 400. Until a stable `0.1.0` exists, `latest` follows the newest preview so an unqualified install never resolves to an older preview (as of 2026-10-07 both tags point to `0.1.0-preview.2`). The alias does not make the preview stable. Previews still publish through the workflow to `next`; afterwards, move `latest` with `npm dist-tag add @cawrestler/react-native-duo@<version> latest`. Check current tags rather than assuming this historical state is unchanged. Preparing a version and notes is not permission to publish it. Confirm trusted-publisher setup before relying on the OIDC workflow.

### Prepare a release pull request

Use a clean branch named `release-*` based on current `origin/main`. Local `release-it` only updates the version and [changelog](./CHANGELOG.md): automatic Git commit, tag, and push, npm publishing, and GitHub release creation are all disabled. Release commands are restricted to release branches.

```sh
git fetch origin
git switch -c release-0.1.1 origin/main
yarn release:dry-run patch
yarn release patch
yarn validate
git diff -- package.json CHANGELOG.md yarn.lock
```

Use `minor`, `major`, or an exact unused version as appropriate. For the already-prepared `0.1.0-preview.2` candidate, do not increment the version again. Before committing any release:

- Check `package.json`, [CHANGELOG.md](./CHANGELOG.md), and [RELEASE_NOTES.md](./RELEASE_NOTES.md) refer to the same version.
- Make the first line of `RELEASE_NOTES.md` exactly `# @cawrestler/react-native-duo <version>` and review the body. Include supported capabilities, requirements, known gaps, and installation guidance; do not claim unverified hardware behavior or independent RN windows.
- Keep `publishConfig.tag` as `next` for previews. Change it deliberately for a stable release; the workflow also requires previews to use `next`.
- Run `yarn install --immutable` and `yarn validate`. Review any lockfile changes, the packed version/notes, and distribution contents.
- Run `yarn check:compatibility` and review [the compatibility checklist](./docs/COMPATIBILITY.md), including navigation ownership, rotation, draft preservation, and touch/scroll behavior. Record native/manual/device evidence for the release commit; unavailable or unverified paths must remain explicit. Passing the baseline guard does not certify a consuming app.

Commit the reviewed release files and any lockfile changes, push the release branch, and open a pull request. Merge only after `CI Required` succeeds and the native/visual test evidence has been reviewed. Keep implementation changes, regression tests, compatibility evidence, and release metadata together. Do not reuse the published preview.1 version.

### npm setup after first publication

The first publication bootstrap has completed for preview.1. npm requires the package to exist before its trusted publisher can be configured, as documented in [npm trust prerequisites](https://docs.npmjs.com/cli/v11/commands/npm-trust/#prerequisites). The package now satisfies that prerequisite, but existence alone does not establish that the trusted publisher has been configured or verified. Check package settings before any subsequent release; do not rerun the first publication or reuse its version.

Repository setup, branch pushes, release preparation, and compatibility checks do not authorize npm/GitHub writes. Use the deliberately approved workflow below for a new, merged version after publisher setup and validation; do not substitute `latest` for a prerelease.

If not already configured, add its GitHub Actions trusted publisher in npm package settings using these exact values:

- Organization or user: `CAWRESTLER`
- Repository: `react-native-duo`
- Workflow filename: `publish.yml`
- Environment name: `npm`
- Allowed actions: enable direct publishing with `npm publish`, which this workflow uses.

See [npm's trusted publishing guide](https://docs.npmjs.com/trusted-publishers/#for-github-actions). Subsequent workflow publications use short-lived OIDC credentials; no npm publish token is stored in this repository or its GitHub Actions secrets. The GitHub `npm` environment requires repository-owner approval and permits deployment only from `main`. The solo owner may approve their own requested deployment. That deployment approval is separate from the zero-approving-review pull request policy.

### Publish a merged release

After npm setup, open the manual [Publish npm workflow](https://github.com/CAWRESTLER/react-native-duo/actions/workflows/publish.yml), select `main`, and choose `next` for previews or `latest` for stable releases. A prerelease version must use `next`. Confirm completed native/device and visual testing, then approve the `npm` deployment as repository owner after reviewing the requested commit and channel.

The workflow checks out the exact requested `main` commit and requires its latest main push CI run to have succeeded, including all six jobs and `CI Required`. A green pull request run or a green run for another commit is insufficient. It verifies that `RELEASE_NOTES.md` is committed and version-matched, repeats those checks after environment approval, validates the package again, publishes to npm, and creates the matching `v<version>` tag and GitHub release with those reviewed notes. Previews are marked prerelease and explicitly not latest on GitHub. CI, branch pushes, and local release preparation do not trigger publication.

Do not reuse an npm version or move an existing release tag. If a run fails, inspect the registry version/dist-tag, workflow commit, and GitHub tag/release before retrying. If npm succeeded but the GitHub release step failed, complete the missing tag/release for the same published commit; rerunning the publish job would attempt to publish the same version again. If npm never accepted the version, confirm that state and any existing tag target before rerunning the manual workflow. Never retry publication blindly.

The npm tarball includes the native podspec and config plugin. The example lives on GitHub, and the host application installs pods normally; there is no separate CocoaPods registry publication to perform.
