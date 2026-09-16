# MissAlign — User Manual

Everything you need to drive the simulator. For what MissAlign is and where it came from,
see [ABOUT.md](ABOUT.md).

**Contents** · [Start here](#1-start-here) · [The screen](#2-the-screen) ·
[Controls](#3-controls) · [Components](#4-components) · [Measuring the beam](#5-measuring-the-beam) ·
[Recipes](#6-recipes) · [Conventions](#7-conventions-that-will-bite-you) ·
[Saving & export](#8-saving-and-export) · [Troubleshooting](#9-troubleshooting)

---

## 1. Start here

Open [`simulator/simulator.html`](simulator/simulator.html) in any modern browser. That is the
whole installation. Nothing is uploaded anywhere; your layout lives in the file you save and in
the browser's local storage.

**Your first path, in about a minute:**

1. Drag **Laser** from the left palette onto the bench. A beam appears immediately.
2. Click it. In the right-hand panel set **Wavelength**, **Beam waist w₀** and, if you know it,
   **Waist position z₀**. Everything downstream follows from these three numbers.
3. Drag a **Mirror** into the beam. Press <kbd>R</kbd> to spin it in 45° steps until the beam
   folds where you want it.
4. Drag a **Lens** downstream and set its focal length.
5. Open the **📐 w(z) Beam Caustic** tab at the bottom. You are now looking at the beam radius
   along the whole path, with the waist marked.
6. Click **🔍 Probe** in that tab and sweep the plot. A marker tracks the same plane on the
   bench above, so you can see where any point on the curve physically is.

That loop — place, set, look at `w(z)` — is the whole tool.

---

## 2. The screen

```
┌───────────┬────────────────────────────────────────┬──────────────┐
│           │                                        │              │
│  PALETTE  │            BENCH (top view)            │  PROPERTIES  │
│           │      drag · click · wheel to zoom      │  of selected │
│  drag     │                                        │   component  │
│  these    ├────────────────────────────────────────┤              │
│  out      │  ANALYSIS TABS                         │              │
│           │  🎯 Target  β Curves  🔬 Resonator      │              │
│           │  📐 w(z) Caustic   🧊 3D View          │              │
└───────────┴────────────────────────────────────────┴──────────────┘
```

- **Palette** (left) — components grouped by function. Drag onto the bench.
- **Bench** (centre) — top view of the optical table, in millimetres, on a 25 mm hole grid.
  Beams are drawn in their true wavelength colour.
- **Properties** (right) — everything about the selected component: physical settings, live
  beam readouts at that component, and fine-alignment nudges.
- **Analysis tabs** (bottom) — see [§5](#5-measuring-the-beam).
- **Top bar** — theme, Beam Probe, Reset View, schematic export, Save / Load / Clear All.

Tick **Show Suggestions** to open an advisory panel that flags problems it can see: a beam
overfilling an aperture, a beam outside an AOM's recommended diameter, a lens that is the wrong
knob to be turning. Advisory only — it never changes your layout.

---

## 3. Controls

### Mouse

| Action | Result |
|---|---|
| Drag from palette | Place a component |
| Click | Select (properties panel follows) |
| Drag a component | Move it; snaps to the 25 mm hole grid |
| <kbd>Alt</kbd>+click | Select one **member** of a group instead of the whole group |
| Drag empty bench | Pan the view |
| Wheel | Zoom toward the cursor (0.15× – 8×) |
| Drag a board edge | Move the board. If the board is **locked**, its components ride along rigidly |

### Keyboard

| Key | Action |
|---|---|
| <kbd>R</kbd> | Rotate selection by 45° |
| <kbd>Del</kbd> / <kbd>Backspace</kbd> | Delete selection |
| <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>Z</kbd> | Undo |
| <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>C</kbd> / <kbd>V</kbd> | Copy / paste |
| <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>A</kbd> | Select all |
| <kbd>Esc</kbd> | Clear selection; reset the caustic trim to the full path |

For angles and positions finer than these, use the **fine-nudge rows** in the properties panel
(§6.1) — not the mouse.

---

## 4. Components

Set-up settings live in the properties panel; the beam state *at* the component is reported
there too.

| Group | Component | What it does | Key settings |
|---|---|---|---|
| **Laser** | Laser | Source of everything. Emits a TEM₀₀ Gaussian — or, as a **supercontinuum**, one beam per sampled wavelength of a band (§6.7) | source type, λ, power, polarisation, **w₀**, **z₀**, M², *source astigmatism*; **λ_min / λ_max / Δλ / power per nm** in supercontinuum mode |
| **Modulator** | AOM | Bragg-diffracts into orders, shifting each by ±m·f_RF. Double-pass helper available | f_RF, RF power, crystal preset, order, double-pass |
| | EOM | Pockels phase modulation → ±f_mod sidebands | f_mod, modulation depth, enable |
| **Mirror** | Mirror | Angle in = angle out | angle, reflectivity |
| | Dichroic | Reflects or transmits by wavelength | cutoff λc, mode |
| | D-Mirror | Half-aperture pick-off; auto-align helper | open side |
| | HR / Out Coupler | High reflector / partial reflector for cavities | reflectivity |
| | **V-Mirror** | Folds the beam **out of the board plane** (§6.4) | channel, vertical path, out angle, retro, retro λ/4 |
| **Beam Split** | PBS | Transmits p, reflects s. With a HWP → tunable divider | — |
| | Cube / Plate BS | Fixed ratio, polarisation-independent | T:R ratio |
| **Waveplate** | HWP | Rotates linear polarisation by 2θ | fast axis |
| | QWP | Linear ↔ circular; double-pass acts as a HWP | fast axis |
| **Lens** | Lens | Spherical thin lens, ABCD on the `q` parameter | focal length (± f) |
| | **Cyl Lens** | Power on **one** transverse axis only (§6.3) | focal length, **powered axis** (in-plane / out-of-plane) |
| **Dispersive** | **Prism** | Refracts through a real triangle at n(λ); colours leave at different angles (§6.7) | Thorlabs part (PS850 / PS852 / PS853), glass, apex, face length, *rotate to minimum deviation* |
| | **Grating** | Reflective grating, one beam per diffraction order, d(sin α + sin β) = mλ (§6.7) | Thorlabs part (GH13-24U), lines/mm, ruled width, η, working order, traced orders, *rotate to Littrow* |
| **Detector** | Output / dump | Absorbs the beam; ends a path | mode |
| | Power Meter | Non-blocking power readout | — |
| | **Camera** | Imaging sensor: spot size in pixels, fill, clipping — per axis | sensor W×H, pixel pitch |
| | Shutter | Blocks completely; slow but clean | open / closed |
| | **Iris** | Passes only the AOM diffraction orders you choose | pass orders |
| **Fiber** | Fiber In | Couples into a single-mode fiber; reports **η** | channel, mode radius ↔ NA, preset, **integrated collimator** |
| | Fiber Out | Re-emits the paired channel's light | channel, collimator |

**Bold** components are additions to the original; see [ABOUT.md](ABOUT.md).

Fiber ports pair by **channel** (A–H): light entering `Fiber In · A` leaves `Fiber Out · A`.
Chains work — a path may go laser → In A, Out A → optics → In B, Out B → … in any component
order. V-Mirrors pair by channel the same way.

---

## 5. Measuring the beam

### On the bench: Beam Probe

Click **Beam Probe** in the top bar, then hover any beam. You get the local 1/e² diameter and
radius, distance from the waist, path length from the source, an intensity cross-section and a
miniature `w(z)`. If a cylindrical lens has made the beam elliptical, the diameter and radius
are quoted as `A ∥ / B ⊥` with the ellipticity.

### The `w(z)` Beam Caustic tab — the main instrument

This is where the real measurements happen.

**Choosing what to plot.** Pick the **source** (which laser, fiber output or periscope the light
came from), then the **branch** if that light splits. Then trim the plotted range with the two
dropdowns — any two optics on the path — or click **▭ Range Select** and drag a box on the bench
to trim by region (<kbd>Shift</kbd>+click picks individual components). <kbd>Esc</kbd> resets to
the full path.

**Reading the plot.**

| On the plot | Meaning |
|---|---|
| Solid coloured envelope | Beam radius on the **in-plane** axis — the one the bench canvas draws |
| Dashed teal envelope | The **out-of-plane** axis. Only appears when the beam is astigmatic |
| Red dashed line + box | Waist: size, `z`, Rayleigh range. Astigmatic beams get both waists **and the axial separation between them** — that separation *is* the astigmatism |
| Faint band around the waist | ± one Rayleigh range |
| Indigo shaded band | The beam is **off the board** here — inside a periscope's vertical run |
| Top strip | Every optic on the path, at its true `z` |

**🔍 Probe.** Toggle it, then move along the plot to read `z`, `w(z)`, distance from the waist in
units of z_R, the Rayleigh range and the wavefront radius `R(z)`. Astigmatic beams add the second
axis and the ellipticity; inside a periscope run you also get the height above the table.

The probe is **linked both ways**: probing the plot drops a marker on the bench at the same
physical plane, and the bench Beam Probe drives the plot's crosshair. This is the fastest way to
answer "where on the table is that waist?".

**🎯 Target z.** Park a reference plane at any `z` and read the diameter you will actually get
there. Survives changes to the plotted range, because it is stored as an absolute path length.

**Other controls.** Wheel to zoom the vertical scale (**fit** to reset), `z max` to extend the
axis past the last optic, **Fill** and **R(z)** overlays, and **⬇ w(z) CSV** to export the trace.

### Other tabs

| Tab | Use |
|---|---|
| 🎯 Target Frequencies | Enter a target detuning; get AOM/EOM combinations that reach it |
| β Curves | EOM modulation depth → sideband strengths |
| 🔬 Resonator | Pick cavity mirrors; solves the eigenmode, stability and higher-order modes |
| 🧊 3D View | The whole table in 3D with real component models; exports CAD |

---

## 6. Recipes

### 6.1 Put a waist exactly where you want it

Place the lens roughly, open **w(z)**, then use the properties panel's **fine-nudge** rows —
along the beam axis and perpendicular to it, down to 0.01 mm — and watch the waist marker move.
The panel also shows **z on beam**, the path length from the source, which you can type
directly: usually easier than reasoning in x/y coordinates. Set **🎯 Target z** to the plane you
care about and nudge until the diameter reads what you need.

For a two-lens telescope, select both and use the **separation** control to set their
centre-to-centre distance numerically.

### 6.2 Couple into a fiber

1. Place **Fiber In**, set its channel, and pick a **preset** (or set mode-field radius / NA
   directly).
2. If the port has a collimator package, switch **integrated collimator** ON and set `f` and the
   distance from the fiber face. "Set d = f" collimates. This is better than placing an external
   lens component, which can drift out of sync with reality.
3. Read **η** in the panel. Use **⚡ Auto-align fiber coupling** to have it search focal length
   and position by real re-tracing.
4. If the panel warns the beam is **elliptical at the fiber face**, stop adding spherical lenses.
   A single spherical lens cannot fix both axes, and η is capped until they match — circularise
   first (§6.3).

### 6.3 Circularise an elliptical beam

Place a **Cyl Lens** and choose its **powered axis**:

- **In-plane** — focuses the width you see on the bench, and steers off-centre beams.
- **Out-of-plane** — focuses the vertical height only. **It deliberately does nothing visible
  in the top view.** That is correct, not a bug: a top-view canvas cannot draw a vertical kick.
  Read its effect off the dashed envelope in **w(z)** and the per-axis panel rows.

Two crossed cylinders of equal focal length are equivalent to a spherical lens; two of different
focal lengths, correctly spaced, turn an ellipse into a circle. Watch both envelopes converge in
**w(z)** and the ellipticity in the fiber or camera panel approach 1.00×.

### 6.4 Route a beam up to a chamber (periscope)

**Two mirrors, same channel:**

1. Place two **V-Mirrors**, give both the same **channel**.
2. On the sending one, set **vertical path** — the height of the run.
3. On the receiving one, set **out angle** — the azimuth the beam leaves along.
4. In **w(z)**, the vertical leg and the entire far side now appear as one continuous curve, with
   the off-board stretch shaded.

If the out angle turns **90°**, the periscope **exchanges the two transverse axes**: what was
horizontal arrives vertical. The plot says so in the shaded band, and each curve keeps following
its own physical axis so the envelope stays continuous. The ∥/⊥ labels in the readouts flip after
the fold, because on the far side they genuinely mean the other axis.

**One mirror, retro-reflected:** set **retro** on a single V-Mirror for a MOT vertical arm — the
beam goes up, comes back down the same axis and retraces backwards. **retro λ/4** rotates the
returning linear polarisation by 90°, so an upstream PBS folds the return out.

### 6.5 AOM double pass

Place an **AOM**, set f_RF and the order you want, then switch on **double-pass**. The helper
components (PBS, λ/4, retro mirror) are generated on the actual traced beam direction, so they
land on the real axis rather than an assumed one. Add an **Iris** downstream and select which
diffraction orders may pass to clean up the unwanted ones.

### 6.6 Make a figure for a paper

**Schem SVG** or **Schem PNG** in the top bar. You get white-background line art with standard
optical symbols, true positions and angles, wavelength-coloured beams, and labels placed to avoid
crossing the beams. Scope it to one board or the whole scene. It updates with the layout, so the
figure never goes stale.

### 6.7 Separate wavelengths with a prism or a grating

**Prism.** Drop a **Prism** on the beam. It arrives as the Thorlabs PS850 (F2, 10 mm) already at minimum
deviation for a 680 nm beam travelling left→right; for any other beam or colour press **⟂ Rotate to minimum
deviation for this beam** in its panel. Add a second laser of another wavelength on the same axis and the two
beams leave the prism at different angles — the panel quotes n(λ), the deviation δ, and dδ/dλ so you can size
the separation at a given distance (F2, 60°: 399 vs 680 nm differ by ≈3.9°). The triangle is drawn at true
size and the beam really refracts through it, so a beam that misses the glass simply passes by, and a steep
exit angle shows up as total internal reflection.

**Grating.** Drop a **Grating** (Thorlabs GH13-24U, 2400 lines/mm) on the beam. The ruled face is the side
the little substrate block is *not* on; a beam arriving from behind passes through. Each traced order is its
own beam: the chips **−2 … +2** choose which orders are traced (evanescent ones are skipped automatically),
the **working order** gets the efficiency η you set and the others share the rest. **↩ Rotate to Littrow**
sends the working order straight back along the incoming beam — the external-cavity-diode-laser geometry — and
the panel lists every order's angle β, power share and dispersion dβ/dλ. At 2400 lines/mm only the 0th and one
first order exist for visible light, and the first order needs incidence above ≈39° at 680 nm; the Littrow
row tells you where that is (54.7° at 680 nm, 41.8° at 556 nm, 28.6° at 399 nm).

**Supercontinuum.** Set a Laser's **Source type** to *Supercontinuum*, give it a band (**λ_min**, **λ_max**),
a **nominal spacing Δλ** and a **spectral power density** (power units per nm). The source then emits one
beam per sampled wavelength — same waist, own colour, power = density × the slice of band it stands for,
so the samples always add up to density × bandwidth. Send it through a Prism or Grating and the band fans
out into a spectrum; a Dichroic splits it at its cutoff; a fibre link carries every sample. The quick-set
buttons give the visible band, the Yb line set (399 … 680 nm in ~47 nm steps) and a full 400–2400 nm SuperK
span. The w(z) tab lists each sample as its own source (`⚡ Laser · 525 nm (SC)`). Keep the count in mind:
64 samples is the cap, and every splitter downstream multiplies the beam count.

---

## 7. Conventions that will bite you

- **Units are millimetres.** Everywhere. Angles in degrees.
- **Every beam size is a 1/e² intensity *radius*** `w`. Diameters are written `⌀ = 2w`. Do not
  compare `w` against a catalogue clear aperture without doubling it.
- **"In-plane" = the board plane**, the axis the bench canvas draws. **"Out-of-plane" = vertical**,
  perpendicular to the table. A top view can only ever show you the first one — the second one
  lives in the dashed envelope and the per-axis panel rows.
- **A cylinder powered out of plane changes nothing on the bench canvas by design.** See §6.3.
- **Beams restart at a fiber.** A single-mode fiber outputs its own clean circular mode, so path
  length, beam quality and astigmatism all reset at a Fiber Out.
- **There are 8 mm gaps in the drawn beam after each optic.** The tracer pushes the next segment
  clear of the component surface. Harmless, but that is what those little holes are.
- **Inside a prism, `z` counts reduced length L/n**, not the geometric glass path, so the `w(z)` plot and the
  beam parameter stay consistent. A ruler on the bench reads L(1 − 1/n) more per prism pass (≈3 mm for the
  10 mm PS850). The prism panel quotes both.
- **A prism or an off-Littrow grating order changes the in-plane beam width** by cos θ_out / cos θ_in at each
  face, and a focused beam leaves a prism slightly astigmatic even at minimum deviation. Both are real
  effects and show in the dashed `w(z)` envelope.
- **Scenes autosave to the browser's local storage**, so closing the tab does not lose work — but
  local storage is per-browser and easy to wipe. **Save a `.json`** for anything you care about.

---

## 8. Saving and export

| Button | Output |
|---|---|
| 💾 Save | Project `.json` (schema `2.0`) — the whole scene, portable |
| 📂 Load | Restore a `.json` |
| Clear All | Empty the bench (undoable with <kbd>Ctrl</kbd>+<kbd>Z</kbd>) |
| Schem SVG / PNG | Publication line-art figure |
| ⬇ w(z) CSV | The plotted beam trace as data |
| Export CAD (3D tab) | The 3D scene geometry |

Saved scenes in `scenes/` double as examples — its `README.md` is a dated timeline of them, and
the largest are full 4–6 board lab layouts worth opening just to see what a finished path looks
like. That directory is kept out of git; see [`LOCAL-FILES.md`](LOCAL-FILES.md) for where it lives.

---

## 9. Troubleshooting

**Nothing appears when I place a component.** Only a laser creates light. Check the beam actually
reaches your component — mirrors at the wrong angle send it off into space.

**The beam ignores my optic.** Interaction apertures are finite and deliberately tighter than the
drawn housing (fiber ports and AOMs interact within ±10 mm of centre). Move the component onto the
beam axis, not just near it.

**My cylindrical lens does nothing.** If its powered axis is *out-of-plane*, that is correct — the
top view cannot show it. Look at the dashed envelope in **w(z)**. See §6.3.

**The w(z) plot looks cut off.** The start/end trim remembers your last choice across edits. Press
<kbd>Esc</kbd>, or re-pick the source, to reset to the full path.

**Coupling efficiency will not go above ~80% no matter what lens I use.** The beam is probably
elliptical at the fiber face. Check the ellipticity row in the FiberIn panel; if it is not ≈1.00×,
no spherical lens will save you. See §6.3.

**My grating shows only one order.** At 2400 lines/mm a visible first order only exists for incidence
above sin⁻¹(λ/d − 1) — about 39° at 680 nm — and the −1 order needs the mirror-image incidence. Check
the **Incidence α** and **Littrow α** rows in the panel, then rotate the grating (or press **↩ Rotate to
Littrow**). Orders marked *evanescent* cannot exist at that angle.

**My supercontinuum shows one line in the Spectrum tab.** Expected: that tab groups by RF offset, not by
wavelength, so all samples land on one carrier whose power is the sum. Read per-wavelength behaviour off the
bench (probe, camera) or the w(z) tab's per-sample source list.

**Several supercontinuum samples have the same colour.** Above ≈645 nm the canvas colour is pure red and
beyond 750 nm a fixed dark red; every sample is still traced separately — hover a beam or check the w(z)
source list for its wavelength.

**My beam vanished inside the prism.** The exit face is beyond the critical angle (the panel's δ row says
*trapped (TIR)*). Press **⟂ Rotate to minimum deviation for this beam**, or choose a lower-index glass.

**I edited `simulator.html` and see no change.** Hard-reload: <kbd>Ctrl</kbd>+<kbd>F5</kbd> /
<kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>.

**I want to modify the code.** Read [`simulator/HANDOVER.md`](simulator/HANDOVER.md) first — it
documents the engine's conventions, how to verify a change without a build step, and the traps that
have already cost someone an afternoon.
