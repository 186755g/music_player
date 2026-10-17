# Frost Player Roadmap

## Phase 0 — Static foundation (Current)

- Verifying empty workspace.
- Creating the project skeleton.
- Defining architecture and safety rules.
- Documenting limitations and Linux Mint decisions.
- No execution of app or build.

### Verification gate
- Review only: architecture, trust boundaries, and file safety are documented.
- Test linkage: no runtime validation performed in this phase; future verification is deferred.

## Phase 1 — Electron shell

- Window creation and menu setup.
- IPC bridge security review.
- Implementation of preload API surface.
- Basic tray / settings model if needed.

### Verification gate
- Unit tests: preload allowlist and settings merge semantics.
- Manual check: window opens without unsafe access or invalid IPC calls on Linux Mint.

## Phase 2 — Renderer UI

- Dark glassmorphism shell.
- Circular album art.
- Playback controls.
- Queue panel and library view.
- Lyrics overlay and equalizer preview.

### Verification gate
- Automated UI scenarios: Arabic / English labels, RTL/LTR layout, and empty-state rendering.
- Manual check: glass transparency, queue rendering, and navigation behavior on Linux Mint.

## Phase 3 — Audio engine

- Web Audio graph setup.
- Track decoding.
- Seeking, volume, playback state.
- Audio format handling.

### Verification gate
- Planned integration tests: real audio playback, switching tracks, seek timing, and volume transitions.
- Automated logic tests: repeat/shuffle, duration clamping, and progress calculations.
- Manual check: real playback on actual audio hardware and Bluetooth output.

## Phase 4 — Playlist and library

- Scanning local folders.
- Metadata extraction.
- Playlist import/export.
- Favorites and recent tracks.

### Verification gate
- Unit tests: library validation, deduplication, missing-file handling, and search sorting.
- Manual check: import with valid files, unsupported extensions, and missing/corrupt metadata.

## Phase 5 — Lyrics and equalizer

- LRC parser and synchronization.
- Ten-band equalizer control.
- Presets and adaptive tuning.

### Verification gate
- Unit tests: LRC parsing, active line selection, timestamp logic, preset application, and clipping protection.
- Manual check: visual sync on real tracks, equalizer response, and preset switching.

## Phase 6 — Linux integration

- MPRIS integration.
- System tray and notifications.
- Keyboard shortcuts and desktop behavior.

### Verification gate
- Manual Linux-only checks: MPRIS state, Bluetooth sink changes, and media key handling.
- Planned integration tests: session metadata propagation and state handoff.

## Phase 7 — Quality and packaging

- Build validation.
- Packaging for Linux Mint.
- Security review.
- Performance optimization.

### Verification gate
- Automated checks: unit/integration suite execution in CI, static TS checks, and deterministic packaging tests.
- Manual checks: desktop packaging, transparency performance, and crash recovery.
- Security gate: no claims of completion without dependency review and release checklist sign-off.

## Phase 14 — Completion review and test readiness

- Review all implemented components against the roadmap.
- Add test cases for logic that can run without real audio hardware.
- Separate Linux-real validation from automation-ready checks.
- Add a manual checklist for real Mint environment validation.
- Record all unexecuted or deferred test areas honestly.

### Verification gate
- Automated unit tests: LRC parsing, next/previous selection, repeat/shuffle, time/progress math, preset application, settings persistence, and library validation.
- Planned integration tests: audio engine behavior, song switching, seek timing, and device/session interactions.
- Manual Linux Mint checklist: real audio output, Bluetooth output, MPRIS state, and transparency / window behavior.
- Release gate: any feature still requiring real Linux hardware is listed as incomplete rather than ready.

## Deferred decisions

- Audio engine implementation is explicitly deferred from full production validation until real Linux hardware is available.
- Linux Mint MPRIS integration is deferred pending host validation.
- Audio codec strategy remains open until library selection is decided.
- No runtime build is executed in this phase.

## Test-readiness matrix

| Requirement | Automation-ready | Needs real Linux hardware | Verification method |
| --- | --- | --- | --- |
| LRC parsing and timestamp logic | Yes | No | Unit tests |
| Next / previous track selection | Yes | No | Unit tests |
| Repeat / shuffle logic | Yes | No | Unit tests |
| Time and progress calculations | Yes | No | Unit tests |
| 10-band preset application | Yes | No | Unit tests |
| Settings save / restore | Yes | No | Unit tests |
| Library validation and dedupe | Yes | No | Unit tests |
| Real audio playback | No | Yes | Planned integration + manual Linux Mint test |
| Bluetooth output switching | No | Yes | Manual Linux Mint check |
| MPRIS / media key state | No | Yes | Manual Linux Mint check |
| Transparency and compositor behavior | No | Yes | Manual Linux Mint and UI checks |
| Arabic / English / RTL UI scenarios | Yes, for static logic; with jsdom where available | Optional | Unit tests + manual UI review |
