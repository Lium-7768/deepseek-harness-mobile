# DeepSeek Harness Mobile

Independent Expo and React Native client for DeepSeek Harness desktop runtimes.

## Scope

This repository owns native routes, presentation, pairing storage, Mobile Gateway API requests, SSE synchronization, and mobile tests. The desktop runtime remains the authority for sessions, tasks, tools, files, credentials, and pairing.

## Compatibility

The client communicates only through a paired Mobile Gateway. It does not import DeepSeek Harness runtime source code.

## Local contract

`src/shared/dsh-presentation.ts` is the small client-neutral presentation and event-projection contract extracted from the former workspace dependency. Protocol changes must stay compatible with the desktop Gateway and mobile API tests.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install independent dependencies. |
| `pnpm test` | Run mobile logic and API tests. |
| `pnpm typecheck` | Type-check native source. |
| `pnpm start` | Start Expo Metro. |
