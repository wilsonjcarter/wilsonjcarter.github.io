/* 3D viewers for /research/aquaporins/. Uses 3Dmol.js and the trimmed, pre-aligned
   structures in assets/data (channel axis along z, cytoplasm at -z). */
(function () {
  "use strict";
  var me = document.querySelector('script[src*="aquaporins.js"]');
  var DATA = me ? me.src.replace(/js\/aquaporins\.js.*$/, "data/") : "/assets/data/";
  var dark = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function isDark() {
    var t = document.documentElement.getAttribute("data-theme");
    return t ? t === "dark" : !!(dark && dark.matches);
  }
  function chainColors() { return isDark() ? ["#6a6a73", "#8c8c96"] : ["#b4b4bb", "#d2d2d7"]; }
  function range(a, b) { var r = []; for (var i = a; i <= b; i++) r.push(i); return r; }
  var BACKBONE = ["N", "CA", "C", "O"];

  function whenReady(fn) {
    if (window.$3Dmol) return fn();
    var n = 0, t = setInterval(function () {
      if (window.$3Dmol) { clearInterval(t); fn(); }
      else if (++n > 200) { clearInterval(t); document.querySelectorAll(".mol-fig .viewer").forEach(function (v) { v.textContent = "The 3D viewer could not load."; }); }
    }, 50);
  }
  function load(file) { return fetch(DATA + file).then(function (r) { if (!r.ok) throw new Error(file); return r.text(); }); }

  // Shared: view buttons (side / top / bottom) and the outside/inside labels
  function viewControls(fig, v, getBase, onChange) {
    var wrap = fig.querySelector(".viewer-wrap"), btns = fig.querySelectorAll("[data-view]");
    function set(view) {
      var base = getBase(); if (!base) return;
      v.setView(base);
      if (view === "side") v.rotate(-90, "x");     // +z (outside) up on screen
      if (view === "bottom") v.rotate(180, "x");   // look from the cytoplasm
      wrap.classList.toggle("is-side", view === "side");
      btns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-view") === view); });
      v.render();
      if (onChange) onChange(view);
    }
    btns.forEach(function (b) { b.addEventListener("click", function () { set(b.getAttribute("data-view")); }); });
    return set;
  }

  /* ---------------- AQP3: open and closed ---------------- */
  function aqp3(fig) {
    var el = fig.querySelector(".viewer"), status = fig.querySelector(".viewer-status");
    var v = $3Dmol.createViewer(el, { backgroundColor: "white", backgroundAlpha: 0, antialias: true });
    var STATES = {
      ph8: { file: "aqp3_ph8.pdb", label: "pH 8.0 · open" },
      ph5: { file: "aqp3_ph5.pdb", label: "pH 5.5 · closed" },
      h2o2: { file: "aqp3_h2o2.pdb", label: "pH 8.0 + H₂O₂ · closed" }
    };
    var LOOP_E = range(207, 212), INNER = range(185, 189);
    var cur = "ph8", base = null, setView;

    function style() {
      var c = chainColors(), apple = css("--apple"), amber = css("--amber");
      Object.keys(STATES).forEach(function (k) {
        var m = STATES[k].model; if (!m) return;
        m.setStyle({}, {});
        m.setStyle({ chain: ["A", "C"] }, { cartoon: { color: c[0] } });
        m.setStyle({ chain: ["B", "D"] }, { cartoon: { color: c[1] } });
        m.setStyle({ resi: LOOP_E }, { cartoon: { color: apple, thickness: 0.8 }, stick: { color: apple, radius: 0.32 } });
        m.setStyle({ resi: INNER }, { cartoon: { color: amber, thickness: 0.8 }, stick: { color: amber, radius: 0.32 } });
      });
      v.render();
    }
    function show(k) {
      cur = k;
      Object.keys(STATES).forEach(function (s) { var m = STATES[s].model; if (m) (s === k ? m.show() : m.hide()); });
      fig.querySelectorAll("[data-state]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-state") === k); });
      status.textContent = STATES[k].label;
      status.classList.toggle("closed", k !== "ph8");
      v.render();
    }

    status.textContent = "Loading structures…";
    Promise.all(Object.keys(STATES).map(function (k) {
      return load(STATES[k].file).then(function (txt) { STATES[k].model = v.addModel(txt, "pdb"); });
    })).then(function () {
      style();
      v.zoomTo(); v.zoom(1.15);
      base = v.getView();
      setView = viewControls(fig, v, function () { return base; });
      show(cur);
      setView("side");
    }).catch(function (e) { console.error(e); status.textContent = "Could not load the structures."; });

    fig.querySelectorAll("[data-state]").forEach(function (b) {
      b.addEventListener("click", function () { if (base) show(b.getAttribute("data-state")); });
    });
    return { restyle: style, viewer: v };
  }

  /* ---------------- AQP7 with inhibitor ---------------- */
  function aqp7(fig) {
    var el = fig.querySelector(".viewer");
    var v = $3Dmol.createViewer(el, { backgroundColor: "white", backgroundAlpha: 0, antialias: true });
    var m = null, base = null;
    function style() {
      if (!m) return;
      var c = chainColors();
      m.setStyle({}, {});
      m.setStyle({ chain: ["A", "C"] }, { cartoon: { color: c[0], opacity: 0.75 } });
      m.setStyle({ chain: ["B", "D"] }, { cartoon: { color: c[1], opacity: 0.75 } });
      // side chains touching the inhibitor (only those were kept in the file)
      v.addStyle({ model: m, not: { or: [{ atom: BACKBONE }, { resn: "T60" }] } }, { stick: { radius: 0.16, colorscheme: isDark() ? "whiteCarbon" : "greyCarbon" } });
      m.setStyle({ resn: "T60" }, { stick: { radius: 0.38, colorscheme: "orangeCarbon" } });
      v.render();
    }
    load("aqp7_inhibitor.pdb").then(function (txt) {
      m = v.addModel(txt, "pdb");
      style();
      v.zoomTo(); v.zoom(1.15);
      base = v.getView();
      viewControls(fig, v, function () { return base; })("side");
    }).catch(function (e) { console.error(e); el.textContent = "Could not load the structure."; });
    return { restyle: style, viewer: v };
  }

  whenReady(function () {
    var figs = [];
    var a = document.getElementById("aqp3"), b = document.getElementById("aqp7");
    if (a) figs.push(aqp3(a));
    if (b) figs.push(aqp7(b));
    if (dark && dark.addEventListener) dark.addEventListener("change", function () { figs.forEach(function (f) { f.restyle(); }); });
    var t; window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(function () { figs.forEach(function (f) { f.viewer.resize(); f.viewer.render(); }); }, 150); });
  });
})();
