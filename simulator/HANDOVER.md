# Handover — frequency_shift_simulator (as of 2026-09-16, rev 6)

## Files & rules
- `simulator/simulator.html` — the WORKING file (all edits go here). Single self-contained
  HTML app, **17.5k lines** at rev 6, six inline `<script>` blocks (one of them ~13 MB of base64
  STL — never `grep` it without `cut`). `index.html` is a landing page only.
- The pristine original is **not in the tree** — it is the `original-pre-merge` tag,
  @s20000125-alt's last published version. Retrieve it when a change is rejected ("go back to the
  original X code") with `git show original-pre-merge:simulator.html`.
- User tests in the browser; remind them to hard-reload (Ctrl+F5). Scenes autosave to localStorage.

## Verifying an edit (no Node on this machine)
Four layers, cheapest first. Run 1 after *every* edit batch; 3–4 before claiming anything works.
1. **Parse** — extract the six inline `<script>` blocks and compile each with `new Function(src)`
   under `jsc` (`/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc`);
   that parses without executing, so it needs no DOM. Supersedes the old brace/backtick-balance
   count, which only ever proved the file was *balanced*, not that it parsed.
2. **Physics in `jsc`** — `sed` the q-helper range out of the file, `load()` it, assert against
   Gaussians computed by hand. No DOM needed, sub-second.
3. **In-browser over CDP** — headless Chrome plus a stdlib-only WebSocket client, `Runtime.evaluate`
   with `returnByValue`. Build scenes programmatically (`components.length = 0; components.push(
   mkComp(...)); lastTracedBeams = traceRays()`), assert, then kill the browser. See gotcha 4 —
   do **not** use `--dump-dom`.
4. **Regression by fingerprint** — hash every segment endpoint, `q1`/`q2`/`qa`, `w1`/`w2` and all
   coupling η for a real scene, on the pre-change file and the working file, and compare. This is
   what turns "no regression" into a measurement. `scenes/IAMS_Yb_Lab_2026-08-20.json` (265 beams /
   1903 segments) exercises lenses, cylinders, AOMs, fibers and V-mirrors at once.

**No `jsc` (Windows)?** The same four layers are scripted in [`verify/`](verify/) with Node 22 and no
packages: `parse_check.js` (layer 1), `physics_test.js` (layer 2 — loads the q-helper + dispersive-optics range
with `vm` and asserts against closed forms), `cdp_test.js <html> tests|fp|shot` (layers 3–4 and a screenshot;
headless Chrome over CDP through Node's built-in WebSocket, killed by its own scratch profile). `fp` on
`git show <rev>:simulator/simulator.html` vs the working file is the fingerprint comparison; it builds a
16-component scene of pre-existing types in-page because `scenes/` is local-only.

Then **look at it**: screenshot the canvas or the w(z) plot over CDP. Two of the three real defects
in the 08-21 session were found by looking, with the assertion suite fully green.

## Engine conventions
- World units = mm; canvas y points down. All beam sizes are 1/e² intensity RADII ("⌀" = 2w everywhere).
- Gaussian q-formalism: `makeGaussianQFromLaser`, `qPropagateFree`, `qApplyABCD`, `beamRadiusFromQ`.
  Laser waist floor = λ/2 (three hidden 5 µm clamps removed).
- **`beam.q` is the IN-PLANE (board-plane) axis.** The out-of-plane (vertical) axis is `beam.qa`, an
  OFFSET: `q_vertical = q + qa`, `null`/absent = round. Stored as a difference because that is exactly
  invariant under free propagation, so all `{...beam}` spreads and every `qPropagateFree` site need no
  extra bookkeeping. Only elements with POWER touch it: `_qaThroughShared` (spherical lens, curved
  mirror — same ABCD both axes), `_qaFromAxisLens` (cylindrical, one axis), fiber → `null`, linked
  V-mirror → `_vmQaAfterLink`. Read the vertical axis with `qVertOf(q, qa)` / `beamRadiusVertFromQ`;
  test with `_qaIsRound(qa)` or `isAstigmatic(beamOrSegOrHit)`. Segments carry ONE `qa` (invariant along
  the segment); `_lastHit` carries `qa` + `beamRadiusVertMm`. **If you add an element with optical power,
  remap `qa` there or astigmatism goes subtly wrong downstream of it.**
- **Dispersive optics (`prism`, `grating`) live in the `DISPERSIVE OPTICS` block right after the qa helpers.**
  The prism is traced through its real triangle (`_prismWorldVerts` → `_prismEdgeHit` → `_prismTrace`, TIR
  bounces included); the grating by `gratingOrders` — d(sin α + sin β) = mλ with α, β from the normal
  `(−sin a, cos a)`, positive toward the tangent `(cos a, sin a)`, so m = 0 is specular and the ruled face is
  the +normal side (same facing rule as a mirror). Both are **anamorphic without power**: in-plane width ×
  cos θ_out/cos θ_in per interface, applied as `qApplyABCD(q, M, 0, 0, 1/M)` on `q` only, with `qa` re-mapped
  by `_qaDiff(qVertOf(qIn, qa), qOut)`. **Inside glass `q` is the reduced q̂ = q/n**: propagate by `L/n`, and
  the in-glass segments (`seg.inGlass = n`) advance `pathStartMm`/`pathEndMm` by `L/n` too, so the caustic
  sampler's `q1 + dz` stays exact. `_prismLast` / `_gratingLast` on the component feed the panel readouts
  the way `_lastHit` does. Grating orders carry `gratingOrder` + `splitTag 'm=+1'`, never `aomOrder`, so the
  iris ignores them.
- **`drawBeamCaustic()` samples every beam in the scene, and that is cached.** The sampling loop is
  hoisted into `_buildCausticBeamTraces(beams)` and memoized by `_getCausticBeamTraces(beams)`, keyed
  on the **identity** of the traced-beam array. `traceRays()` returns a fresh array every time, so the
  cache can never be staler than `lastTracedBeams` itself. Keep the builder a **pure function of
  `beams`** — the moment it reads a view variable (layout, zoom, trim, probe) the cache starts serving
  stale geometry. Callers must not mutate what it returns; the drawing path only ever spreads into new
  objects. `_causticInvalidateTraces()` covers the one case identity cannot see: beams mutated in
  place without re-tracing.
- **Caustic plot coordinates:** `toX()`, the probe's `zProbe` and the 🎯 target are all PLOT-RELATIVE
  (0 = start of the selected range = `branchZ0`); `primaryTrace.pts` carries ABSOLUTE path length. Anything
  measuring the plot must read `plotPts` (the shifted, range-trimmed copy) — mixing the two is silently
  correct only for an untrimmed laser-born beam.
- **Caustic V-Mirror stitch:** `_vlinkChain(beam)` walks channel-linked periscope hops; `drawBeamCaustic`
  synthesises the vertical run and merges the far side into a **proxy beam** (`_vstitched`) so plot→board
  probing works past the fold. `_getCausticBeamNodes` walks the same chain. **Nodes must be taken from the
  RAW beam before the proxy replaces `primaryTrace`** — `updateCausticRangeSelectors` indexes the same raw
  list, and taking them from the proxy shifts every trim index. Retro mirrors are filled during sampling
  instead (gap > 8.5 mm with a vmirror hit at the gap start; run length = `gap − PUSH`, from the trace, not
  the component). Points in a run carry `vert: true`, `vh` (height off the board) and `vmId`.
- **Each caustic curve follows ONE PHYSICAL AXIS, not one board orientation.** A 90° periscope exchanges
  the transverse axes; spot sizes are continuous through the fold, only the names swap. Points carry
  `xch` = exchanges upstream, and the stitch swaps `w`/`wv` on odd parity when merging a leg so the solid
  curve never trades places with the dashed one. ∥/⊥ labels are then resolved PER Z from `xch` parity
  (`_axSym`), never globally. **If you ever make the curves follow board orientation you will reintroduce
  a ~65% vertical step at every 90° periscope** — that was a real reported bug.
- Tracer stores a beam object for every PREFIX of a path; use the longest continuation when mapping a component
  to its beam/z (`_compBeamZ`). `PUSH = 8` mm gap after every optic (q kept consistent) — this leaves 8 mm HOLES
  in path-length coverage; `_beamPosAtPathLen` tolerates gaps ≤10 mm (just above PUSH) and clamps in-hole z to
  the nearest segment edge. FiberIn absorbs → paired FiberOut (same channel, `(c.channel||'A')`) re-emits;
  fiber resets z and beam quality.
- Interaction apertures are decoupled from drawn/3D housing sizes: fiberin/fiberout ±10 mm, AOM ±10 mm box
  (AOM physics otherwise the untouched original).

## Features added 2026-09-16
Two dispersive components, both defaulting to the lab's Thorlabs parts: **Prism** (`prism`, PS850 — F2
equilateral, 10 mm; PS852/PS853 presets; Sellmeier glasses F2 / N-SF11 / N-BK7 / UVFS; traced through the
true triangle; "rotate to minimum deviation" button; δ, δ_min, dδ/dλ, M and glass-path readouts) and
**Grating** (`grating`, GH13-24U — 2400/mm holographic, 12.7 mm; per-order chips, working order + η,
Littrow button, per-order β / share / dβ/dλ). Palette, radial-menu group "Dispersive", schematic symbols,
3D fallbacks, assist apertures, mount fine-tune, save/load. Verification scripts in `verify/`. See CHANGELOG.md.

## Features added this session
Channel pairing UI (A–H dropdown + status), NA ↔ mode-field-radius controls on both fiber ends, collimator &
coupling-lens fine-tune (axial/lateral nudges + typed distance), two-component separation ruler with typed
distance, persistent groups (click=group, Alt+click=member, ⛓gN badges, 25 mm hole snapping incl. best-fit
rigid re-land after rotation), linked probes (w(z) plot ↔ board marker, both directions), z-coordinates in the
caustic optics bar and an editable "z on beam" panel row, caustic range selectors that keep user choices
(dataset.prevVal) and accept endpoints in either order, hover-only component labels/badges (`_hoverComp`,
`_labelVisible`), adaptive w(z) sampling around µm-scale waists, µm-aware readouts in the laser q panel.

## Features added 2026-08-21
Astigmatic laser source (`astig_source` = 'off'/'on' + `waist_v_um` / `waist_v_z_mm`, seeded into `qa` at
emission — OFF returns null so old scenes are untouched); both transverse axes now *quoted* everywhere they
were only drawn (caustic waist box w₀⊥ + Δz astigmatism, 🎯 target ⌀∥/⌀⊥, probe tooltip w⊥ + ellipticity,
camera per-axis ⌀/fill/clip with W×H px, board probe "A ∥ / B ⊥"); V-Mirror out-of-plane runs stitched into
the caustic (`_vlinkChain` for linked periscope pairs + a gap fill for retro mirrors, indigo band, height
readout, proxy beam for far-side probing). Plus a fix: the caustic waist/zR-band/split/target/probe readouts
were interpolating absolute-z points against a plot-relative axis — wrong for any beam born at a FiberOut or
V-Mirror, or any trimmed range. See CHANGELOG.md.

## Features added 2026-08-20
Cylindrical lens component (`cylens`) with a selectable powered axis (in-plane / out-of-plane) and full
lens parity, plus the astigmatic two-axis beam tracking described above: dual-envelope w(z) plot,
astigmatism-aware fiber coupling (η = η₁D·η₁D per axis), periscope axis exchange, `w_v` export columns.
See CHANGELOG.md for the full list and the verification evidence.

## Gotchas that burned time (don't rediscover)
1. **CSS uppercase turns "µ" into Greek capital Mu → "(µm)" renders "(MM)".** Fixed with
   `.prop-label .unit{text-transform:none}` + `<span class="unit">µm</span>`. Use for any new µ label.
2. **w(z) plot sampling** is 10 samples/mm — without the adaptive waist cluster, a 1.5 µm waist plots as ~5–10 µm
   ("looks like a clamp bug").
3. **Panel readouts in fixed mm** rounded fiber-scale values to nonsense (0.002 mm); use the adaptive µm/mm
   formatter pattern.
4. **render() invalidates `_leafBeamsCache`** → caustic selectors rebuild constantly; any user choice there must
   persist via `dataset.prevVal`.
5. **Spatial change requests:** restate a concrete canvas-level example ("component at 0°, beam at X should Y")
   before coding; prefer the smallest fix; two rejections → revert to original verbatim and re-ask. (AOM lesson.)
6. **PUSH=8 path holes:** any tolerance/lookup working in path-length coordinates must allow >8 mm slack, or
   valid positions right behind an optic get rejected (caused false "z beyond traced path" popups when editing
   lens positions — fixed by raising `_beamPosAtPathLen` gap tolerance 2→10 mm).
7. **A cylinder powered out of plane deliberately does nothing visible in top view** — not a bug: it
   changes neither the drawn beam width nor the chief-ray direction (a vertical kick is unrepresentable
   in a top-view engine). Its effect shows in the w(z) plot's dashed envelope, the panel's out-of-plane
   rows, and the fiber-coupling ellipticity. Say this before "fixing" it.
8. **Test helper trap:** the tracer stores a beam object for every PREFIX of a path, and prefixes carry
   the SAME total power — so picking the "primary" beam by power alone silently returns a 1-segment stub
   and every downstream measurement reads "no data". Pick by longest path (`segments[last].pathEndMm`).
9. **Regression proof that works here:** fingerprint a real scene — see "Verifying an edit" above,
   layer 4. Do not settle for "it still renders".

10. **`--dump-dom` headless Chrome never exits on this app** — the render loop keeps virtual time alive, so
   `--virtual-time-budget` never expires and the run hangs (looks exactly like an infinite loop in your own
   code; it isn't). Drive it over CDP instead and kill the browser yourself — kill by the scratch
   `--user-data-dir` match, never `pkill chrome`, that's the user's browser. A stale `SingletonLock` in the
   scratch profile also aborts the next launch; delete it before starting.
11. **`render()` is rAF-throttled** (`render = function(){ requestAnimationFrame(_renderOrig) }` at
   ~10906, wrapped again at ~16699 for the assist layer). It does **not** re-trace synchronously, so a
   headless test that edits the scene, calls `render()`, then asserts immediately reads STALE state and
   looks exactly like a caching bug. Use **`renderNow()`** (which exists for this) or
   `lastTracedBeams = traceRays()` in tests. Cost me two false failures.
12. **Inside a V-Mirror vertical run there is no board position.** Anything mapping plot-z → canvas must
   handle that (the probe pins its marker at the mirror and shows `⊥h=`), or it silently drops the link
   over what can be the longest stretch of the path.
13. **A prism at minimum deviation makes a *focused* beam astigmatic — physics, not a bug.** The tilted faces
   give the tangential axis an effective in-glass length L/(n·M²) against L/n for the sagittal one
   (M = cos θ₂/cos θ₁ ≈ 1.47 for F2 at 54°), so the two waists separate by ≈3 mm for the 10 mm PS850. A
   collimated beam does not care. Likewise a grating order with β ≠ −α leaves elliptical (× cos β/cos α).
   Say this before "fixing" `qa` at either element — the test suite asserts the displacement.
14. **z inside glass is *reduced* length.** `z on beam` and the w(z) axis advance by L/n through a prism
   (5.5 mm for 8.9 mm of F2) so that q and z stay consistent for the sampler. A ruler on the bench disagrees
   by L(1 − 1/n) per prism pass. The panel's "Glass path" row quotes both numbers.

## User context
Yb atomic-physics lab; fluent in Gaussian optics — communicate in those terms. Typical parameters: 460 nm,
PM460-HP-like fiber (w_f ≈ 1.5–1.65 µm), AOM double-pass, 25 mm breadboard grid. Wants minimal, lab-realistic
changes and an uncluttered canvas.
