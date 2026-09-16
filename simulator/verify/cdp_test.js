// Layer 3/4: drive simulator.html in headless Chrome over CDP (Node 22 global
// WebSocket, no dependencies). Modes:
//   node cdp_test.js <html> tests   <out.json>   — end-to-end prism/grating checks
//   node cdp_test.js <html> fp      <out.json>   — regression fingerprint of a scene of pre-existing types
//   node cdp_test.js <html> shot    <out.png>    — demo scene screenshot (canvas)
const { spawn } = require('child_process');
const fs = require('fs'), http = require('http'), path = require('path');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [,, htmlPath, mode, outPath] = process.argv;
const port = 9300 + Math.floor(Math.random() * 500);
const prof = path.join(__dirname, 'chrome-prof-' + port);
fs.rmSync(prof, { recursive: true, force: true });
const fileUrl = 'file:///' + path.resolve(htmlPath).replace(/\\/g, '/');
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--window-size=1600,1000', fileUrl],
  { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
function getJSON(url){ return new Promise((res, rej) => http.get(url, r => { let s=''; r.on('data', d => s += d); r.on('end', () => { try { res(JSON.parse(s)); } catch (e) { rej(e); } }); }).on('error', rej)); }
async function main(){
  let targets = null;
  for (let i = 0; i < 100 && !targets; i++) { await sleep(300); try { const t = await getJSON(`http://127.0.0.1:${port}/json`); if (t.some(x => x.type === 'page' && x.url.startsWith('file:'))) targets = t; } catch (_) {} }
  if (!targets) throw new Error('chrome did not expose a page target');
  const tgt = targets.find(x => x.type === 'page' && x.url.startsWith('file:'));
  const ws = new WebSocket(tgt.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    else if (msg.method === 'Runtime.exceptionThrown') errors.push('exception: ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
    else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push('console.error: ' + msg.params.args.map(a => a.value ?? a.description).join(' '));
  };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJS = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result.exceptionDetails) throw new Error('eval: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
    return r.result.result.value;
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  // wait for the app
  let ready = false;
  for (let i = 0; i < 200 && !ready; i++) { await sleep(250); try { ready = await evalJS(`document.readyState === 'complete' && typeof traceRays === 'function' && typeof renderNow === 'function'`); } catch (_) {} }
  if (!ready) throw new Error('app did not initialise');
  await sleep(1500);
  const startupErrors = errors.slice();
  let result;
  if (mode === 'tests') result = await evalJS(TESTS);
  else if (mode === 'fp') result = await evalJS(FINGERPRINT);
  else if (mode === 'shot') {
    await evalJS(DEMO);
    await sleep(800);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(outPath, Buffer.from(shot.result.data, 'base64'));
    result = { saved: outPath };
  }
  const out = { mode, result, startupErrors, errorsDuringTests: errors.slice(startupErrors.length) };
  if (mode !== 'shot') fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1).slice(0, 6000));
  ws.close();
}
// ── in-page test program ─────────────────────────────────────────────────────
const TESTS = `(function(){
  const R = { ok: [], fail: [] };
  const ok = (c, m, d) => { (c ? R.ok : R.fail).push(m + (c ? '' : '  → ' + JSON.stringify(d))); };
  const deg = r => r * 180 / Math.PI;
  const longest = b => b.segments.length ? b.segments[b.segments.length - 1].pathEndMm : -1;
  const mainBeam = () => lastTracedBeams.reduce((a, b) => longest(b) > longest(a) ? b : a);
  try {
    ok(TYPE_STYLE.prism && TYPE_STYLE.grating && TYPE_ICON.prism && TYPE_ICON.grating && COMP_H.prism && COMP_W.grating, 'style / icon / footprint tables have both types');
    ok(ALL_TYPES.some(t => t.type === 'prism') && ALL_TYPES.some(t => t.type === 'grating'), 'ALL_TYPES lists both');
    ok(document.querySelector('.comp-item[data-type="prism"]') && document.querySelector('.comp-item[data-type="grating"]'), 'sidebar palette has both entries');
    ok(ANGLE_TYPES.has('prism') && ANGLE_TYPES.has('grating') && ASSIST_TYPES.has('prism') && MIRROR_FINE_TYPES.has('grating'), 'type sets include both');

    // ── 1. laser → prism at the default orientation: minimum deviation ──
    components.length = 0; selectedSet.clear(); selected = null;
    const L = mkComp('laser', 0, 300); L.angle = 0; components.push(L);
    const P = mkComp('prism', 200, 300); components.push(P);
    lastTracedBeams = traceRays(); renderNow();
    let mb = mainBeam(), segs = mb.segments;
    const glass = segs.filter(s => s.inGlass);
    ok(glass.length === 1, 'one in-glass segment recorded on the longest beam', glass.length);
    const gi = segs.indexOf(glass[0]);
    const inc = segs[gi - 1], after = segs[gi + 1];
    ok(inc && Math.hypot(inc.x2 - glass[0].x1, inc.y2 - glass[0].y1) < 1e-9, 'incident segment ends exactly at the entry point');
    ok(after && Math.abs(Math.hypot(after.x1 - glass[0].x2, after.y1 - glass[0].y2) - 8) < 1e-6, 'exit beam spawns PUSH = 8 mm past the exit face');
    const n680 = glassIndex('F2', 680), md = prismMinDeviation(n680, 60);
    const outAng = Math.atan2(after.y2 - after.y1, after.x2 - after.x1);
    ok(Math.abs(Math.abs(outAng) - md.dev) < 0.02 * Math.PI / 180, 'exit direction = δmin(F2, 680 nm) = ' + deg(md.dev).toFixed(3) + '°', deg(outAng));
    ok(outAng > 0, 'deviation is toward the base (local +y, screen-down at angle 23.8°)', deg(outAng));
    const Lg = Math.hypot(glass[0].x2 - glass[0].x1, glass[0].y2 - glass[0].y1);
    ok(Math.abs((glass[0].pathEndMm - glass[0].pathStartMm) - Lg / n680) < 1e-9, 'in-glass z advances by L/n (reduced length)');
    ok(Math.abs(after.pathStartMm - glass[0].pathEndMm - 8) < 1e-9, 'z continues by PUSH after the exit face');
    ok(Math.abs(glass[0].pathStartMm - inc.pathEndMm) < 1e-9, 'z continuous at the entry face');
    // w(z) continuity: radius just inside the glass equals the radius at the entry face × entry magnification (≈1)
    const trP = _prismTrace(P, inc.x2, inc.y2, 1, 0, n680), Ment = trP.legs[0].mag;
    ok(glass[0].w1 && inc.w2 && Math.abs(glass[0].w1 / inc.w2 - Ment) < 1e-9, 'in-plane radius grows by cosθ2/cosθ1 = ' + Ment.toFixed(4) + ' at the entry face', [inc.w2, glass[0].w1]);
    ok(P._prismLast && Math.abs(P._prismLast.mag - 1) < 3e-3 && P._prismLast.tir === 0, 'panel readout: M ≈ 1, no TIR', P._prismLast);
    ok(after.qa && !_qaIsRound(after.qa), 'the beam leaves the prism astigmatic (tilted-face astigmatism)', after.qa);
    ok(P._lastHit && Math.abs(P._lastHit.wavelength - 680) < 1e-9, '_lastHit records the wavelength');

    // ── 2. dispersion: a 399 nm laser through the same prism ──
    const L2 = mkComp('laser', 0, 300); L2.angle = 0; L2.wavelength = 399; components.push(L2);
    lastTracedBeams = traceRays();
    const finalsByWl = {};
    for (const b of lastTracedBeams) {
      if (!b.segments.some(s => s.inGlass)) continue;
      const s = b.segments[b.segments.length - 1];
      const a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
      if (!(b.wavelength in finalsByWl) || Math.abs(a) > Math.abs(finalsByWl[b.wavelength])) finalsByWl[b.wavelength] = a;
    }
    const sep = deg(Math.abs(finalsByWl[399]) - Math.abs(finalsByWl[680]));
    // closed form at the realised incidence
    const V = _prismWorldVerts(P), hh = _prismEdgeHit(V, -100, 300, 1, 0, 1, -1);
    const th1 = Math.acos(Math.abs(hh.nx));
    const devAn = n => { const th2 = Math.asin(Math.sin(th1) / n), th4 = Math.asin(n * Math.sin(Math.PI / 3 - th2)); return th1 + th4 - Math.PI / 3; };
    const sepAn = deg(devAn(glassIndex('F2', 399)) - devAn(n680));
    ok(Math.abs(sep - sepAn) < 1e-6, '399 vs 680 nm angular separation ' + sep.toFixed(4) + '° matches closed form ' + sepAn.toFixed(4) + '°');
    ok(sep > 2, 'separation is several degrees (usable in the lab)');

    // ── 3. setPrismMinDeviation brings a mis-set prism back ──
    components.splice(components.indexOf(L2), 1);
    P.angle = 40; lastTracedBeams = traceRays();
    setPrismMinDeviation(P.id);
    ok(Math.abs(P.angle - 23.79) < 0.02, 'setPrismMinDeviation → 23.79°', P.angle);
    lastTracedBeams = traceRays();
    ok(mainBeam().segments.filter(s => s.inGlass).length === 1 && Math.abs(P._prismLast.mag - 1) < 1e-4, 'and M = 1 there (angle stored to 0.001°)', P._prismLast);
    // tilted-face astigmatism at exact minimum deviation: the in-plane axis sees an
    // effective reduced length L/(n·M_entry²) inside the glass, the out-of-plane axis
    // L/n, so the two waists end up displaced by L/n·(1 − 1/M_entry²) with equal zR.
    {
      const sg = mainBeam().segments, g2 = sg.find(s => s.inGlass), a2 = sg[sg.indexOf(g2) + 1], i2 = sg[sg.indexOf(g2) - 1];
      const t2 = _prismTrace(P, i2.x2, i2.y2, 1, 0, n680), Me = t2.legs[0].mag;
      const dzExp = (t2.Lg / n680) * (1 - 1 / (Me * Me));
      ok(a2.qa && Math.abs(a2.qa.re - dzExp) < 5e-3 && Math.abs(a2.qa.im) < 0.05, 'prism astigmatism: waists displaced by ' + dzExp.toFixed(3) + ' mm, equal zR', a2.qa);
    }

    // ── 4. panel renders for the prism ──
    selected = P; updateProps();
    let panel = document.getElementById('prop-content').innerHTML;
    ok(panel.includes('Dispersion at the current beam') && panel.includes('Rotate to minimum deviation') && panel.includes('PS850'), 'prism properties panel renders (readouts, button, preset)');
    ok(panel.includes('Mount fine-tune'), 'prism gets the mount fine-tune block');

    // ── 5. grating: laser → grating at the default 45° incidence ──
    components.length = 0; selected = null;
    const L3 = mkComp('laser', 0, 300); L3.angle = 0; components.push(L3);
    const Gt = mkComp('grating', 200, 300); components.push(Gt);
    lastTracedBeams = traceRays(); renderNow();
    const orders = lastTracedBeams.filter(b => b.gratingOrder !== undefined);
    const byM = {};
    for (const b of orders) { const p = b.freqs.reduce((s, f) => s + f.power, 0); if (!byM[b.gratingOrder]) byM[b.gratingOrder] = { dx: b.dx, dy: b.dy, p, tag: b.splitTag }; }
    ok(Object.keys(byM).sort().join(',') === '0,1', 'orders traced at 680 nm: m = 0 and m = +1 (−1 evanescent)', Object.keys(byM));
    const ref = gratingOrders(Gt, 1, 0, 680, [0, 1]);
    const o1 = ref.orders.find(o => o.m === 1), o0 = ref.orders.find(o => o.m === 0);
    ok(Math.abs(byM[1].dx - o1.dx) < 1e-12 && Math.abs(byM[1].dy - o1.dy) < 1e-12, '+1 order direction = gratingOrders()');
    ok(Math.abs(byM[0].dx - o0.dx) < 1e-12 && Math.abs(byM[0].dy - o0.dy) < 1e-12, '0 order direction = specular');
    ok(Math.abs(deg(ref.alpha) - 45) < 1e-9, 'incidence α = 45° at the default angle 135°', deg(ref.alpha));
    ok(Math.abs(byM[1].p - 0.5) < 1e-12 && Math.abs(byM[0].p - 0.5) < 1e-12, 'power: 50 % in +1, 50 % in 0 (η = 0.5)', byM);
    ok(byM[1].tag === 'm=+1' && byM[0].tag === 'm=0', 'orders carry splitTag m=+1 / m=0', byM);
    ok(Gt._gratingLast && Gt._gratingLast.orders.length === 3, 'panel readout lists the 3 requested orders');
    // anamorphic q on the +1 order
    const b1 = orders.find(b => b.gratingOrder === 1);
    const incSeg = b1.segments[b1.segments.length - 2];
    const qHit = incSeg.q2, qExp = qPropagateFree(qApplyABCD(qHit, o1.mag, 0, 0, 1 / o1.mag), 8);
    ok(Math.abs(b1.segments[b1.segments.length - 1].q1.re - qExp.re) < 1e-9 && Math.abs(b1.segments[b1.segments.length - 1].q1.im - qExp.im) < 1e-9, '+1 order q = (cos β/cos α)² q̂ propagated by PUSH');
    ok(!_qaIsRound(b1.segments[b1.segments.length - 1].qa), '+1 order leaves elliptical (qa ≠ null) at 45° incidence');
    const b0 = orders.find(b => b.gratingOrder === 0);
    ok(_qaIsRound(b0.segments[b0.segments.length - 1].qa), '0 order stays round (β = −α ⇒ M = 1)');

    // ── 6. Littrow ──
    setGratingLittrow(Gt.id);
    lastTracedBeams = traceRays();
    const lit = lastTracedBeams.find(b => b.gratingOrder === 1);
    ok(lit && Math.abs(lit.dx + 1) < 1e-6 && Math.abs(lit.dy) < 1e-4, 'after setGratingLittrow the +1 order retraces the incoming beam (angle stored to 0.001°)', lit && [lit.dx, lit.dy, Gt.angle]);
    ok(Math.abs(Gt.angle - (90 + deg(Math.asin(680 / (2 * 1e6 / 2400))))) < 1e-3, 'Littrow angle = 90° + α_L', Gt.angle);

    // ── 7. 399 nm: −1 order appears? (λ/d = 0.958 → m=−1 evanescent at α=45°, +1 fine) ──
    Gt.angle = 135; L3.wavelength = 399; lastTracedBeams = traceRays();
    const ms399 = [...new Set(lastTracedBeams.filter(b => b.gratingOrder !== undefined).map(b => b.gratingOrder))].sort();
    ok(ms399.join(',') === '0,1', 'at 399 nm the traced orders are still 0 and +1', ms399);
    L3.wavelength = 680;

    // ── 8. grating panel ──
    selected = Gt; updateProps();
    panel = document.getElementById('prop-content').innerHTML;
    ok(panel.includes('Diffraction at the current beam') && panel.includes('Rotate to Littrow') && panel.includes('GH13-24U') && panel.includes('Traced orders'), 'grating properties panel renders');
    ok(panel.includes('m = +1') && panel.includes('evanescent'), 'panel lists orders with the evanescent one marked');

    // ── 9. order chips + iris ──
    toggleGratingOrder(Gt.id, 1);
    lastTracedBeams = traceRays();
    ok(!lastTracedBeams.some(b => b.gratingOrder === 1), 'hiding the +1 chip stops tracing it');
    toggleGratingOrder(Gt.id, 1);
    lastTracedBeams = traceRays();
    ok(lastTracedBeams.some(b => b.gratingOrder === 1), 'showing it again restores it');
    // an iris downstream of the 0th order passes it (it is not an AOM order)
    const o0dir = gratingOrders(Gt, 1, 0, 680, [0]).orders[0];
    const Ir = mkComp('iris', 200 + o0dir.dx * 100, 300 + o0dir.dy * 100); Ir.angle = deg(Math.atan2(o0dir.dy, o0dir.dx)) + 90; Ir.passOrders = [1]; components.push(Ir);
    lastTracedBeams = traceRays();
    ok(!lastTracedBeams.some(b => b.terminal === 'iris_blocked'), 'iris does not block grating orders (they are not AOM orders)');
    components.splice(components.indexOf(Ir), 1);

    // ── 10. schematic export ──
    components.length = 0; selected = null;
    components.push(L, P, Gt); P.angle = 23.8; Gt.x = 400; Gt.y = 400;
    lastTracedBeams = traceRays();
    const svg = _schematicSVG().svg;
    ok(svg.includes('<polygon') && svg.includes('(F2)') && svg.includes('2400/mm'), 'schematic SVG has the prism polygon and grating label');

    // ── 11. 3D procedural fallbacks build ──
    let v3 = 'skipped';
    try { if (typeof v3dProceduralComp === 'function' && typeof THREE !== 'undefined') { const col = new THREE.Color('#ffd166'); v3 = !!(v3dProceduralComp(P, col, false) && v3dProceduralComp(Gt, col, false)); } } catch (e) { v3 = 'threw: ' + e.message; }
    ok(v3 === true || v3 === 'skipped', '3D fallback geometry builds for both (' + v3 + ')');

    // ── 12. save/load round trip keeps the new fields ──
    const json = JSON.stringify(components);
    const back = JSON.parse(json);
    ok(back.some(c => c.type === 'prism' && c.glass === 'F2' && c.part === 'PS850') && back.some(c => c.type === 'grating' && c.grooves_mm === 2400 && Array.isArray(c.orders)), 'component JSON carries glass/part/grooves/orders');

    renderNow();
  } catch (e) { R.fail.push('EXCEPTION ' + e.message + ' @ ' + (e.stack || '').split('\\n')[1]); }
  return R;
})()`;
// ── regression fingerprint: a scene of pre-existing types only ────────────────
const FINGERPRINT = `(function(){
  components.length = 0; selected = null; selectedSet.clear();
  let id = 1000;
  const add = (t, x, y, props) => { const c = mkComp(t, x, y); c.id = id++; Object.assign(c, props || {}); components.push(c); return c; };
  add('laser', 0, 300, { angle: 0, wavelength: 460, waist_um: 400, astig_source: 'on', waist_v_um: 250, waist_v_z_mm: 30 });
  add('hwp', 75, 300, { fast_axis: 22.5 });
  add('pbs', 150, 300, { angle: 45 });
  add('lens', 250, 300, { angle: 90, focal_mm: 150 });
  add('cylens', 325, 300, { angle: 90, focal_mm: 200, cyl_axis: 'v' });
  add('aom', 425, 300, { angle: 0 });
  add('iris', 525, 300, { angle: 90, passOrders: [0, 1] });
  add('dump', 650, 300, {});
  add('mirror', 150, 150, { angle: 45 });
  add('dichroic', 300, 150, { angle: 135, cutoff_nm: 500, mode: 'reflect_shorter' });
  add('lens', 300, 75, { angle: 0, focal_mm: 60 });
  add('fiberin', 300, 25, { angle: 90, channel: '1' });
  add('fiberout', 500, 100, { angle: 0, channel: '1', collimator_on: true });
  add('camera', 650, 100, { angle: 0 });
  add('platebs', 400, 150, { angle: 45 });
  add('powermeter', 400, 50, {});
  lastTracedBeams = traceRays();
  const r6 = v => (v == null ? null : Math.round(v * 1e6) / 1e6);
  const rq = q => q ? [r6(q.re), r6(q.im)] : null;
  const rows = [];
  for (const b of lastTracedBeams) for (const s of b.segments)
    rows.push([r6(s.x1), r6(s.y1), r6(s.x2), r6(s.y2), rq(s.q1), rq(s.q2), rq(s.qa), r6(s.w1), r6(s.w2), r6(s.pathStartMm), r6(s.pathEndMm), s.freqs.reduce((a, f) => a + f.power, 0).toFixed(9), b.wavelength].join('|'));
  rows.sort();
  const etas = components.filter(c => c.type === 'fiberin').map(c => c._coupling ?? c._eta ?? c._couplingEff ?? null);
  const str = rows.join('\\n');
  let h = 5381; for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return { beams: lastTracedBeams.length, segments: rows.length, hash: h.toString(16), etas, sample: rows.slice(0, 3) };
})()`;
// ── demo scene for the screenshot ────────────────────────────────────────────
const DEMO = `(function(){
  components.length = 0; selected = null; selectedSet.clear();
  // top: three Yb-lab colours through the PS850 at minimum deviation for 680 nm
  for (const [wl, lbl] of [[680, '680 nm'], [556, '556 nm'], [399, '399 nm']]) {
    const L = mkComp('laser', 50, 125); L.angle = 0; L.wavelength = wl; L.label = lbl; components.push(L);
  }
  const P = mkComp('prism', 275, 125); components.push(P);
  // bottom: 556 nm from the right onto the GH13-24U at α = +45°; m = 0 straight down, m = +1 to the right
  // (kept in the lower-left so the prism's fan, heading lower-right, does not cross it)
  const L3 = mkComp('laser', 325, 450); L3.angle = 180; L3.wavelength = 556; L3.label = '556 nm'; components.push(L3);
  const G = mkComp('grating', 100, 450); G.angle = 315; components.push(G);
  const D0 = mkComp('dump', 100, 650); D0.label = 'm = 0'; components.push(D0);
  const D1 = mkComp('dump', 450, 488); D1.label = 'm = +1'; components.push(D1);
  lastTracedBeams = traceRays();
  // frame the scene
  const cv = document.getElementById('canvas') || document.querySelector('canvas');
  const W = cv ? cv.clientWidth : 1200, H = cv ? cv.clientHeight : 800;
  vp.scale = Math.min(W / 800, H / 650); vp.x = 60; vp.y = 40;
  selected = P; updateProps();
  renderNow();
  return { W, H };
})()`;
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => { try { chrome.kill(); } catch (_) {} setTimeout(() => { fs.rmSync(prof, { recursive: true, force: true }); process.exit(); }, 500); });
