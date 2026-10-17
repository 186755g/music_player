# Frost Player known limitations and review notes

## Scope and status

This project is intentionally a review-first desktop player scaffold. It is not a production release and it does not claim to be fully hardened or fully device-validated.

## Confirmed constraints

- The renderer must never access arbitrary Node.js APIs or raw filesystem paths.
- The project does not include cloud sync, user accounts, or remote telemetry integrations.
- Linux media integration is design-level only and depends on the host desktop environment.
- The equalizer, lyrics, and visualizer systems are static implementation layers that require a running desktop runtime to validate behavior in real conditions.
- The app intentionally avoids broad security claims and external network behavior.

## Review findings

### Performance and reliability

- Audio context reuse was a real concern; the engine now guards repeated playback attempts and prevents multiple overlapping calls from racing the same state.
- Repeated filter-chain creation could have duplicated audio routing; the equalizer now disconnects and rebuilds a single chain instead of stacking connections.
- Visualization loops could continue running in hidden windows, wasting GPU and CPU resources. The visualizer now pauses when the document is hidden and resumes only when it is visible again.
- Reduced-motion preferences are now respected to avoid unnecessary animation.

### Security and privacy

- The app keeps the main/preload/renderer trust boundary explicit and narrow.
- No arbitrary external hosts or remote telemetry endpoints are included in the codebase.
- Settings are stored locally and remain limited to explicit user preferences.
- The project still needs a full device-specific review before release on a real Linux Mint machine.

## Remaining release risk

- Actual MPRIS registration and Linux session integration still need host validation.
- A full security audit, dependency review, and penetration test must be performed by a release team before shipping.
- Runtime verification was not permitted in this session, so this document reflects code-review findings only.
