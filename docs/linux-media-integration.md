# Linux Media Integration Notes

## Supported path

This project is designed to keep Linux integration separate from the audio engine. The audio engine owns playback, buffering, and state transitions; Linux media integration only reflects that state to desktop system APIs when supported.

## Current support status

### Confirmed safe path

- Media Session metadata updates for the currently playing track
- keyboard shortcut gating that ignores text-entry fields and focus states
- graceful fallback when D-Bus or MPRIS is unavailable

### Deferred / requires device-specific validation

- full D-Bus MPRIS registration to the session bus
- seek and next/previous controls via system media controls
- artwork metadata propagation from external Linux session integration
- linking Frost Player to system-wide media status when a different player owns the session

## Rules

1. No arbitrary shell commands are used to control media.
2. No assumption is made that Frost Player can read another player's session just because MPRIS is present.
3. No attempt is made to claim ownership of another app's MPRIS objects.
4. If D-Bus is absent, the app keeps local playback running and records the limitation.
5. Media control activation requires user-visible state only and never blocks the local player.

## Keyboard shortcut policy

- Space triggers play/pause only when the active element is not a text field or editing control.
- Arrow keys follow a documented interaction model and must not interfere with sliders, text inputs, or list navigation.
- Next/Previous/Mute shortcuts are enabled only when the corresponding safe action is available.
- The shortcut handler is intentionally narrow and focused on playback rather than global system control.

## Gating conditions

Media controls should not be exposed when:

- the app is not running on Linux
- the session has no D-Bus support
- the active session cannot safely provide MPRIS metadata
- a user field is being edited
- the current track is missing or not loaded yet
