# Frost Player Linux installation and support notes

## Temporary status

This document describes the intended installation and support flow for Linux Mint. It is a packaging and release guide only, not a claim that the application has been successfully built or deployed.

## Download and install

1. Obtain the artifact from the approved build pipeline or release location.
2. Prefer the .deb package for Linux Mint when native integration is the target.
3. Use AppImage only for portable validation or testing when a full system install is not desired.
4. Confirm the source is trusted before executing a downloaded package or AppImage.

## Installation examples

### .deb

```bash
sudo dpkg -i frost-player_*.deb
sudo apt-get install -f
```

### AppImage

```bash
chmod +x Frost-Player-*.AppImage
./Frost-Player-*.AppImage
```

## Uninstall

### .deb

```bash
sudo dpkg -r frost-player
```

### AppImage

Remove the downloaded AppImage and its desktop launcher if the system created one.

## Known limitations and required checks

- AppImage and .deb outputs require live validation on Linux Mint.
- Window transparency and system integration may vary between X11 and Wayland.
- MPRIS support requires an active desktop session and should not be assumed to work out-of-the-box.
- Bluetooth output and media key behavior must be checked on a real host.

## Troubleshooting

- If the app does not open, verify that required libraries are installed and the desktop file is valid.
- If the icon is missing, confirm the icon assets were added to the packaging resource path.
- If the app crashes or hangs, capture the exact Linux environment and session type before filing a bug.

## Important note

No package artifact has been generated or published in this session. Documentation is prepared for future distribution only.
