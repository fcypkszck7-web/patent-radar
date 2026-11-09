/* Materialbilder je Thema: im Browser erzeugte SVG-Flächen – Dachziegel, Solarmodule, Kupferrohre,
   Riffelblech, Stehfalz mit Schnee, Trapezblech, Gründach, Zinkblumen. Keine Fotos, keine externen Dateien.
   Motiv.svg(thema, schluessel) liefert ein dekoratives <svg>; der Schlüssel variiert das Bild stabil.
   Motiv.bandStile() liefert CSS-Klassen .mb-<thema> mit dem Bild als Hintergrund (einmal erzeugt, von allen Karten geteilt). */
(function (root) {
  "use strict";
  var W = 640, H = 200, zaehler = 0;

  function rng(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () {
      h += 0x6D2B79F5; var t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function f(n) { return Math.round(n * 10) / 10; }
  function lin(id, stops, x2, y2) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (x2 == null ? 0 : x2) + '" y2="' + (y2 == null ? 1 : y2) + '">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : "") + "/>"; }).join("") + "</linearGradient>";
  }
  /* Filmkorn, Lichtkante und Vignette */
  function licht(id, z, staerke) {
    return {
      defs: '<filter id="' + id + 'Lk" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="' + Math.floor(z() * 99) + '"/><feColorMatrix type="saturate" values="0"/></filter>' +
        '<radialGradient id="' + id + 'Lv" cx=".5" cy=".42" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>' +
        lin(id + "Lg", [[0, "#fff", .22 * (staerke || 1)], [.45, "#fff", 0]], 1, .8),
      ueber: '<rect width="' + W + '" height="' + H + '" fill="url(#' + id + 'Lg)"/>' +
        '<rect width="' + W + '" height="' + H + '" filter="url(#' + id + 'Lk)" opacity=".11" style="mix-blend-mode:overlay"/>' +
        '<rect width="' + W + '" height="' + H + '" fill="url(#' + id + 'Lv)"/>'
    };
  }

  /* Dachdeckung: Biberschwanz-Ziegel, versetzt gedeckt */
  function dach(id, z) {
    var d = "", s = "", tw = 34, sch = 21;
    for (var k = 0; k < 6; k++) {
      var l = 34 + z() * 12, h = 12 + z() * 8;
      d += lin(id + "z" + k, [[0, "hsl(" + f(h) + ",58%," + f(l + 8) + "%)"], [.7, "hsl(" + f(h) + ",56%," + f(l) + "%)"], [1, "hsl(" + f(h - 3) + ",55%," + f(l - 9) + "%)"]]);
    }
    for (var r = Math.ceil((H + 10) / sch); r >= -2; r--) {
      var y = r * sch, ver = (Math.abs(r) % 2 ? tw / 2 : 0) - 6;
      for (var x = -tw + ver; x < W + tw; x += tw) {
        var p = "M" + f(x + 1) + "," + f(y) + "h" + (tw - 2) + "v27a" + f((tw - 2) / 2) + ",15 0 0 1 -" + (tw - 2) + ",0z";
        s += '<path d="' + p + '" fill="#2a120a" opacity=".55" transform="translate(0,3)"/><path d="' + p + '" fill="url(#' + id + "z" + Math.floor(z() * 6) + ')"/>';
      }
    }
    return { grund: "#5a2614", defs: d, inhalt: s };
  }

  /* Solar: monokristalline Module mit Busbars, Alurahmen und Himmelsspiegelung */
  function solar(id, z) {
    var c = 27, defs = lin(id + "c", [[0, "#22386e"], [1, "#0d1838"]]) +
      '<pattern id="' + id + 'p" width="' + c + '" height="' + c + '" patternUnits="userSpaceOnUse">' +
      '<path d="M4,1h' + (c - 9) + 'l3,3v' + (c - 9) + 'l-3,3h-' + (c - 9) + 'l-3,-3v-' + (c - 9) + 'z" fill="url(#' + id + 'c)"/>' +
      [8, 13.5, 19].map(function (x) { return '<rect x="' + x + '" y="1" width=".7" height="' + (c - 2) + '" fill="#b8c3d6" opacity=".55"/>'; }).join("") +
      '<rect x="1" y="9" width="' + (c - 2) + '" height=".35" fill="#8fa0bd" opacity=".35"/><rect x="1" y="18" width="' + (c - 2) + '" height=".35" fill="#8fa0bd" opacity=".35"/></pattern>' +
      lin(id + "r", [[0, "#e6eaef"], [.5, "#9aa3ad"], [1, "#d3d8de"]]) +
      lin(id + "h", [[0, "#cfe0ff", .55], [.35, "#9cb9ef", .12], [.6, "#fff", 0]], 1, 1);
    var s = '<rect width="' + W + '" height="' + H + '" fill="url(#' + id + 'r)"/>', mw = c * 6 + 2, mh = c * 4 + 2, ox = -Math.floor(z() * c * 3);
    for (var my = -40; my < H; my += mh + 8) for (var mx = ox; mx < W; mx += mw + 8) {
      s += '<rect x="' + mx + '" y="' + my + '" width="' + mw + '" height="' + mh + '" fill="#0a1229"/><rect x="' + (mx + 1) + '" y="' + (my + 1) + '" width="' + (mw - 2) + '" height="' + (mh - 2) + '" fill="url(#' + id + 'p)"/>';
    }
    s += '<path d="M' + f(W * (.2 + z() * .2)) + ',0 L' + W + ',0 L' + W + ',' + H + ' L' + f(W * (.55 + z() * .2)) + ',' + H + 'z" fill="url(#' + id + 'h)"/>';
    return { grund: "#0d1838", defs: defs, inhalt: s, lichtStaerke: .6 };
  }

  /* Dachentwässerung: Kupferrohre mit Schellen vor dunkler Wand */
  function rohre(id, z) {
    var defs = lin(id + "k", [[0, "#5a2d12"], [.18, "#b8733d"], [.32, "#f2c19a"], [.45, "#c9824a"], [.8, "#7a3e19"], [1, "#3e1d0a"]]) +
      lin(id + "s", [[0, "#6c737a"], [.35, "#eef1f3"], [.6, "#a5adb4"], [1, "#4b5157"]]) +
      lin(id + "w", [[0, "#2a3138"], [1, "#1a1f24"]]);
    var s = '<rect width="' + W + '" height="' + H + '" fill="url(#' + id + 'w)"/>', y = 18 + z() * 10;
    while (y < H - 10) {
      var d = 14 + Math.floor(z() * 18);
      s += '<rect x="0" y="' + f(y + d * .55) + '" width="' + W + '" height="' + f(d * .7) + '" fill="#000" opacity=".35"/>';
      s += '<rect x="0" y="' + f(y) + '" width="' + W + '" height="' + d + '" fill="url(#' + id + 'k)"/>';
      for (var x = 40 + z() * 120; x < W; x += 150 + z() * 60) {
        s += '<rect x="' + f(x) + '" y="' + f(y - 4) + '" width="9" height="' + (d + 8) + '" rx="2" fill="url(#' + id + 's)"/><rect x="' + f(x + 2.5) + '" y="' + f(y - 9) + '" width="4" height="6" fill="#596068"/>';
      }
      y += d + 16 + z() * 10;
    }
    return { grund: "#1a1f24", defs: defs, inhalt: s, lichtStaerke: .6 };
  }

  /* Dachsicherheit: Riffelblech wie auf Laufrosten und Tritten */
  function riffel(id, z) {
    var g = 26, defs = lin(id + "g", [[0, "#7f8892"], [.5, "#c4cbd2"], [1, "#6e7781"]], 1, .4) +
      lin(id + "t", [[0, "#f3f6f8"], [.5, "#aeb6be"], [1, "#4f5760"]]) +
      '<pattern id="' + id + 'p" width="' + g + '" height="' + g + '" patternUnits="userSpaceOnUse">' +
      '<g transform="translate(' + g / 4 + ',' + g / 4 + ') rotate(45)"><ellipse rx="8" ry="2.4" cy="1.6" fill="#2f353b" opacity=".55"/><ellipse rx="8" ry="2.4" fill="url(#' + id + 't)"/></g>' +
      '<g transform="translate(' + 3 * g / 4 + ',' + 3 * g / 4 + ') rotate(-45)"><ellipse rx="8" ry="2.4" cy="1.6" fill="#2f353b" opacity=".55"/><ellipse rx="8" ry="2.4" fill="url(#' + id + 't)"/></g></pattern>' +
      '<filter id="' + id + 'b" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".003 .7" numOctaves="2" seed="' + Math.floor(z() * 99) + '"/><feColorMatrix type="saturate" values="0"/></filter>';
    var s = '<rect width="' + W + '" height="' + H + '" fill="url(#' + id + 'g)"/>' +
      '<rect width="' + W + '" height="' + H + '" filter="url(#' + id + 'b)" opacity=".22" style="mix-blend-mode:overlay"/>' +
      '<rect x="-' + Math.floor(z() * g) + '" width="' + (W + g) + '" height="' + H + '" fill="url(#' + id + 'p)"/>';
    return { grund: "#8b949d", defs: defs, inhalt: s };
  }

  /* Schneeschutz: Stehfalzdach unter Schnee, davor zwei Schneefangrohre */
  function schnee(id, z) {
    var b = 46, defs = '<pattern id="' + id + 'p" width="' + b + '" height="' + H + '" patternUnits="userSpaceOnUse"><rect width="' + b + '" height="' + H + '" fill="#454e57"/>' +
      '<rect width="3" height="' + H + '" fill="#9aa4ad"/><rect x="3" width="2.4" height="' + H + '" fill="#1d2329"/><rect x="5.4" width="14" height="' + H + '" fill="#3c444c"/></pattern>' +
      lin(id + "s", [[0, "#ffffff"], [.55, "#eef4f9"], [1, "#c9d8e6"]]) +
      lin(id + "r", [[0, "#4c545c"], [.3, "#eef2f5"], [.55, "#a3acb4"], [1, "#363c42"]]);
    var s = '<rect x="-' + Math.floor(z() * b) + '" width="' + (W + b) + '" height="' + H + '" fill="url(#' + id + 'p)"/>';
    var yS = 66 + z() * 18, p = "M0,0H" + W + "V" + f(yS);
    for (var x = W; x >= -32; x -= 32) p += "L" + f(Math.max(0, x)) + "," + f(yS + Math.sin(x / 47 + z() * 2) * 8 + z() * 6);
    p += "Z";
    s += '<path d="' + p + '" fill="#0b1015" opacity=".35" transform="translate(0,6)"/><path d="' + p + '" fill="url(#' + id + 's)"/>';
    var yR = yS + 48, ox = 18 - Math.floor(z() * b);
    for (var hx = ox; hx < W; hx += b * 2) s += '<rect x="' + hx + '" y="' + f(yR - 16) + '" width="7" height="38" rx="2" fill="#262c31"/><rect x="' + (hx + 1.5) + '" y="' + f(yR - 16) + '" width="2" height="38" fill="#c6ced5" opacity=".55"/>';
    [0, 15].forEach(function (dy) {
      s += '<rect x="0" y="' + f(yR + dy + 4) + '" width="' + W + '" height="7" fill="#000" opacity=".35"/><rect x="0" y="' + f(yR + dy) + '" width="' + W + '" height="7" rx="3.5" fill="url(#' + id + 'r)"/>';
    });
    s += '<path d="M0,' + f(yR + 1) + "Q" + f(W * .3) + "," + f(yR - 5) + " " + f(W * .55) + "," + f(yR - 1) + "T" + W + "," + f(yR - 2) + "V" + f(yR + 2.5) + 'H0Z" fill="#f4f8fb" opacity=".92"/>';
    for (var i = 0; i < 46; i++) s += '<circle cx="' + f(z() * W) + '" cy="' + f(z() * H) + '" r="' + f(.6 + z() * 1.5) + '" fill="#fff" opacity="' + f(.25 + z() * .5) + '"/>';
    return { grund: "#454e57", defs: defs, inhalt: s, lichtStaerke: .8 };
  }

  /* Dachzubehör und Anschlüsse: Trapezblech mit Befestigern */
  function trapez(id, z) {
    var b = 44, defs = '<pattern id="' + id + 'p" width="' + b + '" height="' + H + '" patternUnits="userSpaceOnUse">' +
      '<rect width="' + b + '" height="' + H + '" fill="#8a949e"/><rect x="0" width="10" height="' + H + '" fill="#dfe4e9"/>' +
      '<rect x="10" width="6" height="' + H + '" fill="#59626b"/><rect x="16" width="22" height="' + H + '" fill="#9aa4ad"/><rect x="38" width="6" height="' + H + '" fill="#c3cad1"/></pattern>' +
      lin(id + "g", [[0, "#fff", .25], [.5, "#000", .15], [1, "#fff", .1]], 1, 0) +
      '<filter id="' + id + 'b" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9 .004" numOctaves="2" seed="' + Math.floor(z() * 99) + '"/><feColorMatrix type="saturate" values="0"/></filter>';
    var s = '<rect x="-' + Math.floor(z() * b) + '" width="' + (W + b) + '" height="' + H + '" fill="url(#' + id + 'p)"/>' +
      '<rect width="' + W + '" height="' + H + '" filter="url(#' + id + 'b)" opacity=".2" style="mix-blend-mode:overlay"/>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#' + id + 'g)"/>';
    for (var x = 30 + z() * 60; x < W; x += 180 + z() * 80) for (var y = 26; y < H; y += 74) s += '<circle cx="' + f(Math.round(x / b) * b + 3) + '" cy="' + y + '" r="2.4" fill="#4a5259"/><circle cx="' + f(Math.round(x / b) * b + 3) + '" cy="' + (y - .6) + '" r="1.6" fill="#e9edf0"/>';
    return { grund: "#8a949e", defs: defs, inhalt: s };
  }

  /* Gründach: Sedum-Polster auf Substrat */
  function gruen(id, z) {
    var pw = 160, ph = 120, ros = "", k;
    function rosette(cx, cy, r, farbe, hell, drehung) {
      var o = "";
      for (var a = 0; a < 7; a++) {
        var w = a / 7 * 6.2832 + drehung, ex = cx + Math.cos(w) * r * .62, ey = cy + Math.sin(w) * r * .62;
        o += '<ellipse cx="' + f(ex) + '" cy="' + f(ey) + '" rx="' + f(r * .6) + '" ry="' + f(r * .36) + '" transform="rotate(' + f(w * 57.3) + " " + f(ex) + " " + f(ey) + ')" fill="' + farbe + '"/>';
      }
      return o + '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r * .38) + '" fill="' + hell + '"/>';
    }
    for (k = 0; k < 64; k++) {
      var cx = z() * pw, cy = z() * ph, r = 5 + z() * 5, hue = z() < .18 ? 18 + z() * 20 : 80 + z() * 45, l = 28 + z() * 22, dr = z() * .9;
      var farbe = "hsl(" + f(hue) + "," + f(38 + z() * 25) + "%," + f(l) + "%)", hell = "hsl(" + f(hue) + "," + f(45 + z() * 20) + "%," + f(l + 16) + "%)";
      /* am Kachelrand auch gegenüber zeichnen, damit keine Nähte entstehen */
      [-pw, 0, pw].forEach(function (dx) {
        [-ph, 0, ph].forEach(function (dy) {
          var x = cx + dx, y = cy + dy;
          if (x > -2 * r && x < pw + 2 * r && y > -2 * r && y < ph + 2 * r) ros += rosette(x, y, r, farbe, hell, dr);
        });
      });
    }
    var defs = '<pattern id="' + id + 'p" width="' + pw + '" height="' + ph + '" patternUnits="userSpaceOnUse"><rect width="' + pw + '" height="' + ph + '" fill="#3b2c1f"/>' + ros + "</pattern>" +
      '<filter id="' + id + 'n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" seed="' + Math.floor(z() * 99) + '"/><feColorMatrix type="matrix" values="0 0 0 0 .1  0 0 0 0 .25  0 0 0 0 .05  0 0 0 1.3 -.35"/></filter>';
    var s = '<rect x="-' + Math.floor(z() * pw) + '" y="-' + Math.floor(z() * ph) + '" width="' + (W + pw) + '" height="' + (H + ph) + '" fill="url(#' + id + 'p)"/>' +
      '<rect width="' + W + '" height="' + H + '" filter="url(#' + id + 'n)" opacity=".55"/>';
    return { grund: "#2f3a1c", defs: defs, inhalt: s, lichtStaerke: .7 };
  }

  /* Werkstoffe und Fertigung: feuerverzinkte Oberfläche mit Zinkblumen */
  function zink(id, z) {
    var nx = 17, ny = 6, cw = W / (nx - 2), ch = H / (ny - 2), pkt = [], i, j, s = "";
    for (j = 0; j < ny + 1; j++) { pkt.push([]); for (i = 0; i < nx + 1; i++) pkt[j].push([(i - 1) * cw + (z() - .5) * cw * .8, (j - 1) * ch + (z() - .5) * ch * .8]); }
    for (j = 0; j < ny; j++) for (i = 0; i < nx; i++) {
      var a = pkt[j][i], b = pkt[j][i + 1], c = pkt[j + 1][i + 1], d = pkt[j + 1][i];
      var l = 58 + z() * 26, mx = (a[0] + b[0] + c[0] + d[0]) / 4, my = (a[1] + b[1] + c[1] + d[1]) / 4;
      s += '<path d="M' + f(a[0]) + "," + f(a[1]) + "L" + f(b[0]) + "," + f(b[1]) + "L" + f(c[0]) + "," + f(c[1]) + "L" + f(d[0]) + "," + f(d[1]) + 'Z" fill="hsl(206,7%,' + f(l) + '%)" stroke="hsl(206,8%,' + f(l + 12) + '%)" stroke-width=".8"/>';
      var w = z() * 3.1416, len = 6 + z() * 12;
      for (var k = -2; k <= 2; k++) {
        var ox = Math.cos(w + 1.57) * k * 3.2, oy = Math.sin(w + 1.57) * k * 3.2;
        s += '<path d="M' + f(mx + ox - Math.cos(w) * len) + "," + f(my + oy - Math.sin(w) * len) + "L" + f(mx + ox + Math.cos(w) * len) + "," + f(my + oy + Math.sin(w) * len) + '" stroke="hsl(206,8%,' + f(l + (k % 2 ? 9 : -7)) + '%)" stroke-width=".9" opacity=".55"/>';
      }
    }
    var defs = lin(id + "g", [[0, "#fff", .18], [.5, "#000", .08], [1, "#fff", .12]], 1, .3);
    s += '<rect width="' + W + '" height="' + H + '" fill="url(#' + id + 'g)"/>';
    return { grund: "#9aa2a8", defs: defs, inhalt: s, lichtStaerke: .9 };
  }

  /* Ohne Thema: Blaupause mit Raster */
  function blaupause(id, z) {
    var defs = '<pattern id="' + id + 'r" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10,0H0V10" fill="none" stroke="#fff" stroke-width=".4" opacity=".14"/></pattern>' +
      '<pattern id="' + id + 'R" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50,0H0V50" fill="none" stroke="#fff" stroke-width=".7" opacity=".2"/></pattern>';
    var ox = 60 + Math.floor(z() * 260), b = 220, st = 'fill="none" stroke="#e8f0ff" stroke-width="1.3" opacity=".85"';
    var s = '<rect width="' + W + '" height="' + H + '" fill="#1c4f86"/><rect width="' + W + '" height="' + H + '" fill="url(#' + id + 'r)"/><rect width="' + W + '" height="' + H + '" fill="url(#' + id + 'R)"/>' +
      '<path d="M' + ox + ',170V95L' + (ox + b / 2) + ',38L' + (ox + b) + ',95V170Z" ' + st + "/>" +
      '<path d="M' + (ox - 14) + ',102L' + (ox + b / 2) + ',30L' + (ox + b + 14) + ',102" ' + st + "/>";
    return { grund: "#1c4f86", defs: defs, inhalt: s, lichtStaerke: .6 };
  }

  var MOTIVE = {
    entwaesserung: rohre, sicherheit: riffel, schneeschutz: schnee, solar: solar,
    zubehoer: trapez, gruendach: gruen, werkstoffe: zink, deckung: dach
  };

  function svg(thema, schluessel) {
    var id = "mo" + (++zaehler), z = rng((thema || "") + "|" + (schluessel || ""));
    var m = (MOTIVE[thema] || blaupause)(id, z), l = licht(id, z, m.lichtStaerke);
    return '<svg class="motiv" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" style="background:' + m.grund + '">' +
      "<defs>" + m.defs + l.defs + "</defs>" + m.inhalt + l.ueber + "</svg>";
  }
  function datenUrl(thema) {
    var id = "mb" + (++zaehler), z = rng((thema || "") + "|band");
    var m = (MOTIVE[thema] || blaupause)(id, z), l = licht(id, z, m.lichtStaerke);
    var t = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid slice"><defs>' + m.defs + l.defs + '</defs><rect width="' + W + '" height="' + H + '" fill="' + m.grund + '"/>' + m.inhalt + l.ueber + "</svg>";
    return 'url("data:image/svg+xml,' + encodeURIComponent(t).replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29") + '")';
  }
  function bandStile() {
    return Object.keys(MOTIVE).map(function (t) { return ".mb-" + t + "{background-image:" + datenUrl(t) + "}"; }).join("\n") + "\n.mb-x{background-image:" + datenUrl("") + "}";
  }

  root.Motiv = { svg: svg, bandStile: bandStile, themen: Object.keys(MOTIVE) };
})(window);
