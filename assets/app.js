/* Patent-Radar Bau & Dach – Anwendung. Statisch, ohne externe Abrufe, ohne Cookies. */
(function () {
  "use strict";

  var THEMEN = [
    { key: "entwaesserung", name: "Dachentwässerung", kurz: "Rinnen, Rinnenhalter, Fallrohre, Laubschutz, Flachdach- und Notentwässerung" },
    { key: "schneeschutz", name: "Schneeschutz", kurz: "Schneefang, Schneefanggitter, Schneestopper" },
    { key: "solar", name: "Solar auf dem Dach", kurz: "Befestigung und Montagesysteme, auch mit Schneeschutz" },
    { key: "sicherheit", name: "Dachsicherheit", kurz: "Dachtritte, Laufanlagen, Sicherheitsdachhaken, Absturzsicherung, Anschlagpunkte" },
    { key: "deckung", name: "Dachdeckung und Abdichtung", kurz: "Steil-, Flach- und Metalldach, Bahnen, Unterkonstruktion" },
    { key: "zubehoer", name: "Dachzubehör und Anschlüsse", kurz: "Durchführungen, Lüftung, Kamin- und Wandanschlüsse, Blitzschutz" },
    { key: "gruendach", name: "Gründach, Regenwasser und Dämmung", kurz: "Begrünung, Regenwassernutzung, Dämmung" },
    { key: "werkstoffe", name: "Werkstoffe und Fertigung", kurz: "Bleche, Beschichtungen, Umform- und Fügeverfahren mit Dachbezug" }
  ];
  var THEMA = {};
  THEMEN.forEach(function (t) { THEMA[t.key] = t; });
  var ARTEN = ["Offenlegung", "Erteilung", "Gebrauchsmuster", "Internationale Anmeldung"];
  var AEMTER = { DE: "Deutschland (DPMA)", EP: "Europa (EPA)", WO: "International (PCT)" };
  var MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  var MONATE_LANG = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

  var D = { radar: null, news: [], berichte: [], byId: {} };
  var main = document.getElementById("inhalt");
  var reduziert = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Hilfen ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function datum(iso) {
    if (!iso) return "–";
    var p = String(iso).split("-");
    if (p.length < 3) return esc(iso);
    return p[2] + "." + p[1] + "." + p[0];
  }
  function heute() {
    var s = (D.radar && D.radar.heute) || null;
    var d = new Date();
    var lokal = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    return lokal > (s || "") ? lokal : s;
  }
  function tageBis(iso) {
    var a = new Date(heute() + "T00:00:00Z"), b = new Date(iso + "T00:00:00Z");
    return Math.round((b - a) / 86400000);
  }
  function fristKlasse(e) {
    if (!e.einspruch_bis) return "";
    var t = tageBis(e.einspruch_bis);
    if (t < 0) return "abgelaufen";
    if (t < 30) return "unter-30";
    if (t < 90) return "unter-90";
    return "";
  }
  function fristLaeuft(e) { return !!e.einspruch_bis && tageBis(e.einspruch_bis) >= 0; }
  function themaName(k) { return (THEMA[k] && THEMA[k].name) || k || "–"; }
  function themaStil(k) { return "--themafarbe: var(--t-" + (THEMA[k] ? k : "deckung") + ")"; }
  function relRang(r) { return r === "hoch" ? 0 : 1; }
  function plural(n, a, b) { return n === 1 ? a : b; }
  function kw(isoDatum) {
    var d = new Date(isoDatum + "T00:00:00Z");
    var tag = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - tag + 3);
    var j = d.getUTCFullYear();
    var erster = new Date(Date.UTC(j, 0, 4));
    var w = 1 + Math.round(((d - erster) / 86400000 - 3 + ((erster.getUTCDay() + 6) % 7)) / 7);
    return { woche: w, jahr: j };
  }
  function toast(text) {
    var t = document.querySelector(".toast");
    t.textContent = text; t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, 2600);
  }
  var ICON = {
    merken: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h12v17l-6-4.2-6 4.2z"/></svg>',
    teilen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/></svg>',
    export: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5M4.5 16.5v3h15v-3"/></svg>',
    druck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3.5h10V8M7 17H4.5V9.5h15V17H17"/><path d="M7 14h10v6.5H7z"/></svg>',
    suche: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>',
    zurueck: '<svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M14.5 6 8.5 12l6 6"/></svg>'
  };

  /* ---------- Merkliste (nur im eigenen Browser) ---------- */
  var Merk = {
    ids: [],
    laden: function () { try { this.ids = JSON.parse(localStorage.getItem("pr-merkliste") || "[]") || []; } catch (e) { this.ids = []; } },
    speichern: function () { try { localStorage.setItem("pr-merkliste", JSON.stringify(this.ids)); } catch (e) {} },
    hat: function (id) { return this.ids.indexOf(id) >= 0; },
    umschalten: function (id) {
      var i = this.ids.indexOf(id);
      if (i >= 0) this.ids.splice(i, 1); else this.ids.push(id);
      this.speichern(); this.zaehler();
      return i < 0;
    },
    zaehler: function () {
      var z = document.querySelector(".merk-zahl");
      if (z) z.textContent = this.ids.length;
    }
  };

  /* ---------- Thema (hell/dunkel) ---------- */
  document.getElementById("thema-schalter").addEventListener("click", function () {
    var root = document.documentElement;
    var aktuell = root.getAttribute("data-theme");
    if (!aktuell) aktuell = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    var neu = aktuell === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", neu);
    try { localStorage.setItem("pr-theme", neu); } catch (e) {}
  });

  /* ---------- Routing ---------- */
  function route() {
    var h = location.hash.replace(/^#\/?/, "");
    var teile = h.split("?");
    var pfad = teile[0].split("/").filter(Boolean).map(decodeURIComponent);
    var params = new URLSearchParams(teile[1] || "");
    return { name: pfad[0] || "uebersicht", arg: pfad[1] || null, params: params };
  }
  function setzeNav(name) {
    var n = name === "eintrag" ? "schutzrechte" : name;
    document.querySelectorAll("[data-route]").forEach(function (a) {
      if (a.getAttribute("data-route") === n) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }
  function hashMit(name, params) {
    var q = params.toString();
    return "#/" + name + (q ? "?" + q : "");
  }

  var ANSICHTEN = {
    uebersicht: uebersicht, schutzrechte: schutzrechte, eintrag: eintrag, fristen: fristen,
    anmelder: anmelder, news: news, berichte: berichte, hinweise: hinweise, merkliste: merkliste
  };
  var letzteRoute = "";
  function zeichnen(fokus) {
    var r = route();
    var fn = ANSICHTEN[r.name] || nichtGefunden;
    setzeNav(r.name);
    main.innerHTML = '<div class="seite einblenden">' + fn(r) + "</div>";
    document.title = (fn.titel ? fn.titel(r) + " – " : "") + "Patent-Radar Bau & Dach";
    if (fn.danach) fn.danach(r);
    binden();
    var schluessel = r.name + "/" + (r.arg || "");
    if (fokus && schluessel !== letzteRoute) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
    letzteRoute = schluessel;
  }
  window.addEventListener("hashchange", function () { zeichnen(true); });

  /* ---------- Bausteine ---------- */
  function karte(e, opt) {
    opt = opt || {};
    var fk = fristKlasse(e);
    var frist = e.einspruch_bis ? '<span class="frist ' + fk + '">Einspruch bis ' + datum(e.einspruch_bis) + (fk === "abgelaufen" ? " (abgelaufen)" : "") + "</span>" : "";
    var merk = Merk.hat(e.id);
    return '<li class="karte" style="' + themaStil(e.thema) + '">' +
      '<div class="karte-oben"><span class="art-marke">' + esc(e.art) + "</span>" +
      '<span class="nummer">' + esc(e.nummer) + "</span>" +
      "<span>" + datum(e.veroeffentlicht) + "</span>" +
      (e.neu_erteilt ? '<span class="etikett neu-erteilt">neu erteilt</span>' : "") +
      (opt.neuMarke && e.neu ? '<span class="etikett neu">neu</span>' : "") + "</div>" +
      '<h3><a href="#/eintrag/' + encodeURIComponent(e.id) + '">' + esc(e.titel) + "</a></h3>" +
      (opt.kompakt ? "" : '<p class="original">' + esc(e.titel_original) + "</p>") +
      (opt.kompakt ? "" : '<p class="neu-text">' + esc(e.was_neu) + "</p>") +
      '<div class="karte-unten"><span class="thema-marke" style="' + themaStil(e.thema) + '">' + esc(themaName(e.thema)) + "</span>" +
      '<span class="relevanz ' + esc(e.relevanz) + '">Relevanz ' + esc(e.relevanz) + "</span>" +
      "<span>" + esc((e.anmelder || []).join(", ")) + "</span>" + frist +
      '<button type="button" class="knopf klein merken" data-merken="' + esc(e.id) + '" aria-pressed="' + merk + '" aria-label="' + (merk ? "Von der Merkliste entfernen" : "Auf die Merkliste") + '">' + ICON.merken + "<span>" + (merk ? "Gemerkt" : "Merken") + "</span></button>" +
      "</div></li>";
  }
  function leer(titel, text) {
    return '<div class="leer"><strong>' + esc(titel) + "</strong>" + (text ? esc(text) : "") + "</div>";
  }
  function kennzahlBlock(werte) {
    return '<div class="kennzahlen">' + werte.map(function (w) {
      var inner = '<div class="kennzahl-wert zahl" data-zaehlen="' + w.wert + '">' + w.wert + '</div><div class="kennzahl-name">' + esc(w.name) + "</div>";
      return '<div class="kennzahl">' + (w.link ? '<a href="' + w.link + '">' + inner + "</a>" : inner) + "</div>";
    }).join("") + "</div>";
  }
  function zaehlen() {
    if (reduziert) return;
    document.querySelectorAll("[data-zaehlen]").forEach(function (el) {
      var ziel = parseInt(el.getAttribute("data-zaehlen"), 10) || 0;
      if (ziel < 2) return;
      var start = performance.now(), dauer = 650;
      function schritt(t) {
        var p = Math.min(1, (t - start) / dauer);
        el.textContent = Math.round(ziel * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(schritt);
      }
      el.textContent = "0";
      requestAnimationFrame(schritt);
    });
  }

  /* ---------- Übersicht ---------- */
  function uebersicht() {
    var R = D.radar, alle = R.eintraege;
    var lauf = R.lauf || {};
    var w = kw(lauf.datum || R.stand);
    var neu = alle.filter(function (e) { return e.neu; }).sort(function (a, b) {
      return relRang(a.relevanz) - relRang(b.relevanz) || (b.punkte || 0) - (a.punkte || 0) || String(b.veroeffentlicht).localeCompare(a.veroeffentlicht);
    });
    var laufend = alle.filter(fristLaeuft).sort(function (a, b) { return a.einspruch_bis.localeCompare(b.einspruch_bis); });
    var bald = laufend.slice(0, 6);
    var erteilt = alle.filter(function (e) { return e.art === "Erteilung"; }).length;
    var gm = alle.filter(function (e) { return e.art === "Gebrauchsmuster"; }).length;
    var neuErteilt = neu.filter(function (e) { return e.art === "Erteilung"; }).length;

    var satz;
    if (lauf.art === "erstbefuellung") {
      satz = "Erstausgabe: " + alle.length + " Schutzrechte aus den letzten sechs Monaten (Erteilungen neun Monate) aufgenommen. " +
        (neu.length ? neu.length + " davon wurden in den vergangenen zwei Wochen veröffentlicht." : "");
    } else if (neu.length) {
      satz = "Diese Woche " + plural(neu.length, "ist ein neues Schutzrecht", "sind " + neu.length + " neue Schutzrechte") + " hinzugekommen" +
        (neuErteilt ? ", " + neuErteilt + " " + plural(neuErteilt, "davon ist eine Erteilung", "davon sind Erteilungen") : "") + ". " +
        (laufend.filter(function (e) { return tageBis(e.einspruch_bis) < 30; }).length ? "Mindestens eine Einspruchsfrist endet in den nächsten 30 Tagen." : "");
    } else {
      satz = "Diese Woche keine neuen relevanten Veröffentlichungen.";
    }

    var abd = R.abdeckung || {};
    var html = '<section class="ausgabe" aria-labelledby="ausgabe-titel">' +
      '<div><h1 id="ausgabe-titel" class="ausgabe-woche"><small>Ausgabe</small>KW ' + w.woche + " / " + w.jahr + "</h1>" +
      '<p class="ausgabe-satz">' + esc(satz) + "</p></div>" +
      '<div class="ausgabe-stand"><strong>Stand ' + datum(R.stand) + "</strong>" + esc(alle.length + " Schutzrechte im Radar") +
      (abd.status === "eingeschraenkt" ? '<br><span class="abdeckung-hinweis">Eingeschränkte Abdeckung</span>' : "") + "</div></section>";

    html += kennzahlBlock([
      { wert: neu.length, name: "neu diese Woche", link: "#/schutzrechte?neu=1" },
      { wert: erteilt, name: "Erteilungen", link: "#/schutzrechte?art=Erteilung" },
      { wert: gm, name: "Gebrauchsmuster", link: "#/schutzrechte?art=Gebrauchsmuster" },
      { wert: laufend.length, name: "laufende Einspruchsfristen", link: "#/fristen" }
    ]);

    html += '<section class="abschnitt" aria-labelledby="leiste-titel"><div class="abschnitt-kopf"><h2 id="leiste-titel">Einspruchsfristen der nächsten neun Monate</h2><a href="#/fristen">Alle Fristen</a></div>' +
      fristenLeiste(laufend) + "</section>";

    html += '<div class="zwei-spalten abschnitt"><section aria-labelledby="neu-titel"><div class="abschnitt-kopf"><h2 id="neu-titel">Neu diese Woche</h2>' +
      (neu.length > 6 ? '<a href="#/schutzrechte?neu=1">Alle ' + neu.length + " anzeigen</a>" : "") + "</div>" +
      (neu.length ? '<ul class="liste">' + neu.slice(0, 6).map(function (e) { return karte(e); }).join("") + "</ul>" :
        leer("Diese Woche keine neuen relevanten Veröffentlichungen.", "Der Radar wird jeden Montag aktualisiert.")) + "</section>" +
      '<section aria-labelledby="bald-titel"><div class="abschnitt-kopf"><h2 id="bald-titel">Einspruchsfristen, die bald enden</h2></div>' +
      (bald.length ? '<ul class="liste kompakt">' + bald.map(function (e) { return karte(e, { kompakt: true }); }).join("") + "</ul>" :
        leer("Keine laufenden Einspruchsfristen.", "")) + "</section></div>";

    var top = topDesMonats();
    html += '<section class="abschnitt" aria-labelledby="top-titel"><div class="abschnitt-kopf"><h2 id="top-titel">Top 5 des Monats</h2><span class="hinweis-text">' + esc(top.label) + "</span></div>" +
      (top.liste.length ? '<ul class="liste">' + top.liste.map(function (e) { return karte(e, { neuMarke: true }); }).join("") + "</ul>" :
        leer("In diesem Monat noch keine Einträge.", "")) + "</section>";

    html += '<section class="abschnitt" aria-labelledby="trend-titel"><div class="abschnitt-kopf"><h2 id="trend-titel">Veröffentlichungen je Thema, letzte 12 Monate</h2>' +
      (R.daten_ab ? '<span class="hinweis-text">Erfasst ab ' + datum(R.daten_ab) + "</span>" : "") + "</div>" + trend() + "</section>";

    var top8 = (R.anmelder || []).slice(0, 8);
    var max = top8.length ? top8[0].anzahl : 1;
    html += '<section class="abschnitt" aria-labelledby="anm-titel"><div class="abschnitt-kopf"><h2 id="anm-titel">Top-Anmelder</h2><a href="#/anmelder">Rangliste</a></div>' +
      (top8.length ? '<ul class="balken-liste">' + top8.map(function (a) {
        return '<li><div class="balken-name"><a href="' + hashMit("schutzrechte", new URLSearchParams({ anmelder: a.name })) + '">' + esc(a.name) + '</a><div class="balken"><span style="width:' + Math.max(4, Math.round(100 * a.anzahl / max)) + '%"></span></div></div><span class="zahl">' + a.anzahl + "</span></li>";
      }).join("") + "</ul>" : leer("Noch keine Anmelder erfasst.", "")) + "</section>";
    return html;
  }
  uebersicht.titel = function () { return "Übersicht"; };
  uebersicht.danach = zaehlen;

  function topDesMonats() {
    var bericht = D.berichte.filter(function (b) { return b.art === "monat" && b.top && b.top.length; })
      .sort(function (a, b) { return String(b.zeitraum.bis).localeCompare(a.zeitraum.bis); })[0];
    var h = heute();
    var monat = h.slice(0, 7);
    if (bericht && String(bericht.zeitraum.bis).slice(0, 7) >= monat.replace(/-(\d\d)$/, function (m, x) { var v = parseInt(x, 10) - 1; return "-" + String(v < 1 ? 12 : v).padStart(2, "0"); })) {
      return { label: bericht.titel, liste: bericht.top.slice(0, 5).map(function (id) { return D.byId[id]; }).filter(Boolean) };
    }
    var grenze = new Date(h + "T00:00:00Z"); grenze.setUTCDate(grenze.getUTCDate() - 31);
    var g = grenze.toISOString().slice(0, 10);
    var liste = D.radar.eintraege.filter(function (e) { return (e.erteilung_datum || e.veroeffentlicht) >= g; })
      .sort(function (a, b) { return relRang(a.relevanz) - relRang(b.relevanz) || (b.punkte || 0) - (a.punkte || 0) || String(b.veroeffentlicht).localeCompare(a.veroeffentlicht); })
      .slice(0, 5);
    return { label: "Veröffentlichungen der letzten 31 Tage", liste: liste };
  }

  function fristenLeiste(laufend) {
    var start = new Date(heute() + "T00:00:00Z");
    var ende = new Date(start); ende.setUTCMonth(ende.getUTCMonth() + 9); ende.setUTCDate(ende.getUTCDate() + 3);
    var B = 1000, H = 108, L = 8, Rr = 8, spanne = ende - start;
    function x(d) { return L + (B - L - Rr) * ((d - start) / spanne); }
    var t30 = new Date(start); t30.setUTCDate(t30.getUTCDate() + 30);
    var t90 = new Date(start); t90.setUTCDate(t90.getUTCDate() + 90);
    var s = '<svg viewBox="0 0 ' + B + " " + H + '" role="img" aria-label="Zeitleiste der laufenden Einspruchsfristen">';
    s += '<rect class="zone-30" x="' + x(start) + '" y="22" width="' + (x(t30) - x(start)) + '" height="46" rx="4"/>';
    s += '<rect class="zone-90" x="' + x(t30) + '" y="22" width="' + (x(t90) - x(t30)) + '" height="46"/>';
    s += '<line class="achse" x1="' + L + '" x2="' + (B - Rr) + '" y1="68" y2="68"/>';
    var m = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    while (m < ende) {
      var mx = x(m);
      s += '<line class="achse" x1="' + mx + '" x2="' + mx + '" y1="64" y2="72"/><text class="monat" x="' + mx + '" y="88" text-anchor="middle">' + MONATE[m.getUTCMonth()] + (m.getUTCMonth() === 0 ? " " + m.getUTCFullYear() : "") + "</text>";
      m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1));
    }
    s += '<line class="heute" x1="' + x(start) + '" x2="' + x(start) + '" y1="14" y2="74"/><text class="heute-text" x="' + (x(start) + 4) + '" y="12">heute</text>';
    var belegt = {};
    laufend.forEach(function (e) {
      var d = new Date(e.einspruch_bis + "T00:00:00Z");
      if (d > ende) return;
      var px = Math.round(x(d));
      var slot = Math.round(px / 14);
      var reihe = belegt[slot] = (belegt[slot] || 0) + 1;
      var cy = 56 - (reihe - 1) * 13;
      if (cy < 26) cy = 26;
      var t = tageBis(e.einspruch_bis);
      var farbe = t < 30 ? "var(--kupfer)" : t < 90 ? "var(--messing)" : "var(--patina)";
      s += '<a href="#/eintrag/' + encodeURIComponent(e.id) + '" aria-label="' + esc(e.titel + ", Einspruch bis " + datum(e.einspruch_bis)) + '"><circle cx="' + px + '" cy="' + cy + '" r="6.5" fill="' + farbe + '"><title>' + esc(e.titel + " – Einspruch bis " + datum(e.einspruch_bis) + " (" + e.nummer + ")") + "</title></circle></a>";
    });
    s += "</svg>";
    var legende = '<div class="leiste-legende"><span class="leg-30">weniger als 30 Tage</span><span class="leg-90">weniger als 90 Tage</span><span class="leg-punkt">Erteilung mit laufender Frist, Punkt anklickbar</span></div>';
    if (!laufend.length) return '<div class="leiste">' + s + '<p class="hinweis-text">Zurzeit keine laufenden Einspruchsfristen im Radar.</p></div>';
    return '<div class="leiste">' + s + legende + "</div>";
  }

  function trend() {
    var h = heute();
    var j = parseInt(h.slice(0, 4), 10), mo = parseInt(h.slice(5, 7), 10) - 1;
    var monate = [];
    for (var i = 11; i >= 0; i--) {
      var d = new Date(Date.UTC(j, mo - i, 1));
      monate.push(d.toISOString().slice(0, 7));
    }
    var ab = (D.radar.daten_ab || "").slice(0, 7);
    var zaehl = {};
    THEMEN.forEach(function (t) { zaehl[t.key] = {}; });
    D.radar.eintraege.forEach(function (e) {
      var m = String(e.veroeffentlicht).slice(0, 7);
      if (zaehl[e.thema]) zaehl[e.thema][m] = (zaehl[e.thema][m] || 0) + 1;
    });
    var gesamtMax = 1;
    THEMEN.forEach(function (t) { monate.forEach(function (m) { gesamtMax = Math.max(gesamtMax, zaehl[t.key][m] || 0); }); });
    return '<div class="trend-raster">' + THEMEN.map(function (t) {
      var summe = 0;
      var balken = monate.map(function (m, idx) {
        var n = zaehl[t.key][m] || 0; summe += n;
        var hoehe = n ? Math.max(3, Math.round(50 * n / gesamtMax)) : 2;
        var vorher = ab && m < ab;
        return '<rect x="' + (idx * 10 + 1) + '" y="' + (52 - hoehe) + '" width="7" height="' + hoehe + '" rx="1.5"' + (vorher || !n ? ' class="leer-monat"' : "") + '><title>' + MONATE_LANG[parseInt(m.slice(5), 10) - 1] + " " + m.slice(0, 4) + ": " + (vorher ? "nicht erfasst" : n) + "</title></rect>";
      }).join("");
      return '<div class="trend-zelle" style="' + themaStil(t.key) + '"><h3><a href="' + hashMit("schutzrechte", new URLSearchParams({ thema: t.key })) + '" style="color:inherit">' + esc(t.name) + "</a><span>" + summe + '</span></h3><svg viewBox="0 0 120 54" preserveAspectRatio="none" role="img" aria-label="' + esc(t.name + ": " + summe + " Veröffentlichungen in 12 Monaten") + '">' + balken + '</svg><div class="trend-achse"><span>' + MONATE[parseInt(monate[0].slice(5), 10) - 1] + "</span><span>" + MONATE[parseInt(monate[11].slice(5), 10) - 1] + "</span></div></div>";
    }).join("") + "</div>";
  }

  /* ---------- Schutzrechte ---------- */
  function filterAnwenden(liste, p) {
    var q = (p.get("q") || "").toLowerCase().trim();
    var woerter = q ? q.split(/\s+/) : [];
    var thema = p.get("thema"), art = p.get("art"), amt = p.get("amt"), rel = p.get("relevanz"),
      von = p.get("von"), bis = p.get("bis"), anm = p.get("anmelder"), neu = p.get("neu"), frist = p.get("frist");
    return liste.filter(function (e) {
      if (thema && e.thema !== thema) return false;
      if (art && e.art !== art) return false;
      if (amt && e.amt !== amt) return false;
      if (rel && e.relevanz !== rel) return false;
      if (von && String(e.veroeffentlicht) < von) return false;
      if (bis && String(e.veroeffentlicht) > bis) return false;
      if (anm && (e.anmelder || []).indexOf(anm) < 0) return false;
      if (neu === "1" && !e.neu) return false;
      if (frist === "laufend" && !fristLaeuft(e)) return false;
      if (woerter.length) {
        var text = (e._suche || (e._suche = [e.titel, e.titel_original, e.was_neu, e.bezug, (e.anmelder || []).join(" "), e.nummer, e.nummer_kompakt,
          (e.klassen || []).join(" "), (e.familie || []).map(function (f) { return f.nummer; }).join(" "), themaName(e.thema)].join(" ").toLowerCase()));
        for (var i = 0; i < woerter.length; i++) if (text.indexOf(woerter[i]) < 0) return false;
      }
      return true;
    });
  }
  var SORTIERUNG = {
    datum: { name: "Neueste zuerst", fn: function (a, b) { return String(b.veroeffentlicht).localeCompare(a.veroeffentlicht); } },
    relevanz: { name: "Relevanz", fn: function (a, b) { return relRang(a.relevanz) - relRang(b.relevanz) || (b.punkte || 0) - (a.punkte || 0) || String(b.veroeffentlicht).localeCompare(a.veroeffentlicht); } },
    frist: { name: "Einspruchsfrist", fn: function (a, b) { return (a.einspruch_bis || "9999").localeCompare(b.einspruch_bis || "9999"); } },
    titel: { name: "Titel A–Z", fn: function (a, b) { return String(a.titel).localeCompare(b.titel, "de"); } },
    anmelder: { name: "Anmelder A–Z", fn: function (a, b) { return String((a.anmelder || [""])[0]).localeCompare((b.anmelder || [""])[0], "de"); } },
    aufnahme: { name: "Zuletzt aufgenommen", fn: function (a, b) { return String(b.aufgenommen).localeCompare(a.aufgenommen) || String(b.veroeffentlicht).localeCompare(a.veroeffentlicht); } }
  };
  var aktuelleListe = [];

  function auswahl(name, label, optionen, wert) {
    return '<label class="feld"><span>' + esc(label) + '</span><select name="' + name + '"><option value="">Alle</option>' +
      optionen.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === wert ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></label>";
  }

  function schutzrechte(r) {
    var p = r.params;
    var sort = SORTIERUNG[p.get("sort")] ? p.get("sort") : "datum";
    var ansicht = p.get("ansicht") === "tabelle" ? "tabelle" : "karten";
    var liste = filterAnwenden(D.radar.eintraege, p).sort(SORTIERUNG[sort].fn);
    aktuelleListe = liste;
    var anmelderListe = (D.radar.anmelder || []).map(function (a) { return [a.name, a.name + " (" + a.anzahl + ")"]; });
    var aktiv = ["thema", "art", "amt", "relevanz", "von", "bis", "anmelder", "neu", "frist", "q"].some(function (k) { return p.get(k); });

    var html = '<div class="seite-kopf"><h1>Alle Schutzrechte</h1><p>Patente, Offenlegungen und Gebrauchsmuster aus Deutschland und Europa, nach Patentfamilie zusammengefasst. Jede Ansicht lässt sich über die Adresszeile teilen.</p></div>';
    html += '<form class="filter" id="filter" role="search" onsubmit="return false">' +
      '<label class="feld suche"><span class="visuell-verborgen">Volltextsuche</span>' + ICON.suche + '<input type="search" name="q" value="' + esc(p.get("q") || "") + '" placeholder="Suche nach Titel, Inhalt, Anmelder, Nummer oder Patentklasse" autocomplete="off"></label>' +
      '<div class="filter-zeile">' +
      auswahl("thema", "Thema", THEMEN.map(function (t) { return [t.key, t.name]; }), p.get("thema")) +
      auswahl("art", "Art", ARTEN.map(function (a) { return [a, a]; }), p.get("art")) +
      auswahl("amt", "Amt", Object.keys(AEMTER).map(function (k) { return [k, AEMTER[k]]; }), p.get("amt")) +
      auswahl("relevanz", "Relevanz", [["hoch", "hoch"], ["mittel", "mittel"]], p.get("relevanz")) +
      auswahl("anmelder", "Anmelder", anmelderListe, p.get("anmelder")) +
      '<label class="feld"><span>Veröffentlicht ab</span><input type="date" name="von" value="' + esc(p.get("von") || "") + '"></label>' +
      '<label class="feld"><span>Veröffentlicht bis</span><input type="date" name="bis" value="' + esc(p.get("bis") || "") + '"></label>' +
      '<label class="feld"><span>Sortierung</span><select name="sort">' + Object.keys(SORTIERUNG).map(function (k) { return '<option value="' + k + '"' + (k === sort ? " selected" : "") + ">" + SORTIERUNG[k].name + "</option>"; }).join("") + "</select></label>" +
      "</div>" +
      (p.get("neu") === "1" ? '<p class="hinweis-text">Gefiltert auf: neu in dieser Woche.</p>' : "") +
      (p.get("frist") === "laufend" ? '<p class="hinweis-text">Gefiltert auf: laufende Einspruchsfrist.</p>' : "") +
      "</form>";

    html += '<div class="ergebnis-leiste"><span class="ergebnis-zahl"><strong>' + liste.length + "</strong> " + plural(liste.length, "Schutzrecht", "Schutzrechte") +
      (aktiv ? ' gefunden <a href="#/schutzrechte" style="margin-left:8px">Filter zurücksetzen</a>' : "") + "</span>" +
      '<div class="werkzeug-reihe"><div class="knopf-gruppe" role="group" aria-label="Ansicht">' +
      '<button type="button" class="knopf klein" data-ansicht="karten" aria-pressed="' + (ansicht === "karten") + '">Karten</button>' +
      '<button type="button" class="knopf klein" data-ansicht="tabelle" aria-pressed="' + (ansicht === "tabelle") + '">Tabelle</button></div>' +
      exportKnoepfe() + '<button type="button" class="knopf klein" data-teilen>' + ICON.teilen + "Link kopieren</button></div></div>";

    if (!liste.length) {
      html += leer(aktiv ? "Keine Schutzrechte zu diesen Filtern." : "Noch keine Schutzrechte im Radar.", aktiv ? "Lockere die Filter oder setze sie zurück." : "");
    } else if (ansicht === "tabelle") {
      html += tabelle(liste, sort);
    } else {
      html += '<ul class="liste">' + liste.map(function (e) { return karte(e, { neuMarke: true }); }).join("") + "</ul>";
    }
    return html;
  }
  schutzrechte.titel = function () { return "Schutzrechte"; };
  schutzrechte.danach = function () {
    var f = document.getElementById("filter");
    if (!f) return;
    var timer;
    function anwenden() {
      var r = route(), p = r.params;
      ["q", "thema", "art", "amt", "relevanz", "anmelder", "von", "bis", "sort"].forEach(function (k) {
        var el = f.elements[k]; if (!el) return;
        if (el.value && !(k === "sort" && el.value === "datum")) p.set(k, el.value); else p.delete(k);
      });
      var ziel = hashMit("schutzrechte", p);
      if (ziel !== location.hash) {
        var fokusName = document.activeElement && document.activeElement.name;
        var pos = document.activeElement && document.activeElement.selectionStart;
        history.replaceState(null, "", ziel);
        zeichnen(false);
        if (fokusName) {
          var neuEl = document.getElementById("filter").elements[fokusName];
          if (neuEl) { neuEl.focus(); if (pos != null && neuEl.setSelectionRange) try { neuEl.setSelectionRange(pos, pos); } catch (e) {} }
        }
      }
    }
    f.addEventListener("input", function (ev) {
      clearTimeout(timer);
      timer = setTimeout(anwenden, ev.target.name === "q" ? 250 : 0);
    });
    f.addEventListener("change", anwenden);
  };

  function tabelle(liste, sort) {
    function kopf(k, text) { return '<th scope="col"><button type="button" data-sort="' + k + '"' + (sort === k ? ' aria-current="true"' : "") + ">" + text + (sort === k ? " ↓" : "") + "</button></th>"; }
    return '<div class="tabelle-rahmen"><table><thead><tr>' + kopf("titel", "Titel") + "<th scope=\"col\">Art</th><th scope=\"col\">Nummer</th>" + kopf("datum", "Veröffentlicht") +
      kopf("anmelder", "Anmelder") + "<th scope=\"col\">Thema</th>" + kopf("relevanz", "Relevanz") + kopf("frist", "Einspruch bis") + "<th scope=\"col\"><span class=\"visuell-verborgen\">Merken</span></th></tr></thead><tbody>" +
      liste.map(function (e) {
        var fk = fristKlasse(e), merk = Merk.hat(e.id);
        return '<tr><td class="titel-zelle"><a href="#/eintrag/' + encodeURIComponent(e.id) + '">' + esc(e.titel) + "</a>" + (e.neu_erteilt ? ' <span class="etikett neu-erteilt">neu erteilt</span>' : "") + "</td><td>" + esc(e.art) + '</td><td class="nummer">' + esc(e.nummer) + '</td><td class="tab">' + datum(e.veroeffentlicht) +
          "</td><td>" + esc((e.anmelder || []).join(", ")) + '</td><td><span class="thema-marke" style="' + themaStil(e.thema) + '">' + esc(themaName(e.thema)) + '</span></td><td><span class="relevanz ' + esc(e.relevanz) + '">' + esc(e.relevanz) + "</span></td><td>" +
          (e.einspruch_bis ? '<span class="frist ' + fk + '">' + datum(e.einspruch_bis) + "</span>" : "–") + '</td><td><button type="button" class="knopf klein merken" data-merken="' + esc(e.id) + '" aria-pressed="' + merk + '" aria-label="' + (merk ? "Von der Merkliste entfernen" : "Auf die Merkliste") + '">' + ICON.merken + "</button></td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  /* ---------- Detail ---------- */
  function eintrag(r) {
    var e = D.byId[r.arg];
    if (!e) return leer("Dieser Eintrag ist nicht (mehr) im Radar.", "Er wurde möglicherweise mit einem anderen Familienmitglied zusammengeführt.") + '<p style="margin-top:14px"><a href="#/schutzrechte">Zu allen Schutzrechten</a></p>';
    var fk = fristKlasse(e), merk = Merk.hat(e.id);
    var html = '<a class="zurueck" href="#/schutzrechte">' + ICON.zurueck + "Alle Schutzrechte</a>";
    html += '<div class="detail"><article class="detail-haupt" style="' + themaStil(e.thema) + '">' +
      '<div class="karte-oben"><span class="art-marke">' + esc(e.art) + '</span><span class="nummer">' + esc(e.nummer) + "</span>" + (e.neu_erteilt ? '<span class="etikett neu-erteilt">neu erteilt</span>' : "") + (e.neu ? '<span class="etikett neu">neu diese Woche</span>' : "") + "</div>" +
      "<h1>" + esc(e.titel) + '</h1><p class="original">' + esc(e.titel_original) + "</p>" +
      '<h2>Was ist neu?</h2><p class="absatz">' + esc(e.was_neu) + "</p>" +
      '<h2>Bezug</h2><p class="absatz">' + esc(e.bezug) + "</p>" +
      '<div class="werkzeug-reihe" style="margin-top:18px"><button type="button" class="knopf merken" data-merken="' + esc(e.id) + '" aria-pressed="' + merk + '">' + ICON.merken + "<span>" + (merk ? "Gemerkt" : "Merken") + '</span></button><button type="button" class="knopf" data-teilen>' + ICON.teilen + "Link kopieren</button></div>" +
      "</article><aside class=\"detail-seite\">";
    if (e.einspruch_bis) {
      html += '<div class="kasten frist-kasten ' + fk + '"><h2>Einspruch möglich bis</h2><div class="frist-datum">' + datum(e.einspruch_bis) + "</div><p>" +
        (fk === "abgelaufen" ? "Frist abgelaufen." : "Noch " + tageBis(e.einspruch_bis) + " Tage.") + " Neun Monate ab Veröffentlichung der Erteilung am " + datum(e.erteilung_datum) +
        " (" + (e.amt === "EP" ? "Art. 99 EPÜ" : "§ 59 PatG") + ").</p><p class=\"hinweis-text\" style=\"margin:0\">Frist im amtlichen Register prüfen.</p></div>";
    }
    html += '<div class="kasten"><h2>Daten</h2><dl class="daten">' +
      "<dt>Art</dt><dd>" + esc(e.art) + "</dd><dt>Amt</dt><dd>" + esc(AEMTER[e.amt] || e.amt) + '</dd><dt>Nummer</dt><dd class="nummer">' + esc(e.nummer) + "</dd>" +
      "<dt>Anmelder</dt><dd>" + (e.anmelder || []).map(function (a) { return '<a href="' + hashMit("schutzrechte", new URLSearchParams({ anmelder: a })) + '">' + esc(a) + "</a>"; }).join("<br>") + "</dd>" +
      "<dt>Veröffentlicht</dt><dd>" + datum(e.veroeffentlicht) + "</dd><dt>Angemeldet</dt><dd>" + datum(e.angemeldet) + "</dd><dt>Priorität</dt><dd>" + datum(e.prioritaet) + "</dd>" +
      '<dt>Thema</dt><dd><span class="thema-marke" style="' + themaStil(e.thema) + '">' + esc(themaName(e.thema)) + "</span></dd>" +
      '<dt>Relevanz</dt><dd><span class="relevanz ' + esc(e.relevanz) + '">' + esc(e.relevanz) + "</span></dd>" +
      "<dt>Klassen</dt><dd>" + esc((e.klassen || []).join(", ")) + "</dd>" +
      "<dt>Im Radar seit</dt><dd>" + datum(e.aufgenommen) + "</dd></dl></div>";
    if (e.familie && e.familie.length) {
      html += '<div class="kasten"><h2>Weitere Familienmitglieder</h2><ul class="link-liste">' + e.familie.map(function (f) {
        return '<li><span class="nummer">' + esc(f.nummer) + "</span>" + (f.art ? " – " + esc(f.art) : "") + (f.datum ? ", " + datum(f.datum) : "") + "</li>";
      }).join("") + "</ul></div>";
    }
    html += '<div class="kasten"><h2>Amtliche Quellen</h2><ul class="link-liste">' + (e.links || []).map(function (l) {
      return '<li><a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label) + "</a></li>";
    }).join("") + "</ul></div></aside></div>";
    return html;
  }
  eintrag.titel = function (r) { var e = D.byId[r.arg]; return e ? e.titel : "Eintrag"; };

  /* ---------- Fristen ---------- */
  function fristen() {
    var alle = D.radar.eintraege.filter(function (e) { return e.einspruch_bis; });
    var laufend = alle.filter(fristLaeuft).sort(function (a, b) { return a.einspruch_bis.localeCompare(b.einspruch_bis); });
    var abgelaufen = alle.filter(function (e) { return !fristLaeuft(e); }).sort(function (a, b) { return b.einspruch_bis.localeCompare(a.einspruch_bis); });
    aktuelleListe = laufend;
    var html = '<div class="seite-kopf"><h1>Einspruchsfristen</h1><p>Gegen ein erteiltes Patent kann innerhalb von neun Monaten nach Veröffentlichung der Erteilung Einspruch eingelegt werden (DE: § 59 PatG, EP: Art. 99 EPÜ). Kupfer markiert weniger als 30 Tage, Messing weniger als 90 Tage Restlaufzeit. Fristen bitte immer im amtlichen Register prüfen.</p></div>';
    html += fristenLeiste(laufend);
    html += '<div class="ergebnis-leiste" style="margin-top:22px"><span class="ergebnis-zahl"><strong>' + laufend.length + "</strong> laufende " + plural(laufend.length, "Frist", "Fristen") + "</span>" +
      '<div class="werkzeug-reihe">' + exportKnoepfe() + "</div></div>";
    if (!laufend.length) html += leer("Zurzeit keine laufenden Einspruchsfristen.", "");
    else html += '<div class="tabelle-rahmen"><table><thead><tr><th scope="col">Einspruch bis</th><th scope="col">Restlaufzeit</th><th scope="col">Titel</th><th scope="col">Nummer</th><th scope="col">Anmelder</th><th scope="col">Thema</th></tr></thead><tbody>' +
      laufend.map(function (e) {
        var t = tageBis(e.einspruch_bis), fk = fristKlasse(e);
        return '<tr><td><span class="frist ' + fk + '">' + datum(e.einspruch_bis) + '</span></td><td class="tab"><span class="frist ' + fk + '">' + t + " " + plural(t, "Tag", "Tage") + '</span></td><td class="titel-zelle"><a href="#/eintrag/' + encodeURIComponent(e.id) + '">' + esc(e.titel) + '</a></td><td class="nummer">' + esc(e.nummer) + "</td><td>" + esc((e.anmelder || []).join(", ")) + '</td><td><span class="thema-marke" style="' + themaStil(e.thema) + '">' + esc(themaName(e.thema)) + "</span></td></tr>";
      }).join("") + "</tbody></table></div>";
    if (abgelaufen.length) {
      html += '<details class="abschnitt"><summary>Abgelaufene Fristen (' + abgelaufen.length + ")</summary>" + '<ul class="liste kompakt" style="margin-top:12px">' + abgelaufen.map(function (e) { return karte(e, { kompakt: true }); }).join("") + "</ul></details>";
    }
    return html;
  }
  fristen.titel = function () { return "Einspruchsfristen"; };

  /* ---------- Anmelder ---------- */
  function anmelder() {
    var liste = D.radar.anmelder || [];
    var max = liste.length ? liste[0].anzahl : 1;
    var html = '<div class="seite-kopf"><h1>Anmelder</h1><p>Rangliste nach Anzahl der Patentfamilien im Radar. Ein Klick zeigt alle Einträge des Anmelders.</p></div>';
    if (!liste.length) return html + leer("Noch keine Anmelder erfasst.", "");
    html += '<div class="tabelle-rahmen"><table><thead><tr><th scope="col">Anmelder</th><th scope="col">Land</th><th scope="col">Einträge</th><th scope="col">Themen</th></tr></thead><tbody>' +
      liste.map(function (a) {
        return '<tr><td><a href="' + hashMit("schutzrechte", new URLSearchParams({ anmelder: a.name })) + '">' + esc(a.name) + '</a><div class="balken" style="margin-top:6px;max-width:260px"><span style="width:' + Math.max(4, Math.round(100 * a.anzahl / max)) + '%"></span></div></td><td>' + esc(a.land || "–") + '</td><td class="tab">' + a.anzahl + '</td><td><div class="themen-chips">' +
          Object.keys(a.themen || {}).sort(function (x, y) { return a.themen[y] - a.themen[x]; }).map(function (k) { return '<span class="chip">' + esc(themaName(k)) + " " + a.themen[k] + "</span>"; }).join("") + "</div></td></tr>";
      }).join("") + "</tbody></table></div>";
    return html;
  }
  anmelder.titel = function () { return "Anmelder"; };

  /* ---------- News ---------- */
  function news() {
    var liste = D.news.slice().sort(function (a, b) { return String(b.datum).localeCompare(a.datum); });
    var html = '<div class="seite-kopf"><h1>News</h1><p>Patent- und Innovationsnachrichten aus Dach und Entwässerung: Patentstreitigkeiten, Rechtsänderungen, Meldungen der Ämter und der Fachpresse. Höchstens zehn Meldungen pro Woche.</p></div>';
    if (!liste.length) return html + leer("Noch keine Meldungen.", "Neue Meldungen erscheinen mit der nächsten wöchentlichen Aktualisierung.");
    return html + '<ul class="news-liste">' + liste.map(function (n) {
      return '<li><div class="news-meta"><span>' + datum(n.datum) + "</span><span>" + esc(n.quelle) + "</span>" + (n.thema ? '<span class="thema-marke" style="' + themaStil(n.thema) + '">' + esc(themaName(n.thema)) + "</span>" : "") + "</div><h3>" + esc(n.titel) + "</h3><p>" + esc(n.text) + '</p><a href="' + esc(n.url) + '" target="_blank" rel="noopener noreferrer">Zur Meldung bei ' + esc(n.quelle) + "</a></li>";
    }).join("") + "</ul>";
  }
  news.titel = function () { return "News"; };

  /* ---------- Berichte ---------- */
  function berichte(r) {
    if (r.arg) return bericht(r.arg);
    var liste = D.berichte.slice().sort(function (a, b) { return String(b.zeitraum.bis).localeCompare(a.zeitraum.bis) || (a.art === "monat" ? -1 : 1); });
    var html = '<div class="seite-kopf"><h1>Berichte</h1><p>Wochenzusammenfassungen nach jeder Aktualisierung und ein kompakter Monatsbericht am ersten Montag des Monats. Monatsberichte lassen sich auf A4 drucken oder als PDF speichern.</p></div>';
    if (!liste.length) return html + leer("Noch keine Berichte.", "");
    var monat = liste.filter(function (b) { return b.art === "monat"; }), woche = liste.filter(function (b) { return b.art !== "monat"; });
    function kachel(b) {
      return '<li><a href="#/berichte/' + encodeURIComponent(b.id) + '"><span class="art">' + (b.art === "monat" ? "Monatsbericht" : "Wochenbericht") + "</span><strong>" + esc(b.titel) + '</strong><span class="kurz">' + esc(b.kurz || "") + "</span></a></li>";
    }
    if (monat.length) html += '<section class="abschnitt" style="margin-top:0"><div class="abschnitt-kopf"><h2>Monatsberichte</h2></div><ul class="berichte-liste">' + monat.map(kachel).join("") + "</ul></section>";
    if (woche.length) html += '<section class="abschnitt"><div class="abschnitt-kopf"><h2>Wochenberichte</h2></div><ul class="berichte-liste">' + woche.map(kachel).join("") + "</ul></section>";
    return html;
  }
  berichte.titel = function (r) { var b = r.arg && D.berichte.filter(function (x) { return x.id === r.arg; })[0]; return b ? b.titel : "Berichte"; };

  function eintragZeile(id, extra) {
    var e = D.byId[id];
    if (!e) return "";
    return '<li><a href="#/eintrag/' + encodeURIComponent(e.id) + '">' + esc(e.titel) + "</a> – " + esc((e.anmelder || []).join(", ")) + ", " + '<span class="nummer">' + esc(e.nummer) + "</span>" + (extra ? extra(e) : "") + "</li>";
  }
  function bericht(id) {
    var b = D.berichte.filter(function (x) { return x.id === id; })[0];
    if (!b) return leer("Bericht nicht gefunden.", "") + '<p style="margin-top:14px"><a href="#/berichte">Alle Berichte</a></p>';
    var k = b.kennzahlen || {};
    var html = '<a class="zurueck" href="#/berichte">' + ICON.zurueck + "Alle Berichte</a>" +
      '<div class="bericht-werkzeuge"><button type="button" class="knopf" data-drucken>' + ICON.druck + 'Drucken oder als PDF speichern</button><button type="button" class="knopf" data-teilen>' + ICON.teilen + "Link kopieren</button></div>" +
      '<article class="bericht"><p class="hinweis-text" style="margin:0">' + (b.art === "monat" ? "Monatsbericht" : "Wochenbericht") + " Patent-Radar Bau &amp; Dach</p><h1>" + esc(b.titel) + '</h1><p class="zeitraum">Zeitraum ' + datum(b.zeitraum.von) + " bis " + datum(b.zeitraum.bis) + ", erstellt am " + datum(b.erstellt) + "</p>" +
      (b.zusammenfassung ? '<p class="absatz">' + esc(b.zusammenfassung) + "</p>" : "") +
      kennzahlBlock([
        { wert: k.neu || 0, name: "neue Einträge" }, { wert: k.erteilungen || 0, name: "davon Erteilungen" },
        { wert: k.gebrauchsmuster || 0, name: "davon Gebrauchsmuster" }, { wert: k.fristen_laufend || 0, name: "laufende Einspruchsfristen" }
      ]);
    if (b.top && b.top.length) html += "<h2>" + (b.art === "monat" ? "Top 5 des Monats" : "Top 3 der Woche") + "</h2><ol>" + b.top.map(function (i) { return eintragZeile(i); }).join("") + "</ol>";
    if (b.fristen && b.fristen.length) html += "<h2>" + (b.art === "monat" ? "Einspruchsfristen der nächsten 90 Tage" : "Neue Einspruchsfristen") + "</h2><ul>" + b.fristen.map(function (i) { return eintragZeile(i, function (e) { return ', Einspruch bis <span class="frist ' + fristKlasse(e) + '">' + datum(e.einspruch_bis) + "</span>"; }); }).join("") + "</ul>";
    if (b.trends) html += "<h2>Trends</h2><p>" + esc(b.trends) + "</p>";
    if (b.anmelder && b.anmelder.length) html += "<h2>Aktivste Anmelder</h2><ul>" + b.anmelder.map(function (a) { return '<li><a href="' + hashMit("schutzrechte", new URLSearchParams({ anmelder: a.name })) + '">' + esc(a.name) + "</a>: " + a.anzahl + " " + plural(a.anzahl, "Eintrag", "Einträge") + "</li>"; }).join("") + "</ul>";
    if (b.news && b.news.length) {
      var nById = {}; D.news.forEach(function (n) { nById[n.id] = n; });
      var nl = b.news.map(function (i) { return nById[i]; }).filter(Boolean);
      if (nl.length) html += "<h2>" + (b.art === "monat" ? "News-Highlights" : "News der Woche") + "</h2><ul>" + nl.map(function (n) { return '<li><a href="' + esc(n.url) + '" target="_blank" rel="noopener noreferrer">' + esc(n.titel) + "</a> (" + esc(n.quelle) + ", " + datum(n.datum) + "): " + esc(n.text) + "</li>"; }).join("") + "</ul>";
    }
    if (b.hinweise && b.hinweise.length) html += "<h2>Hinweise zur Abdeckung</h2><ul>" + b.hinweise.map(function (h) { return "<li>" + esc(h) + "</li>"; }).join("") + "</ul>";
    if (!b.top || !b.top.length) html += '<p style="margin-top:18px">Im Berichtszeitraum keine neuen relevanten Veröffentlichungen.</p>';
    html += '<p class="hinweis-text" style="margin-top:24px">Automatisierte Übersicht öffentlicher Veröffentlichungen. Keine Rechtsberatung. Vor Entscheidungen bitte durch eine Patentanwältin oder einen Patentanwalt prüfen lassen.</p></article>';
    return html;
  }

  /* ---------- Merkliste ---------- */
  function merkliste() {
    var liste = Merk.ids.map(function (id) { return D.byId[id]; }).filter(Boolean);
    aktuelleListe = liste;
    var html = '<div class="seite-kopf"><h1>Merkliste</h1><p>Die Merkliste wird nur in diesem Browser gespeichert und nicht übertragen.</p></div>';
    if (!liste.length) return html + leer("Die Merkliste ist leer.", "Über „Merken“ an einem Eintrag landet er hier.");
    html += '<div class="ergebnis-leiste"><span class="ergebnis-zahl"><strong>' + liste.length + "</strong> gemerkt</span><div class=\"werkzeug-reihe\">" + exportKnoepfe() + "</div></div>";
    return html + '<ul class="liste">' + liste.map(function (e) { return karte(e); }).join("") + "</ul>";
  }
  merkliste.titel = function () { return "Merkliste"; };

  /* ---------- Hinweise ---------- */
  function hinweise() {
    var R = D.radar, abd = R.abdeckung || {};
    var quellen = (abd.quellen || []).map(function (q) {
      return "<tr><td>" + esc(q.name) + "</td><td>" + esc(q.umfang || "") + "</td><td>" + (q.stand ? datum(q.stand) : "–") + "</td><td>" + esc(q.status || "") + "</td></tr>";
    }).join("");
    return '<div class="text-seite"><div class="seite-kopf"><h1>Hinweise</h1><p>Quellen, Methode und Abdeckung des Radars sowie die wichtigsten Begriffe.</p></div>' +
      '<p class="rechtlich">Automatisierte Übersicht öffentlicher Veröffentlichungen. Keine Rechtsberatung. Vor Entscheidungen bitte durch eine Patentanwältin oder einen Patentanwalt prüfen lassen.</p>' +
      "<h2>Quellen und Abdeckung</h2>" +
      (abd.status === "eingeschraenkt" ? '<p><span class="abdeckung-hinweis">Eingeschränkte Abdeckung</span> ' + esc(abd.hinweis || "") + "</p>" : "") +
      (quellen ? '<div class="tabelle-rahmen quellen-tabelle"><table><thead><tr><th scope="col">Quelle</th><th scope="col">Umfang</th><th scope="col">Datenstand</th><th scope="col">Status</th></tr></thead><tbody>' + quellen + "</tbody></table></div>" : "") +
      "<p style=\"margin-top:14px\">Erfasst werden Offenlegungsschriften (A1), Patentschriften (B3, B4) und Gebrauchsmuster (U1) des Deutschen Patent- und Markenamts sowie europäische Anmeldungen (A1, A2) und erteilte europäische Patente (B1, B2) des Europäischen Patentamts. Internationale Anmeldungen (WO) werden nur aufgenommen, wenn sie thematisch klar passen; sie sind nicht vollständig erfasst.</p>" +
      "<h2>Methode</h2><ul>" +
      "<li>Jeden Montag werden die Veröffentlichungen der Vorwochen über Patentklassen (CPC/IPC) und Stichwörter abgerufen. Ein rollierendes Fenster von 30 Tagen fängt verspätet eingespielte Daten auf; bereits bekannte Nummern werden übersprungen.</li>" +
      "<li>Treffer werden thematisch geprüft und als hoch oder mittel relevant eingestuft. Bauthemen ohne Dachbezug werden nicht aufgenommen.</li>" +
      "<li>Dokumente derselben Patentfamilie werden zu einem Eintrag zusammengefasst; gezeigt wird der weiteste Stand, also Erteilung vor Anmeldung. Wird eine bereits gezeigte Anmeldung erteilt, wird der Eintrag aktualisiert und als „neu erteilt“ markiert.</li>" +
      "<li>Jeder Eintrag beruht auf einer amtlichen Nummer und verlinkt auf Espacenet und das jeweilige amtliche Register. Daten und Fristen stammen aus den amtlichen Daten; Einspruchsfristen werden aus dem Veröffentlichungstag der Erteilung berechnet.</li>" +
      "<li>Die Texte unter „Was ist neu?“ und „Bezug“ sind eigene Zusammenfassungen und ersetzen nicht die Lektüre der Patentschrift.</li></ul>" +
      "<h2>Die 18-Monats-Regel</h2><p>Patentanmeldungen werden erst 18 Monate nach dem Prioritätstag veröffentlicht. Was heute im Radar erscheint, wurde also meist eineinhalb Jahre zuvor angemeldet. Jüngere Entwicklungen sind noch nicht sichtbar. Gebrauchsmuster werden dagegen schon mit der Eintragung bekannt gemacht, oft wenige Monate nach der Anmeldung.</p>" +
      '<h2>Glossar</h2><dl class="glossar">' +
      "<dt>Offenlegung</dt><dd>Veröffentlichung einer Patentanmeldung, meist 18 Monate nach dem Prioritätstag. Ein Schutzrecht besteht damit noch nicht.</dd>" +
      "<dt>Erteilung</dt><dd>Nach der Prüfung gewährtes Patent. Ab der Veröffentlichung der Erteilung läuft die neunmonatige Einspruchsfrist.</dd>" +
      "<dt>Gebrauchsmuster</dt><dd>Ungeprüftes Schutzrecht für technische Erfindungen mit bis zu zehn Jahren Laufzeit. Es wird ohne Prüfung auf Neuheit eingetragen und kann über einen Löschungsantrag angegriffen werden.</dd>" +
      "<dt>Einspruch</dt><dd>Verfahren, mit dem Dritte ein erteiltes Patent innerhalb von neun Monaten nach Veröffentlichung der Erteilung angreifen können (DE: § 59 PatG, EP: Art. 99 EPÜ).</dd>" +
      "<dt>Patentfamilie</dt><dd>Alle Anmeldungen und Patente, die auf dieselbe Erfindung und dieselbe Priorität zurückgehen, etwa eine deutsche und eine europäische Fassung.</dd>" +
      "<dt>Kind-Codes</dt><dd>Kennbuchstaben hinter der Nummer. DE: A1 Offenlegungsschrift, B3 Patentschrift ohne vorherige Offenlegung, B4 Patentschrift nach Offenlegung, U1 Gebrauchsmuster. EP: A1 Anmeldung mit Recherchenbericht, A2 Anmeldung ohne Recherchenbericht, B1 Patentschrift, B2 geänderte Patentschrift nach Einspruch. WO: A1 internationale Anmeldung.</dd>" +
      "<dt>Einheitliche Wirkung</dt><dd>Europäische Patente können nach der Erteilung einheitliche Wirkung in den teilnehmenden EU-Staaten erhalten (Einheitspatent). Den Status zeigt das Europäische Patentregister.</dd></dl>" +
      "<h2>Datenschutz</h2><p>Diese Seite setzt keine Cookies, verwendet keine Analyse- oder Tracking-Dienste und lädt keine Inhalte von fremden Servern. Merkliste und Farbmodus werden nur im eigenen Browser gespeichert.</p>" +
      '<h2>Benachrichtigung</h2><p>Der <a href="feed.xml">RSS-Feed</a> enthält die wöchentlichen Neuheiten und lässt sich mit einem RSS-zu-E-Mail-Dienst abonnieren.</p></div>';
  }
  hinweise.titel = function () { return "Hinweise"; };

  function nichtGefunden() { return leer("Diese Seite gibt es nicht.", "") + '<p style="margin-top:14px"><a href="#/">Zur Übersicht</a></p>'; }

  /* ---------- Export ---------- */
  function exportKnoepfe() {
    return '<button type="button" class="knopf klein" data-export="xlsx">' + ICON.export + 'Excel</button><button type="button" class="knopf klein" data-export="csv">' + ICON.export + "CSV</button>";
  }
  function exportZeilen(liste) {
    return liste.map(function (e) {
      return {
        "Titel": e.titel, "Originaltitel": e.titel_original, "Art": e.art, "Amt": e.amt, "Nummer": e.nummer,
        "Familienmitglieder": (e.familie || []).map(function (f) { return f.nummer; }).join(", "),
        "Anmelder": (e.anmelder || []).join("; "), "Veröffentlicht": e.veroeffentlicht || "", "Angemeldet": e.angemeldet || "", "Priorität": e.prioritaet || "",
        "Thema": themaName(e.thema), "Relevanz": e.relevanz, "Patentklassen": (e.klassen || []).join(", "),
        "Einspruch bis": e.einspruch_bis || "", "Was ist neu": e.was_neu, "Bezug": e.bezug,
        "Espacenet": ((e.links || [])[0] || {}).url || "", "Im Radar seit": e.aufgenommen || "",
        "Link": location.href.split("#")[0] + "#/eintrag/" + encodeURIComponent(e.id)
      };
    });
  }
  function dateiname(endung) { return "patent-radar-" + heute() + "." + endung; }
  function exportieren(art) {
    var zeilen = exportZeilen(aktuelleListe);
    if (!zeilen.length) { toast("Keine Einträge zum Exportieren."); return; }
    if (art === "csv") {
      var spalten = Object.keys(zeilen[0]);
      var csv = "﻿" + [spalten.join(";")].concat(zeilen.map(function (z) {
        return spalten.map(function (s) { var v = String(z[s] == null ? "" : z[s]); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(";");
      })).join("\r\n");
      herunterladen(new Blob([csv], { type: "text/csv;charset=utf-8" }), dateiname("csv"));
      return;
    }
    ladeXlsx(function (ok) {
      if (!ok) { toast("Excel-Export konnte nicht geladen werden."); return; }
      var ws = window.XLSX.utils.json_to_sheet(zeilen);
      ws["!cols"] = Object.keys(zeilen[0]).map(function (k) { return { wch: Math.min(60, Math.max(10, k.length + 2)) }; });
      var wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Patent-Radar");
      window.XLSX.writeFile(wb, dateiname("xlsx"));
    });
  }
  function ladeXlsx(cb) {
    if (window.XLSX) return cb(true);
    var s = document.createElement("script");
    s.src = "assets/vendor/xlsx.mini.min.js";
    s.onload = function () { cb(!!window.XLSX); };
    s.onerror = function () { cb(false); };
    document.head.appendChild(s);
  }
  function herunterladen(blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- Ereignisse ---------- */
  function binden() {
    main.querySelectorAll("[data-merken]").forEach(function (b) {
      b.addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var id = b.getAttribute("data-merken");
        var jetzt = Merk.umschalten(id);
        b.setAttribute("aria-pressed", jetzt);
        b.setAttribute("aria-label", jetzt ? "Von der Merkliste entfernen" : "Auf die Merkliste");
        var sp = b.querySelector("span"); if (sp) sp.textContent = jetzt ? "Gemerkt" : "Merken";
        toast(jetzt ? "Auf die Merkliste gesetzt." : "Von der Merkliste entfernt.");
        if (route().name === "merkliste" && !jetzt) zeichnen(false);
      });
    });
    main.querySelectorAll("[data-teilen]").forEach(function (b) {
      b.addEventListener("click", function () {
        var url = location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { toast("Link kopiert."); }, function () { prompt("Link zum Kopieren:", url); });
        else prompt("Link zum Kopieren:", url);
      });
    });
    main.querySelectorAll("[data-export]").forEach(function (b) {
      b.addEventListener("click", function () { exportieren(b.getAttribute("data-export")); });
    });
    main.querySelectorAll("[data-ansicht]").forEach(function (b) {
      b.addEventListener("click", function () {
        var r = route(); var p = r.params;
        if (b.getAttribute("data-ansicht") === "tabelle") p.set("ansicht", "tabelle"); else p.delete("ansicht");
        history.replaceState(null, "", hashMit("schutzrechte", p)); zeichnen(false);
      });
    });
    main.querySelectorAll("[data-sort]").forEach(function (b) {
      b.addEventListener("click", function () {
        var r = route(); var p = r.params; var k = b.getAttribute("data-sort");
        if (k === "datum") p.delete("sort"); else p.set("sort", k);
        history.replaceState(null, "", hashMit("schutzrechte", p)); zeichnen(false);
      });
    });
    main.querySelectorAll("[data-drucken]").forEach(function (b) { b.addEventListener("click", function () { window.print(); }); });
  }

  /* ---------- Start ---------- */
  function json(pfad, v) {
    return fetch(pfad + "?v=" + encodeURIComponent(v || Date.now()), { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(pfad + ": " + r.status);
      return r.json();
    });
  }
  Merk.laden(); Merk.zaehler();
  json("data/radar.json").then(function (radar) {
    D.radar = radar;
    radar.eintraege.forEach(function (e) { D.byId[e.id] = e; });
    (radar.weiterleitungen || []).forEach(function (w) { if (D.byId[w.zu]) D.byId[w.von] = D.byId[w.zu]; });
    var st = document.getElementById("fuss-stand");
    if (st) st.textContent = "Stand " + datum(radar.stand);
    return Promise.all([
      json("data/news.json", radar.stand).catch(function () { return []; }),
      json("data/berichte.json", radar.stand).catch(function () { return []; })
    ]);
  }).then(function (r) {
    D.news = r[0] || []; D.berichte = r[1] || [];
    zeichnen(false);
  }).catch(function (err) {
    main.innerHTML = '<div class="seite">' + leer("Die Daten konnten nicht geladen werden.", "Bitte die Seite neu laden. Besteht das Problem weiter, liegt eine Störung bei der Aktualisierung vor.") + "</div>";
    if (window.console) console.error(err);
  });
})();
