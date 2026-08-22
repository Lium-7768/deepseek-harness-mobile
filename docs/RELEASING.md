# Releasing DeepSeek Harness Mobile

This guide produces installable mobile artifacts without committing signing material. The desktop Mobile Gateway remains the authority; a mobile release contains only the native client.

## Version and release tag

Before creating a tag, align the same semantic version in `package.json`, `app.json`, `android/app/build.gradle` (`versionName`), and the iOS project's `MARKETING_VERSION`. Increase Android `versionCode` and iOS `CURRENT_PROJECT_VERSION` for every store upload. Check the release metadata before building:

```bash
pnpm release:verify -- v0.1.0
```

The command rejects a tag that does not match every public version field. Create and push an annotated `v<major>.<minor>.<patch>` tag only after the validation and `main` CI are green.

## Android

For a local signed release, copy `android/keystore.properties.example` to `android/keystore.properties`, provide a private release keystore, and keep both outside Git. The release task refuses to use the debug key.

```bash
RELEASE_TAG=v0.1.0 pnpm release:android
# android/app/build/outputs/bundle/release/app-release.aab
```

The resulting AAB is suitable for Google Play upload. Do not use the debug APK for store distribution.

## iOS

Use a Mac with Xcode, CocoaPods, an Apple signing team, a distribution certificate, and a provisioning profile. Install Pods after native dependency changes, then archive:

```bash
cd ios && pod install && cd ..
RELEASE_TAG=v0.1.0 pnpm release:ios
# dist/ios/DeepSeekHarness.xcarchive
```

Export the archive with a private `ExportOptions.plist` appropriate for App Store, TestFlight, or internal distribution. Apple signing identities and provisioning profiles must remain in the Apple developer account or local keychain, never in this repository.

## EAS Build

`eas.json` provides a preview profile for internal testing and a production profile that produces an Android App Bundle. Configure the Expo project once with `pnpm dlx eas-cli@22.2.0 build:configure`, then use:

```bash
RELEASE_TAG=v0.1.0 pnpm release:eas
```

EAS can hold Android and iOS signing credentials securely. It is optional: local Android and iOS release commands remain available when credentials are managed locally.

## GitHub Release workflow

Pushing a `v*` tag runs **Mobile Release**. It validates the tag, dependency alignment, tests, type checks, and iOS/Android JavaScript exports. It uploads those exports as workflow artifacts and creates a **draft** GitHub Release with a manifest. A tag push never publishes a public GitHub Release or starts a store build automatically.

For a controlled release, use **Actions → Mobile Release → Run workflow**, select an existing tag, and choose `publish` only after reviewing the draft. Choose `eas_build` only after configuring the Expo project and adding the repository secret `EXPO_TOKEN`; this starts EAS production builds but does not automatically submit to App Store Connect or Google Play.

To automate store submission later, add EAS Submit profiles and store credentials deliberately. Keep production promotion manual until TestFlight and the Play internal track have been reviewed.
