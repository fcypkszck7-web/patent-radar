/* Bewegung: Federn, Fallblatt-Tafel, Zählwerk, Flug in die Merkliste, Neigen mit Lichtreflex,
   Zeitleiste beim Scrollen, Übergänge zwischen Karte und Detailansicht.
   Gemeinsam genutzt vom Start-up-Radar und vom Patent-Radar. Keine externen Abhängigkeiten.
   Bei „Bewegung reduzieren“ im Betriebssystem springt alles ohne Animation an sein Ziel. */
(function (root) {
  "use strict";
  var doc = document, html = doc.documentElement;
  var mq = root.matchMedia ? root.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  function ruhig() { return !!mq.matches; }
  var KANN_ANIM = !!(Element.prototype.animate);
  var KANN_LINEAR = !!(root.CSS && CSS.supports && CSS.supports("transition-timing-function", "linear(0, 1)"));
  function noop() {}
  function el(tag, klasse) { var e = doc.createElement(tag); if (klasse) e.className = klasse; return e; }
  var LEER = { finished: Promise.resolve(), cancel: noop, finish: noop };

  /* ---------- Federn: echte Feder-Physik, als Zeitkurve linear() abgetastet ---------- */
  function feder(k, c) {
    var x = 0, v = 0, dt = 1 / 240, t = 0, pkt = [0], ruhe = 0;
    for (var s = 0; s < 2400; s++) {
      var a = -k * (x - 1) - c * v; v += a * dt; x += v * dt; t += dt;
      if (s % 4 === 3) pkt.push(x);
      if (Math.abs(x - 1) < .0006 && Math.abs(v) < .006) { if (++ruhe > 24) break; } else ruhe = 0;
    }
    var schritt = Math.ceil(pkt.length / 64), aus = [];
    for (var i = 0; i < pkt.length; i += schritt) aus.push(+pkt[i].toFixed(3));
    aus.push(1);
    var d = Math.round(t * 1000);
    return KANN_LINEAR ? { e: "linear(" + aus.join(", ") + ")", d: d } : { e: "cubic-bezier(.3, 1.25, .45, 1)", d: Math.min(d, 650) };
  }
  var F = { weich: feder(170, 21), straff: feder(320, 36), huepf: feder(380, 15), zug: feder(260, 27), vor: feder(470, 40), nach: feder(150, 21), zaehl: feder(210, 19) };
  Object.keys(F).forEach(function (n) { html.style.setProperty("--f-" + n, F[n].e); html.style.setProperty("--f-" + n + "-d", F[n].d + "ms"); });

  function anim(e, frames, o) {
    if (!KANN_ANIM || !e) return LEER;
    if (ruhig()) o = Object.assign({}, o, { duration: 1, delay: 0 });
    try { return e.animate(frames, o); } catch (x) { return LEER; }
  }
  function stoss(e) { return anim(e, [{ transform: "scale(1.45)" }, { transform: "none" }], { duration: F.huepf.d, easing: F.huepf.e }); }

  /* ---------- Gleitende Markierung: vordere Kante eilt voraus, hintere zieht nach ---------- */
  function gleite(e, l, r, sofort) {
    var alt = parseFloat(e.style.left), rechts = isNaN(alt) || l >= alt;
    if (sofort || ruhig() || isNaN(alt)) e.style.transition = "none";
    else e.style.transition = (rechts
      ? "right " + F.vor.d + "ms " + F.vor.e + ", left " + F.nach.d + "ms " + F.nach.e
      : "left " + F.vor.d + "ms " + F.vor.e + ", right " + F.nach.d + "ms " + F.nach.e) + ", opacity .2s";
    e.style.left = l + "px"; e.style.right = r + "px";
  }

  /* ---------- Zählwerk: Ziffernrollen wie bei einem mechanischen Zähler ---------- */
  function Zaehlwerk(ziel) {
    ziel.textContent = "";
    this.sr = el("span", "bw-sr");
    this.huelle = el("span", "bw-zahl"); this.huelle.setAttribute("aria-hidden", "true");
    this.platz = el("span", "bw-zahl-platz"); this.vis = el("span", "bw-zw");
    this.huelle.appendChild(this.platz); this.huelle.appendChild(this.vis);
    ziel.appendChild(this.sr); ziel.appendChild(this.huelle); this.sp = [];
  }
  var ZW_REIHE = " 0123456789.,", ZW_N = ZW_REIHE.length;
  Zaehlwerk.prototype.setze = function (text, sofort) {
    text = String(text);
    var n = Math.max(text.length, this.sp.length), neu = false;
    while (this.sp.length < n) {
      var s = el("span", "bw-zw-s leer"), band = el("span", "bw-zw-band");
      band.innerHTML = ZW_REIHE.split("").map(function (c) { return "<span>" + (c === " " ? "&nbsp;" : c) + "</span>"; }).join("");
      s.appendChild(band); this.vis.insertBefore(s, this.vis.firstChild); this.sp.unshift({ s: s, b: band }); neu = true;
    }
    if (neu) void this.vis.offsetWidth;
    var pad = n - text.length, still = sofort || ruhig(), f = F.zaehl;
    this.platz.textContent = text;
    this.sp.forEach(function (o, i) {
      var ch = i < pad ? " " : text[i - pad], idx = ZW_REIHE.indexOf(ch);
      if (idx < 0) idx = 0;
      o.s.classList.toggle("leer", idx === 0);
      o.s.classList.toggle("trenn", idx > 10);
      o.b.style.transition = still ? "none" : "transform " + f.d + "ms " + f.e + " " + (i * 40) + "ms";
      o.b.style.transform = "translateY(" + (-idx * 100 / ZW_N).toFixed(4) + "%)";
    });
    this.sr.textContent = text;
  };
  function format(n) { return typeof n === "number" ? n.toLocaleString("de-DE") : String(n); }
  /* Zahl in ein Element schreiben; ab dem zweiten Mal rollt sie */
  function zahl(ziel, wert, sofort) {
    if (!ziel) return;
    var z = ziel.__bwZw;
    if (!z || !ziel.contains(z.huelle)) { z = ziel.__bwZw = new Zaehlwerk(ziel); sofort = true; }
    z.setze(format(wert), sofort);
  }
  /* Zahl, die neu gezeichnet wurde, vom alten Wert aus rollen lassen */
  function rolle(ziel, von, bis) {
    if (!ziel) return;
    if (von == null || von === bis) { ziel.textContent = format(bis); return; }
    zahl(ziel, von, true); zahl(ziel, bis);
  }

  /* ---------- Fallblatt-Tafel ---------- */
  var TROMMEL = " ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ0123456789.-&/#:'+";
  function norm(s) {
    s = String(s == null ? "" : s).toUpperCase().replace(/ß/g, "SS").replace(/[–—]/g, "-").replace(/[„“”"«»]/g, "");
    var o = ""; for (var i = 0; i < s.length; i++) o += TROMMEL.indexOf(s[i]) < 0 ? " " : s[i];
    return o.replace(/\s+/g, " ");
  }
  function passe(s, n) {
    s = norm(s).trim();
    if (s.length > n) { var cut = s.slice(0, n + 1).lastIndexOf(" "); s = (cut > n * .5 ? s.slice(0, cut) : s.slice(0, n)).replace(/[ &\-\/:.,]+$/, ""); }
    while (s.length < n) s += " ";
    return s;
  }
  function Zelle(klasse) {
    var e = el("span", "bw-fz"), z = this;
    this.el = e; this.klasse = klasse; this.cur = " "; this.ziel = " "; this.laeuft = false; this.max = klasse ? 3 : 9;
    ["o", "u", "bo", "bu"].forEach(function (k) { var s = el("span", k); s.appendChild(el("b")); e.appendChild(s); z[k] = s; });
    this.alle(" ");
  }
  Zelle.prototype.mal = function (teil, ch) {
    teil.firstChild.textContent = ch === " " ? " " : ch;
    if (this.klasse) { var k = this.klasse(ch); teil.className = teil.className.split(" ")[0] + (k ? " " + k : ""); }
  };
  Zelle.prototype.alle = function (ch) { this.mal(this.o, ch); this.mal(this.u, ch); this.mal(this.bo, ch); this.mal(this.bu, ch); };
  Zelle.prototype.sofort = function (ch) { if (this.a1) this.a1.cancel(); if (this.a2) this.a2.cancel(); this.laeuft = false; this.cur = this.ziel = ch; this.alle(ch); };
  Zelle.prototype.zu = function (ch, verz) {
    this.ziel = ch;
    if (ruhig() || !KANN_ANIM) { this.sofort(ch); return; }
    if (!this.laeuft && this.cur !== ch) { var z = this; this.laeuft = true; setTimeout(function () { z.weiter(); }, verz || 0); }
  };
  Zelle.prototype.weiter = function () {
    var z = this;
    if (z.cur === z.ziel || !z.el.isConnected) { z.laeuft = false; return; }
    var n = TROMMEL.length, i = TROMMEL.indexOf(z.cur), j = TROMMEL.indexOf(z.ziel), ab = (j - i + n) % n;
    var nx = ab > z.max ? TROMMEL[(j - z.max + n) % n] : TROMMEL[(i + 1) % n];
    z.schritt(nx, nx === z.ziel).then(function () { z.weiter(); });
  };
  Zelle.prototype.schritt = function (nx, letzter) {
    var z = this;
    z.mal(z.o, nx); z.mal(z.bo, z.cur); z.mal(z.bu, nx);
    if (z.a1) z.a1.cancel(); if (z.a2) z.a2.cancel();
    var d1 = letzter ? 95 : 40, d2 = letzter ? 300 : 44;
    z.a1 = z.bo.animate(letzter
      ? [{ transform: "rotateX(0deg)", filter: "brightness(1)" }, { transform: "rotateX(-90deg)", filter: "brightness(.45)" }]
      : [{ transform: "rotateX(0deg)" }, { transform: "rotateX(-90deg)" }],
      { duration: d1, easing: "cubic-bezier(.55, 0, 1, .5)", fill: "forwards" });
    z.a2 = z.bu.animate(letzter
      ? [{ transform: "rotateX(90deg)", filter: "brightness(1.5)", easing: "cubic-bezier(.6, 0, 1, .6)" },
         { transform: "rotateX(0deg)", filter: "brightness(1)", offset: .36, easing: "cubic-bezier(0, .5, .5, 1)" },
         { transform: "rotateX(16deg)", offset: .55, easing: "cubic-bezier(.5, 0, 1, .5)" },
         { transform: "rotateX(0deg)", offset: .74, easing: "cubic-bezier(0, .5, .5, 1)" },
         { transform: "rotateX(5deg)", offset: .87, easing: "cubic-bezier(.5, 0, 1, .5)" },
         { transform: "rotateX(0deg)" }]
      : [{ transform: "rotateX(90deg)" }, { transform: "rotateX(0deg)" }],
      { duration: d2, delay: d1, easing: letzter ? "linear" : "cubic-bezier(.2, .5, .5, 1)", fill: "both" });
    var fertig = function () { z.cur = nx; z.mal(z.u, nx); };
    return z.a2.finished.then(fertig, fertig);
  };

  /* o: { zeilen, spalten: [{ k, n | rest, min, ab, klasse(ch), farbe(datum) }], titel: { k: "Spaltenname" },
          element: "button" | "a", hover(datum, an) }
     Daten je Zeile: { k: Text …, label: Vorlesetext, href, attr: { name: wert } } */
  function Tafel(wurzel, o) {
    this.w = wurzel; this.o = o; this.daten = []; this.bau = null;
    wurzel.classList.add("bw-tafel");
    this.kopf = el("div", "bw-tafel-spalten"); this.kopf.setAttribute("aria-hidden", "true");
    this.liste = el("div", "bw-tafel-zeilen");
    wurzel.appendChild(this.kopf); wurzel.appendChild(this.liste);
    this.baue();
    var t = this;
    if (root.ResizeObserver) {
      this.ro = new ResizeObserver(function () {
        if (!t.w.isConnected) { t.ro.disconnect(); return; }
        if (t.baue()) t.zeige(t.daten, true);
      });
      this.ro.observe(this.liste);
    }
  }
  Tafel.prototype.plan = function () {
    var cs = getComputedStyle(this.w), zw = parseFloat(cs.getPropertyValue("--bw-zw")) || 20, zl = parseFloat(cs.getPropertyValue("--bw-zl")) || 2, zg = parseFloat(cs.getPropertyValue("--bw-zg")) || 10;
    var b = this.liste.clientWidth || this.w.clientWidth, pro = zw + zl;
    var sp = this.o.spalten.filter(function (s) { return !s.ab || b >= s.ab; });
    var fest = 0;
    sp.forEach(function (s) { if (!s.rest) fest += s.n * pro - zl; });
    var rest = 0;
    sp.forEach(function (s) { if (s.rest) rest = Math.max(s.min || 6, Math.floor((b - (sp.length - 1) * zg - fest + zl) / pro)); });
    return { sp: sp.map(function (s) { return { k: s.k, n: s.rest ? rest : s.n, def: s }; }), pro: pro, zl: zl, key: sp.map(function (s) { return s.k + (s.rest ? rest : s.n); }).join("/") + "/" + pro };
  };
  Tafel.prototype.baue = function () {
    var p = this.plan(), t = this;
    if (this.bau && this.bau.key === p.key) return false;
    this.liste.textContent = "";
    var zeilen = [];
    for (var r = 0; r < this.o.zeilen; r++) {
      var z = el(this.o.element || "div", "bw-tz"), gruppen = {};
      if ((this.o.element || "div") === "button") z.type = "button";
      p.sp.forEach(function (s) {
        var fg = el("span", "bw-fg bw-fg-" + s.k + (s.def.farbe ? " bw-fg-farbe" : "")), zs = [];
        fg.setAttribute("aria-hidden", "true");
        for (var i = 0; i < s.n; i++) { var ze = new Zelle(s.def.klasse || null); fg.appendChild(ze.el); zs.push(ze); }
        z.appendChild(fg); gruppen[s.k] = { zellen: zs, fg: fg };
      });
      (function (r, z) {
        if (t.o.hover) {
          z.addEventListener("mouseenter", function () { if (t.daten[r]) t.o.hover(t.daten[r], true); });
          z.addEventListener("mouseleave", function () { if (t.daten[r]) t.o.hover(t.daten[r], false); });
          z.addEventListener("focus", function () { if (t.daten[r]) t.o.hover(t.daten[r], true); });
          z.addEventListener("blur", function () { if (t.daten[r]) t.o.hover(t.daten[r], false); });
        }
      })(r, z);
      this.liste.appendChild(z); zeilen.push({ el: z, g: gruppen, attr: [] });
    }
    var titel = this.o.titel || {};
    this.kopf.innerHTML = p.sp.map(function (s) { return '<span style="width:' + (s.n * p.pro - p.zl) + 'px">' + (titel[s.k] || "") + "</span>"; }).join("");
    this.bau = { key: p.key, plan: p, zeilen: zeilen };
    return true;
  };
  Tafel.prototype.zeige = function (daten, sofort) {
    this.daten = daten || [];
    var p = this.bau.plan, t = this;
    this.bau.zeilen.forEach(function (z, r) {
      var d = t.daten[r], c = 0;
      z.attr.forEach(function (a) { z.el.removeAttribute(a); }); z.attr = [];
      if (d && d.attr) Object.keys(d.attr).forEach(function (a) { z.el.setAttribute(a, d.attr[a]); z.attr.push(a); });
      if (z.el.tagName === "A") { if (d && d.href) z.el.setAttribute("href", d.href); else z.el.removeAttribute("href"); }
      if (z.el.tagName === "BUTTON") z.el.disabled = !d || !d.attr;
      if (d && d.label) { z.el.setAttribute("aria-label", d.label); z.el.removeAttribute("aria-hidden"); z.el.removeAttribute("tabindex"); }
      else { z.el.removeAttribute("aria-label"); z.el.setAttribute("aria-hidden", "true"); z.el.setAttribute("tabindex", "-1"); }
      z.el.classList.toggle("leer", !d);
      p.sp.forEach(function (s) {
        var g = z.g[s.k], text = passe(d ? d[s.k] : "", s.n);
        if (s.def.farbe) g.fg.style.setProperty("--bw-blatt", (d && s.def.farbe(d)) || "");
        g.zellen.forEach(function (ze, i) {
          if (sofort) ze.sofort(text[i]); else ze.zu(text[i], r * 70 + c * 14 + Math.random() * 110);
          c++;
        });
      });
    });
  };

  /* ---------- Merken: Stern springt auf, Funken, Flug in die Merkliste ---------- */
  function funken(knopf) {
    if (ruhig() || !KANN_ANIM || !knopf) return;
    var svg = knopf.querySelector("svg");
    if (svg) anim(svg, [{ transform: "scale(.45) rotate(-20deg)" }, { transform: "none" }], { duration: F.huepf.d, easing: F.huepf.e });
    var r = knopf.getBoundingClientRect();
    if (!r.width) return;
    var lage = el("div", "bw-funken"); lage.setAttribute("aria-hidden", "true");
    lage.style.left = (r.left + r.width / 2) + "px"; lage.style.top = (r.top + r.height / 2) + "px";
    var ring = el("span", "bw-ring"); lage.appendChild(ring);
    doc.body.appendChild(lage);
    anim(ring, [{ opacity: .9, transform: "scale(.3)" }, { opacity: 0, transform: "scale(2)" }], { duration: 560, easing: "cubic-bezier(.1, .6, .3, 1)" });
    for (var n = 0; n < 8; n++) {
      var f = el("span", "bw-funke"); lage.appendChild(f);
      var w = n / 8 * Math.PI * 2 + Math.random() * .5, d = 20 + Math.random() * 12;
      anim(f, [{ transform: "translate(0, 0) scale(1)", opacity: 1 }, { transform: "translate(" + (Math.cos(w) * d).toFixed(1) + "px," + (Math.sin(w) * d).toFixed(1) + "px) scale(0)", opacity: 0 }],
        { duration: 520 + Math.random() * 180, easing: "cubic-bezier(.15, .7, .3, 1)" });
    }
    setTimeout(function () { lage.remove(); }, 900);
  }
  function flug(quelle, ziel, fertig) {
    fertig = fertig || noop;
    if (ruhig() || !KANN_ANIM || !quelle || !ziel) { fertig(); return; }
    var q = quelle.getBoundingClientRect(), z = ziel.getBoundingClientRect(), vh = root.innerHeight;
    if (!q.width || !z.width || z.bottom < 0 || z.top > vh || q.bottom < 0 || q.top > vh) { fertig(); return; }
    var g, bg = getComputedStyle(quelle).backgroundImage;
    if (bg && bg !== "none") { g = el("div", "bw-geist"); g.style.backgroundImage = bg; }
    else { g = quelle.cloneNode(true); g.removeAttribute("id"); Array.prototype.forEach.call(g.querySelectorAll("[id]"), function (x) { x.removeAttribute("id"); }); g.classList.add("bw-geist"); }
    g.setAttribute("aria-hidden", "true");
    var w = Math.min(q.width, 150), h = Math.min(q.height, 110);
    var x0 = q.left + q.width / 2 - w / 2, y0 = q.top + q.height / 2 - h / 2;
    g.style.left = x0 + "px"; g.style.top = y0 + "px"; g.style.width = w + "px"; g.style.height = h + "px";
    doc.body.appendChild(g);
    var dx = z.left + z.width / 2 - (x0 + w / 2), dy = z.top + z.height / 2 - (y0 + h / 2);
    var cx = dx * .3, cy = Math.min(dy, 0) - 90, ende = Math.max(.12, Math.min(.5, 28 / w)), frames = [];
    for (var n = 0; n <= 28; n++) {
      var t = n / 28, u = 1 - t, x = 2 * u * t * cx + t * t * dx, y = 2 * u * t * cy + t * t * dy;
      frames.push({ transform: "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) rotate(" + (-12 * Math.sin(t * Math.PI)).toFixed(1) + "deg) scale(" + (1 - (1 - ende) * t).toFixed(3) + ")", opacity: t > .82 ? 1 - (t - .82) / .18 * .7 : 1 });
    }
    anim(g, frames, { duration: 780, easing: "cubic-bezier(.45, 0, .2, 1)" }).finished.then(function () { g.remove(); fertig(); }, function () { g.remove(); fertig(); });
  }

  /* ---------- Neigen mit Lichtreflex (nur mit Maus) ---------- */
  var neigenSel = [], nZust = new Map(), nAkt = null, nLaeuft = false, nZeit = 0;
  function nZustand(e) {
    var s = nZust.get(e);
    if (!s) {
      var g = null;
      for (var i = 0; i < e.children.length; i++) if (e.children[i].classList.contains("bw-glanz")) g = e.children[i];
      if (!g) { g = el("span", "bw-glanz"); g.setAttribute("aria-hidden", "true"); e.appendChild(g); if (getComputedStyle(e).position === "static") e.style.position = "relative"; }
      s = { el: e, g: g, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, s: 1, vs: 0, ts: 1 };
      nZust.set(e, s);
    }
    return s;
  }
  function nLos() { if (!nLaeuft) { nLaeuft = true; nZeit = 0; requestAnimationFrame(nTick); } }
  function nTick(zeit) {
    var dt = nZeit ? Math.min((zeit - nZeit) / 1000, 1 / 30) : 1 / 60, aktiv = false; nZeit = zeit;
    nZust.forEach(function (c, e) {
      var ax = 170 * (c.tx - c.x) - 13 * c.vx, ay = 170 * (c.ty - c.y) - 13 * c.vy, as = 420 * (c.ts - c.s) - 26 * c.vs;
      c.vx += ax * dt; c.x += c.vx * dt; c.vy += ay * dt; c.y += c.vy * dt; c.vs += as * dt; c.s += c.vs * dt;
      var bewegt = Math.abs(c.tx - c.x) + Math.abs(c.ty - c.y) + Math.abs(c.vx) + Math.abs(c.vy) > .01 || Math.abs(c.ts - c.s) + Math.abs(c.vs) > .0004;
      if (!bewegt && c.tx === 0 && c.ty === 0 && c.ts === 1) { e.style.transform = ""; nZust.delete(e); return; }
      if (!e.isConnected) { nZust.delete(e); return; }
      if (bewegt) aktiv = true; else { c.x = c.tx; c.y = c.ty; c.s = c.ts; c.vx = c.vy = c.vs = 0; }
      e.style.transform = "perspective(1000px) rotateX(" + c.x.toFixed(2) + "deg) rotateY(" + c.y.toFixed(2) + "deg) scale(" + c.s.toFixed(4) + ")";
    });
    if (aktiv) requestAnimationFrame(nTick); else nLaeuft = false;
  }
  function nLoslassen(e) { var s = nZust.get(e); if (!s) return; s.tx = s.ty = 0; s.ts = 1; s.g.style.opacity = "0"; nLos(); }
  /* Bei verschachtelten Treffern (Karte in Kachel) neigt sich das innerste Element */
  function nTreffer(t) {
    if (!t || !t.closest) return null;
    var best = null;
    for (var i = 0; i < neigenSel.length; i++) { var e = t.closest(neigenSel[i]); if (e && (!best || best.contains(e))) best = e; }
    return best;
  }
  var nBereit = false;
  function neigen(sel) {
    neigenSel.push(sel);
    if (nBereit || !root.matchMedia || !root.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    nBereit = true;
    doc.addEventListener("pointermove", function (ev) {
      if (ruhig() || (ev.pointerType && ev.pointerType !== "mouse" && ev.pointerType !== "pen")) return;
      var e = nTreffer(ev.target);
      if (e !== nAkt) { if (nAkt) nLoslassen(nAkt); nAkt = e; }
      if (!e) return;
      var s = nZustand(e), r = e.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
      var mx = Math.max(.8, Math.min(5, 300 / r.height)), my = Math.max(.8, Math.min(5, 300 / r.width));
      s.tx = -(py - .5) * 2 * mx; s.ty = (px - .5) * 2 * my;
      s.g.style.setProperty("--bw-gx", (px * 100).toFixed(1) + "%"); s.g.style.setProperty("--bw-gy", (py * 100).toFixed(1) + "%"); s.g.style.opacity = "1";
      nLos();
    }, { passive: true });
    doc.addEventListener("pointerdown", function (ev) { var e = nTreffer(ev.target); if (e && !ruhig()) { nZustand(e).ts = .985; nLos(); } }, { passive: true });
    ["pointerup", "pointercancel"].forEach(function (t) { doc.addEventListener(t, function () { nZust.forEach(function (s) { s.ts = 1; }); nLos(); }, { passive: true }); });
    html.addEventListener("pointerleave", function () { if (nAkt) { nLoslassen(nAkt); nAkt = null; } });
    root.addEventListener("blur", function () { if (nAkt) { nLoslassen(nAkt); nAkt = null; } });
  }

  /* ---------- Zeitleiste beim Scrollen: Linie füllt sich, Tage rasten ein ---------- */
  /* o: { gruppe: Selektor, zahl: Selektor der Datumszahl, kopf: Anteil der Fensterhöhe } */
  function Leitlinie(o) {
    this.o = o; this.gr = []; this.akt = null; this.raf = 0; this.gemessen = 0; this.wurzel = null;
    var t = this;
    root.addEventListener("scroll", function () { if (t.wurzel && !t.raf) t.raf = requestAnimationFrame(function () { t.raf = 0; t.lauf(false); }); }, { passive: true });
    root.addEventListener("resize", function () { if (t.wurzel) { t.messe(); t.lauf(true); } });
    if (root.ResizeObserver) this.ro = new ResizeObserver(function () { if (t.wurzel) { t.messe(); t.lauf(true); } });
  }
  Leitlinie.prototype.neu = function (wurzel) {
    if (this.ro) this.ro.disconnect();
    this.wurzel = wurzel && wurzel.querySelector(this.o.gruppe) ? wurzel : null;
    this.akt = null; this.gr = [];
    if (!this.wurzel) return;
    if (this.ro) this.ro.observe(this.wurzel);
    this.messe(); this.lauf(true);
  };
  Leitlinie.prototype.messe = function () {
    if (!this.wurzel || !this.wurzel.isConnected) { this.wurzel = null; this.gr = []; return; }
    var y = root.scrollY, alt = {}, oben = null;
    this.gr.forEach(function (g) { alt[g.id] = g; });
    this.gr = Array.prototype.map.call(this.wurzel.querySelectorAll(this.o.gruppe), function (e, i) {
      if (oben == null) oben = parseFloat(getComputedStyle(e, "::before").top) || 0;
      var r = e.getBoundingClientRect(), a = alt[e.getAttribute("data-id") || e.getAttribute("data-woche") || i];
      return { el: e, id: e.getAttribute("data-id") || e.getAttribute("data-woche") || i, top: r.top + y, h: r.height, oben: oben, wert: a && a.el === e ? a.wert : -1, an: a && a.el === e ? a.an : null };
    });
    this.gemessen = Date.now();
  };
  Leitlinie.prototype.lauf = function (sofort) {
    if (!this.wurzel) return;
    if (!this.wurzel.isConnected) { this.wurzel = null; return; }
    if (Date.now() - this.gemessen > 900) this.messe();
    var kopf = root.scrollY + root.innerHeight * (this.o.kopf || .4), jetzt = null, t = this;
    this.gr.forEach(function (g) {
      var start = g.top + g.oben, ende = g.top + g.h, v = kopf <= start ? 0 : kopf >= ende ? 1 : (kopf - start) / Math.max(1, ende - start);
      if (Math.abs(v - g.wert) > .002) { g.wert = v; g.el.style.setProperty("--bw-ll", v.toFixed(3)); }
      var an = kopf >= g.top + 24;
      if (an) jetzt = g;
      if (an !== g.an) { g.an = an; g.el.classList.toggle("bw-ll-an", an); }
    });
    if (jetzt !== this.akt) {
      if (this.akt) this.akt.el.classList.remove("bw-ll-jetzt");
      this.akt = jetzt;
      if (jetzt) {
        jetzt.el.classList.add("bw-ll-jetzt");
        if (!sofort && !ruhig()) {
          var z = jetzt.el.querySelector(t.o.zahl);
          if (z) anim(z, [{ transform: "perspective(200px) rotateX(-88deg)", opacity: .2, easing: "cubic-bezier(.6, 0, 1, .6)" }, { transform: "perspective(200px) rotateX(0deg)", opacity: 1, offset: .45, easing: "cubic-bezier(0, .5, .5, 1)" },
            { transform: "perspective(200px) rotateX(14deg)", offset: .65, easing: "cubic-bezier(.5, 0, 1, .5)" }, { transform: "perspective(200px) rotateX(0deg)", offset: .82 }, { transform: "perspective(200px) rotateX(4deg)", offset: .91 }, { transform: "none" }],
            { duration: 560, easing: "linear" });
        }
      }
    }
  };

  /* ---------- Übergang Karte ↔ Detailansicht (View Transitions, sonst ohne) ---------- */
  function morph(alt, aendern, neuFn) {
    var namen = Object.keys(alt || {}).filter(function (n) { return alt[n] && alt[n].isConnected; });
    if (!doc.startViewTransition || ruhig() || !namen.length) { aendern(); return false; }
    var vh = root.innerHeight;
    namen = namen.filter(function (n) { var r = alt[n].getBoundingClientRect(); return r.width && r.bottom > 0 && r.top < vh; });
    if (!namen.length) { aendern(); return false; }
    html.classList.add("bw-morph");
    namen.forEach(function (n) { alt[n].style.viewTransitionName = n; });
    var neu = {}, vt;
    var aufraeumen = function () {
      html.classList.remove("bw-morph");
      namen.forEach(function (n) { if (alt[n]) alt[n].style.viewTransitionName = ""; });
      Object.keys(neu).forEach(function (n) { if (neu[n]) neu[n].style.viewTransitionName = ""; });
    };
    try {
      vt = doc.startViewTransition(function () {
        namen.forEach(function (n) { alt[n].style.viewTransitionName = ""; });
        aendern();
        var kandidat = neuFn ? neuFn() || {} : {};
        namen.forEach(function (n) {
          var e = kandidat[n]; if (!e) return;
          var r = e.getBoundingClientRect();
          if (!r.width || r.bottom < 0 || r.top > root.innerHeight) return;
          e.style.viewTransitionName = n; neu[n] = e;
        });
      });
    } catch (x) { aufraeumen(); aendern(); return false; }
    [vt.ready, vt.updateCallbackDone].forEach(function (p) { if (p && p.catch) p.catch(noop); });
    vt.finished.then(aufraeumen, aufraeumen);
    return true;
  }

  /* ---------- Kamerafahrt beim Bereichswechsel ---------- */
  function buchstaben(h) {
    if (!h || h.children.length || h.__bw) return;
    var text = h.textContent;
    if (!text || text.length > 60) return;
    h.__bw = true;
    h.setAttribute("aria-label", text);
    h.innerHTML = '<span class="bw-titel" aria-hidden="true">' + text.split(" ").map(function (w) {
      return '<span class="bw-w">' + w.split("").map(function (c) { return '<span class="bw-b">' + c.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</span>"; }).join("") + "</span>";
    }).join(" ") + "</span>";
    var b = h.querySelectorAll(".bw-b"), schritt = Math.min(34, 520 / Math.max(1, b.length));
    Array.prototype.forEach.call(b, function (s, i) {
      anim(s, [{ transform: "translateY(112%)" }, { transform: "none" }], { duration: F.weich.d, easing: F.weich.e, delay: 120 + i * schritt, fill: "backwards" });
    });
  }
  function kamera(o) {
    if (ruhig() || !KANN_ANIM) return;
    var dir = o.dir || 1;
    if (o.bild) anim(o.bild, [{ transform: "translateX(" + (dir * 7) + "%) scale(1.14)", filter: "blur(10px) brightness(1.3)", opacity: 0 }, { transform: "none", filter: "blur(0px) brightness(1)", opacity: 1 }],
      { duration: 1150, easing: "cubic-bezier(.16, .8, .2, 1)" });
    if (o.titel) buchstaben(o.titel);
    if (o.text) anim(o.text, [{ opacity: 0, transform: "translateX(" + (dir * 18) + "px)" }, { opacity: 1, transform: "none" }], { duration: F.weich.d, easing: F.weich.e, delay: 220, fill: "backwards" });
  }

  /* ---------- Sanftes Umsortieren beim Filtern (FLIP), Weggefallenes verblasst ---------- */
  function flipErfassen(wurzel, attr) {
    var m = {};
    if (ruhig() || !KANN_ANIM || !wurzel) return null;
    var vh = root.innerHeight;
    Array.prototype.forEach.call(wurzel.querySelectorAll("[" + attr + "]"), function (e) {
      var r = e.getBoundingClientRect();
      var pa = e.parentNode;
      m[e.getAttribute(attr)] = { r: r, el: e, sichtbar: r.bottom > -60 && r.top < vh + 60 && r.width > 0, blatt: !e.querySelector("[" + attr + "]"),
        pTag: pa && pa.tagName ? pa.tagName.toLowerCase() : "div", pKlasse: pa && pa.className && typeof pa.className === "string" ? pa.className : "" };
    });
    return m;
  }
  function flipAbspielen(wurzel, attr, vorher) {
    if (!vorher || !wurzel) return;
    var vh = root.innerHeight, neuN = 0, da = {}, n = 0;
    Array.prototype.forEach.call(wurzel.querySelectorAll("[" + attr + "]"), function (e) {
      var id = e.getAttribute(attr); da[id] = 1;
      if (n > 80) return;
      var a = vorher[id], b = e.getBoundingClientRect(), imBild = b.bottom > -80 && b.top < vh + 80;
      if (!imBild && !(a && a.sichtbar)) return;
      n++;
      if (a) {
        var dx = a.r.left - b.left, dy = Math.max(-vh, Math.min(vh, a.r.top - b.top));
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) anim(e, [{ transform: "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px)" }, { transform: "none" }], { duration: F.weich.d, easing: F.weich.e });
      } else if (imBild) {
        anim(e, [{ opacity: 0, transform: "translateY(14px) scale(.98)" }, { opacity: 1, transform: "none" }], { duration: F.weich.d, easing: F.weich.e, delay: Math.min(neuN++ * 40, 320), fill: "backwards" });
      }
    });
    var g = 0;
    Object.keys(vorher).forEach(function (id) {
      var a = vorher[id];
      if (da[id] || !a.sichtbar || !a.blatt || g >= 14 || a.el.isConnected) return;
      g++;
      /* Im Elterntyp verpackt, damit die Kartenstile weiter greifen */
      var geist = el(a.pTag, a.pKlasse);
      geist.classList.add("bw-weg");
      geist.setAttribute("aria-hidden", "true");
      geist.style.left = a.r.left + "px"; geist.style.top = a.r.top + "px"; geist.style.width = a.r.width + "px"; geist.style.height = a.r.height + "px";
      a.el.style.margin = "0";
      geist.appendChild(a.el);
      doc.body.appendChild(geist);
      anim(geist, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.95) translateY(-6px)" }], { duration: 240, easing: "cubic-bezier(.4, 0, 1, 1)", fill: "forwards" })
        .finished.then(function () { geist.remove(); }, function () { geist.remove(); });
    });
  }
  function flip(wurzel, attr, aendern) {
    var v = flipErfassen(wurzel, attr);
    aendern();
    flipAbspielen(wurzel, attr, v);
  }

  root.Bewegung = {
    ruhig: ruhig, F: F, anim: anim, stoss: stoss, gleite: gleite, zahl: zahl, rolle: rolle, Tafel: Tafel, funken: funken, flug: flug,
    neigen: neigen, Leitlinie: Leitlinie, morph: morph, kamera: kamera, buchstaben: buchstaben, flip: flip, flipErfassen: flipErfassen, flipAbspielen: flipAbspielen
  };
})(window);
