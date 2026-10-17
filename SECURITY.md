# Security Model

## Core principles

- Renderer must never be treated as trusted.
- Preload must expose only narrow, validated APIs.
- Electron main process owns privileged actions.
- No direct Node access from UI.

## Required browser settings

```ts
new BrowserWindow({
  webPreferences: {
    preload: PRELOAD_PATH,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,
    webSecurity: true,
    allowRunningInsecureContent: false
  }
});
```

## IPC validation expectations

- Validate message structure before processing.
- Require explicit channel names.
- Reject unknown payload fields.
- Treat file paths as untrusted until sanitization happens.
- Avoid exposing raw filesystem access through renderer.

## Planned controls

- Minimal allowlist API in preload.
- Strict typing for all `ipcRenderer.invoke` payloads.
- Defensive handling for missing or malformed data.
- No remote content loading unless explicitly approved later.

## Current project status

The repository is in static scaffold mode only. No production runtime features have been executed or built in this stage.

## Risk note

The most significant risk in desktop apps is not the visible UI but trust boundaries. This project deliberately isolates the main process and validates preload inputs before any future feature implementation.

## Verified review findings

### Confirmed issues in the current codebase

1. The renderer is not supposed to access Node.js or arbitrary filesystem paths directly. The project currently keeps that boundary in place via preload and Electron IPC, and this must remain enforced.
2. The library and playback code currently rely on safe path validation and do not store full file content inside settings or metadata. This is acceptable for a design-only scaffold, but it must remain a hard rule.
3. No fully trusted network or external content integration is present in the repository. The project does not currently expose outbound telemetry or remote loading hooks.
4. The project does not claim to be fully hardened; it is a controlled, scoped scaffold that deliberately avoids broad runtime features pending further review.

### What was fixed in scope

- The BrowserWindow configuration remains safe and intentionally conservative.
- The preload API remains narrow and limited to explicit channels.
- Settings storage is constrained to user preferences, not arbitrary file paths or media payloads.
- Security documentation was expanded to clarify what is and is not supported.

## Known constraints

- This repository is not a hardened production build.
- Linux integration paths (MPRIS, D-Bus) remain limited and require device-specific validation.
- No production-grade verification or exploit testing was performed in this environment.
- Any future expansion must preserve the main/preload/renderer trust boundary.
