// Layer 2: dispersive-optics physics, checked against closed-form Gaussian /
// Snell / grating results in plain Node (no DOM). Loads the q-helper range and
// the geometry helpers straight out of simulator.html.
const fs = require('fs'), vm = require('vm');
const path = process.argv[2] || require('path').join(__dirname, '..', 'simulator.html');
const html = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
function slice(startMarker, endMarker){
  const a = html.indexOf(startMarker); if (a < 0) throw new Error('missing ' + startMarker);
  const b = html.indexOf(endMarker, a); if (b < 0) throw new Error('missing ' + endMarker);
  return html.slice(a, b);
}
let code = '';
code += 'function nmToMm(v){ return (v || 680) * 1e-6; }\n';
code += slice('// ── SUPERCONTINUUM SOURCE', 'function qPropagateFree(q, d){');
code += slice('function qPropagateFree(q, d){', '// ── DISPERSIVE OPTICS');
code += slice('// ── DISPERSIVE OPTICS', 'function gratingShares(');
code += slice('function gratingShares(', '\n}\n') + '\n}\n';
code += slice('function lineLineIntersect(', 'function traceBeam(');
const ctx = { Math, Number, parseFloat, isFinite, Map, Array, Object, console };
vm.createContext(ctx);
vm.runInContext(code, ctx);
// expose
const G = ctx;
let pass = 0, fail = 0;
function ok(cond, msg, detail){ if (cond) { pass++; console.log('  ok   ' + msg); } else { fail++; console.log('  FAIL ' + msg + (detail !== undefined ? '  → ' + detail : '')); } }
const deg = r => r * 180 / Math.PI, rad = d => d * Math.PI / 180;
const near = (a, b, tol) => Math.abs(a - b) <= tol;

console.log('— Sellmeier indices (catalogue n_d at 587.56 nm)');
ok(near(G.glassIndex('F2', 587.56), 1.62004, 2e-4), 'F2 n_d = 1.62004', G.glassIndex('F2', 587.56));
ok(near(G.glassIndex('N-SF11', 587.56), 1.78472, 2e-4), 'N-SF11 n_d = 1.78472', G.glassIndex('N-SF11', 587.56));
ok(near(G.glassIndex('N-BK7', 587.56), 1.51680, 2e-4), 'N-BK7 n_d = 1.51680', G.glassIndex('N-BK7', 587.56));
ok(near(G.glassIndex('UVFS', 587.56), 1.45846, 2e-4), 'UVFS n_d = 1.45846', G.glassIndex('UVFS', 587.56));
ok(G.glassIndex('F2', 399) > G.glassIndex('F2', 680), 'normal dispersion: n(399) > n(680)');

console.log('— Prism: analytic deviation vs traced deviation');
// analytic single-pass deviation for incidence th1 on an apex-A prism
function devAnalytic(n, A, th1){
  const th2 = Math.asin(Math.sin(th1) / n);
  const th3 = A - th2;
  const s = n * Math.sin(th3); if (Math.abs(s) > 1) return null;
  const th4 = Math.asin(s);
  return { dev: th1 + th4 - A, th2, th3, th4 };
}
const prism = { type:'prism', x:0, y:0, angle:23.8, glass:'F2', apex_deg:60, side_mm:10 };
const n680 = G.glassIndex('F2', 680);
const md = G.prismMinDeviation(n680, 60);
console.log(`  n(680) = ${n680.toFixed(5)}  θ1(min dev) = ${deg(md.theta1).toFixed(3)}°  δmin = ${deg(md.dev).toFixed(3)}°`);
// a +x beam from the left, aimed at the centroid
function tracePrism(c, n, y0 = 0){
  const V = G._prismWorldVerts(c);
  const h = G._prismEdgeHit(V, -100, y0, 1, 0, 1, -1);
  if (!h) return null;
  return G._prismTrace(c, -100 + h.t, y0, 1, 0, n);
}
const tr = tracePrism(prism, n680);
ok(!!tr && tr.tir === 0, 'default orientation: beam passes (no TIR)');
ok(near(Math.abs(tr.dev), md.dev, rad(0.02)), `default angle 23.8° is min deviation for 680 nm (|δ| = ${deg(Math.abs(tr.dev)).toFixed(3)}°)`, deg(md.dev));
ok(near(tr.mag, 1, 2e-3), `anamorphic magnification ≈ 1 at min deviation (M = ${tr.mag.toFixed(4)})`);
// the incidence angle actually realised, from the entry-face normal
{
  const V = G._prismWorldVerts(prism);
  const h = G._prismEdgeHit(V, -100, 0, 1, 0, 1, -1);
  const th1 = Math.acos(Math.abs(h.nx * -1 + h.ny * 0));
  const an = devAnalytic(n680, rad(60), th1);
  ok(near(Math.abs(tr.dev), Math.abs(an.dev), 1e-9), `traced δ equals closed-form δ(θ1) at θ1 = ${deg(th1).toFixed(3)}°`, `${deg(tr.dev)} vs ${deg(an.dev)}`);
  const Man = (Math.cos(an.th2) / Math.cos(th1)) * (Math.cos(an.th4) / Math.cos(an.th3));
  ok(near(tr.mag, Man, 1e-9), 'traced in-plane magnification equals cosθ2/cosθ1 · cosθ4/cosθ3', `${tr.mag} vs ${Man}`);
}
// dispersion: 399 nm vs 680 nm through the same prism
{
  const n399 = G.glassIndex('F2', 399);
  const t399 = tracePrism(prism, n399);
  ok(!!t399, '399 nm beam also passes');
  const sep = deg(Math.abs(t399.dev) - Math.abs(tr.dev));
  ok(sep > 2 && sep < 6, `399 nm deviates more than 680 nm by ${sep.toFixed(3)}° (F2, 60°)`);
  const V = G._prismWorldVerts(prism);
  const h = G._prismEdgeHit(V, -100, 0, 1, 0, 1, -1);
  const th1 = Math.acos(Math.abs(h.nx * -1));
  const an399 = devAnalytic(n399, rad(60), th1);
  ok(near(Math.abs(t399.dev), Math.abs(an399.dev), 1e-9), 'closed-form δ at 399 nm matches the trace');
}
// off minimum deviation: rotate the prism 10° and compare with closed form; M ≠ 1
{
  const p2 = { ...prism, angle: 33.8 };
  const V = G._prismWorldVerts(p2);
  const h = G._prismEdgeHit(V, -100, 0, 1, 0, 1, -1);
  const t2 = G._prismTrace(p2, -100 + h.t, 0, 1, 0, n680);
  const th1 = Math.acos(Math.abs(h.nx * -1));
  const an = devAnalytic(n680, rad(60), th1);
  ok(!!t2 && an && near(Math.abs(t2.dev), Math.abs(an.dev), 1e-9), `off-minimum (θ1 = ${deg(th1).toFixed(2)}°): traced δ = closed form`, `${t2 && deg(t2.dev)} vs ${an && deg(an.dev)}`);
  ok(t2 && Math.abs(t2.dev) > md.dev, 'and that deviation exceeds δmin');
  ok(t2 && Math.abs(t2.mag - 1) > 0.05, `and M ≠ 1 there (M = ${t2 && t2.mag.toFixed(4)})`);
}
// TIR: N-SF11 at a steep exit gets trapped/bounced — check the tracer handles it without throwing
{
  const p3 = { ...prism, glass:'N-SF11', angle: 0 };   // 30° incidence, exit face beyond critical
  const nS = G.glassIndex('N-SF11', 680);
  const V = G._prismWorldVerts(p3);
  const h = G._prismEdgeHit(V, -100, 0, 1, 0, 1, -1);
  const t3 = G._prismTrace(p3, -100 + h.t, 0, 1, 0, nS);
  const an = devAnalytic(nS, rad(60), Math.acos(Math.abs(h.nx * -1)));
  ok(an === null, 'closed form confirms the second face is beyond critical angle here');
  ok(t3 === null || t3.tir >= 1, `tracer reports TIR (${t3 ? t3.tir + ' bounce(s), exits' : 'trapped'})`);
}
console.log('— Prism: reduced-q bookkeeping keeps both axes consistent');
{
  // Round beam, waist 250 µm at the prism, min deviation ⇒ round out; at 33.8° ⇒ elliptical
  const lam = 680;
  const q0 = { re: 0, im: Math.PI * 0.25 * 0.25 / G.nmToMm(lam) };   // zR = π w0² / λ
  function through(c){
    const n = G.glassIndex(c.glass, lam);
    const V = G._prismWorldVerts(c);
    const h = G._prismEdgeHit(V, -100, 0, 1, 0, 1, -1);
    const t = G._prismTrace(c, -100 + h.t, 0, 1, 0, n);
    let qh = q0, qv = q0;
    for (const leg of t.legs) { qh = G.qApplyABCD(qh, leg.mag, 0, 0, 1 / leg.mag); qh = G.qPropagateFree(qh, leg.L / n); qv = G.qPropagateFree(qv, leg.L / n); }
    qh = G.qApplyABCD(qh, t.exitMag, 0, 0, 1 / t.exitMag);
    return { qh, qv, qa: G._qaDiff(qv, qh), t, n };
  }
  const a = through({ ...prism, angle: 23.787 });
  // Tilted-interface astigmatism: inside the glass the in-plane axis sees an
  // effective reduced length L/(n·M_entry²) while the out-of-plane axis sees L/n,
  // so a beam through a prism at minimum deviation leaves with its two waists
  // displaced by L/n · (1 − 1/M_entry²) and identical Rayleigh ranges.
  const Ment = a.t.legs[0].mag;
  const dzExpected = (a.t.Lg / a.n) * (1 - 1 / (Ment * Ment));
  ok(a.qa && near(a.qa.re, dzExpected, 5e-3) && Math.abs(a.qa.im) < 0.05, `tilted-face astigmatism: waists displaced by ${dzExpected.toFixed(3)} mm, same zR`, JSON.stringify(a.qa));
  ok(near(Ment, Math.cos(Math.asin(Math.sin(md.theta1) / n680)) / Math.cos(md.theta1), 1e-3), `entry magnification cosθ2/cosθ1 = ${Ment.toFixed(4)}`, Math.cos(Math.asin(Math.sin(md.theta1) / n680)) / Math.cos(md.theta1));
  ok(near(G.beamRadiusFromQ(lam, a.qv), G.beamRadiusFromQ(lam, G.qPropagateFree(q0, a.t.Lg / a.n)), 1e-12), 'out-of-plane radius = free propagation over L/n only');
  const b = through({ ...prism, angle: 33.8 });
  ok(b.qa !== null, 'off minimum deviation the beam leaves astigmatic (qa ≠ null)');
  const wv = G.beamRadiusVertFromQ(lam, b.qh, b.qa), wvDirect = G.beamRadiusFromQ(lam, b.qv);
  ok(near(wv, wvDirect, 1e-12), 'qVertOf(q, qa) reproduces the directly propagated vertical q');
  // ABCD sanity: q → M²q for diag(M, 1/M)
  const qt = G.qApplyABCD({ re: 3, im: 7 }, 1.3, 0, 0, 1 / 1.3);
  ok(near(qt.re, 3 * 1.69, 1e-12) && near(qt.im, 7 * 1.69, 1e-12), 'diag(M,1/M) maps q → M²q');
}

console.log('— Grating: grating equation, orders, Littrow, shares');
const grating = { type:'grating', x:0, y:0, angle:135, grooves_mm:2400, width_mm:12.7, efficiency:0.5, work_order:1, orders:[-1,0,1] };
{
  const r = G.gratingOrders(grating, 1, 0, 680, [-2, -1, 0, 1, 2]);
  ok(!!r, 'a +x beam sees the ruled face at angle 135°');
  ok(near(deg(r.alpha), 45, 1e-9), `incidence α = 45° (got ${deg(r.alpha).toFixed(4)}°)`);
  ok(near(r.d_nm, 416.6667, 1e-3), 'period d = 416.67 nm');
  const o0 = r.orders.find(o => o.m === 0), o1 = r.orders.find(o => o.m === 1), om1 = r.orders.find(o => o.m === -1), o2 = r.orders.find(o => o.m === 2);
  const refl = G.reflect(1, 0, -Math.sin(rad(135)), Math.cos(rad(135)));
  ok(near(o0.dx, refl.dx, 1e-12) && near(o0.dy, refl.dy, 1e-12), 'm = 0 is the specular reflection');
  const betaAn = Math.asin(680 / 416.6667 - Math.sin(rad(45)));
  ok(o1.propagates && near(o1.beta, betaAn, 1e-6), `m = +1 at β = ${deg(o1.beta).toFixed(3)}° (closed form ${deg(betaAn).toFixed(3)}°)`);
  ok(!om1.propagates && !o2.propagates, 'm = −1 and m = +2 are evanescent at 680 nm / 2400 mm⁻¹');
  // explicit grating equation check on the returned direction
  const a = rad(135), tx = Math.cos(a), ty = Math.sin(a), nx = -ty, ny = tx;
  const sinB = o1.dx * tx + o1.dy * ty, sinA = -(1 * tx + 0 * ty);
  ok(near(416.6667 * (sinA + sinB), 680, 1e-3), 'd(sin α + sin β) = mλ holds for the +1 direction');
  ok(near(o1.mag, Math.cos(o1.beta) / Math.cos(r.alpha), 1e-12), 'in-plane magnification = cos β / cos α');
  ok(near(o1.disp_rad_per_nm, 1 / (416.6667 * Math.cos(o1.beta)), 1e-9), 'angular dispersion dβ/dλ = m / (d cos β)');
  const sh = G.gratingShares(r, 1, 0.5);
  ok(near(sh.get(1), 0.5, 1e-12) && near(sh.get(0), 0.5, 1e-12) && !sh.has(-1), 'shares: working order 50 %, zeroth 50 %, evanescent none');
  const sh2 = G.gratingShares(r, -1, 0.5);
  ok(near(sh2.get(1), 0.5, 1e-12) && near(sh2.get(0), 0.5, 1e-12), 'working order evanescent ⇒ propagating orders share equally');
  const sh3 = G.gratingShares(r, 1, 0.8);
  ok(near(sh3.get(1), 0.8, 1e-12) && near(sh3.get(0), 0.2, 1e-12), 'η = 0.8 ⇒ 80/20');
  // from the substrate side
  ok(G.gratingOrders({ ...grating, angle: 315 }, 1, 0, 680, [0]) === null, 'beam from the substrate side is rejected');
}
{
  // Littrow: replicate setGratingLittrow's angle formula for a +x beam at 680 nm
  const aL = G.gratingLittrowAlpha(grating, 1, 680);
  ok(near(Math.sin(aL), 680 / (2 * 416.6667), 1e-6), `Littrow α = ${deg(aL).toFixed(3)}° for m = +1`);
  const phi = Math.atan2(-0, -1);
  const angle = (((phi + aL) * 180 / Math.PI - 90) % 360 + 360) % 360;
  const r = G.gratingOrders({ ...grating, angle }, 1, 0, 680, [1]);
  const o1 = r.orders[0];
  ok(near(r.alpha, aL, 1e-9), 'that rotation realises α = α_Littrow');
  ok(o1.propagates && near(o1.beta, r.alpha, 1e-9), 'and β = α (the +1 order retraces the beam)');
  ok(near(o1.dx, -1, 1e-9) && near(o1.dy, 0, 1e-9), '+1 order direction is exactly −d_in');
  ok(near(o1.mag, 1, 1e-12), 'M = 1 at Littrow');
  // 399 nm Littrow for Yb blue
  const aB = G.gratingLittrowAlpha(grating, 1, 399);
  ok(near(deg(aB), deg(Math.asin(399 / (2e6 / 2400))), 1e-9), `Littrow α(399 nm) = ${deg(aB).toFixed(2)}°`);
  ok(G.gratingLittrowAlpha({ ...grating, grooves_mm: 2400 }, 2, 680) === null, 'm = +2 Littrow unreachable at 680 nm');
}
{
  // setPrismMinDeviation replica for a +x beam should return ≈ 23.79°
  const c = { ...prism, angle: 0 };
  const V = G._prismLocalVerts(c);
  const cands = [];
  for (const [P, Q, sgn] of [[V[0], V[1], -1], [V[0], V[2], +1]]) {
    let nx = -(Q.y - P.y), ny = (Q.x - P.x); const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;
    const mx = (P.x + Q.x) / 2, my = (P.y + Q.y) / 2; if (nx*mx + ny*my < 0) { nx = -nx; ny = -ny; }
    const inA = Math.atan2(-ny, -nx) + sgn * md.theta1;
    cands.push(((((0 - inA) * 180 / Math.PI) % 360) + 360) % 360);
  }
  const best = cands.reduce((a, b) => Math.min(Math.abs(a - 360), a) < Math.min(Math.abs(b - 360), b) ? a : b);
  ok(near(best, 23.79, 0.02), `min-deviation rotation for a +x beam = ${best.toFixed(3)}° (default 23.8)`);
  // verify by tracing at that exact angle: M = 1 to 1e-9 and δ = δmin to 1e-9
  const c2 = { ...prism, angle: best };
  const V2 = G._prismWorldVerts(c2);
  const h = G._prismEdgeHit(V2, -100, 0, 1, 0, 1, -1);
  const t = G._prismTrace(c2, -100 + h.t, 0, 1, 0, n680);
  ok(near(t.mag, 1, 1e-9) && near(Math.abs(t.dev), md.dev, 1e-9), 'at that angle M = 1 and δ = δmin exactly');
  const other = cands.find(v => v !== best);
  const c3 = { ...prism, angle: other };
  const V3 = G._prismWorldVerts(c3);
  const h3 = G._prismEdgeHit(V3, -100, 0, 1, 0, 1, -1);
  const t3 = G._prismTrace(c3, -100 + h3.t, 0, 1, 0, n680);
  ok(t3 && near(Math.abs(t3.dev), md.dev, 1e-9), 'the other candidate (entry via the second face) is also min deviation');
}
console.log('— Supercontinuum sampling');
{
  const L = { source_mode: 'supercontinuum', sc_min_nm: 450, sc_max_nm: 700, sc_step_nm: 25, sc_psd: 0.04 };
  const w = G.laserWavelengths(L), s = G.laserSamples(L);
  ok(w.length === 11 && w[0] === 450 && w[10] === 700, '450–700 / 25 nm → 11 samples including both edges', w);
  ok(near(s.reduce((a, x) => a + x.power, 0), 0.04 * 250, 1e-12), 'Σ power = psd × span');
  ok(near(s[0].power, 0.04 * 12.5, 1e-12) && near(s[3].power, 0.04 * 25, 1e-12), 'half a slice at the edges, a full one inside');
  const w2 = G.laserWavelengths({ ...L, sc_step_nm: 30 });
  ok(w2.length === 10 && w2[9] === 700, 'non-multiple spacing keeps the band edge as the last sample', w2);
  ok(near(G.laserSamples({ ...L, sc_step_nm: 30 }).reduce((a, x) => a + x.power, 0), 0.04 * 250, 1e-12), 'and Σ power is still psd × span');
  ok(G.laserWavelengths({ ...L, sc_min_nm: 400, sc_max_nm: 2400, sc_step_nm: 1 }).length === 64, 'sample count capped at 64');
  ok(G.laserWavelengths({ ...L, sc_min_nm: 700, sc_max_nm: 450 })[0] === 450, 'reversed band is swapped, not empty');
  ok(G.laserWavelengths({ wavelength: 556 }).length === 1 && G.laserSamples({ wavelength: 556, power: 2 })[0].power === 2, 'CW laser: one sample at its own power');
  ok(!G.laserIsSupercontinuum({ wavelength: 680 }) && !G.laserIsSupercontinuum({ source_mode: 'cw' }), 'absent / cw source_mode is CW');
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
