# Frost Player test plan and readiness review

## Status

This document describes the test strategy for Frost Player in a review-only pass. No test command was executed in this workspace, and no local build or runtime launch was performed.

## 1. Automated unit tests (eligible for CI / local automation without real hardware)

These are the test cases that can be written and run without a real audio device:

- LRC parsing and metadata extraction
  - Valid timestamps and sorting
  - Invalid timestamp handling
  - Empty and malformed content
- Next / previous track logic
  - Sequential movement
  - Repeat-all loop behavior
  - Shuffle selection within bounds
- Repeat / shuffle state transitions
  - Off -> all -> one behavior
  - Shuffle state persistence
- Time and progress calculations
  - Seek boundaries and clamp logic
  - Duration normalization
  - Snapshot state accuracy
- 10-band preset logic
  - Bass, treble, and flat preset application
  - Gain clamping and clipping flag behavior
  - Custom preset creation and deletion
- Settings persistence and restore
  - Default load
  - Invalid JSON handling
  - Window-bound sanitization
  - Clear library metadata retention
- Library validation
  - Deduplication
  - Search behavior
  - Playlist reorder and removal
  - Missing or unavailable media handling

## 2. Planned integration tests (not executed here)

These tests require a real runtime environment and are intentionally listed as planned, not passed:

- Audio engine integration with a real browser audio context
- Playback state transitions while switching tracks
- Seek operations during active playback
- Search plus playback timeline while the UI updates
- File import of real local media directories

## 3. Negative-file validation scenarios

- Missing file path in the library entry
- Corrupt or truncated audio file metadata
- Unsupported extension from file picker
- Empty or incomplete LRC file
- Library entry with missing title / album / duration metadata
- File present but unavailable due to permission or filesystem state

## 4. Linux Mint manual checklist

This checklist is intentionally manual and requires a real Linux Mint machine.

1. Real output path validation
   - Verify audio plays through the laptop speakers.
   - Validate pause / resume / seek behavior.
   - Confirm a silent or broken file fails gracefully without crashing the app.

2. Bluetooth output validation
   - Pair a Bluetooth speaker or headset.
   - Switch audio output from the app or system controls.
   - Confirm the player status updates without stale path references.

3. MPRIS / media-session validation
   - Confirm media controls reflect current state.
   - Validate play / pause / next / previous from desktop controls.
   - Confirm no fake ownership claims or stale state after close.

4. Transparency and compositor validation
   - Test on a Mint desktop using the active compositor.
   - Verify the glass background remains readable at different scaling factors.
   - Check contrast in both dark and light theme modes.

5. Localization validation
   - Verify English and Arabic labels render correctly.
   - Confirm RTL/LTR changes do not break layout or control order.
   - Confirm collapsed queue and library panels remain accessible.

## 5. Automation vs Linux-real split

| Area | Automated now | Requires real Linux device |
| --- | --- | --- |
| LRC parsing | Yes | No |
| Next / previous selection | Yes | No |
| Repeat / shuffle logic | Yes | No |
| Time and progress math | Yes | No |
| Equalizer preset calculations | Yes | No |
| Settings persistence | Yes | No |
| Library validation and dedupe | Yes | No |
| Real audio playback | No | Yes |
| Bluetooth routing | No | Yes |
| MPRIS integration | No | Yes |
| Window transparency / compositor check | No | Yes |

## 6. UI scenarios for Arabic, English, and RTL

- App loads in English with default western layout.
- App loads in Arabic and the sidebar, controls, and queue adapt correctly.
- Active tabs remain in correct order under RTL.
- Search and playlist controls remain aligned in both directions.
- No text truncation or overlapped labels when the system uses larger fonts or higher scaling.

## 7. Release gate: do not treat experimental features as completed

A feature must not be marked complete unless the following are true:

- The requirement is mapped to a concrete verification method.
- The implementation is reviewed for edge cases and invalid inputs.
- The behavior is either automated or covered by a manual step on Linux Mint.
- The status is explicitly marked as Pending, Manual, or Automated.
- Any requirement that relies on real audio hardware remains separate from unit-test coverage.

## 8. Requirement-to-verification mapping

- Audio engine logic: Unit tests + planned integration tests + Linux Mint manual validation.
- LRC parsing: Unit tests.
- Equalizer presets: Unit tests.
- Settings persistence: Unit tests.
- Library validation: Unit tests.
- Real Linux desktop features: Manual Linux Mint validation only.
- UI translation / RTL behavior: Unit scenarios + manual review.
