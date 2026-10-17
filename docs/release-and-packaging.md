# Frost Player release and packaging documentation

## Scope

This document describes the packaging approach for Frost Player as a planned Linux desktop distribution workflow. It does not claim that the package has already been built successfully.

## Packaging tool selection

Electron Builder is a suitable fit for this project because:

- the app already uses Electron + Vite + TypeScript
- it supports Linux package targets such as AppImage and .deb
- it can package prebuilt static renderer assets and Electron main/preload bundles
- it is straightforward to integrate into CI without embedding secrets

The packaging configuration is defined in [../electron-builder.config.cjs](../electron-builder.config.cjs), and the package entry points are defined in [../package.json](../package.json).

## Linux output targets evaluated

### AppImage

Pros:
- portable single-file binary
- convenient for Linux distribution testing
- useful for validating the app without system package installation

Risks and constraints:
- still requires a real Linux environment to verify runtime behavior
- must be validated on Mint with X11 and Wayland if the app uses transparency or desktop integration
- not a substitute for a native .deb install validation

### .deb

Pros:
- familiar Linux Mint installation model
- easier integration with package managers and system policy
- aligned with the target desktop environment

Risks and constraints:
- package dependencies must be validated before release
- desktop file, icon paths, and install permissions must be tested on a real machine
- external libraries or native modules must be declared explicitly

### Not claimed as complete

Neither AppImage nor .deb is treated as production-ready solely because the config exists. The project still requires real-device validation before any of these outputs can be called successful.

## Required app metadata

Before a real package build, confirm the following:

- application name is stable and matches the product identity
- package identifier is unique and not conflicting with an existing desktop package
- icon assets exist in the configured build resource path
- installer metadata and desktop file values are reviewed manually
- app versioning follows a clear semantic scheme

## Resource inclusion and exclusions

Included by design:
- final renderer build output
- compiled Electron main/preload output
- package manifest and metadata
- user-facing documentation required for installation and support

Excluded from packaging by design:
- source test files and specs
- local dev-only files
- temporary build artifacts not needed at runtime
- secrets or CI-only environment configuration

## File permissions and user settings storage

Packaging must be designed with the following expectations:

- no global root permissions should be required for normal app operation
- user settings remain local to the running account
- app state should live under the standard user config area, not under a shared writable path
- the app should avoid writing to system-owned folders during ordinary use
- installation and update scripts must not silently alter unrelated user files

## External dependencies and native modules

This project currently relies on:

- Electron runtime
- Vite + React renderer build
- TypeScript toolchain
- Electron Builder for packaging
- optional Linux desktop dependencies for audio and media integration that must be confirmed on Mint

No native module is currently declared in the repository as a required build-time dependency. If a future real audio backend or native binding is introduced, it must be documented explicitly under the dependency list and included in the installation instructions.

## MPRIS and Linux integration notes

If MPRIS support is enabled later, the package should document:

- the need for a desktop session with D-Bus available
- that MPRIS behavior differs between X11 and Wayland
- that media controls depend on the active session and desktop environment
- that no package should claim MPRIS success without a live Linux Mint validation step

## Versioning and updates

Recommended version policy:

- MAJOR: breaking compatibility or major UI/feature reset
- MINOR: new user-facing features or significant improvements
- PATCH: bugfixes and safety fixes

Release process policy:

1. update the version number in the package metadata
2. document the change in a changelog or release notes file
3. verify the intended Linux artifact type in CI
4. confirm no secret or environment-specific credential is embedded in the package
5. publish only after a live Linux Mint validation step

This repository does not publish or create a GitHub Release automatically. That remains a separate action.

## Installation and uninstallation instructions

### Install from package

- Download the generated .deb or AppImage artifact from the trusted release location.
- For .deb: use the system package installer or `dpkg -i` followed by dependency resolution if required.
- For AppImage: mark the file executable and run it directly after verifying the source is trusted.

### Uninstall

- For .deb: uninstall using the package manager or `dpkg -r frost-player` if the package name matches the installed package.
- For AppImage: remove the downloaded file and any desktop shortcut created by the system.

### Troubleshooting

- if the app fails to launch, check whether the required Linux libraries are installed
- if the desktop entry is missing, confirm the package includes the `.desktop` metadata and icon assets
- if audio fails, test on a real Linux Mint machine rather than assuming the packaged app is healthy
- if Wayland or X11 behavior differs, record the exact desktop environment and window manager

## CI and release automation

The GitHub workflow defined in [.github/workflows/linux-package.yml](../.github/workflows/linux-package.yml) is intentionally limited to:

- installing dependencies
- building the renderer and Electron bundles
- preparing Linux artifacts
- uploading artifacts for review

It does not create a GitHub Release, publish to any registry, or embed credentials.

## Release readiness statement

This project is not considered release-ready simply because package definitions exist. The app still needs final validation on a real Linux Mint desktop for:

- actual audio playback
- Bluetooth output changes
- MPRIS behavior
- compositor and transparency behavior
- native installation and uninstallation flow

No build or package execution was performed in this session, and no success claim is made for GitHub Actions or package outputs.
