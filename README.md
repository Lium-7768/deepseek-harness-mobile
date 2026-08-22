# DeepSeek Harness Mobile

Native Expo/React Native companion for a paired **DeepSeek Harness** desktop app.

## Run

Requirements: Node 22, pnpm, and a running desktop app with Mobile Gateway enabled.

```bash
pnpm install
pnpm start
```

Use the Expo terminal to open iOS or Android. For a native development build, use `pnpm ios` or `pnpm android`.

## Pair

In the desktop app, open the mobile connection page and create a pairing QR code. In the mobile app, choose **Connect** and scan the code. Credentials are stored securely on the device.

## Development

```bash
pnpm test
pnpm typecheck
```

The desktop runtime remains the source of truth for sessions, tasks, tools, files, credentials, and pairing. This app provides the native UI and communicates only with the paired Mobile Gateway over authenticated HTTP/SSE.

> `src/shared/dsh-presentation.ts` is a deliberately local presentation contract. Keep it compatible with future desktop Gateway protocol changes.
