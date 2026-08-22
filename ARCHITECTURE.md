# Mobile Architecture

```mermaid
flowchart LR
  Native[Expo Router native UI] --> Store[SecureStore pairing credentials]
  Native --> Query[TanStack Query cache]
  Native --> API[MobileApi HTTP client]
  Native --> Sync[MobileSyncBridge SSE subscriber]
  API --> Gateway[Paired Mobile Gateway]
  Sync --> Gateway
  Gateway --> Desktop[Desktop DSH runtime]
  Desktop --> Authority[Sessions, tasks, tools, durable history]
```

The native client projects desktop authority. It owns mobile navigation, rendering, pairing credential storage, and bounded cache state; it does not own an Agent Loop or a durable desktop session store.
