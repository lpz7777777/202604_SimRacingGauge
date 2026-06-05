# Overlay Rendering Redesign Design

## Context

Sim Racing Gauge currently renders all video overlay elements from one large `OverlayCanvas.tsx`. That component owns canvas lifecycle, device-pixel-ratio sizing, animation, store reads, current GPS lookup, acceleration calculation, mini-map projection, speed gauge drawing, lap timer drawing, and track map drawing. The result works as a prototype, but it is hard to test, hard to extend, and the current visual treatment feels like boxed dashboard widgets placed on top of the video.

This iteration adopts the user-approved visual direction: a clean, bright, transparent overlay. The overlay should avoid visible panels, cards, heavy borders, and dark boxed backgrounds. Text, thin gauge marks, route strokes, direction arrows, and subtle shadows are acceptable when needed for readability.

The iteration also includes stabilization work: fix the existing lint failures, add a test runner, and cover the core algorithm and overlay utility logic before changing behavior.

## Goals

- Make `npm.cmd run lint` and `npm.cmd run build` pass on Windows PowerShell.
- Add a repeatable test command and focused tests for GPX parsing, track calculations, overlay telemetry, and overlay geometry.
- Replace the monolithic overlay renderer with a small canvas rendering subsystem.
- Redesign the visible overlay as a transparent, low-obstruction video HUD.
- Add a screenshot button that saves the current video frame plus the current overlay as a PNG.

## Non-Goals

- Do not implement MP4 video export in this iteration.
- Do not add drag-and-drop free positioning yet.
- Do not add OBD-based gear or RPM gauges yet.
- Do not redesign the whole app shell or track-analysis tab.
- Do not replace Canvas with DOM, SVG, or WebGL for this iteration.

## Architecture

The overlay will remain Canvas-based, but the responsibilities will be split into testable units.

`OverlayCanvas.tsx` becomes the host component. It will create and resize the canvas, keep refs synchronized with Zustand state, run the `requestAnimationFrame` loop, and call a renderer function with a complete render context. It should not contain per-widget drawing logic.

`src/components/VideoOverlay/overlay/overlayTelemetry.ts` will derive frame data from app state: current GPS point, current point index, current acceleration, active lap, and current lap elapsed time. It will use the existing `getPointAtTime()` and `calculateAcceleration()` utilities where appropriate, but it will expose a small overlay-specific API that tests can exercise without React.

`src/components/VideoOverlay/overlay/overlayGeometry.ts` will own mini-map projection and track progress logic. It will compute bounds, map coordinates, split the track into completed and remaining polylines, and compute direction arrow rotation from GPS heading or neighboring points.

`src/components/VideoOverlay/overlay/overlayRenderer.ts` will compose the frame. It will clear the canvas, set common drawing quality options, and call dedicated renderers for speed, mini-map, lap timer, and acceleration.

Renderer modules will live under `src/components/VideoOverlay/overlay/renderers/`:

- `speedGauge.ts`: large speed number plus thin arc marks. No filled circular panel.
- `trackMiniMap.ts`: completed track in a bright cyan/white stroke, remaining track in low-opacity white, current position as a direction arrow. No boxed map background by default.
- `lapTimer.ts`: top-center text with subtle shadow only.
- `accelBars.ts`: small minimal G-force indicators using thin lines or bars, with no card background.

Screenshot behavior will be implemented separately in `src/components/VideoOverlay/overlay/captureOverlayFrame.ts`. It will receive a video element and overlay canvas, draw the current video frame into an offscreen canvas, draw the overlay canvas above it, and trigger a PNG download. The UI button will live in `VideoOverlayTab.tsx` or a small local component near the video surface, not inside the overlay canvas image.

## Data Flow

1. `VideoPlayer` continues to update `currentTime`, `isPlaying`, and video state through the existing store.
2. `OverlayCanvas` reads the store values it needs: GPX points, laps, current time, video start time, time offset, and overlay config.
3. Each animation frame builds an `OverlayFrameInput` containing canvas size, timing values, GPX points, laps, and config.
4. `deriveOverlayTelemetry(input)` returns the current telemetry snapshot.
5. `renderOverlayFrame(ctx, input, telemetry)` delegates to widget renderers.
6. The screenshot button calls `captureOverlayFrame(videoElement, overlayCanvas, filename)` and saves a composed PNG.

The render pipeline should be deterministic for a given frame input. This keeps the non-Canvas calculations easy to test and leaves visual rendering to manual/browser verification.

## Visual Design

The selected style is option B from the preview: clean, crisp, and transparent.

Rules:

- Avoid visible boxes around gauges and the mini-map.
- Avoid thick borders, dark panels, and card-like backgrounds.
- Use white and cool cyan as the dominant overlay colors, with restrained amber/red only for warnings or braking/acceleration accents.
- Prefer thin strokes, typography, and subtle shadows over filled shapes.
- Keep overlay elements out of the center driving view.
- Default positions: speed lower-left, mini-map lower-right, lap timer top-center, acceleration near the speed area.
- Text must remain readable over video through light shadow or outline, not through large opaque panels.

## Error Handling

- If no GPX data is present, render no telemetry overlay and keep the canvas transparent.
- If video start time is missing, keep using the existing auto-default to the first GPS timestamp.
- If current video time does not match a GPS point within the existing tolerance, render an empty or inactive state rather than stale telemetry.
- If screenshot capture fails because the video frame is unavailable or the canvas is tainted, show an Ant Design `message.error()` with a short Chinese error message.

## Testing

Add Vitest as the project test runner and a `test` script.

Core tests:

- `gpxParser`: parses GPX track points, ignores malformed timestamps, computes smoothed speed from distance/time.
- `trackCalc`: detects start-line crossings, computes lap data, computes acceleration, computes theoretical best lap.
- `overlayTelemetry`: maps video time and offset to current telemetry, returns null when no matching GPS point exists, computes active lap elapsed time.
- `overlayGeometry`: projects track coordinates into a mini-map box, splits completed and remaining track, computes direction arrow heading.
- `captureOverlayFrame`: can be covered by a small DOM/canvas smoke test if the environment supports it; otherwise it receives a documented manual QA step.

Verification commands:

- `npm.cmd run lint`
- `npm.cmd run build`
- `npm.cmd test`

## Implementation Sequence

1. Fix current lint issues without changing user-facing behavior.
2. Add Vitest and tests for existing calculation behavior.
3. Extract overlay telemetry and geometry helpers test-first.
4. Extract renderer modules and rewrite `OverlayCanvas.tsx` as a host.
5. Apply the transparent visual design to each renderer.
6. Add screenshot capture and button.
7. Update README and DEV_LOG to match the new overlay status.

## Acceptance Criteria

- Lint, build, and tests pass using Windows-safe `npm.cmd` commands.
- `OverlayCanvas.tsx` no longer contains all widget drawing logic.
- The overlay renders with no visible panel/card backgrounds around speed, mini-map, lap timer, or acceleration widgets.
- Mini-map shows completed and remaining track differently and uses a direction arrow for the current position.
- Speed display uses a large clean number plus a thin gauge accent.
- Screenshot saves a PNG containing both the video frame and overlay.
- Documentation reflects the new overlay renderer structure and known future work.
