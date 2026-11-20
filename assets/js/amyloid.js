/* α-synuclein sequence map for /research/amyloid/. Plain JS, no dependencies. */
(function () {
  "use strict";
  var fig = document.getElementById("asyn");
  if (!fig) return;

  // Human α-synuclein, UniProt P37840
  var SEQ = "MDVFMKGLSKAKEGVVAAAEKTKQGVAEAAGKTKEGVLYVGSKTKEGVVHGVATVAEKTK" +
            "EQVTNVGGAVVTGVTAVAQKTVEGAGSIAAATGFVKKDQLGKNEEGAPQEGILEDMPVDP" +
            "DNEAYEMPSEEGYQDYEPEA";
  var REGIONS = [
    { id: "n", name: "N-terminal region", from: 1, to: 60,
      text: "Carries most of the positive charge, in repeats of the motif KTKEGV. It binds membranes, where it folds into a helix." },
    { id: "nac", name: "NAC region", from: 61, to: 95,
      text: "Hydrophobic and the driving force for aggregation. It forms the middle of the fibril core." },
    { id: "c", name: "C-terminal tail", from: 96, to: 140,
      text: "Very acidic and disordered even in fibrils. This is where STIP1/HOP binds." }
  ];
  var CORE = [38, 97]; // ordered in the fibril structure PDB 6CU7
  // Approximate pKa values for exposed groups (as on the free energy page); a = acid (loses charge 0 -> -1), b = base (+1 -> 0)
  var PKA = { D: [3.7, "a"], E: [4.2, "a"], H: [6.5, "b"], K: [10.4, "b"], R: [12.5, "b"], Y: [9.8, "a"], C: [8.5, "a"] };
  var NTERM = [8.0, "b"], CTERM = [3.7, "a"];
  var NAMES = { A: "Ala", R: "Arg", N: "Asn", D: "Asp", C: "Cys", E: "Glu", Q: "Gln", G: "Gly", H: "His", I: "Ile", L: "Leu", K: "Lys", M: "Met", F: "Phe", P: "Pro", S: "Ser", T: "Thr", W: "Trp", Y: "Tyr", V: "Val" };

  var state = { mode: "regions", ph: 7.2, sel: null };
  var seqEl = fig.querySelector(".seq"), legend = fig.querySelector(".legend"), readout = fig.querySelector(".readout");
  var phIn = fig.querySelector('[data-in="ph"]'), phOut = fig.querySelector('[data-out="ph"]');

  function regionOf(i) { for (var k = 0; k < REGIONS.length; k++) if (i >= REGIONS[k].from && i <= REGIONS[k].to) return REGIONS[k]; }
  function groupCharge(pka, kind, ph) {
    var fProt = 1 / (1 + Math.pow(10, ph - pka));
    return kind === "a" ? -(1 - fProt) : fProt;
  }
  function charge(i, ph) { // residue i is 1-based
    var q = 0, p = PKA[SEQ[i - 1]];
    if (p) q += groupCharge(p[0], p[1], ph);
    if (i === 1) q += groupCharge(NTERM[0], NTERM[1], ph);
    if (i === SEQ.length) q += groupCharge(CTERM[0], CTERM[1], ph);
    return q;
  }
  function sum(from, to, ph) { var q = 0; for (var i = from; i <= to; i++) q += charge(i, ph); return q; }
  function fmt(q) { return (q > 0.05 ? "+" : q < -0.05 ? "−" : "") + Math.abs(q).toFixed(1); }

  // build the cells once
  var cells = [];
  for (var i = 1; i <= SEQ.length; i++) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "aa reg-" + regionOf(i).id + (i % 10 === 0 ? " tenth" : "");
    b.textContent = SEQ[i - 1];
    b.setAttribute("data-i", i);
    if (i % 10 === 0 || i === 1) b.setAttribute("data-n", i);
    b.setAttribute("aria-label", NAMES[SEQ[i - 1]] + " " + i);
    b.addEventListener("click", function (e) { state.sel = +e.currentTarget.getAttribute("data-i"); draw(); });
    seqEl.appendChild(b);
    cells.push(b);
  }

  function draw() {
    fig.setAttribute("data-mode", state.mode);
    fig.querySelectorAll("[data-mode]").forEach(function (b) { if (b.tagName === "BUTTON") b.setAttribute("aria-pressed", b.getAttribute("data-mode") === state.mode); });
    phOut.textContent = state.ph.toFixed(1);
    fig.querySelectorAll("[data-ph]").forEach(function (b) { b.setAttribute("aria-pressed", Math.abs(+b.getAttribute("data-ph") - state.ph) < 0.05); });

    cells.forEach(function (c, k) {
      var i = k + 1, q = charge(i, state.ph), bg = "", fg = "";
      c.classList.toggle("sel", state.sel === i);
      c.classList.toggle("in-core", i >= CORE[0] && i <= CORE[1]);
      if (state.mode === "charge") {
        var a = Math.min(1, Math.abs(q));
        if (a > 0.04) bg = "color-mix(in srgb, " + (q > 0 ? "var(--steel)" : "var(--congo)") + " " + Math.round(18 + a * 70) + "%, var(--surface))";
        if (a > 0.6) fg = "var(--bg)";
      }
      c.style.background = bg; c.style.color = fg;
    });

    if (state.mode === "regions") {
      legend.innerHTML = REGIONS.map(function (r) { return '<span><i class="sw reg-' + r.id + '"></i>' + r.name + " " + r.from + "–" + r.to + "</span>"; }).join("");
    } else if (state.mode === "charge") {
      legend.innerHTML = '<span><i class="sw pos"></i>positive</span><span><i class="sw neg"></i>negative</span><span><i class="sw neu"></i>neutral</span>';
    } else {
      legend.innerHTML = '<span><i class="sw core"></i>ordered in the fibril core, ' + CORE[0] + "–" + CORE[1] + '</span><span><i class="sw neu"></i>stays disordered</span>';
    }

    var html = "";
    if (state.sel) {
      var i = state.sel, r = regionOf(i), q = charge(i, state.ph), aa = SEQ[i - 1];
      html = "<b>" + NAMES[aa] + " " + i + "</b> · " + r.name + ". ";
      if (state.mode === "charge") html += "Charge at pH " + state.ph.toFixed(1) + ": " + fmt(q) + ". ";
      if (state.mode === "core") html += (i >= CORE[0] && i <= CORE[1] ? "Part of the ordered fibril core. " : "Outside the fibril core, still flexible. ");
      if (state.mode === "regions") html += r.text;
    } else if (state.mode === "regions") {
      html = REGIONS.map(function (r) { return "<b>" + r.name + "</b>: " + r.text; }).join(" ");
    }
    if (state.mode === "charge") {
      html += (html ? "<br>" : "") + "Net charge at pH " + state.ph.toFixed(1) + ": <b>" + fmt(sum(1, 140, state.ph)) + "</b> (" +
        REGIONS.map(function (r) { return r.name.replace(" region", "").replace(" tail", "") + " " + fmt(sum(r.from, r.to, state.ph)); }).join(", ") + ").";
    }
    if (state.mode === "core" && !state.sel) {
      html = "In this fibril, residues " + CORE[0] + "–" + CORE[1] + " stack into the ordered core. They cover the NAC region and part of the N-terminal region; the acidic tail stays disordered around the fibril.";
    }
    readout.innerHTML = html;
  }

  fig.querySelectorAll("button[data-mode]").forEach(function (b) {
    b.addEventListener("click", function () { state.mode = b.getAttribute("data-mode"); draw(); });
  });
  phIn.addEventListener("input", function () { state.ph = +phIn.value; state.mode = "charge"; draw(); });
  fig.querySelectorAll("[data-ph]").forEach(function (b) {
    b.addEventListener("click", function () { state.ph = +b.getAttribute("data-ph"); phIn.value = state.ph; state.mode = "charge"; draw(); });
  });
  draw();
})();
