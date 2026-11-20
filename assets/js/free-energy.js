/* Interactive figures for /research/free-energy/. Plain JS + SVG, no dependencies. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var RT_LN10_KJ = 5.708;   // RT ln 10 at 298 K, kJ/mol
  var RT_LN10_KCAL = 1.364; // same in kcal/mol
  var KT = 2.479;           // RT at 298 K, kJ/mol

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function text(parent, x, y, str, cls, anchor) {
    var t = el("text", { x: x, y: y, class: cls || "", "text-anchor": anchor || "start" }, parent);
    t.textContent = str;
    return t;
  }
  function clear(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
  // second line of a double bond: parallel to A-B, offset to one side, kept clear of both atoms
  function dbl(svg, A, B, side, opacity) {
    var dx = B[0] - A[0], dy = B[1] - A[1], L = Math.sqrt(dx * dx + dy * dy), ux = dx / L, uy = dy / L;
    var ox = -uy * 5 * side, oy = ux * 5 * side, a = 14, b = 15;
    el("line", { x1: A[0] + ux * a + ox, y1: A[1] + uy * a + oy, x2: B[0] - ux * b + ox, y2: B[1] - uy * b + oy, class: "bond bond2", opacity: opacity }, svg);
  }
  // single bond that stops at the edge of the atom at B (radius r)
  function bondTo(svg, A, B, r, opacity) {
    var dx = B[0] - A[0], dy = B[1] - A[1], L = Math.sqrt(dx * dx + dy * dy);
    el("line", { x1: A[0], y1: A[1], x2: B[0] - dx / L * r, y2: B[1] - dy / L * r, class: "bond", opacity: opacity }, svg);
  }
  function signed(x, d) { return (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(d); }
  function minus(s) { return String(s).replace("-", "−"); }
  function pct(f) {
    var p = f * 100;
    if (p >= 99.95) return ">99.9%";
    if (p < 0.01) return "<0.01%";
    if (p < 1) return parseFloat(p.toPrecision(2)) + "%";
    if (p < 10) return p.toFixed(1) + "%";
    return Math.round(p) + "%";
  }

  /* ------------------------------------------------------------------
     Figure 1: titration curve, in water vs. shifted inside a protein
     ------------------------------------------------------------------ */
  function titration(fig) {
    // One example residue: aspartate, approximate pKa of an exposed Asp in water.
    var RES = { id: "aspartate", pka: 3.7, acid: true };
    var state = { res: RES, ph: 7.4, shift: 3.0 };
    var svg = fig.querySelector("svg.plot"), toon = fig.querySelector("svg.cartoon");
    var readout = fig.querySelector(".readout");
    var phIn = fig.querySelector('[data-in="ph"]'), shIn = fig.querySelector('[data-in="shift"]');
    var phOut = fig.querySelector('[data-out="ph"]'), shOut = fig.querySelector('[data-out="shift"]');

    var W, H, m = { l: 52, r: 18, t: 18, b: 40 }, pw, ph;
    function size() { // narrower drawing on phones so the text stays readable
      var narrow = (svg.clientWidth || 640) < 480;
      W = narrow ? 360 : 640; H = narrow ? 250 : 300;
      m.l = narrow ? 42 : 52;
      pw = W - m.l - m.r; ph = H - m.t - m.b;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    }
    function X(p) { return m.l + (p / 14) * pw; }
    function Y(f) { return m.t + (1 - f) * ph; }
    function frac(p, pka) { return 1 / (1 + Math.pow(10, p - pka)); }
    function curve(pka) {
      var d = "";
      for (var p = 0; p <= 14.0001; p += 0.05) d += (d ? "L" : "M") + X(p).toFixed(1) + " " + Y(frac(p, pka)).toFixed(1);
      return d;
    }


    // Cartoon: the aspartate carboxyl group in water and inside a protein; the proton fades with how often it is there.
    function carboxyl(ox, oy, f) {
      var CB = [ox - 44, oy], C = [ox, oy], O1 = [ox + 30, oy - 30], O2 = [ox + 30, oy + 30], Hp = [ox + 66, oy + 38];
      el("line", { x1: ox - 86, y1: oy + 14, x2: CB[0], y2: CB[1], class: "chain" }, toon);
      el("line", { x1: CB[0], y1: CB[1], x2: C[0], y2: C[1], class: "bond" }, toon);
      el("line", { x1: C[0], y1: C[1], x2: O1[0], y2: O1[1], class: "bond" }, toon);
      dbl(toon, C, O1, -1, 0.5 + f * 0.5);
      el("line", { x1: C[0], y1: C[1], x2: O2[0], y2: O2[1], class: "bond" }, toon);
      dbl(toon, C, O2, 1, (1 - f) * 0.5);
      bondTo(toon, O2, Hp, 9, f);
      function atom(p, r, cls, tint) {
        el("circle", { cx: p[0], cy: p[1], r: r, class: "atom-bg" }, toon);
        el("circle", { cx: p[0], cy: p[1], r: r, class: "atom " + cls, "fill-opacity": tint }, toon);
      }
      el("circle", { cx: CB[0], cy: CB[1], r: 8, class: "res" }, toon);
      atom(C, 11, "c", 1);
      atom(O1, 13, "o", 0.3);
      atom(O2, 13, "o", 0.3);
      var hv = 0.18 + 0.82 * f; // keep a faint outline so you can see where the proton goes
      el("circle", { cx: Hp[0], cy: Hp[1], r: 9, class: "atom-bg", opacity: hv }, toon);
      el("circle", { cx: Hp[0], cy: Hp[1], r: 9, class: "atom h", "fill-opacity": 0.35, opacity: hv }, toon);
      text(toon, C[0], C[1] + 4, "C", "cys-label", "middle");
      text(toon, O1[0], O1[1] + 4, "O", "cys-label", "middle");
      text(toon, O2[0], O2[1] + 4, "O", "cys-label", "middle");
      text(toon, Hp[0], Hp[1] + 4, "H", "cys-label", "middle").setAttribute("opacity", hv);
      text(toon, ox + 50, oy + 21, "−", "minus-charge", "middle").setAttribute("opacity", 1 - f);
    }
    function drawToon(fw, fp) {
      if (!toon) return;
      clear(toon);
      // protein blob behind the lower copy
      el("path", { d: "M14 196 C 8 160, 60 148, 112 154 C 170 146, 214 168, 208 210 C 216 256, 168 282, 112 276 C 52 284, 4 252, 14 196 Z", class: "blob" }, toon);
      text(toon, 10, 20, "in water", "label");
      text(toon, 10, 36, "proton on " + pct(fw), "tiny");
      text(toon, 28, 182, "in the protein", "label protein-label");
      text(toon, 28, 198, "proton on " + pct(fp), "tiny");
      carboxyl(128, 88, fw);
      carboxyl(128, 228, fp);
    }

    function draw() {
      var r = state.res, pkaW = r.pka, pkaP = Math.min(14, Math.max(0, r.pka + state.shift));
      phOut.textContent = state.ph.toFixed(1);
      shOut.textContent = signed(state.shift, 1);

      size();
      clear(svg);
      var g = el("g", { class: "axis" }, svg);
      for (var p = 0; p <= 14; p += 2) {
        el("line", { x1: X(p), x2: X(p), y1: m.t, y2: m.t + ph, class: "grid" }, g);
        text(g, X(p), H - m.b + 18, p, "tick", "middle");
      }
      [0, 0.5, 1].forEach(function (f) {
        el("line", { x1: m.l, x2: m.l + pw, y1: Y(f), y2: Y(f), class: "grid" }, g);
        text(g, m.l - 8, Y(f) + 4, f * 100 + "%", "tick", "end");
      });
      text(g, m.l + pw, H - 6, "pH", "label", "end");
      text(g, m.l, m.t - 6, "protonated", "label");

      el("path", { d: curve(pkaW), class: "curve water" }, svg);
      el("path", { d: curve(pkaP), class: "curve protein" }, svg);

      // pKa markers
      el("circle", { cx: X(pkaW), cy: Y(0.5), r: 4, class: "dot water" }, svg);
      el("circle", { cx: X(pkaP), cy: Y(0.5), r: 5, class: "dot protein" }, svg);
      // labels sit on the side away from the other curve, unless the pH line or the edge is in the way
      var pRight = pkaP >= pkaW, wRight = !pRight;
      if (pRight && ((state.ph >= pkaP && state.ph - pkaP < 2.8) || pkaP > 11.5)) pRight = false;
      else if (!pRight && ((state.ph <= pkaP && pkaP - state.ph < 2.8) || pkaP < 2.5)) pRight = true;
      text(svg, X(pkaW) + (wRight ? 8 : -8), Y(0.5) - 8, "water " + pkaW.toFixed(1), "mark water", wRight ? "start" : "end");
      text(svg, X(pkaP) + (pRight ? 10 : -10), Y(0.5) + 18, "protein " + pkaP.toFixed(1), "mark protein", pRight ? "start" : "end");

      // current pH
      el("line", { x1: X(state.ph), x2: X(state.ph), y1: m.t, y2: m.t + ph, class: "phline" }, svg);
      var fw = frac(state.ph, pkaW), fp = frac(state.ph, pkaP);
      el("circle", { cx: X(state.ph), cy: Y(fw), r: 4, class: "dot water" }, svg);
      el("circle", { cx: X(state.ph), cy: Y(fp), r: 5, class: "dot protein" }, svg);
      drawToon(fw, fp);

      // charge: acids go 0 -> -1 on losing the proton, bases +1 -> 0
      var qw = r.acid ? -(1 - fw) : fw, qp = r.acid ? -(1 - fp) : fp;
      var dG = Math.abs(pkaP - pkaW);
      readout.innerHTML =
        "At pH " + state.ph.toFixed(1) + ", " + r.id + " holds its proton <b>" + pct(fw) + "</b> of the time in water and <b>" +
        pct(fp) + "</b> inside this protein (average charge " + minus(qw.toFixed(2)) + " → " + minus(qp.toFixed(2)) + "). " +
        "A shift of " + Math.abs(pkaP - pkaW).toFixed(1) + " pKa units is " + (dG * RT_LN10_KJ).toFixed(1) + " kJ/mol (" +
        (dG * RT_LN10_KCAL).toFixed(1) + " kcal/mol).";
    }

    phIn.addEventListener("input", function () { state.ph = +phIn.value; draw(); });
    shIn.addEventListener("input", function () { state.shift = +shIn.value; draw(); });

    function fromPointer(e) {
      var b = svg.getBoundingClientRect();
      var x = (e.clientX - b.left) * (W / b.width);
      var p = Math.round(((x - m.l) / pw) * 140) / 10;
      state.ph = Math.min(14, Math.max(0, p));
      phIn.value = state.ph;
      draw();
    }
    var dragging = false;
    svg.addEventListener("pointerdown", function (e) { dragging = true; svg.setPointerCapture(e.pointerId); fromPointer(e); });
    svg.addEventListener("pointermove", function (e) { if (dragging) fromPointer(e); });
    svg.addEventListener("pointerup", function () { dragging = false; });
    svg.addEventListener("pointercancel", function () { dragging = false; });

    var lastW = 0;
    window.addEventListener("resize", function () {
      var w = svg.clientWidth; if (Math.abs(w - lastW) > 40) { lastW = w; draw(); }
    });
    draw();
  }

  /* ------------------------------------------------------------------
     Figure 2: lambda morph + non-equilibrium work distributions (Crooks)
     ------------------------------------------------------------------ */
  function crooks(fig) {
    var morph = fig.querySelector(".morph svg"), work = fig.querySelector(".work svg");
    var lamIn = fig.querySelector('[data-in="lam"]'), lamOut = fig.querySelector('[data-out="lam"]');
    var note = fig.querySelector(".lam-note"), readout = fig.querySelector(".work .readout");
    var runBtn = fig.querySelector('[data-act="run"]'), resetBtn = fig.querySelector('[data-act="reset"]');
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Toy model: Gaussian work with equal width obeys Crooks exactly when the
    // forward mean is dG + s^2/(2kT) and the reverse mean is -dG + s^2/(2kT).
    var DG = 40.0, SIG = 6.0, DISS = SIG * SIG / (2 * KT);
    var fwd = [], rev = []; // rev stores reverse work W_r (sign not flipped)

    function gauss() {
      var u = 1 - Math.random(), v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    /* --- the morphing carboxyl group --- */
    function drawMorph(lam) {
      clear(morph);
      var C = [92, 85], O1 = [132, 40], O2 = [132, 130], Hp = [178, 142], R = [36, 85];
      el("line", { x1: R[0], y1: R[1], x2: C[0], y2: C[1], class: "bond" }, morph);
      text(morph, R[0] - 6, R[1] + 5, "R", "atom-label", "end");
      // C=O double bond, and the C–O bond that gains double-bond character as the charge delocalises
      el("line", { x1: C[0], y1: C[1], x2: O1[0], y2: O1[1], class: "bond" }, morph);
      dbl(morph, C, O1, -1, 1 - lam * 0.5);
      el("line", { x1: C[0], y1: C[1], x2: O2[0], y2: O2[1], class: "bond" }, morph);
      dbl(morph, C, O2, 1, lam * 0.5);
      // O–H bond fades with the proton
      bondTo(morph, O2, Hp, 11, 1 - lam);
      function atom(p, r, cls, tint) {
        el("circle", { cx: p[0], cy: p[1], r: r, class: "atom-bg" }, morph);           // opaque base hides bonds
        el("circle", { cx: p[0], cy: p[1], r: r, class: "atom " + cls, "fill-opacity": tint }, morph);
      }
      atom(C, 13, "c", 1);
      atom(O1, 15, "o", 0.3);
      atom(O2, 15 + lam * 2, "o", 0.3 + lam * 0.35);   // the oxygen that takes the negative charge
      atom(Hp, 11, "h", 0.35 * (1 - lam));
      text(morph, C[0], C[1] + 5, "C", "atom-label", "middle");
      text(morph, O1[0], O1[1] + 5, "O", "atom-label", "middle");
      text(morph, O2[0], O2[1] + 5, "O", "atom-label", "middle");
      text(morph, Hp[0], Hp[1] + 5, "H", "atom-label h-label", "middle").setAttribute("opacity", 1 - lam * 0.6);
      if (lam > 0.5) text(morph, Hp[0], Hp[1] + 26, "dummy", "tiny", "middle").setAttribute("opacity", (lam - 0.5) * 2);
      text(morph, 228, 20, "charge " + minus((-lam).toFixed(2)), "charge", "end");
      lamOut.textContent = lam.toFixed(2);
      note.textContent = lam === 0 ? "λ = 0: protonated, neutral" :
        lam === 1 ? "λ = 1: deprotonated, charge −1; the proton is a non-interacting dummy" :
        "in between: an unphysical hybrid, which is fine for computing free energies";
    }
    lamIn.addEventListener("input", function () { drawMorph(+lamIn.value); });

    /* --- Bennett acceptance ratio (in units of kJ/mol) --- */
    function bar(wf, wr) {
      var nf = wf.length, nr = wr.length, M = KT * Math.log(nf / nr);
      function f(dg) {
        var a = 0, b = 0, i;
        for (i = 0; i < nf; i++) a += 1 / (1 + Math.exp((M + wf[i] - dg) / KT));
        for (i = 0; i < nr; i++) b += 1 / (1 + Math.exp((-M + wr[i] + dg) / KT));
        return a - b;
      }
      var lo = -200, hi = 200;
      for (var k = 0; k < 60; k++) { var mid = (lo + hi) / 2; if (f(mid) > 0) hi = mid; else lo = mid; }
      return (lo + hi) / 2;
    }
    function resample(a) { var o = []; for (var i = 0; i < a.length; i++) o.push(a[(Math.random() * a.length) | 0]); return o; }

    /* --- histograms --- */
    var W = 420, H = 230, m = { l: 14, r: 14, t: 26, b: 36 }, LO = 10, HI = 70, BW = 2.5;
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    function X(w) { return m.l + ((w - LO) / (HI - LO)) * pw; }
    function hist(vals) {
      var n = Math.round((HI - LO) / BW), h = new Array(n).fill(0);
      vals.forEach(function (v) { var i = Math.floor((v - LO) / BW); if (i >= 0 && i < n) h[i]++; });
      return h;
    }
    function drawWork() {
      clear(work);
      var g = el("g", { class: "axis" }, work);
      for (var w = 10; w <= 70; w += 10) {
        el("line", { x1: X(w), x2: X(w), y1: m.t, y2: m.t + ph, class: "grid" }, g);
        text(g, X(w), H - m.b + 16, w, "tick", "middle");
      }
      text(g, m.l + pw, H - 4, "work (kJ/mol)", "label", "end");
      el("line", { x1: m.l, x2: m.l + pw, y1: m.t + ph, y2: m.t + ph, class: "base" }, g);

      var hf = hist(fwd), hr = hist(rev.map(function (x) { return -x; }));
      var top = Math.max(4, Math.max.apply(null, hf.concat(hr)));
      function bars(h, cls) {
        h.forEach(function (c, i) {
          if (!c) return;
          var hgt = (c / top) * ph;
          el("rect", { x: X(LO + i * BW) + 0.5, y: m.t + ph - hgt, width: (BW / (HI - LO)) * pw - 1, height: hgt, class: "bar " + cls }, work);
        });
      }
      bars(hr, "rev");
      bars(hf, "fwd");

      if (!fwd.length) {
        text(work, W / 2, m.t + ph / 2, "no switches yet", "empty", "middle");
        readout.textContent = "Each switch drags λ across in a few picoseconds and records the work. Press run to start.";
        return;
      }
      var est = bar(fwd, rev), boots = [];
      for (var b = 0; b < 40; b++) boots.push(bar(resample(fwd), resample(rev)));
      var mean = boots.reduce(function (s, x) { return s + x; }, 0) / boots.length;
      var se = Math.sqrt(boots.reduce(function (s, x) { return s + (x - mean) * (x - mean); }, 0) / (boots.length - 1));

      var showTrue = fwd.length >= 100;
      if (showTrue) {
        el("line", { x1: X(DG), x2: X(DG), y1: m.t - 4, y2: m.t + ph, class: "true" }, work);
      }
      el("line", { x1: X(est), x2: X(est), y1: m.t - 4, y2: m.t + ph, class: "est" }, work);
      text(work, X(est), m.t - 10, "ΔG ≈ " + est.toFixed(1), "est-label", "middle");

      var mf = fwd.reduce(function (s, x) { return s + x; }, 0) / fwd.length;
      var mr = rev.reduce(function (s, x) { return s - x; }, 0) / rev.length;
      readout.innerHTML = "<b>" + fwd.length + "</b> switches each way. Forward runs average " + mf.toFixed(1) +
        ", reverse " + mr.toFixed(1) + " kJ/mol. Estimate: <b>ΔG = " + est.toFixed(1) + " ± " + se.toFixed(1) + " kJ/mol</b>" +
        (showTrue ? " (true value in this toy: " + DG.toFixed(1) + ", dashed)." : ". The true value is revealed at 100.");
    }

    var busy = false;
    function addSwitches(n) {
      for (var i = 0; i < n; i++) {
        fwd.push(DG + DISS + SIG * gauss());
        rev.push(-DG + DISS + SIG * gauss());
      }
      drawWork();
    }
    runBtn.addEventListener("click", function () {
      if (busy) return;
      if (reduce) { addSwitches(20); return; }
      busy = true;
      var t0 = null, dur = 650;
      function step(t) {
        if (t0 === null) t0 = t;
        var u = Math.min(1, (t - t0) / dur), lam = u < 0.5 ? u * 2 : 2 - u * 2; // 0 -> 1 -> 0
        lamIn.value = lam; drawMorph(lam);
        if (u < 1) requestAnimationFrame(step);
        else { lamIn.value = 0; drawMorph(0); addSwitches(20); busy = false; }
      }
      requestAnimationFrame(step);
    });
    resetBtn.addEventListener("click", function () { fwd = []; rev = []; drawWork(); });

    drawMorph(0);
    drawWork();
  }

  /* ------------------------------------------------------------------
     Figure 3: disulfide bond, loop entropy and redox potential
     ------------------------------------------------------------------ */
  function disulfide(fig) {
    var R = 8.314e-3, T = 298, TWO_F = 2 * 96.485; // kJ/(mol K), K, kJ/(mol V) for a 2-electron reaction
    var E_REF = -220;                               // mV, illustrative potential of an unstrained disulfide with no help from the fold
    var ENVS = [
      { id: "Cytosol", e: -280 },
      { id: "ER", e: -180 },
      { id: "Outside cells", e: -140 }
    ];
    var state = { n: 12, e: -230 };
    var loop = fig.querySelector("svg.loop"), plot = fig.querySelector("svg.plot");
    var chips = fig.querySelector(".chips"), readout = fig.querySelector(".readout");
    var nIn = fig.querySelector('[data-in="n"]'), eIn = fig.querySelector('[data-in="e"]');
    var nOut = fig.querySelector('[data-out="n"]'), eOut = fig.querySelector('[data-out="e"]');

    ENVS.forEach(function (v) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = v.id + " ≈ " + minus(v.e) + " mV";
      b.addEventListener("click", function () { state.e = v.e; eIn.value = v.e; draw(); });
      chips.appendChild(b);
      v.btn = b;
    });

    // Pace et al. (1988): entropy lost by the unfolded chain, dS = -2.1 - 1.5 R ln n  (cal/mol/K)
    function stab(n) { return T * (2.1 * 4.184e-3 + 1.5 * R * Math.log(n)); } // kJ/mol
    function fOx(e, e0) { return 1 / (1 + Math.exp(-TWO_F * (e - e0) / 1000 / (R * T))); }

    function drawLoop(n, f) {
      clear(loop);
      var cx = 120, r = Math.min(70, 30 + n * 1.0), cy = 14 + r;
      var th0 = Math.asin(Math.min(0.95, 22 / r));
      var a1 = Math.PI / 2 + th0, a2 = 2.5 * Math.PI - th0;         // long way round, over the top
      var P = function (a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
      var c1 = P(a1), c2 = P(a2);
      // chain backbone
      var d = "M" + (c1[0] - 70) + " " + (c1[1] + 22) + " L" + c1[0] + " " + c1[1];
      for (var k = 0; k <= 60; k++) { var q = P(a1 + (a2 - a1) * k / 60); d += " L" + q[0].toFixed(1) + " " + q[1].toFixed(1); }
      d += " L" + (c2[0] + 70) + " " + (c2[1] + 22);
      el("path", { d: d, class: "chain" }, loop);
      // residues between the cysteines
      var br = Math.max(1.8, Math.min(5, (r * (a2 - a1)) / (n + 1) / 2.6));
      for (var i = 1; i <= n; i++) { var p = P(a1 + (a2 - a1) * i / (n + 1)); el("circle", { cx: p[0], cy: p[1], r: br, class: "res" }, loop); }
      // cysteines and their sulfurs
      var s1 = [c1[0] + 4, c1[1] + 30], s2 = [c2[0] - 4, c2[1] + 30];
      el("line", { x1: c1[0], y1: c1[1], x2: s1[0], y2: s1[1], class: "sbond" }, loop);
      el("line", { x1: c2[0], y1: c2[1], x2: s2[0], y2: s2[1], class: "sbond" }, loop);
      el("line", { x1: s1[0], y1: s1[1], x2: s2[0], y2: s2[1], class: "ss", opacity: f }, loop);
      [c1, c2].forEach(function (c) { el("circle", { cx: c[0], cy: c[1], r: 8, class: "cys" }, loop); text(loop, c[0], c[1] + 4, "C", "cys-label", "middle"); });
      [s1, s2].forEach(function (s) { el("circle", { cx: s[0], cy: s[1], r: 9, class: "sulfur" }, loop); text(loop, s[0], s[1] + 4, "S", "cys-label", "middle"); });
      var h = 1 - f;
      text(loop, s1[0] - 14, s1[1] + 18, "H", "h-on-s", "middle").setAttribute("opacity", h);
      text(loop, s2[0] + 14, s2[1] + 18, "H", "h-on-s", "middle").setAttribute("opacity", h);
      text(loop, cx, 232, n + " residues · " + (f > 0.5 ? "S–S formed " + pct(f) : "reduced " + pct(1 - f)), "tiny", "middle");
    }

    var W, H, m = { l: 40, r: 16, t: 34, b: 38 }, pw, ph, LO = -400, HI = -50;
    function size() {
      var narrow = (plot.clientWidth || 420) < 380;
      W = narrow ? 340 : 420; H = narrow ? 240 : 260;
      pw = W - m.l - m.r; ph = H - m.t - m.b;
      plot.setAttribute("viewBox", "0 0 " + W + " " + H);
    }
    function X(e) { return m.l + ((e - LO) / (HI - LO)) * pw; }
    function Y(f) { return m.t + (1 - f) * ph; }
    function curve(e0) {
      var d = "";
      for (var e = LO; e <= HI + 0.01; e += 2.5) d += (d ? "L" : "M") + X(e).toFixed(1) + " " + Y(fOx(e, e0)).toFixed(1);
      return d;
    }

    function draw() {
      size();
      var g0 = stab(state.n), e0 = E_REF - g0 / TWO_F * 1000;
      var fr = fOx(state.e, E_REF), fp = fOx(state.e, e0);
      nOut.textContent = state.n;
      eOut.textContent = minus(state.e) + " mV";
      ENVS.forEach(function (v) { v.btn.setAttribute("aria-pressed", v.e === state.e); });

      clear(plot);
      var g = el("g", { class: "axis" }, plot);
      for (var e = -400; e <= -50; e += 50) {
        el("line", { x1: X(e), x2: X(e), y1: m.t, y2: m.t + ph, class: "grid" }, g);
        if (e % 100 === 0 || W > 360) text(g, X(e), H - m.b + 16, minus(e), "tick", "middle");
      }
      [0, 0.5, 1].forEach(function (f) {
        el("line", { x1: m.l, x2: m.l + pw, y1: Y(f), y2: Y(f), class: "grid" }, g);
        text(g, m.l - 6, Y(f) + 4, f * 100 + "%", "tick", "end");
      });
      text(g, m.l, m.t - 20, "bond formed", "label");
      text(g, m.l + pw, H - 4, "mV · more oxidising →", "label", "end");
      ENVS.forEach(function (v) {
        el("line", { x1: X(v.e), x2: X(v.e), y1: m.t - 6, y2: m.t, class: "base" }, g);
      });
      el("path", { d: curve(E_REF), class: "curve water" }, plot);
      el("path", { d: curve(e0), class: "curve protein" }, plot);
      el("line", { x1: X(state.e), x2: X(state.e), y1: m.t, y2: m.t + ph, class: "phline" }, plot);
      el("circle", { cx: X(state.e), cy: Y(fr), r: 4, class: "dot water" }, plot);
      el("circle", { cx: X(state.e), cy: Y(fp), r: 5, class: "dot protein" }, plot);

      drawLoop(state.n, fp);
      readout.innerHTML = "Closing a loop of " + state.n + " residues costs the unfolded chain about <b>" + g0.toFixed(1) +
        " kJ/mol</b> (" + (g0 / 4.184).toFixed(1) + " kcal/mol). Held without strain by the fold, that moves the bond’s potential from " +
        minus(E_REF) + " to " + minus(Math.round(e0)) + " mV. At " + minus(state.e) + " mV it is formed <b>" + pct(fr) +
        "</b> of the time on its own and <b>" + pct(fp) + "</b> in the folded protein.";
    }

    nIn.addEventListener("input", function () { state.n = +nIn.value; draw(); });
    eIn.addEventListener("input", function () { state.e = +eIn.value; draw(); });
    var lastW = 0;
    window.addEventListener("resize", function () { var w = plot.clientWidth; if (Math.abs(w - lastW) > 40) { lastW = w; draw(); } });
    draw();
  }

  var t = document.getElementById("titration"), c = document.getElementById("crooks"), d = document.getElementById("disulfide");
  if (t) titration(t);
  if (c) crooks(c);
  if (d) disulfide(d);
})();
