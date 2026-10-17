# Frost Player manual Linux Mint checklist

## Purpose

This checklist exists for real-device validation only. It does not replace automated unit coverage; it verifies the behavior that cannot be trusted without a live Mint desktop environment.

## Required environment

- Linux Mint desktop with the active compositor and audio stack enabled
- At least one physical playback device or Bluetooth speaker/headset
- A known-good local music folder containing MP3 / WAV / OGG examples if available
- A test script or loop that can switch tracks repeatedly

## Steps

### A. Local playback

1. Launch the app and import a folder containing multiple valid audio files.
2. Confirm the queue renders and each track has a valid source path.
3. Start playback on a real track and verify the time counter advances.
4. Pause and resume the same track, then confirm the state resets correctly.
5. Seek to 25%, 50%, and 90% of the file and confirm the timeline remains valid.

### B. Bluetooth output

1. Connect a Bluetooth speaker or headset.
2. Switch audio output from the system UI or desktop settings.
3. Confirm the player is still stable and the output selection is not stale.
4. Disconnect and reconnect the device while the app is idle and while it is playing.

### C. MPRIS and media keys

1. Check whether the desktop media controls reflect the current song metadata.
2. Trigger play / pause / next / previous from the desktop controls.
3. Confirm the app remains stable if control events arrive out of order.
4. Close the app and verify no stale MPRIS state persists.

### D. Transparency and desktop behavior

1. Verify the glass panel remains readable over dark wallpaper.
2. Check at normal and high display scaling.
3. Confirm window drag, resize, and maximize operations remain stable.
4. Switch between workspaces or applications while playback continues.

### E. Arabic / English and RTL validation

1. Toggle language between English and Arabic.
2. Confirm the brand panel, controls, queue, and tabs reflow correctly.
3. Verify the app remains stable when using a right-to-left layout.
4. Confirm no element overlaps the queue or playback controls.

## Completion rule

This checklist is only considered complete when all required items are observed in a live Linux Mint session. No item should be marked as complete based on code inspection alone.
