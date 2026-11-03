# DeepSeek Harness Mobile

A native **Expo / React Native** companion for a paired DeepSeek Harness desktop app. It presents the desktop runtime on iOS and Android; it is not a second desktop runtime.

## Architecture

```text
Expo Router native UI
  ├─ SecureStore: paired-device credentials
  ├─ TanStack Query: bounded screen cache
  ├─ MobileApi: authenticated HTTP commands
  └─ MobileSyncBridge: authenticated SSE updates
                 │
                 ▼
        Paired Mobile Gateway
                 │
                 ▼
       Desktop DSH runtime (authority)
```

| Layer | Responsibility | Does not own |
| --- | --- | --- |
| Mobile app | Native navigation, rendering, secure pairing storage, local cache, and mobile interactions | Agent Loop, durable session database, desktop files, provider keys |
| Mobile Gateway | Paired-device HTTP/SSE boundary, authentication, replay, and activation state | Desktop UI or an independent task runtime |
| Desktop runtime | Sessions, history, tasks, tools, files, credentials, and pairing authority | Mobile platform UI |

The full component diagram is in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Data flow

1. On launch, the app restores paired-device credentials from SecureStore.
2. `MobileApi` fetches authoritative snapshots from the desktop Gateway.
3. `MobileSyncBridge` subscribes to Gateway SSE and updates the React Query cache.
4. The native UI renders that state. If the connection is interrupted, the client reconnects and converges on the desktop state.

## Quick start

**Requirements:** Node 22, pnpm, Xcode for iOS development, and a running desktop app with Mobile Gateway enabled.

```bash
pnpm install
pnpm start
```

Use the Expo terminal to open iOS or Android. To build and install a native development app, use:

```bash
pnpm ios
pnpm android
```

For a specific iOS simulator and Metro port, for example:

```bash
pnpm ios -- --device "iPhone 16" --port 8090
```

## Pair a device

1. In the desktop app, open the mobile connection page and create a pairing QR code.
2. In the mobile app, select **Connect** and scan the QR code.
3. The app stores the paired-device credential securely and then loads desktop-backed sessions.

If the Gateway reports an expired or revoked device, create a new QR code in the desktop app and pair again. Do not copy provider credentials or desktop runtime tokens into this project.

## Development commands

| Command | Purpose |
| --- | --- |
| `pnpm start` | Start the Expo / Metro development server. |
| `pnpm ios` | Build, install, and open the iOS development app. |
| `pnpm android` | Build, install, and open the Android development app. |
| `pnpm test` | Run mobile API and UI-logic tests. |
| `pnpm test:watch` | Run tests in watch mode. |
| `pnpm typecheck` | Type-check TypeScript, including unused imports and parameters. |
| `pnpm format:check` | Verify shared formatting rules. |
| `pnpm format` | Format routes, features, components, tests and visual fixtures. |

## Project map

| Path | Purpose |
| --- | --- |
| `app/` | Thin Expo Router route entries and the native root layout. |
| `src/features/` | Feature screens and session query/action hooks. |
| `src/sync/` | SSE lifecycle, event decoding, cache projection and conversation windows. |
| `src/hooks/` | Native foreground/focus lifecycle hooks. |
| `src/api/` | Gateway API client and connection persistence. |
| `src/components/` | Reusable native UI, conversation, drawer, and sync components. |
| `src/state/` | React Query-facing selection and sync state. |
| `src/shared/dsh-presentation.ts` | Local presentation and event-projection contract. |
| `tests/` | API, routing, synchronization, and UI-logic regression tests. |
| `ios/`, `android/` | Native projects for development builds. |

## Native build note

This repository contains a pnpm-managed `expo-modules-jsi` compatibility patch for the current Xcode 26.0.1 / Swift 6.2 toolchain. The patch targets `expo-modules-jsi@57.1.3` and is applied automatically by `pnpm install`; do not edit `node_modules` manually. After a fresh native dependency install, run `cd ios && pod install` before `pnpm ios` if CocoaPods has not already been run.

## Contract and contribution rules

`src/shared/dsh-presentation.ts` is intentionally local so the mobile client has no direct workspace dependency on the desktop repository. When changing Gateway payloads or durable event projection, update this contract, its tests, and the desktop Gateway compatibility at the same time. Keep desktop authority on the desktop: do not add a mobile Agent Loop, durable session store, desktop file browser, Shell access, or provider credential management.

## Android development

Install Android Studio with an Android SDK, then start an emulator or connect a device with USB debugging. The Android commands locate `ANDROID_SDK_ROOT` automatically on macOS and Linux when it is installed in a standard location.

```bash
pnpm android            # build, install, and open the development app
pnpm android:assemble   # produce android/app/build/outputs/apk/debug/app-debug.apk
```

A release bundle is deliberately blocked until a private signing configuration exists. Copy `android/keystore.properties.example` to `android/keystore.properties`, replace every placeholder, and keep both that file and its keystore private. Then run `pnpm android:bundle` to create the release bundle. The project never falls back to the debug keystore for a release build.

## Releases

The tested Android, iOS, EAS, version-tag, signing, and GitHub draft-release process is documented in [docs/RELEASING.md](docs/RELEASING.md). Release signing credentials and store submission tokens must remain outside Git.

## Native UI and reliability maintenance

The task ledger and acceptance results are in [docs/IMPROVEMENT-PLAN.md](docs/IMPROVEMENT-PLAN.md).
The current architecture and native UI review are in [docs/NATIVE-REVIEW.md](docs/NATIVE-REVIEW.md).

For repeatable visual checks without touching desktop sessions, run `node scripts/visual/gateway-fixture.mjs`.
It serves synthetic data on loopback port 8094. On an Android emulator, use `adb reverse tcp:8094 tcp:8094`,
then connect the development app to `http://127.0.0.1:8094` with any non-empty password.
The fixture must stay local; it is a development aid with no real authentication, execution or persistence.


### Native resource ownership

The checked-in `ios/` and `android/` projects own the shipping launcher and splash resources. `app.json` keeps matching Expo asset inputs for tooling; `expo prebuild` regenerates native projects and is not a routine build step. After an intentional prebuild, review its icon, splash, permission and network-policy diffs before keeping them.
