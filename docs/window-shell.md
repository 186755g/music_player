# Frost Player Window Shell and Linux Mint Design Notes

## BrowserWindow status

The existing Electron BrowserWindow configuration in the main process already provides the safe baseline:

- nodeIntegration is disabled
- contextIsolation is enabled
- webSecurity remains enabled
- the project does not depend on unsafe design hacks to achieve the dark glass appearance

## Safe visual additions

The design layer can include:

- rounded corners
- subtle dark translucent panels
- soft border and shadow styling
- HiDPI-aware sizing and scaling
- fallback dark backgrounds when transparency is unavailable

## Do not do

- do not enable nodeIntegration for the sake of visuals
- do not disable webSecurity to force blur or transparency
- do not assume Wayland or X11 support without checking the current session
- do not rely on backdrop-filter as a guarantee of native desktop blur

## Transparency strategy

Transparency should be optional and only enabled when the desktop environment supports it reliably. Otherwise, Frost Player falls back to a solid dark background and retains sharp legibility.

## Window behavior constraints

- the window remains draggable and resizable without blocking controls
- controls remain clickable even when the shell is styled with round corners or translucent panels
- window restore must never place the app off-screen
- Always on Top is not enabled by default and remains optional if added later

## HiDPI and Linux Mint constraints

- use devicePixelRatio-aware canvas and element sizing
- allow layout adaptation to different DPI and font scaling
- avoid hard-coded blur values that fail on certain GTK or compositor settings
- keep the shell light enough that it remains responsive on lower-power hardware

## Current status

This phase leaves the visual layer as a documented safe enhancement plan and does not rely on unsupported Linux-specific behavior. It is intentionally conservative to preserve stability and avoid breaking the desktop session.
