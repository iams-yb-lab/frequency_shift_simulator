# Simulator Changelog — frequency_shift_simulator

All modifications live in `simulator/simulator.html`.
The untouched upstream file is not kept in the tree; retrieve it with
`git show original-pre-merge:simulator.html`.
How each session was verified is stated in its own entry below; the current method is in
[HANDOVER.md](HANDOVER.md) ("Verifying an edit"). Early sessions used a bracket/backtick balance
count against the original — that only ever proved the file was *balanced*, and was superseded on
2026-08-21 by a real parse check under `jsc`.

---

## Session 2026-08-07 / 08

### Fiber & coupling
- **Fiber channel pairing UI** — Channel ID dropdown (A–H) on FiberIn/FiberOut with live pair status;
  all pairing comparisons normalized to `(c.channel || 'A')`.
- **NA ↔ mode-field-radius controls** on both fiber ends (FiberOut edits the paired FiberIn's shared mode).
- **Fiber presets catalog** by wavelength band (PM460-HP, SM450, PM630-HP, PM780-HP, PM980-XP, SMF-28, …).
- **Collimator & coupling-lens fine-tune** — axial/lateral nudges, lateral-offset readout, re-center,
  typed "distance from fiber face".
- **Auto-align fiber coupling** — one-click solver: searches lens f + position by real re-trace
  (exact same physics as manual adjustment), places lens(es), fine-tunes, reports η.

### Geometry & UI
- **Two-component separation ruler** with typed center-to-center distance.
- **Persistent groups** — click selects group, Alt+click single member, ⛓gN badges, 25 mm hole snapping
  including best-fit rigid re-land after rotation.
- **Linked probes** — w(z) plot probe ↔ board marker, both directions.
- **z coordinates** — per-component z in the caustic optics bar; editable "z on beam" row in the panel.
- **Hover-only labels** — component names/badges shown on hover/selection only (functional state stays visible).

### Fixes
- **Aperture fixes** — FiberIn/FiberOut interact within ±10 mm (was ±32); AOM within ±10 mm of center
  (was the full 72.5 mm housing).
- **Small-waist fixes** — removed hidden 5 µm laser-waist clamps (floor now λ/2); adaptive caustic sampling
  around µm-scale waists.
- **"(µm)" rendered as "(MM)"** — CSS uppercase turned µ into Greek capital Mu; fixed with `.unit` spans.
- **False "z beyond traced path"** — `_beamPosAtPathLen` gap tolerance raised 2 → 10 mm (the tracer's
  PUSH = 8 mm leaves 8 mm holes in path-length coverage after every optic).
- **Caustic range selectors** keep user choices across re-renders; endpoints accepted in either order.

---

## Session 2026-08-18 / 19

### Integrated fiber collimator
- FiberIn/FiberOut carry an optional built-in thin lens: `collimator_on` (default OFF = old external-lens
  way), `collimator_f`, `collimator_dist` [mm from fiber face], defaults 7.5 mm (A7.5-style package).
- **FiberOut**: emits the post-lens q referenced to the port face (exact for z ≥ d; 0…d draws the virtual
  collimated beam, like light leaving a collimator package).
- **FiberIn**: coupling η computed through the port's lens (−d → lens f → +d folded into the traced q at
  the face). Auto-align remains exact (re-trace scoring includes the integrated lens).
- Panel: toggle, f/d inputs, "Set d = f" (collimate ↔ waist at face), output-beam readout (⌀ at lens,
  waist ⌀/position, divergence), stale-external-lens warning; old Plan A/B/C UI hidden while ON.
- Later addition: **fine-adjust nudge rows** for d and f (±1 / ±0.1 / ±0.01 mm).
- Canvas: small lens tick at ±d on the port axis.

### Breadboards
- **Lock/free per board** — locked: dragging the board carries every component on it rigidly; free: the
  board slides underneath (old way). Gold "🔒 locked" tag on canvas; board properties panel added
  (size, hole count, rider count, lock toggle, delete).
- **Board presets dropdown** ("＋ Add Board…"): Standard 600×425, 450×600, 300×450, Nanofiber MOT (500×600),
  Nanofiber MOT — back side, custom size.
- **Board rotation** — 90° steps about the center (w/h swap, origin re-snapped to the 25 mm grid);
  locked boards rotate their optics too (positions + optical angles); MOT geometry rotates with the plate.

### Nanofiber-MOT board (from `assets/breadboard/NanofiberMOTAssembly.STL`)
- Geometry extracted offline from the 27.5 MB / 550k-triangle STL (not embedded — 2D only by decision).
- **Keep-out**: only the circular chamber reaches the plate (max radius 90.3 mm around the center) —
  the nanofiber support overhangs from above, so the plate under it stays usable. Forbid radius 95 mm;
  drags divert to the nearest free hole.
- **⌀60 mm through-hole** found by rasterizing the plate-top triangles (bottom window for the vertical beam).
- **2D chamber drawing** traced from the STL at window level (75 mm above plate): octagon body
  (circumradius 68 mm, corners at 22.5° + k·45° — orientation corrected per lab knowledge), 8 recessed
  viewports on the flats (k·45°), ⌀10 tube port to r = 129, ⌀34 fiber-side tube to r = 214, flange end caps.
- **Back-side board**: same plate viewed from above at the level below — only the ⌀60 window, no keep-out;
  hole at the same board-local spot so a V-Mirror on it aligns with the chamber axis.

### New components
- **Iris** — idealized AOM order filter ("real alignment too difficult"): per-order pass chips
  (−2 −1 0 +1 +2); beams carry `aomOrder` stamped at the last AOM; blocked orders terminate at the iris;
  non-AOM beams (and fiber-cleaned beams) always pass. Blade-tick canvas symbol with always-visible
  pass tag; plain "Iris" label in exports.
- **V-Mirror** — vertical fold for the 3D-MOT axis: ⊙ (up) / ⊗ (down) out-of-plane notation; optional
  **retro** at settable vertical path (beam returns after 2×L with q and path length advanced — the
  caustic stays physically correct through the vertical run) and **λ/4 double-pass** (pol +90°, so an
  upstream PBS folds the return out — standard vertical MOT arm). Fine-tune: X/Y position nudges,
  vertical-path nudges, and **return-beam tilt** (in-plane retro misalignment, ⌖0 = perfect retrace).

### Physics fixes
- **AOM false-color clarified** — canvas colors per diffraction order are display tags only; the
  schematic export now colors beams by true wavelength (an 80 MHz shift does not change the color).
- **PBS/CBS diagonal-face fix** — the intersect used the center plane (x = c.x / y = c.y), which collapsed
  parallel offset beams (e.g. AOM orders) onto one axis after reflection: they merged at the PBS and only
  re-separated by their small angle difference. Now the beam intersects the true diagonal line through the
  cube center along `c.angle` (vertical offset → horizontal offset preserved). Note: off-center hits now
  reflect off-center — physically right; old scenes may show small shifts.
- **FiberOut blocks beams** — a beam hitting a FiberOut port (e.g. a back-reflection) terminates there
  instead of passing through; the port's own emission excludes itself on the first hop so it never self-blocks.
- **AOM "displayed orders"** — per-AOM chips select which single-pass orders are traced at all
  (kept orders keep exact physics; DP retro on the selected order still works).

### Schematic export (publication figures)
- **PNG (3×) + SVG export** in the style of the lab's example figures: white background, black line-art
  symbols (mirror stroke, lens ellipse + "f = X mm", PBS square + diagonal, HWP/QWP bars ⊥ the local beam,
  labeled boxes, fiber connector + pigtail), wavelength-colored beams, true positions/angles.
- PUSH-gap bridging (beams run continuously through optics), Liang-Barsky clipping.
- **Label anti-overlap** — greedy placement (below → above → right → left → further out) against
  rotation-aware symbol obstacles; labels drawn last.
- **AOM fan exaggeration (export only)** — real ~1–2° deflections are unreadable; a diffracted order whose
  beam flies off freely is drawn rotated to 10°/order (anchored beams keep true paths). (First
  wedge-and-rejoin attempt rejected — looked like a glitch.)
- **Board-set export** — checkbox list in the board panel selects which boards go into one figure:
  union bounds, per-board beam clipping, dashed board outlines; MOT chamber drawn in line-art in exports.
- Scope: per-board buttons in the board panel; whole-scene buttons in the toolbar.

### Groups & mirrors
- **Group mirror** — ⇋ Mirror H / ⇵ Mirror V flip the multi-selection about its centroid (positions and
  optical angles reflect; D-mirror open side inverts; best-fit hole re-land like rotation).
- **Mirror fine-tune** (all mirror types) — kinematic-mount-style nudges: angle ±1/±0.1/±0.01°
  (reflected beam steers 2×), translation ⊥ normal (walks the beam parallel) and ∥ surface, ±1/±0.1/±0.02 mm.

### Beam caustic window
- **🎯 Target-z marker** — gold dashed line + ±w dots + "z ⌀" label at a typed z; anchored to the physical
  plane (absolute path length), survives range changes, saved with the project.
- **z-max override** — extend the axis past the traced beam (place the target beyond the last optic) or
  zoom into the early range; "auto" placeholder shows the natural limit; saved with the project.

### UX
- **Component placement "lost it" fix** — drops far from any board no longer clamp into the nearest board
  (they land at the cursor on the global grid); spawn pulse ring marks every new component; the view
  auto-centers if a legitimate snap moved it off-screen; plain palette click places at the view center.

---

## Session 2026-08-19 (second session)

Verification this session: in addition to the balance check, changes were tested end-to-end in headless
Chrome (CDP) against the real page and the lab's saved scene (`scenes/IAMS_Yb_Lab_2026-08-19_1018.json`, formerly `IAMS_Yb_Lab_2026-08-19-2.json`).

### MOT chamber
- **Dispenser-side window is opaque** — the flat carrying the long ⌀34 dispenser tube (270° + board
  rotation; board-top in the base orientation) has no viewport: beams now terminate at that wall, in both
  directions. Canvas draws that window tick gray with a "dispenser (opaque)" note; schematic exports omit
  its window tick. The other 7 viewports stay transparent.

### Fiber channels
- **Numbered channels 1–99** (letters removed). Old saves migrate on load: letters map to numbers ABOVE the
  highest numeric channel already in the scene (pure-letter saves get A→1 … H→8), so legacy ports never
  merge into an active numeric channel. New ports default to channel 1.
- **Root cause of "channels > 10 don't pair"** — pairing uses strict `===`; one code path stored the channel
  as a number, so `12 !== '12'` silently failed. Every setter now stores strings and loading coerces,
  killing the whole mismatch class.
- **Blank dropdowns fixed (all selects)** — Windows paints the native popup with the select's
  near-transparent background over white → white-on-white options. Global CSS gives options solid colors
  (hard-coded — option elements don't resolve CSS vars inside native popups).
- **Panel warning when several FiberIns share one channel** (outputs take light from the first lit one).

### Fiber chains light up correctly
- **Multi-pass FiberOut emission** — a chain laser → FiberIn A … FiberOut A → optics → FiberIn B … FiberOut B
  used to leave FiberOut B dark whenever it preceded FiberOut A in creation order (emission ran as ONE pass
  in component order). Emission now repeats until no port gains light (each emits once, so loops terminate).
  Found by reproducing the lab scene headless: 4 of 14 FiberOuts were dark with their inputs lit.

### V-Mirror linking (vertical runs the 2D canvas can't draw)
- **V-Link channel** pairs two V-Mirrors like fiber ports (own channel space, "— none" = standalone/retro).
  A beam folding out of plane at one mirror re-enters at its mate along the mate's **exit angle**, with q and
  path length advanced by the sender's vertical path — unlike fiber, polarization, EOM/AOM history and the
  caustic all carry through (it's just two mirrors). Bidirectional; plugs into the same multi-pass emission,
  so fiber ↔ V-link chains work in any order. Canvas: Vch badge + exit-direction arrow + dashed link line.
- **Exit-angle controls** — quick-set → 0° / ↓ 90° / ← 180° / ↑ 270° buttons plus ±10/±1/±0.1/±0.01° nudges
  (wraps mod 360), matching the mirror fine-tune style.

### New component
- **Camera** — imaging sensor: absorbs the beam and reads out spot ⌀ (1/e²), spot size in PIXELS, sensor
  fill % with a clip warning, power, λ, path length. Sensor width/height/pixel size editable (defaults
  11.26 × 7.03 mm, 3.45 µm). Rotates with its angle; "CAM" box in schematic exports.

### Beam caustic: pick the light, not a range
- **Source dropdown** — one entry per lit light origin: lasers, FiberOut emissions, V-Mirror links. Picking
  one plots its full path from z = 0 at the source. **FiberOuts are first-class sources now** (the port is
  the first node of the plot).
- **Branch dropdown** — appears only when that light splits (PBS, AOM orders); entries labeled by where the
  branch ends. No more guessing which arm the plot chose.
- Start/end dropdowns + ▭ Range Select demoted to optional trim; switching source/branch resets to the full path.
- **Two bugs fixed underneath**: fiber-emitted beams had no source identity, so (a) the port could never be
  a range start, and (b) every truncated prefix of a fiber beam entered the beam cache as a separate beam —
  selections landed on arbitrary partial paths.

### Schematic export: labels avoid beams
- Reverses the earlier "labels may cross beams" decision. Every drawn beam segment is now a placement
  obstacle: labels try a near-to-far grid of ~50 positions (below/above rows × centred/edge/beside columns,
  plus page-edge-flush columns for components near the border; export margin 25 → 48 px to create that
  strip). If no clean single-line spot exists, the label wraps onto TWO lines and retries; last resort is
  the fewest-crossings position. Verified on the lab scene: 0 label-beam overlaps on every board
  (35 labels on the busiest board).
- **Fiber pigtails are obstacles too** — the curly fiber tail extends well past the port's connector box,
  and labels could land on it; each pigtail now registers its bounding box (bezier control-point hull) as a
  label obstacle. Verified: 0 label-pigtail overlaps on all boards of the lab scene.
- **Two wavelengths on one path → parallel strands** — segments were deduped by coordinates alone, so where
  two colors co-propagate (e.g. 399 + 556 combined at a dichroic) the second color was silently not drawn.
  Now segments dedupe by coordinates AND color, segments are grouped by their carrier line, and where colors
  actually overlap each wavelength is drawn as its own thin line offset ±1.1 px perpendicular to the path
  (railroad style — the standard two-color convention in beam-path figures). Single-color stretches stay on
  the center line; the small jog where a color rejoins the center lands under an optic's white symbol.
  Verified on the lab scene: both MOT-arm colors now visible along the shared paths, labels still clear.

---

## Session 2026-08-20

### Cylindrical lens component (`cylens`) + astigmatic beam tracking
New optic with a **selectable powered axis** and every feature the spherical lens has
(focal length incl. negative f, angle, group rotation, position fine-tune, "z on beam",
hover label, `_lastHit` beam readout, schematic export symbol, 3D mesh, assist evaluation,
scan-parameter selector, ABCD/cavity handling).

- **Axis selector** — `cyl_axis`: `'h'` = in-plane (board plane / horizontal), `'v'` = out-of-plane
  (vertical, ⊥ board). The cylinder axis itself is perpendicular to the chosen power axis.
  An in-plane cylinder focuses the width the 2D canvas draws and steers off-centre beams
  (same paraxial −y/f kick as the spherical lens); an out-of-plane cylinder leaves the top view
  *and* the chief-ray direction untouched by design — a vertical kick is unrepresentable in a
  top-view engine — and reshapes only the out-of-plane axis.
- **Astigmatism** — the engine's `q` is now explicitly the IN-PLANE axis; the out-of-plane axis is
  carried as `beam.qa`, an **offset** (`q_vertical = q + qa`, `null` = round). The offset is exactly
  invariant under free propagation (both axes advance `re` by the same `d`), which is why it is stored
  as a difference: every `{...beam}` spread and all ~20 `qPropagateFree` sites stay correct with no
  extra bookkeeping, and a scene with no cylindrical lens has `qa == null` everywhere. Only elements
  with power touch it — spherical lens / curved mirror re-map it through the identical ABCD
  (`_qaThroughShared`), a cylinder sets it per-axis (`_qaFromAxisLens`), single-mode fiber drops it
  to `null` (the output is round), a linked V-mirror periscope may exchange the axes.
- **w(z) plot** — second, dashed envelope for the out-of-plane axis, drawn only when the beam is
  astigmatic, with a legend. The w-scale now fits the larger of the two axes, and the adaptive waist
  clustering also refines around the *out-of-plane* waist (which sits at a different z).
- **Fiber coupling is now astigmatism-aware** — the old η = 4·zR·zRf/((zR+zRf)²+dz²) is the *square*
  of the 1D overlap, so it is replaced by η = η₁D(in-plane)·η₁D(out-of-plane), i.e. the geometric mean
  of the two per-axis efficiencies. Collapses to the original expression bit-for-bit for a round beam.
  Panel gains both axis radii, the ellipticity, and a "circularise with a cylindrical pair first" note.
- **Periscope axis exchange** — a linked V-mirror pair preserves the two transverse axes when the exit
  azimuth matches the entry one and exchanges them at 90°; the rule snaps to the nearer of those two
  (intermediate azimuths would *rotate* the profile, which needs general astigmatism with cross terms).
- **`w_v_mm` / `w_v_um`** added to the beam-trace data export.
- Scalar in-plane tools (ABCD chain, cavity eigenmode) treat an out-of-plane cylinder as the identity
  and say so in their element labels.

### Verification
- Bracket/backtick balance matches the original baseline after every edit round.
- All 6 inline `<script>` blocks parse (JavaScriptCore via `osascript -l JavaScript`).
- 28 numeric physics checks pass: crossed cylinders of equal f reproduce a spherical lens on *both*
  axes; `qa` invariance under free propagation; spherical re-map equals direct computation; η reduces
  exactly to the old formula when round and equals the geometric mean when not; periscope rule.
- 25 in-browser end-to-end checks (headless Chrome over CDP) pass with zero console errors: an in-plane
  cylinder's in-plane q matches a spherical lens of the same f to 1e-9 while its out-of-plane axis keeps
  diverging; an out-of-plane cylinder leaves the canvas width identical to the no-lens case and does not
  steer the chief ray; render / w(z) plot / schematic SVG / 3D mesh / assist all exercised.
- **Zero regression on a real scene** — the 179-component lab layout (`IAMS_Yb_Lab_2026-08-19_1152`)
  traces to a bit-identical fingerprint before vs. after: 255 beams, every segment's geometry and
  q(re, im, w1, w2), all 20 fiber coupling efficiencies, all component hit readouts.

---

## Session 2026-08-21

### Astigmatic laser source
Astigmatism could previously only be *created* by a cylindrical lens — every beam left its laser round.
- **"Source astigmatism"** selector on the laser panel. OFF (default) returns `qa = null`, so scenes
  saved before this behave bit-for-bit as they did. ON gives the out-of-plane axis its own
  `waist_v_um` / `waist_v_z_mm`, converted at emission into the same `qa` offset a cylinder produces,
  so it rides downstream through the tracer, the w(z) plot, the per-axis coupling and the periscope
  rule with nothing else touched.
- Switching ON also starts *round*: the new fields fall back to the in-plane pair, so the beam only
  turns elliptical once they are actually changed.
- The laser's Gaussian-beam table gains w₀⊥ / z_R⊥ / q(0)⊥ and the axial separation of the two waists.

### Both axes are now *quoted*, not just drawn
The out-of-plane axis was computed and drawn but never reported anywhere — the waist box even built a
`waistPtV` that nothing read.
- **Caustic waist box** — w₀⊥, the z it sits at, and Δz between the two waists (that separation *is* the
  astigmatism; the size alone says nothing). Teal dashed line + hollow rings mark the ⊥ waist. Waists now
  carry their own adaptive unit, so a 148 µm ⊥ waist no longer renders as "0.1 mm" just because the
  in-plane axis set the plot scale to mm.
- **🎯 target marker** — ⌀∥ and ⌀⊥ at the target plane, with hollow rings on the dashed envelope.
- **Probe tooltip** — w⊥ row and the w∥/w⊥ ellipticity. Filled dots always mean in-plane, hollow rings
  always mean out-of-plane.
- **Camera panel** — a sensor sees a 2D spot, so it splits into ⌀∥ (across sensor WIDTH) and ⌀⊥ (across
  HEIGHT), spot size as W×H px, per-axis fill, and a clip warning naming *which* axis clipped: an
  elliptical beam can overrun one axis while the other is comfortable.
- **Board Beam Probe** — dia/radius as "A ∥ / B ⊥", ellipticity in the header.
All of it is gated on the axes actually differing, so a round beam renders exactly as before.

### V-Mirror out-of-plane runs stitched into the caustic
A V-Mirror takes the beam off the board, and the w(z) plot used to stop dead at the fold: a channel-linked
periscope pair was two unrelated beams (vertical run *and* the whole far side missing), and a retro
V-Mirror left a blank stripe 2·vpath wide — often the longest free-space stretch on the path and exactly
where the waist sits.
- **Retro** — filled during sampling. Every optic leaves a hole of exactly `PUSH = 8` mm, so a larger gap
  with a V-Mirror hit at its start is unambiguous; the run length comes from the traced geometry
  (`gap − PUSH`), never re-read off the component, so it cannot disagree with the trace. Points carry the
  height above the board, rising on the up-leg and falling on the down-leg.
- **Linked pair** — new `_vlinkChain()` walks the hops (loop-guarded, follows chains). `drawBeamCaustic`
  synthesises the vertical run by truly propagating the stored link-beam q, appends the far side's points, and
  replaces the primary with a merged **proxy beam** — that proxy is what makes plot→board probing work
  past the fold, since `_beamPosAtPathLen` needs the far side's segments. `_getCausticBeamNodes` walks the
  same chain, so the trim dropdowns, the optics bar and component-click trimming all reach the far side.
- **Invariant** — nodes are taken from the RAW beam, *before* the proxy replaces `primaryTrace`.
  `updateCausticRangeSelectors` builds its dropdown from the same raw beam; taking them from the proxy
  shifts every trim index.
- **Axis naming** — a 90° periscope *exchanges* the two transverse axes. The beam's two spot sizes are
  continuous through the fold; only the NAMES swap. So each drawn curve follows **one physical axis** end
  to end (solid = whichever axis is in-plane where the plot starts), which keeps w(z) continuous — the
  only way the plot is readable. Naming the curves by board orientation instead would make them trade
  values at the fold and put a meaningless vertical step in the middle of the caustic. The naming is
  instead resolved **per z**: every point carries `xch` (exchanges upstream of it) and the ∥/⊥ symbols in
  the waist box, probe and 🎯 readouts flip on its parity, with a `(—)`/`(- -)` tag naming the curve when
  the plotted range straddles an exchange. The band and the legend say where it happens.
- **Drawing** — an indigo band marks every off-board stretch with its length and the mate it runs to. The
  probe reports the height off the board and pins its board marker *at* the V-Mirror (recoloured, with a
  `⊥h=` label) rather than dropping the link, since no in-plane position exists there.
- R(z) and the local zR are computed for V-run points too, via a shared `_causticRzRAt()`, so the probe
  has no dead patch inside a run.

### Fix: caustic readouts read absolute z against a plot-relative axis
`toX()`, the probe's `zProbe` and the target marker are plot-relative (0 = start of the selected range),
but the waist marker, Rayleigh band, split-origin diamond, target readout and probe all interpolated
`primaryTrace.pts`, which carries *absolute* path length. The two only agree when `branchZ0 == 0` — an
untrimmed beam born at a laser. For a beam born at a FiberOut or a V-Mirror, or any trimmed range, every
one of those readouts sat at the wrong z. (`_beamPosAtPathLen` right next to the probe already added
`branchZ0` back, which is what made the mismatch visible.) All five sites now read the shifted,
range-trimmed points.

### Beam-caustic probe: usable pointer, 12× faster redraw
- **The OS cursor is visible again while probing.** It was hidden on the assumption that the drawn
  crosshair replaced it, but that crosshair only tracks z — vertical mouse motion moved nothing on
  screen, so you lost track of your own pointer. Drawing a cursor instead is not an option: it repaints
  with the plot and would trail the real pointer by a frame.
- **The sampled traces are now memoized.** `drawBeamCaustic()` re-sampled *every* beam in the scene on
  *every* call — including the one fired by each mousemove while probing — then drew exactly one of
  them. Profiled on `IAMS_Yb_Lab_2026-08-20` (265 beams, 44 771 plotted points): **243 ms/frame, of
  which 223 ms was sampling beams that are never drawn**; stroking the visible curve measured ~0 ms.
  The sampling loop is hoisted into a pure `_buildCausticBeamTraces(beams)` and cached on the traced-beam
  array's identity, so a re-trace invalidates it automatically. **243 ms → 14 ms (3 fps → 70 fps.)**
  No point decimation was needed.

### Caustic waist box: docked, compacted, and hideable
- The w₀ box sat beside the waist, pinned just above the centreline — which is exactly where the
  envelope runs for a small beam, so it covered the very curve it annotates. It now **docks to
  whichever plot corner the beam leaves emptiest** (scored against the real envelope; bottom-right
  is skipped when the ∥/⊥ legend is there), with a faint leader line back to the waist tick.
  Corners rather than a free search, so it does not hop around while an optic is being nudged.
- **Compacted from 6 lines to 3** (2 for a round beam): the waist position rides on the same line as
  its size, and the ⊥ waist's z is implied by Δz instead of spending a line. Row colours now match
  the curve each row describes.
- New **☑ Waist** toggle beside Fill / R(z) hides the whole annotation — lines, dots and box.

### Fix: R(z) and zR described the wrong axis past a periscope exchange
The axis-exchange fix swapped `w`/`wv` at the fold but left `R` and `zR` behind, so **every point
past a 90° periscope reported the other axis's Rayleigh range and wavefront curvature** — a 13.7 µm
waist quoting `zR = 28.63 m` where the true value is 1.1 mm. Both are now carried per axis
(`Rv`, `zRv`) through the sampler, the retro fill and the V-run fill, and swapped together with
`w`/`wv` wherever a leg is re-keyed. Caught by the box compaction putting w₀ and zR on adjacent
lines, where the inconsistency became obvious.

### Verification
- All 6 inline `<script>` blocks parse (`jsc`, parse-only via `new Function`).
- 17 numeric physics checks in `jsc`: per-axis w(z) matches `w₀√(1+((z−z₀)/z_R)²)`; `qa` invariant under
  free propagation; a spherical lens re-maps the offset to exactly the directly computed vertical q;
  crossed cylinders of equal f reproduce a spherical lens on both axes.
- 61 in-browser end-to-end checks (headless Chrome over a raw-socket CDP client) with zero console errors:
  hop geometry lands on the mirror face; far-side z is continuous at `fold + vpath`; the run's last q
  equals the far beam's first q to 1e-12; the stitched w(z) is one analytic Gaussian across the whole
  plot; a 90° turn is detected as swapped and its far in-plane axis *is* the near out-of-plane one; the
  retro fill peaks at vpath and returns to zero with no gap larger than the 8 mm PUSH hole; V-run R(z)/zR
  match the analytic Gaussian and the segment-loop convention; a cyl lens powered out of plane followed
  by a periscope reproduces an independently built ABCD chain on the ⊥ axis to 1e-9 while leaving the
  in-plane axis untouched.
- **Zero regression on the real scenes** — `IAMS_Yb_Lab_2026-08-20` (265 beams / 1903 segments) and
  `final_version` both draw all 50 selectable beams, open every panel type and probe cleanly. The trace
  fingerprint — every segment endpoint, `q1`/`q2`/`qa` and `w1`/`w2`, plus all 21 coupling efficiencies —
  is **bit-identical** to commit `4a162b6`, i.e. before this whole branch. The stitch is display-only.
  The lab scene exercises it for real: 3 linked periscope hops across 4 V-Mirrors, 603 vertical-run points.
- Visual check: screenshot of the stitched plot with an astigmatic source + out-of-plane cylinder +
  90°-capable periscope — both envelopes continuous across the band, waist box, legend, and the probe
  tooltip reading `w∥ 0.81 / w⊥ 0.22 / ⊥ V-run · 150 mm off board`.

---

## Session 2026-09-16

Verification this session (scripts now in [`verify/`](verify/)): all 6 inline scripts parse (Node 22
`new Function`); **47 closed-form physics checks** in Node; **44 end-to-end checks** in headless Chrome over
CDP with zero console errors; a regression fingerprint of a 16-component scene built only from pre-existing
types (laser · HWP · PBS · lens · cylinder · AOM · iris · mirror · dichroic · fiber pair · plate BS · camera ·
power meter · dump — 13 beams / 62 segments, every endpoint, `q1`/`q2`/`qa`, `w1`/`w2`, path length and power)
is **bit-identical** before and after. Evidence: [`logs/2026-09-16_prism-grating-dispersion.png`](../logs/2026-09-16_prism-grating-dispersion.png).

### New components — dispersive optics
- **Prism** (`prism`) — Thorlabs **PS850** by default (F2 equilateral, 10 mm faces), with **PS852** (F2, 25 mm)
  and **PS853** (N-SF11, 25 mm) presets and a custom mode (glass F2 / N-SF11 / N-BK7 / UV fused silica, apex
  angle, face length). The beam is refracted through the **drawn triangle at true size** — entry face → glass →
  exit face — at n(λ) from the Sellmeier equation, with total internal reflection handled (the ray bounces
  inside, or is reported trapped). Two lasers of different colour separate by their deviation difference
  (F2, 60°: 399 vs 680 nm → 3.94°). Panel: n(λ), incidence θ₁, deviation δ, δ_min and the incidence that gives
  it, dδ/dλ in mrad/nm (by re-tracing at λ ± 0.5 nm), in-plane magnification, glass path, and **⟂ Rotate to
  minimum deviation for this beam**. The default orientation is minimum deviation for a beam travelling +x at
  680 nm. Mount fine-tune (angle / ⊥ / ∥ nudges) as for mirrors.
- **Grating** (`grating`) — Thorlabs **GH13-24U** by default (2400 lines/mm reflective holographic, 12.7 mm
  ruled width), **GH13-24V** preset, or custom lines/mm and width. Reflective and single-sided (a beam from
  the substrate side passes it by), one traced beam per order from d(sin α + sin β) = mλ; m = 0 is the specular
  reflection; evanescent orders are skipped. **Traced-order chips** (−2 … +2, default −1 0 +1); a **working
  order** carries the set efficiency η (default 0.5) and the other propagating orders share 1 − η (when the
  working order is evanescent, all propagating orders share equally). Panel: λ, period, λ/d, incidence α, the
  Littrow angle for the working order, per-order β / power share / dβ/dλ, and **↩ Rotate to Littrow** (the
  working order retraces the incoming beam). Orders carry `splitTag` `m=+1` etc. and `gratingOrder`; they are
  **not** AOM orders, so an iris never blocks them.
- Both appear in the sidebar palette, the radial menu (new **Dispersive** group), the schematic export
  (true-size triangle; ruled line with a hatch on the substrate side), the 3D view (procedural glass prism /
  ruled plate) and the assist evaluation (clear aperture = 0.8 × face length / ruled width).

### Physics: how the new elements touch `q`
- Neither element has focusing power, but both are **anamorphic in the plane of incidence**: at a tilted face,
  or on diffraction to a different angle, the in-plane width scales by M = cos θ_out / cos θ_in. That is applied
  as the ABCD diag(M, 1/M) — q → M²q — on the in-plane `q` only, and `qa` is re-mapped from the untouched
  vertical q, the same discipline as for a cylindrical lens. Overall M = 1 at minimum deviation and at Littrow.
- **Inside glass the engine carries the reduced q̂ = q/n** (Siegman): propagation over a geometric length L
  advances q̂ by L/n, and `beamRadiusFromQ` with the vacuum λ returns the true radius. The in-glass legs are
  stored as segments on the beam (`inGlass: n`) and advance the **path-length axis by L/n as well**, so the
  w(z) sampler — which interpolates q by z — stays exact through the prism.
- Consequence, and checked in the tests: a prism at minimum deviation still leaves a *focused* beam
  **astigmatic**. The in-plane axis sees an effective in-glass length L/(n·M_entry²), the vertical axis L/n, so
  the two waists end up L/n · (1 − 1/M_entry²) apart — 2.96 mm for the PS850 at 680 nm. That is textbook
  tilted-plate astigmatism, not a bug; a collimated beam does not notice it.

---

## Session 2026-09-17

Verification: 6/6 scripts parse; **56 physics checks** in Node; **61 in-browser checks** with zero console
errors; the pre-existing-types fingerprint (13 beams / 62 segments) is still `b39e17f2`, **bit-identical**.
Evidence: [`logs/2026-09-17_supercontinuum-prism.png`](../logs/2026-09-17_supercontinuum-prism.png).

### Laser: supercontinuum source mode
- **Source type** dropdown on the laser: *Single wavelength (CW)* — everything as before — or
  **Supercontinuum**: a band **λ_min … λ_max** sampled on a **nominal spacing Δλ**, each sample traced as
  its own beam with its own colour and its own q (same waist, so z_R ∝ 1/λ). The band edge is always the
  last sample even when the span is not a multiple of Δλ. Strength is given as a **spectral power density**
  (power units per nm): a sample carries density × the width of the band slice it stands for (half-way to
  each neighbour, cut at the edges), so the samples sum to density × bandwidth exactly. Sample count is
  capped at 64 (the spacing is widened and the panel says so). Defaults 450–700 nm / 25 nm / 0.04 per nm.
- Quick-set buttons: *Visible 400–700 · 25*, *Yb lines 399–680 · ~47* (lands on 399 / 446 / 493 / 540 /
  587 / 633 / 680 nm), *Full SC 400–2400 · 100*. The panel lists sample count, band, total and per-sample
  power. In supercontinuum mode the single *Wavelength* row becomes *Reference λ*, used only by readouts
  that need one wavelength (fibre NA ↔ mode radius, assist, resonator).
- **Everything downstream already worked per beam**, so the band behaves physically with no further
  changes: a prism or grating fans the samples out (the evidence screenshot), a dichroic splits the band at
  its cutoff, fibre coupling is evaluated per sample. Two places did have to learn about it: a **FiberIn now
  collects every supercontinuum sample** (one per wavelength) and the paired FiberOut re-emits them all —
  CW beams keep the old last-one-wins rule — and the **caustic source dropdown lists one entry per sample**
  (`⚡ Laser · 525 nm (SC)`), also through fibres and V-Mirror links.
- Canvas: the laser's exit arrow is drawn as a spectrum in supercontinuum mode. Schematic export colours
  each sample by wavelength and the existing strand-offset pass fans co-propagating colours apart. The
  Spectrum tab sums the samples into one carrier line (it groups by RF offset, not by λ).
- Colours: `wavelengthColor()` is pure red from 645 to 700 nm and fixed dark red beyond 750 nm, so samples
  there share a colour — cosmetic only; every sample is still traced and listed by its own λ.
- Lasers without `source_mode` (every existing scene) are CW; `mkComp` now writes `source_mode: 'cw'`.
