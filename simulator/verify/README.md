# verify/ — the four verification layers as scripts

[HANDOVER.md](../HANDOVER.md) ("Verifying an edit") describes four layers that were run by hand with
`jsc` and a scratch CDP client on a Mac. These are the same layers as Node 22 scripts (no packages), so
they run on the Windows lab workstation too. Run them from anywhere; they default to `../simulator.html`.

| Layer | Script | What it proves |
|---|---|---|
| 1 Parse | `node parse_check.js [file.html]` | Every inline `<script>` compiles (`new Function`, not executed). A typo otherwise yields a blank page, not a stack trace. |
| 2 Physics | `node physics_test.js [file.html]` | Loads the q-helper + dispersive-optics range with `vm` and asserts against closed forms: Sellmeier catalogue indices, prism deviation and anamorphic magnification vs the analytic θ-chain, the grating equation, Littrow, power shares, tilted-face astigmatism. |
| 3 In-browser | `node cdp_test.js <file.html> tests out.json` | Drives the real page in headless Chrome over CDP (Node's built-in WebSocket): builds scenes with `mkComp`, traces with `traceRays`, checks segment bookkeeping, panel HTML, schematic SVG, order chips, iris interaction, save/load fields, and the supercontinuum source (sampling, prism fan, dichroic band split, fibre pass-through, caustic keys). Reports console errors. |
| 4 Fingerprint | `node cdp_test.js <file.html> fp out.json` | Traces a fixed 16-component scene of pre-existing types and hashes every endpoint, `q1`/`q2`/`qa`, `w1`/`w2`, path length and power. Run on `git show <rev>:simulator/simulator.html` and on the working file; equal hashes = no regression. |
| — Screenshot | `node cdp_test.js <file.html> shot out.png` | A demo scene (three colours through the prism, one on the grating) captured at 1600×1000 for the session log. |

Chrome is expected at `C:/Program Files/Google/Chrome/Application/chrome.exe`; override with the
`CHROME` environment variable. Each run uses its own scratch profile under this directory and deletes
it afterwards — it never touches your browser. Set `PYTHONIOENCODING=utf-8` if you post-process the
JSON with Python on Windows (the messages contain arrows and Greek letters).

The fingerprint scene lives inside `cdp_test.js` (`FINGERPRINT`) because `scenes/` is local-only. It
exercises: laser with source astigmatism → HWP → PBS → lens → out-of-plane cylinder → AOM → iris → dump on
the transmitted arm; mirror → dichroic → lens → FiberIn ‖ FiberOut (integrated collimator) → camera on
the reflected arm; plate BS and power meter. Extend it when you add a type that should stay bit-identical.
