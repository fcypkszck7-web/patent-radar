/* Patent-Radar Bau & Dach – Anwendung. Statisch, ohne externe Abrufe, ohne Cookies. */
(function () {
  "use strict";

  var THEMEN = [
    { key: "entwaesserung", knapp: "Entwässerung", name: "Dachentwässerung", kurz: "Rinnen, Rinnenhalter, Fallrohre, Laubschutz, Flachdach- und Notentwässerung" },
    { key: "sicherheit", knapp: "Sicherheit", name: "Dachsicherheit", kurz: "Dachtritte, Laufanlagen, Sicherheitsdachhaken, Absturzsicherung, Anschlagpunkte" },
    { key: "schneeschutz", knapp: "Schneeschutz", name: "Schneeschutz", kurz: "Schneefang, Schneefanggitter, Schneestopper" },
    { key: "solar", knapp: "Solar", name: "Solar auf dem Dach", kurz: "Befestigung und Montagesysteme, auch mit Schneeschutz" },
    { key: "zubehoer", knapp: "Zubehör", name: "Dachzubehör und Anschlüsse", kurz: "Durchführungen, Lüftung, Kamin- und Wandanschlüsse, Blitzschutz" },
    { key: "gruendach", knapp: "Gründach", name: "Gründach, Regenwasser und Dämmung", kurz: "Begrünung, Regenwassernutzung, Dämmung" },
    { key: "werkstoffe", knapp: "Werkstoffe", name: "Werkstoffe und Fertigung", kurz: "Bleche, Beschichtungen, Umform- und Fügeverfahren mit Dachbezug" },
    { key: "deckung", knapp: "Deckung", name: "Dachdeckung und Abdichtung", kurz: "Steil-, Flach- und Metalldach, Bahnen, Unterkonstruktion" }
  ];  var THEMA = {};
  THEMEN.forEach(function (t) { THEMA[t.key] = t; });
  var ARTEN = ["Offenlegung", "Erteilung", "Gebrauchsmuster", "Internationale Anmeldung"];
  var BEZUG = { entwaesserung: 10, sicherheit: 20, schneeschutz: 30, solar: 40, zubehoer: 50, gruendach: 60, werkstoffe: 70, deckung: 80 };
  var RUBRIKEN = [
    { key: "erteilungen", art: "Erteilung", name: "Erteilungen", codes: "B1, B2, B3, B4", kurz: "Geprüft und erteilt, mit Einspruchsfrist",
      text: "Geprüfte und erteilte Patente. Ab der Veröffentlichung der Erteilung kann neun Monate lang Einspruch eingelegt werden." },
    { key: "offenlegungen", art: "Offenlegung", name: "Offenlegungen", codes: "A1, A2", kurz: "Veröffentlichte Anmeldungen, noch ohne Schutz",
      text: "Veröffentlichte Patentanmeldungen. Sie entfalten noch keinen vollen Schutz, zeigen aber früh, woran gearbeitet wird." },
    { key: "gebrauchsmuster", art: "Gebrauchsmuster", name: "Gebrauchsmuster", codes: "U1", kurz: "Eingetragen ohne Prüfung, schnell wirksam",
      text: "Eingetragene Schutzrechte ohne Prüfung auf Neuheit. Sie wirken ab der Eintragung und lassen sich mit einem Löschungsantrag angreifen." },
    { key: "international", art: "Internationale Anmeldung", name: "International", codes: "WO A1", kurz: "PCT-Anmeldungen, nur klar passende",
      text: "Internationale Anmeldungen nach dem Patentzusammenarbeitsvertrag (PCT). Aufgenommen werden nur thematisch klar passende." }
  ];
  var RUBRIK = {}, RUBRIK_NACH_ART = {};
  RUBRIKEN.forEach(function (r) { RUBRIK[r.key] = r; RUBRIK_NACH_ART[r.art] = r; });
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
  function zThema(k, klasse) {
    var z = window.PRZ && window.PRZ.thema[k];
    return z ? '<svg class="' + (klasse || "ic-thema") + '" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' + z + "</svg>" : "";
  }
  function zRubrik(k, klasse) {
    var z = window.PRZ && window.PRZ.rubrik[k];
    return z ? '<svg class="' + (klasse || "ic-rubrik") + '" viewBox="0 0 56 56" aria-hidden="true" focusable="false">' + z + "</svg>" : "";
  }
  function kindMarke(e) {
    var rb = RUBRIK_NACH_ART[e.art];
    return '<span class="kind kind-' + (rb ? rb.key : "x") + '" title="' + esc(e.art) + '"><small>' + esc(e.amt) + "</small>" + esc(e.kind || "") + "</span>";
  }
  function kindMini(art, amt, kind) {
    var rb = RUBRIK_NACH_ART[art];
    return '<span class="kind mini kind-' + (rb ? rb.key : "x") + '" title="' + esc(art || "") + '"><small>' + esc(amt || "") + "</small>" + esc(kind || "") + "</span>";
  }
  function kindAusNummer(nr) {
    var m = String(nr || "").match(/^([A-Z]{2})\s.*\s([A-Z]\d?)$/);
    return m ? { amt: m[1], kind: m[2] } : { amt: "", kind: "" };
  }
  function urgenz(t) { return t < 0 ? "abgelaufen" : t < 30 ? "unter-30" : t < 90 ? "unter-90" : "laeuft"; }

  /* ---------- Kopfband: Blaupause oben auf jeder Seite ---------- */
  function bandChip(c) {
    var inner = (c.wert != null ? "<strong>" + c.wert + "</strong>" : "") + "<span>" + esc(c.name) + "</span>";
    var stil = ' style="--cf:var(' + (c.farbe || "--band-tinte-2") + ')"';
    return c.link ? '<a class="band-chip" href="' + c.link + '"' + stil + ">" + inner + "</a>" : '<span class="band-chip"' + stil + ">" + inner + "</span>";
  }
  function kopfband(o) {
    var fig = o.fig != null ? o.fig : (o.figKey && window.PRZ && window.PRZ.seite && window.PRZ.seite[o.figKey]) || "";
    return '<header class="kopfband' + (o.unten ? " mit-reitern" : "") + (o.klasse ? " " + o.klasse : "") + '"' + (o.stil ? ' style="' + o.stil + '"' : "") + '><div class="kopfband-innen">' +
      '<div class="kopfband-text">' + (o.oben || "") +
      (o.kicker ? '<p class="kicker">' + o.kicker + "</p>" : "") +
      "<h1>" + o.titel + "</h1>" + (o.unterzeile || "") +
      (o.text ? '<p class="kopfband-satz">' + o.text + "</p>" : "") +
      (o.chips && o.chips.length ? '<div class="band-chips">' + o.chips.map(bandChip).join("") + "</div>" : "") +
      "</div>" + (fig ? '<figure class="seitenfigur"' + (o.figAttr || "") + ">" + fig + (o.figText ? "<figcaption>" + o.figText + "</figcaption>" : "") + "</figure>" : "") +
      "</div>" + (o.unten ? '<div class="kopfband-unten">' + o.unten + "</div>" : "") + "</header>";
  }
  var SYM = {
    alle: '<svg class="br-ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/></svg>',
    filter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16M7 12h10M10 17.5h4"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>',
    anmelder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 20V9.5L12 4.5l7.5 5V20"/><path d="M9.5 20v-5.5h5V20"/></svg>',
    karten: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4.5" width="16" height="6" rx="1.5"/><rect x="4" y="13.5" width="16" height="6" rx="1.5"/></svg>',
    tabelle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v13H4zM4 10h16M4 14.5h16M10 5.5v13"/></svg>',
    links: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6 8.5 12l6 6"/></svg>',
    rechts: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg>',
    pfeil: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 7l5 5-5 5"/></svg>',
    kalender: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    uhr: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    stern: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h12v17l-6-4.2-6 4.2z"/></svg>',
    rss: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11a8 8 0 0 1 8 8M5 5a14 14 0 0 1 14 14"/><circle class="punkt" cx="6" cy="18" r="1.4"/></svg>',
    radar: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12l6-6"/></svg>',
    seite: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8l4 4V20.5H6z"/><path d="M14 3.5v4h4M9 12h6M9 15.5h6"/></svg>'
  };
  /* Themen-Leiste mit Symbolen und Zahlen (wie die Branchen-Leiste des Start-up-Radars) */
  function themenFilter(liste, p, ziel) {
    var aktiv = p.get("thema");
    var zahl = {};
    liste.forEach(function (e) { zahl[e.thema] = (zahl[e.thema] || 0) + 1; });
    function link(k) {
      var q = new URLSearchParams(p);
      if (k) q.set("thema", k); else q.delete("thema");
      return hashMit(ziel, q);
    }
    return '<div class="kat-leiste"><button type="button" class="kat-pfeil links" aria-label="Themen nach links blättern" tabindex="-1">' + SYM.links + '</button>' +
      '<nav class="kat-spur" aria-label="Nach Thema filtern"><a class="kat" href="' + link("") + '"' + (!aktiv ? ' aria-current="true"' : "") + ">" + SYM.alle + '<span class="kat-name">Alle</span><span class="kat-zahl">' + liste.length.toLocaleString("de-DE") + "</span></a>" +
      THEMEN.map(function (t) {
        var n = zahl[t.key] || 0, an = aktiv === t.key;
        return '<a class="kat' + (n || an ? "" : " leer-thema") + '" href="' + link(an ? "" : t.key) + '" style="--f:var(--t-' + t.key + ')"' + (an ? ' aria-current="true"' : "") + ' title="' + esc(t.name + ": " + t.kurz) + '">' +
          zThema(t.key, "br-ic") + '<span class="kat-name">' + esc(t.knapp) + '</span><span class="kat-zahl">' + n.toLocaleString("de-DE") + "</span></a>";
      }).join("") + '</nav><button type="button" class="kat-pfeil rechts" aria-label="Themen nach rechts blättern" tabindex="-1">' + SYM.rechts + "</button></div>";
  }
  /* Klebende Filterleiste: Themen, Suche, Schnellfilter, Aufklappmenü, aktive Filter als Chips */
  function filterLeiste(o) {
    var mehr = o.mehr ? '<div class="pop-anker"><button type="button" class="knopf filter-knopf" data-pop="filter-pop" aria-expanded="false" aria-controls="filter-pop">' + SYM.filter + "Filter" +
      (o.mehrZahl ? '<b class="fl-zahl">' + o.mehrZahl + "</b>" : "") + '</button><div class="pop" id="filter-pop" role="group" aria-label="Weitere Filter" hidden><p class="pop-titel">Weitere Filter</p>' + o.mehr +
      '<div class="pop-fuss"><a class="knopf leise" href="' + o.zuruecksetzen + '">Alle zurücksetzen</a><button type="button" class="knopf primaer" data-pop-zu>Fertig</button></div></div></div>' : "";
    return '<div class="filterleiste"><div class="fl-innen">' + (o.kat || "") +
      (o.suche || o.schnell || mehr ? '<form class="fl-werkzeug" id="filter" role="search" onsubmit="return false">' + (o.suche || "") +
        (o.schnell ? '<div class="schnell" role="group" aria-label="Schnellfilter">' + o.schnell + "</div>" : "") + mehr + "</form>" : "") +
      '<div class="aktiv-filter">' + (o.chips || []).map(function (c) {
        return '<a class="af-chip" href="' + c.weg + '" aria-label="Filter entfernen: ' + esc(c.text) + '">' + esc(c.text) + SYM.x + "</a>";
      }).join("") + ((o.chips || []).length > 1 ? '<a class="af-alle" href="' + o.zuruecksetzen + '">Alle Filter entfernen</a>' : "") + "</div></div></div>";
  }
  function ohneParam(ziel, p, k) { var q = new URLSearchParams(p); q.delete(k); return hashMit(ziel, q); }
  function schnellLink(ziel, p, k, v, text, title) {
    var an = p.get(k) === v, q = new URLSearchParams(p);
    if (an) q.delete(k); else q.set(k, v);
    return '<a class="schnell-knopf" href="' + hashMit(ziel, q) + '"' + (an ? ' aria-current="true"' : "") + (title ? ' title="' + esc(title) + '"' : "") + ">" + text + "</a>";
  }
  function exportMenue(mitDruck) {
    return '<div class="pop-anker"><button type="button" class="knopf" data-pop="export-pop" aria-expanded="false" aria-controls="export-pop">' + ICON.export + 'Exportieren</button>' +
      '<div class="pop pop-menue rechts" id="export-pop" hidden>' +
      '<button type="button" class="pop-eintrag" data-export="xlsx">' + ICON.export + "<span><b>Excel-Tabelle</b><small>Alle Einträge dieser Auswahl als .xlsx</small></span></button>" +
      '<button type="button" class="pop-eintrag" data-export="csv">' + ICON.export + "<span><b>CSV-Datei</b><small>Für andere Programme</small></span></button>" +
      '<button type="button" class="pop-eintrag" data-teilen>' + ICON.teilen + "<span><b>Link kopieren</b><small>Mit allen Filtern, zum Weitergeben</small></span></button>" +
      (mitDruck ? '<button type="button" class="pop-eintrag" data-drucken>' + ICON.druck + "<span><b>Drucken</b><small>Druckansicht dieser Seite</small></span></button>" : "") +
      "</div></div>";
  }
  function themaChip(k, n, link) {
    var inner = '<span class="tc-punkt"></span>' + esc(themaName(k)) + (n != null ? " <b>" + n + "</b>" : "");
    return link ? '<a class="thema-chip" style="' + themaStil(k) + '" href="' + link + '">' + inner + "</a>" : '<span class="thema-chip" style="' + themaStil(k) + '">' + inner + "</span>";
  }
  function datumKachel(iso, klasse) {
    var p = String(iso || "").split("-");
    if (p.length < 3) return "";
    return '<span class="datum-kachel ' + (klasse || "") + '" aria-hidden="true"><b>' + p[2] + "</b><span>" + MONATE[parseInt(p[1], 10) - 1] + "</span><small>" + p[0] + "</small></span>";
  }
  function themenBalken(zaehlung, beschriftung) {
    var summe = THEMEN.reduce(function (a, t) { return a + (zaehlung[t.key] || 0); }, 0);
    if (!summe) return "";
    return '<div class="themen-balken" role="img" aria-label="' + esc(beschriftung + ": " + THEMEN.filter(function (t) { return zaehlung[t.key]; }).map(function (t) { return t.name + " " + zaehlung[t.key]; }).join(", ")) + '">' +
      THEMEN.filter(function (t) { return zaehlung[t.key]; }).map(function (t) {
        var n = zaehlung[t.key];
        return '<span style="' + themaStil(t.key) + ";flex-grow:" + n + '" data-tip="' + esc(t.name + ": " + n + " " + plural(n, "Eintrag", "Einträge")) + '"></span>';
      }).join("") + "</div>";
  }
  var LAENDER = { DE: "Deutschland", US: "USA", FR: "Frankreich", NL: "Niederlande", CH: "Schweiz", AT: "Österreich", IT: "Italien", GB: "Vereinigtes Königreich",
    DK: "Dänemark", BE: "Belgien", PL: "Polen", SE: "Schweden", FI: "Finnland", NO: "Norwegen", ES: "Spanien", PT: "Portugal", CZ: "Tschechien", SK: "Slowakei",
    SI: "Slowenien", HU: "Ungarn", LU: "Luxemburg", IE: "Irland", CN: "China", JP: "Japan", KR: "Südkorea", TW: "Taiwan", CA: "Kanada", AU: "Australien",
    IL: "Israel", TR: "Türkei", LI: "Liechtenstein", LT: "Litauen", LV: "Lettland", EE: "Estland", GR: "Griechenland", RO: "Rumänien", HR: "Kroatien", IN: "Indien", NZ: "Neuseeland", SG: "Singapur" };
  function landName(c) { return LAENDER[c] || c || "unbekannt"; }

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
    umschalten: function (id, ohneZaehler) {
      var i = this.ids.indexOf(id);
      if (i >= 0) this.ids.splice(i, 1); else this.ids.push(id);
      this.speichern(); if (!ohneZaehler) this.zaehler(true);
      return i < 0;
    },
    zaehler: function (pop) {
      var z = document.querySelector(".merk-zahl"), l = document.querySelector(".merk-link");
      if (!z) return;
      z.hidden = !this.ids.length;
      if (window.Bewegung) window.Bewegung.zahl(z, this.ids.length, !pop); else z.textContent = this.ids.length;
      if (l) l.classList.toggle("hat", this.ids.length > 0);
      if (pop && !reduziert && this.ids.length) {
        if (window.Bewegung) window.Bewegung.stoss(z);
        else { z.classList.remove("pop"); void z.offsetWidth; z.classList.add("pop"); }
      }
    }
  };

  /* ---------- Thema (hell/dunkel) ---------- */
  document.getElementById("thema-schalter").addEventListener("click", function () {
    var root = document.documentElement;
    var neu = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", neu);
    var tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute("content", neu === "light" ? "#dfe5eb" : "#1d2935");
    try { localStorage.setItem("pr-farbschema", neu); } catch (e) {}
    toast(neu === "light" ? "Helles Farbschema" : "Dunkles Farbschema (Schiefer)");
  });

  /* ---------- Gleitende Markierung in der Hauptnavigation ---------- */
  function navZeiger(sofort) {
    var z = document.querySelector(".nav-zeiger"), a = document.querySelector('.hauptnav a[aria-current="page"]');
    if (!z) return;
    if (!a || !a.offsetWidth) { z.style.opacity = "0"; return; }
    var nav = z.parentNode, l = a.offsetLeft + 8, r = nav.clientWidth - a.offsetLeft - a.offsetWidth + 8;
    var still = sofort || !z.classList.contains("bereit") || z.style.opacity === "0";
    if (window.Bewegung) {
      /* Gummiband: die vordere Kante eilt voraus, die hintere zieht nach */
      z.style.width = "auto"; z.style.transform = "none";
      window.Bewegung.gleite(z, l, r, still);
    } else {
      z.style.width = (a.offsetWidth - 16) + "px";
      z.style.transform = "translateX(" + l + "px)";
    }
    z.style.opacity = "1";
    if (!z.classList.contains("bereit")) requestAnimationFrame(function () { z.classList.add("bereit"); });
  }
  window.addEventListener("resize", function () { navZeiger(true); });

  /* ---------- Mobile Leiste: „Mehr“ ---------- */
  (function () {
    var k = document.querySelector(".un-mehr"), m = document.getElementById("un-menue");
    if (!k || !m) return;
    k.addEventListener("click", function (ev) {
      ev.stopPropagation();
      var auf = m.hidden; m.hidden = !auf; k.setAttribute("aria-expanded", String(auf));
    });
    document.addEventListener("click", function (ev) { if (!m.hidden && !m.contains(ev.target)) { m.hidden = true; k.setAttribute("aria-expanded", "false"); } });
    m.addEventListener("click", function () { m.hidden = true; k.setAttribute("aria-expanded", "false"); });
  })();

  /* ---------- Routing ---------- */
  function route() {
    var h = location.hash.replace(/^#\/?/, "");
    var teile = h.split("?");
    var pfad = teile[0].split("/").filter(Boolean).map(decodeURIComponent);
    var params = new URLSearchParams(teile[1] || "");
    return { name: pfad[0] || "uebersicht", arg: pfad[1] || null, params: params };
  }
  function setzeNav(name) {
    var n = name === "eintrag" || RUBRIK[name] ? "schutzrechte" : name;
    document.querySelectorAll("[data-route]").forEach(function (a) {
      if (a.getAttribute("data-route") === n) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    var mehr = document.querySelector(".un-mehr");
    if (mehr) mehr.classList.toggle("aktiv", ["anmelder", "news", "berichte", "merkliste", "hinweise"].indexOf(n) >= 0);
    navZeiger();
  }
  function hashMit(name, params) {
    var q = params.toString();
    return "#/" + name + (q ? "?" + q : "");
  }

  var ANSICHTEN = {
    uebersicht: uebersicht, schutzrechte: schutzrechte, eintrag: eintrag, fristen: fristen, bestand: bestand,
    anmelder: anmelder, news: news, berichte: berichte, hinweise: hinweise, merkliste: merkliste
  };
  RUBRIKEN.forEach(function (rb) {
    var fn = function (r) { return schutzrechte(r, rb); };
    fn.titel = function () { return rb.name; };
    fn.danach = function (r) { schutzrechte.danach(r); };
    ANSICHTEN[rb.key] = fn;
  });
  var letzteRoute = "", gezeichnet = {};
  function flipErfassen() {
    if (window.Bewegung) return window.Bewegung.flipErfassen(main, "data-flip");
    var m = {};
    if (reduziert) return m;
    var vh = window.innerHeight;
    main.querySelectorAll("[data-flip]").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom > -80 && r.top < vh + 80) m[el.getAttribute("data-flip")] = r;
    });
    return m;
  }
  function flipAbspielen(alt) {
    if (window.Bewegung) return window.Bewegung.flipAbspielen(main, "data-flip", alt);
    if (reduziert || !alt || !Element.prototype.animate) return;
    var vh = window.innerHeight, n = 0;
    main.querySelectorAll("[data-flip]").forEach(function (el) {
      if (n > 60) return;
      var r = el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) return;
      var a = alt[el.getAttribute("data-flip")];
      n++;
      if (a) {
        var dx = a.left - r.left, dy = a.top - r.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        el.animate([{ transform: "translate(" + dx + "px," + dy + "px)" }, { transform: "none" }], { duration: 460, easing: "cubic-bezier(.2,.7,.2,1)" });
      } else {
        el.animate([{ opacity: 0, transform: "translateY(10px) scale(.98)" }, { opacity: 1, transform: "none" }], { duration: 340, delay: Math.min(n, 12) * 18, easing: "ease-out", fill: "backwards" });
      }
    });
  }
  var NAV_REIHE = ["uebersicht", "schutzrechte", "bestand", "fristen", "anmelder", "news", "berichte", "merkliste", "hinweise"];
  function navIndex(name) { var n = name === "eintrag" || RUBRIK[name] ? "schutzrechte" : name; return NAV_REIHE.indexOf(n); }
  var leit = null, letzterName = null;
  /* Kacheln und die Top 5 neigen sich zum Mauszeiger, ein Lichtreflex wandert mit */
  if (window.Bewegung) { window.Bewegung.neigen(".bento > .kachel"); window.Bewegung.neigen(".top5 .t5"); }
  function zahlLesen(el) {
    if (!el) return null;
    var n = parseInt((el.querySelector(".bw-sr") || el).textContent.replace(/\D/g, ""), 10);
    return isNaN(n) ? null : n;
  }
  function zeichnen(fokus, flip) {
    var alt = flip ? flipErfassen() : null;
    var altZahl = zahlLesen(main.querySelector(".ergebnis-zahl .ez-n"));
    var r = route();
    if (r.name === "schutzrechte" && RUBRIK_NACH_ART[r.params.get("art")]) {
      var ziel = RUBRIK_NACH_ART[r.params.get("art")].key;
      r.params.delete("art");
      history.replaceState(null, "", hashMit(ziel, r.params));
      r = route();
    }
    var fn = ANSICHTEN[r.name] || nichtGefunden;
    setzeNav(r.name);
    main.innerHTML = '<div class="seite' + (fokus === false ? "" : " einblenden") + '" data-seite="' + esc(RUBRIK[r.name] ? "schutzrechte" : r.name) + '">' + fn(r) + "</div>";
    document.title = (fn.titel ? fn.titel(r) + " – " : "") + "Patent-Radar Bau & Dach";
    if (fn.danach) fn.danach(r);
    binden();
    var figKey = RUBRIK[r.name] ? "schutzrechte" : r.name === "berichte" && r.arg ? "bericht" : r.name;
    main.querySelectorAll(".seitenfigur .fig-zeichnung").forEach(function (svg) {
      if (reduziert || gezeichnet[figKey]) return;
      svg.classList.add("zeichnet");
    });
    gezeichnet[figKey] = true;
    var schluessel = r.name + "/" + (r.arg || "");
    if (fokus && schluessel !== letzteRoute) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
    letzteRoute = schluessel;
    filterHoehe();
    if (alt) flipAbspielen(alt);
    if (window.Bewegung) {
      /* Trefferzahl rollt beim Filtern wie ein Zählwerk */
      var zEl = main.querySelector(".ergebnis-zahl .ez-n");
      if (zEl && flip && altZahl != null) window.Bewegung.rolle(zEl, altZahl, zahlLesen(zEl));
      /* Kamerafahrt beim Bereichswechsel: Zeichnung fährt aus der Klickrichtung ins Bild, Titel steigt Buchstabe für Buchstabe auf */
      if (fokus && letzterName && letzterName !== r.name && !zeichnen.ohneKamera) {
        var dir = navIndex(r.name) >= navIndex(letzterName) ? 1 : -1;
        window.Bewegung.kamera({ bild: main.querySelector(".kopfband .seitenfigur") || main.querySelector(".detail-band .db-bild"), titel: main.querySelector(".kopfband h1"), text: main.querySelector(".kopfband .kopfband-satz"), dir: dir });
      }
      /* Zeitleiste: Linie füllt sich beim Scrollen, die aktuelle Woche rastet ein */
      if (!leit) leit = new window.Bewegung.Leitlinie({ gruppe: ".tag-gruppe", zahl: ".td-tag", kopf: .42 });
      leit.neu(main.querySelector(".zeitleiste"));
    }
    letzterName = r.name;
  }
  /* Filterleiste: Höhe merken (für klebende Wochenmarken) und beim Runterscrollen ausweichen */
  function filterHoehe() {
    var fl = main.querySelector(".filterleiste");
    document.documentElement.style.setProperty("--filter-h", (fl ? fl.offsetHeight : 0) + "px");
  }
  var letzteY = window.scrollY;
  window.addEventListener("scroll", function () {
    var fl = main.querySelector(".filterleiste"), y = window.scrollY;
    if (fl) {
      var offen = fl.querySelector(".pop:not([hidden])") || fl.contains(document.activeElement);
      if (y > letzteY + 8 && y > 520 && !offen) fl.classList.add("weg");
      else if (y < letzteY - 8 || y < 300) fl.classList.remove("weg");
    }
    letzteY = y;
  }, { passive: true });
  /* Karte wächst zur Detailseite: Materialbild und Titel wandern mit; zurück geht es an dieselbe Stelle */
  var morphQuelle = null, morphZurueck = null;
  function morphTeile(k) {
    return { "bw-bild": k && k.querySelector(".karte-bild, .t5-bild, .mini-bild"), "bw-titel": k && k.querySelector("h3 a, .t5-titel, .kl-name") };
  }
  function ohneKamera(fn) { return function () { zeichnen.ohneKamera = true; try { fn(); } finally { zeichnen.ohneKamera = false; } }; }
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href^="#/eintrag/"]');
    if (!a || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    var k = a.closest(".karte, .t5, .k-liste li");
    morphQuelle = k ? { id: decodeURIComponent(a.getAttribute("href").slice(10)), teile: morphTeile(k), hash: location.hash || "#/", y: window.scrollY } : null;
  }, true);
  window.addEventListener("hashchange", function () {
    var r = route(), q = morphQuelle, z = morphZurueck;
    morphQuelle = null;
    if (window.Bewegung && q && r.name === "eintrag" && r.arg === q.id) {
      morphZurueck = { hash: q.hash, y: q.y, id: q.id };
      window.Bewegung.morph(q.teile, ohneKamera(function () { zeichnen(true); }), function () {
        return { "bw-bild": main.querySelector(".detail-band .db-bild"), "bw-titel": main.querySelector(".detail-band h1") };
      });
      return;
    }
    morphZurueck = null;
    if (window.Bewegung && z && letzterName === "eintrag" && (location.hash || "#/") === z.hash) {
      window.Bewegung.morph({ "bw-bild": main.querySelector(".detail-band .db-bild"), "bw-titel": main.querySelector(".detail-band h1") },
        ohneKamera(function () { zeichnen(true); window.scrollTo(0, z.y); }),
        function () { var a = main.querySelector('a[href="#/eintrag/' + encodeURIComponent(z.id) + '"]'); return morphTeile(a && a.closest(".karte, .t5, .k-liste li")); });
      return;
    }
    zeichnen(true);
  });

  /* ---------- Bausteine ---------- */
  function fristPille(e) {
    if (!e.einspruch_bis) return "";
    var t = tageBis(e.einspruch_bis), fk = fristKlasse(e);
    return '<span class="frist-pille ' + fk + '">' + SYM.uhr + (t < 0 ? "Einspruchsfrist abgelaufen" : "Einspruch bis " + datum(e.einspruch_bis) + (t < 90 ? " · noch " + t + " " + plural(t, "Tag", "Tage") : "")) + "</span>";
  }
  function merkKnopf(e, klasse) {
    var merk = Merk.hat(e.id);
    return '<button type="button" class="' + (klasse || "stern") + ' merken" data-merken="' + esc(e.id) + '" aria-pressed="' + merk + '" aria-label="' + (merk ? "Von der Merkliste entfernen" : "Auf die Merkliste") + '" title="Merken">' + ICON.merken + (klasse ? "<span>" + (merk ? "Gemerkt" : "Merken") + "</span>" : "") + "</button>";
  }
  /* Karte: Text links, Materialbild des Themas rechts (wie die Terminkarten des Start-up-Radars) */
  function karte(e, opt) {
    opt = opt || {};
    var oben = '<span class="art-text">' + esc(e.art) + '</span><span class="k-datum">' + datum(e.veroeffentlicht) + "</span>" +
      (e.neu_erteilt ? '<span class="etikett neu-erteilt">neu erteilt</span>' : "") + (opt.neuMarke && e.neu ? '<span class="etikett neu">neu</span>' : "");
    var anm = '<span class="k-anm">' + SYM.anmelder + esc((e.anmelder || []).join(", ") || "Anmelder unbekannt") + "</span>";
    if (opt.kompakt) {
      return '<li class="karte kompakt" data-flip="' + esc(e.id) + '" style="' + themaStil(e.thema) + '"><div class="karte-inhalt"><div class="karte-oben">' + kindMini(e.art, e.amt, e.kind) + oben + "</div>" +
        '<h3><a href="#/eintrag/' + encodeURIComponent(e.id) + '">' + esc(e.titel) + "</a></h3>" +
        '<div class="karte-unten">' + anm + fristPille(e) + "</div></div></li>";
    }
    return '<li class="karte" data-flip="' + esc(e.id) + '" style="' + themaStil(e.thema) + '">' +
      '<div class="karte-inhalt"><div class="karte-oben">' + oben + "</div>" +
      '<h3><a href="#/eintrag/' + encodeURIComponent(e.id) + '">' + esc(e.titel) + "</a></h3>" +
      '<p class="neu-text">' + esc(e.was_neu) + "</p>" +
      '<div class="karte-unten">' + anm + '<span class="thema-pille">' + zThema(e.thema, "tp-ic") + esc(THEMA[e.thema] ? THEMA[e.thema].knapp : themaName(e.thema)) + "</span>" +
      '<span class="relevanz ' + esc(e.relevanz) + '">' + (e.relevanz === "hoch" ? "hoch relevant" : "mittel") + "</span>" + fristPille(e) + "</div></div>" +
      '<div class="karte-bild mb-' + (THEMA[e.thema] ? e.thema : "x") + '">' + kindMarke(e) + merkKnopf(e) + "</div></li>";
  }
  /* Zeitleiste: Monate, darin Veröffentlichungswochen mit klebender Wochenmarke */
  function wochenRahmen(iso) {
    var d = new Date(iso + "T00:00:00Z"), tag = (d.getUTCDay() + 6) % 7;
    var mo = new Date(d); mo.setUTCDate(d.getUTCDate() - tag);
    var so = new Date(mo); so.setUTCDate(mo.getUTCDate() + 6);
    var a = mo.getUTCDate() + "." + (mo.getUTCMonth() !== so.getUTCMonth() ? " " + MONATE[mo.getUTCMonth()] : "");
    return a + "–" + so.getUTCDate() + ". " + MONATE[so.getUTCMonth()];
  }
  function zeitleiste(liste, feld, opt) {
    opt = opt || {};
    feld = feld || "veroeffentlicht";
    var jeMonat = {};
    liste.forEach(function (e) { var m = String(e[feld]).slice(0, 7); jeMonat[m] = (jeMonat[m] || 0) + 1; });
    var html = "", monat = "", woche = "", offen = false;
    liste.forEach(function (e) {
      var d = String(e[feld]), m = d.slice(0, 7), w = kw(d), wk = m + "|" + w.jahr + "-" + w.woche;
      if (m !== monat) {
        if (offen) html += "</ul></div>";
        offen = false; monat = m; woche = "";
        html += '<h2 class="monat-kopf" id="m-' + m + '">' + MONATE_LANG[parseInt(m.slice(5), 10) - 1] + " " + m.slice(0, 4) + " <span>" + jeMonat[m] + " " + plural(jeMonat[m], "Schutzrecht", "Schutzrechte") + "</span></h2>";
      }
      if (wk !== woche) {
        if (offen) html += "</ul></div>";
        woche = wk; offen = true;
        html += '<div class="tag-gruppe" data-woche="' + w.jahr + "-" + w.woche + '"><div class="tag-datum"><span class="td-wt">KW</span><span class="td-tag">' + w.woche + '</span><span class="td-sub">' + wochenRahmen(d) + '</span></div><ul class="liste karten">';
      }
      html += karte(e, opt);
    });
    if (offen) html += "</ul></div>";
    return '<div class="zeitleiste">' + html + "</div>";
  }
  /* Seitenspalte: Monatskalender (Punkte an Tagen mit Einträgen) und Kennzahlen der Auswahl */
  function kalender(liste, feld, monat, ziel) {
    var tage = {};
    liste.forEach(function (e) { var d = e[feld]; if (d) tage[d] = (tage[d] || 0) + 1; });
    var j = parseInt(monat.slice(0, 4), 10), m = parseInt(monat.slice(5, 7), 10) - 1;
    var erster = new Date(Date.UTC(j, m, 1)), versatz = (erster.getUTCDay() + 6) % 7, anzahl = new Date(Date.UTC(j, m + 1, 0)).getUTCDate();
    var h = heute(), html = '<div class="kal" data-monat="' + monat + '" data-feld="' + feld + '"><div class="kal-kopf"><button type="button" class="kal-pfeil" data-kal="-1" aria-label="Vormonat">' + SYM.links + "</button>" +
      "<strong>" + MONATE_LANG[m] + " " + j + '</strong><button type="button" class="kal-pfeil" data-kal="1" aria-label="Nächster Monat">' + SYM.rechts + "</button></div>" +
      '<div class="kal-raster" role="group" aria-label="Tage im ' + MONATE_LANG[m] + '"><span class="kal-wt">Mo</span><span class="kal-wt">Di</span><span class="kal-wt">Mi</span><span class="kal-wt">Do</span><span class="kal-wt">Fr</span><span class="kal-wt">Sa</span><span class="kal-wt">So</span>';
    for (var i = 0; i < versatz; i++) html += "<span></span>";
    for (var dTag = 1; dTag <= anzahl; dTag++) {
      var iso = monat + "-" + String(dTag).padStart(2, "0"), n = tages(iso);
      html += n ? '<button type="button" class="kal-tag hat' + (iso === h ? " heute" : "") + '" data-tag="' + iso + '" aria-label="' + datum(iso) + ": " + n + " " + plural(n, "Eintrag", "Einträge") + '">' + dTag + '<i style="--n:' + Math.min(n, 4) + '"></i></button>'
        : '<span class="kal-tag' + (iso === h ? " heute" : "") + '">' + dTag + "</span>";
    }
    function tages(iso) { return tage[iso] || 0; }
    return html + "</div></div>";
  }
  function auswahlStatistik(liste, titel) {
    var max = 1, z = {};
    RUBRIKEN.forEach(function (rb) { z[rb.key] = liste.filter(function (e) { return e.art === rb.art; }).length; max = Math.max(max, z[rb.key]); });
    var hoch = liste.filter(function (e) { return e.relevanz === "hoch"; }).length, frist = liste.filter(fristLaeuft).length;
    return '<div class="sk-karte"><p class="sk-titel">' + esc(titel || "In dieser Auswahl") + '</p><p class="sk-zahl">' + liste.length.toLocaleString("de-DE") + " " + plural(liste.length, "Schutzrecht", "Schutzrechte") + "</p>" +
      '<ul class="sk-balken">' + RUBRIKEN.map(function (rb) {
        return '<li style="--sf:var(--r-' + rb.key + ')"><span>' + esc(rb.name) + "</span><b>" + z[rb.key] + '</b><i><em style="width:' + Math.round(100 * z[rb.key] / max) + '%"></em></i></li>';
      }).join("") + "</ul>" +
      '<dl class="sk-werte"><div><dt>hoch relevant</dt><dd>' + hoch + "</dd></div><div><dt>mit laufender Einspruchsfrist</dt><dd>" + frist + "</dd></div></dl></div>";
  }
  function leer(titel, text) {
    return '<div class="leer"><strong>' + esc(titel) + "</strong>" + (text ? esc(text) : "") + "</div>";
  }
  function kennzahlBlock(werte) {
    return '<div class="kennzahlen">' + werte.map(function (w) {
      var inner = '<div class="kennzahl-wert zahl" data-zaehlen="' + w.wert + '">' + w.wert + '</div><div class="kennzahl-name">' + esc(w.name) + "</div>";
      return '<div class="kennzahl"' + (w.farbe ? ' style="--kf:var(' + w.farbe + ')"' : "") + ">" + (w.link ? '<a href="' + w.link + '">' + inner + "</a>" : inner) + "</div>";
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
    var jeThema = {};
    alle.forEach(function (e) { jeThema[e.thema] = (jeThema[e.thema] || 0) + 1; });
    var maxThema = 1;
    Object.keys(jeThema).forEach(function (k) { maxThema = Math.max(maxThema, jeThema[k]); });
    var html = '<div class="titelband"><div class="titelband-innen"><section class="titelblatt" aria-labelledby="ausgabe-titel">' +
      '<div class="titelblatt-text"><h1 id="ausgabe-titel" class="ausgabe-woche"><small>Ausgabe</small>KW ' + w.woche + "<span>/" + w.jahr + "</span></h1>" +
      '<p class="ausgabe-satz">' + esc(satz) + "</p>" +
      '<p class="ausgabe-links"><a href="#/schutzrechte?neu=1"><strong>' + neu.length + "</strong> neu diese Woche</a>" +
      '<a href="#/fristen"><strong>' + laufend.length + "</strong> laufende Einspruchsfristen</a></p>" +
      '<p class="ausgabe-stand">Stand ' + datum(R.stand) + ", " + esc(alle.length + " Schutzrechte im Radar") +
      (abd.status === "eingeschraenkt" ? '<br><span class="abdeckung-hinweis">Eingeschränkte Abdeckung</span>' : "") + "</p></div>" +
      '<figure class="zeichenblatt">' + ((window.PRZ && window.PRZ.hero) || "") + "</figure></section>";
    if (window.Bewegung) {
      html += '<section class="pr-tafel bw-gehaeuse" aria-labelledby="pt-titel"><div class="pt-kopf"><h2 id="pt-titel"><span class="pt-led" aria-hidden="true"></span>Anzeigetafel</h2>' +
        '<div class="pt-wahl" role="group" aria-label="Was die Tafel zeigt">' + TAFEL_ARTEN.map(function (t, i) {
          return '<button type="button" data-tafel="' + t[0] + '" aria-pressed="' + (i === 0) + '" aria-label="' + esc(t[1]) + '"><span class="pt-lang">' + esc(t[1]) + '</span><span class="pt-kurz" aria-hidden="true">' + esc(t[2]) + "</span></button>";
        }).join("") + '</div></div><div id="pr-tafel"></div></section>';
    }

    html += '<section class="bezugszeichen" aria-labelledby="bz-titel"><h2 id="bz-titel">Bezugszeichenliste <span>Themen des Radars, ein Klick zeigt alle Einträge</span></h2><ul>' +
      THEMEN.map(function (t) {
        var n = jeThema[t.key] || 0;
        return '<li><a href="' + hashMit("schutzrechte", new URLSearchParams({ thema: t.key })) + '" data-thema="' + t.key + '" style="' + themaStil(t.key) + '">' +
          '<span class="bz-symbol">' + zThema(t.key) + '</span><span class="bz-nr">' + BEZUG[t.key] + '</span><span class="bz-name">' + esc(t.name) + '</span><span class="bz-zahl">' + n + "</span>" +
          '<span class="bz-balken" aria-hidden="true"><span style="width:' + Math.max(2, Math.round(100 * n / maxThema)) + '%"></span></span></a></li>';
      }).join("") + "</ul></section></div></div>";

    html += bento(alle, neu, laufend);
    return html;
  }
  uebersicht.titel = function () { return "Übersicht"; };
  /* Fallblatt-Anzeige: Schutzrechtsnummern laufen ein wie auf einer Abfahrtstafel */
  var TAFEL_ARTEN = [["neu", "Neu diese Woche", "Neu"], ["erteilt", "Erteilungen", "Erteilungen"], ["fristen", "Einspruchsfristen", "Fristen"]];
  function tafelZeilen(art) {
    var alle = D.radar.eintraege, l;
    if (art === "erteilt") l = alle.filter(function (e) { return e.art === "Erteilung"; }).sort(function (a, b) { return String(b.veroeffentlicht).localeCompare(a.veroeffentlicht); });
    else if (art === "fristen") l = alle.filter(fristLaeuft).sort(function (a, b) { return a.einspruch_bis.localeCompare(b.einspruch_bis); });
    else l = alle.filter(function (e) { return e.neu; }).sort(function (a, b) {
      return relRang(a.relevanz) - relRang(b.relevanz) || (b.punkte || 0) - (a.punkte || 0) || String(b.veroeffentlicht).localeCompare(a.veroeffentlicht);
    });
    var zeilen = l.slice(0, 8).map(function (e) {
      var d = String(art === "fristen" ? e.einspruch_bis : e.veroeffentlicht);
      return { d: d.slice(8, 10) + "." + d.slice(5, 7), nr: e.nummer, t: e.titel, b: String(BEZUG[e.thema] || ""), thema: e.thema,
        href: "#/eintrag/" + encodeURIComponent(e.id),
        label: (art === "fristen" ? "Einspruch bis " : "") + datum(d) + ", " + e.nummer + ", " + e.titel + ", " + themaName(e.thema) };
    });
    if (!zeilen.length) zeilen = [{ d: "", nr: "", t: art === "fristen" ? "Keine laufenden Fristen" : "Diese Woche nichts Neues", b: "", label: art === "fristen" ? "Zurzeit laufen keine Einspruchsfristen" : "Diese Woche keine neuen Einträge" }];
    return zeilen;
  }
  function tafelBauen() {
    var ziel = main.querySelector("#pr-tafel");
    if (!ziel || !window.Bewegung) return;
    var tafel = new window.Bewegung.Tafel(ziel, {
      zeilen: 8, element: "a",
      spalten: [{ k: "d", n: 5 }, { k: "nr", n: 21, ab: 900 }, { k: "t", rest: true, min: 10 }, { k: "b", n: 2, farbe: function (d) { return d.thema ? "var(--t-" + d.thema + ")" : ""; } }],
      titel: { d: "Datum", nr: "Nummer", t: "Titel", b: "Bez." }
    });
    tafel.zeige(tafelZeilen("neu"));
    main.querySelectorAll("[data-tafel]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.getAttribute("aria-pressed") === "true") return;
        main.querySelectorAll("[data-tafel]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        var art = b.getAttribute("data-tafel");
        tafel.o.titel.d = art === "fristen" ? "Frist" : "Datum";
        var kopf = ziel.querySelector(".bw-tafel-spalten span");
        if (kopf) kopf.textContent = tafel.o.titel.d;
        tafel.zeige(tafelZeilen(art));
      });
    });
  }
  var schonGezeichnet = false;
  uebersicht.danach = function () {
    tafelBauen();
    var svg = main.querySelector(".fig-zeichnung");
    if (!svg) return;
    var teile = svg.querySelectorAll(".teil");
    teile.forEach(function (t, i) {
      var k = t.getAttribute("data-thema");
      var n = main.querySelector('.bezugszeichen a[data-thema="' + k + '"] .bz-zahl');
      t.setAttribute("aria-label", BEZUG[k] + " " + themaName(k) + ", " + (n ? n.textContent : "0") + " Einträge");
      t.style.setProperty("--v", (0.75 + i * 0.16).toFixed(2) + "s");
    });
    if (!schonGezeichnet && !reduziert) { svg.classList.add("zeichnet"); zaehlen(); }
    schonGezeichnet = true;
    main.querySelectorAll(".bezugszeichen a[data-thema]").forEach(function (a) {
      var teil = svg.querySelector('.teil[data-thema="' + a.getAttribute("data-thema") + '"]');
      if (!teil) return;
      function an() { teil.classList.add("hervor"); }
      function aus() { teil.classList.remove("hervor"); }
      a.addEventListener("mouseenter", an); a.addEventListener("focus", an);
      a.addEventListener("mouseleave", aus); a.addEventListener("blur", aus);
    });
  };

  /* ---------- Übersicht: Kachel-Raster wie beim Start-up-Radar ---------- */
  var ART_ZAHL = { erteilungen: ["Erteilung", "Erteilungen"], offenlegungen: ["Offenlegung", "Offenlegungen"], gebrauchsmuster: ["Gebrauchsmuster", "Gebrauchsmuster"], international: ["PCT-Anmeldung", "PCT-Anmeldungen"] };
  function kLink(href, text) { return '<a class="k-link" href="' + href + '">' + text + SYM.rechts + "</a>"; }
  function kKopf(id, titel, rechts) { return '<div class="k-kopf"><h2 id="' + id + '">' + titel + "</h2>" + (rechts || "") + "</div>"; }
  function miniBild(e) {
    return '<span class="mini-bild mb-' + (THEMA[e.thema] ? e.thema : "x") + '" aria-hidden="true"><small>' + esc(e.amt) + "</small>" + esc(e.kind || "") + "</span>";
  }
  function anmText(e) { return (e.anmelder || []).join(", ") || "Anmelder unbekannt"; }
  function bento(alle, neu, laufend) {
    var R = D.radar, h = '<div class="bento">';
    var jeArt = {};
    neu.forEach(function (e) { jeArt[e.art] = (jeArt[e.art] || 0) + 1; });
    h += '<section class="kachel k4 k-neu" aria-labelledby="kn-titel">' + kKopf("kn-titel", "Neu diese Woche", neu.length ? kLink("#/schutzrechte?neu=1", "Alle") : "") +
      '<p class="k-zahl"><span data-zaehlen="' + neu.length + '">' + neu.length + "</span><small>" + plural(neu.length, "Schutzrecht", "Schutzrechte") + "</small></p>" +
      (neu.length ? '<p class="k-arten">' + RUBRIKEN.filter(function (rb) { return jeArt[rb.art]; }).map(function (rb) {
        var n = jeArt[rb.art];
        return '<a href="' + hashMit(rb.key, new URLSearchParams({ neu: "1" })) + '" style="--rf:var(--r-' + rb.key + ')"><i></i>' + n + " " + ART_ZAHL[rb.key][n === 1 ? 0 : 1] + "</a>";
      }).join("") + "</p>" +
        '<ul class="k-liste">' + neu.slice(0, 3).map(function (e) {
          return '<li><a href="#/eintrag/' + encodeURIComponent(e.id) + '">' + miniBild(e) + '<span class="kl-text"><span class="kl-name">' + esc(e.titel) + '</span><span class="kl-sub">' + esc(anmText(e)) + "</span></span></a></li>";
        }).join("") + "</ul>"
        : '<p class="k-leer">Diese Woche keine neuen relevanten Veröffentlichungen. Der Radar wird jeden Montag aktualisiert.</p>') + "</section>";

    var n30 = laufend.filter(function (e) { return tageBis(e.einspruch_bis) < 30; }).length;
    h += '<section class="kachel k4 k-fristen" aria-labelledby="kf-titel">' + kKopf("kf-titel", "Einspruchsfristen", laufend.length ? kLink("#/fristen", "Alle " + laufend.length) : "") +
      (laufend.length ? '<ul class="k-liste">' + laufend.slice(0, 4).map(function (e) {
        var t = tageBis(e.einspruch_bis);
        return '<li><a href="#/eintrag/' + encodeURIComponent(e.id) + '"><span class="countdown ' + urgenz(t) + '"><b>' + t + "</b><small>" + plural(t, "Tag", "Tage") + '</small></span><span class="kl-text"><span class="kl-name">' + esc(e.titel) + '</span><span class="kl-sub">' + esc(e.nummer) + ", bis " + datum(e.einspruch_bis) + "</span></span></a></li>";
      }).join("") + "</ul>" + (n30 ? '<p class="k-fuss">' + n30 + " " + plural(n30, "Frist endet", "Fristen enden") + " in weniger als 30 Tagen.</p>" : "")
        : '<p class="k-leer">Zurzeit laufen keine Einspruchsfristen.</p>') + "</section>";

    h += '<section class="kachel k4 k-rubriken" aria-labelledby="kr-titel">' + kKopf("kr-titel", "Rubriken", kLink("#/schutzrechte", "Alle " + alle.length)) +
      '<ul class="k-liste">' + RUBRIKEN.map(function (rb) {
        var liste = alle.filter(function (e) { return e.art === rb.art; });
        var neuN = liste.filter(function (e) { return e.neu; }).length;
        var zusatz = rb.key === "erteilungen" ? liste.filter(fristLaeuft).length + " mit laufender Einspruchsfrist" : neuN ? neuN + " neu diese Woche" : rb.kurz;
        return '<li><a class="rk-' + rb.key + '" href="#/' + rb.key + '">' + zRubrik(rb.key, "kr-ic") + '<span class="kl-text"><span class="kl-name">' + esc(rb.name) + '</span><span class="kl-sub">' + esc(zusatz) + '</span></span><b class="kr-zahl">' + liste.length + "</b></a></li>";
      }).join("") + "</ul></section>";

    var top = topDesMonats();
    h += '<section class="kachel k12 k-top" aria-labelledby="kt-titel">' + kKopf("kt-titel", "Top 5 des Monats", '<p class="k-text">' + esc(top.label) + "</p>") +
      (top.liste.length ? '<ol class="top5">' + top.liste.map(function (e, i) {
        return '<li><a class="t5" href="#/eintrag/' + encodeURIComponent(e.id) + '" style="' + themaStil(e.thema) + '"><span class="t5-bild mb-' + (THEMA[e.thema] ? e.thema : "x") + '"><span class="t5-rang">' + (i + 1) + "</span>" + kindMarke(e) + "</span>" +
          '<span class="t5-text"><span class="t5-art">' + esc(e.art) + " · " + datum(e.veroeffentlicht) + '</span><span class="t5-titel">' + esc(e.titel) + '</span><span class="t5-sub">' + esc(anmText(e)) + "</span></span></a></li>";
      }).join("") + "</ol>" : '<p class="k-leer">In diesem Monat noch keine Einträge.</p>') + "</section>";

    h += '<section class="kachel k12 k-leiste" aria-labelledby="kl-titel">' + kKopf("kl-titel", "Einspruchsfristen der nächsten neun Monate", kLink("#/fristen", "Zum Fristenkalender")) + fristenLeiste(laufend) + "</section>";

    var k = R.bestand;
    if (k && k.gesamt) {
      var teile = [["patente", "erteilte Patente", "--r-erteilungen", "patent"], ["gebrauchsmuster", "Gebrauchsmuster", "--r-gebrauchsmuster", "gm"], ["anmeldungen", "Anmeldungen", "--r-offenlegungen", "anmeldung"]];
      h += '<section class="kachel k6 k-bestand" aria-labelledby="kb-titel">' + kKopf("kb-titel", "Bestand: alles, was noch läuft", kLink("#/bestand", "Zur Datenbank")) +
        '<p class="k-zahl">' + k.gesamt.toLocaleString("de-DE") + "<small>laufende Schutzrechte aus DE und EP</small></p>" +
        '<div class="kb-anteile" role="img" aria-label="' + esc(teile.map(function (t) { return k[t[0]] + " " + t[1]; }).join(", ")) + '">' + teile.map(function (t) {
          return '<span style="--sf:var(' + t[2] + ");flex-grow:" + k[t[0]] + '" data-tip="' + esc(t[1] + ": " + k[t[0]].toLocaleString("de-DE")) + '"></span>';
        }).join("") + "</div>" +
        '<ul class="kb-zahlen">' + teile.map(function (t) {
          return '<li><a href="#/bestand?art=' + t[3] + '" style="--sf:var(' + t[2] + ')"><b>' + k[t[0]].toLocaleString("de-DE") + "</b><span>" + esc(t[1]) + "</span></a></li>";
        }).join("") + '<li><a href="#/bestand?ende=12m&amp;sort=ablauf" style="--sf:var(--kupfer)"><b>' + k.auslaufend_12m.toLocaleString("de-DE") + "</b><span>laufen in 12 Monaten aus</span></a></li></ul>" +
        '<form class="kb-suche" data-bestand-suche role="search"><label class="feld suche"><span class="visuell-verborgen">Im Bestand suchen</span>' + ICON.suche + '<input type="search" name="q" placeholder="Titel, Anmelder, Nummer oder Klasse" autocomplete="off"></label><button type="submit" class="knopf primaer">Im Bestand suchen</button></form></section>';
    }

    var top6 = (R.anmelder || []).slice(0, 5), maxA = top6.length ? top6[0].anzahl : 1;
    var themenA = {};
    top6.forEach(function (a) { Object.keys(a.themen || {}).forEach(function (t) { themenA[t] = 1; }); });
    h += '<section class="kachel k6 k-anmelder" aria-labelledby="ka-titel">' + kKopf("ka-titel", "Aktivste Anmelder", kLink("#/anmelder", "Rangliste")) +
      (top6.length ? '<ul class="ka-liste">' + top6.map(function (a) {
        var segs = THEMEN.filter(function (t) { return (a.themen || {})[t.key]; }).map(function (t) {
          var n = a.themen[t.key];
          return '<span class="anm-seg" style="' + themaStil(t.key) + ";flex-grow:" + n + '" data-tip="' + esc(a.name + ": " + t.name + ", " + n + " " + plural(n, "Eintrag", "Einträge")) + '"></span>';
        }).join("");
        return '<li><a class="ka-name" href="' + hashMit("schutzrechte", new URLSearchParams({ anmelder: a.name })) + '">' + esc(a.name) + "</a><b>" + a.anzahl + '</b><span class="ka-balken"><span style="width:' + Math.max(6, Math.round(100 * a.anzahl / maxA)) + '%">' + segs + "</span></span></li>";
      }).join("") + '</ul><ul class="stapel-legende klein">' + THEMEN.filter(function (t) { return themenA[t.key]; }).map(function (t) {
        return '<li><span class="leg-eintrag" style="' + themaStil(t.key) + '"><span class="farbfeld"></span>' + esc(THEMA[t.key].knapp) + "</span></li>";
      }).join("") + "</ul>" : '<p class="k-leer">Noch keine Anmelder erfasst.</p>') + "</section>";

    h += '<section class="kachel k12 k-trend" aria-labelledby="ktr-titel">' + kKopf("ktr-titel", "Neue Veröffentlichungen je Monat und Thema",
      R.voll_ab ? '<p class="k-text">Vollständig erfasst ab ' + MONATE_LANG[parseInt(R.voll_ab.slice(5, 7), 10) - 1] + " " + R.voll_ab.slice(0, 4) + "</p>" : "") + trend() + "</section>";

    var nl = D.news.slice().sort(function (a, b) { return String(b.datum).localeCompare(a.datum); }).slice(0, 3);
    h += '<section class="kachel k6 k-news" aria-labelledby="kne-titel">' + kKopf("kne-titel", "News", nl.length ? kLink("#/news", "Alle Meldungen") : "") +
      (nl.length ? '<ul class="k-liste">' + nl.map(function (n) {
        return '<li><a href="' + esc(n.url) + '" target="_blank" rel="noopener noreferrer">' + datumKachel(n.datum, "kn-datum") + '<span class="kl-text"><span class="kl-name">' + esc(n.titel) + '</span><span class="kl-sub">' + esc(n.quelle) + ' <span aria-hidden="true">↗</span></span></span></a></li>';
      }).join("") + "</ul>" : '<p class="k-leer">Noch keine Meldungen.</p>') + "</section>";

    var bericht = D.berichte.slice().sort(function (a, b) { return String(b.zeitraum.bis).localeCompare(a.zeitraum.bis) || (a.art === "monat" ? -1 : 1); })[0];
    function zeile(inhalt, sym, name, sub) { return "<li>" + inhalt.replace("%", '<span class="st-icon">' + sym + '</span><span class="kl-text"><span class="kl-name">' + name + '</span><span class="kl-sub">' + sub + "</span></span>") + "</li>"; }
    h += '<section class="kachel k6 k-dran" aria-labelledby="kd-titel">' + kKopf("kd-titel", "Auf dem Laufenden bleiben", "") + '<ul class="k-liste">' +
      (bericht ? zeile('<a href="#/berichte/' + encodeURIComponent(bericht.id) + '">%</a>', ICON.druck, esc(bericht.titel), (bericht.art === "monat" ? "Monatsbericht" : "Wochenbericht") + ", zum Drucken oder als PDF") : "") +
      zeile('<a href="feed.xml">%</a>', SYM.rss, "RSS-Feed", "Die Neuheiten jeder Woche, auch per RSS-zu-E-Mail-Dienst") +
      zeile('<a href="#/merkliste">%</a>', ICON.merken, "Merkliste", Merk.ids.length + " gemerkt, nur in diesem Browser") +
      zeile('<button type="button" data-suche>%</button>', ICON.suche, "Suchen", "Strg K durchsucht Radar, Bestand und Anmelder") + "</ul></section>";
    return h + "</div>";
  }

  function rubrikReiter(aktiv, p) {
    var behalten = new URLSearchParams();
    ["q", "thema", "amt", "relevanz", "anmelder", "von", "bis", "neu", "frist", "ansicht"].forEach(function (k) { if (p.get(k)) behalten.set(k, p.get(k)); });
    var basis = filterAnwenden(D.radar.eintraege, behalten);
    function reiter(key, name, n, icon) {
      return '<a class="rk-' + key + '" href="' + hashMit(key, behalten) + '"' + (aktiv === key ? ' aria-current="page"' : "") + ">" + icon + "<span>" + esc(name) + '</span><span class="reiter-zahl">' + n + "</span></a>";
    }
    return '<nav class="reiter" aria-label="Rubriken">' + reiter("schutzrechte", "Alle", basis.length, "") +
      RUBRIKEN.map(function (rb) {
        return reiter(rb.key, rb.name, basis.filter(function (e) { return e.art === rb.art; }).length, zRubrik(rb.key));
      }).join("") + "</nav>";
  }

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
    var s = '<svg viewBox="0 0 ' + B + " " + H + '" role="group" aria-label="Zeitleiste der laufenden Einspruchsfristen">';
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
    var R = D.radar, h = heute();
    var j = parseInt(h.slice(0, 4), 10), mo = parseInt(h.slice(5, 7), 10) - 1;
    var monate = [];
    for (var i = 11; i >= 0; i--) monate.push(new Date(Date.UTC(j, mo - i, 1)).toISOString().slice(0, 7));
    var ab = (R.voll_ab || R.daten_ab || "").slice(0, 7);
    if (ab) monate = monate.filter(function (m) { return m >= ab; });
    if (!monate.length) return leer("Noch keine Monate vollständig erfasst.", "");
    var z = {};
    monate.forEach(function (m) { z[m] = {}; });
    R.eintraege.forEach(function (e) {
      var m = String(e.veroeffentlicht).slice(0, 7);
      if (z[m]) z[m][e.thema] = (z[m][e.thema] || 0) + 1;
    });
    var summe = function (m) { return THEMEN.reduce(function (a, t) { return a + (z[m][t.key] || 0); }, 0); };
    var maxS = Math.max.apply(null, monate.map(summe).concat([1]));
    var schritt = maxS > 60 ? 20 : maxS > 30 ? 10 : 5;
    var oben = Math.ceil(maxS / schritt) * schritt;
    var B = 1080, H = 300, L = 36, Rr = 8, T = 24, U = 30, ih = H - T - U, iw = B - L - Rr;
    var band = iw / monate.length, bw = Math.min(76, band * 0.5);
    function y(v) { return T + ih - ih * v / oben; }
    var svg = '<svg class="stapel" viewBox="0 0 ' + B + " " + H + '" role="img" aria-label="Neue Veröffentlichungen je Monat, gestapelt nach Thema. Die Tabelle darunter enthält alle Werte.">';
    for (var g = 0; g <= oben; g += schritt) svg += '<line class="gitter" x1="' + L + '" x2="' + (B - Rr) + '" y1="' + y(g) + '" y2="' + y(g) + '"/><text class="achse-text" x="' + (L - 8) + '" y="' + (y(g) + 4) + '" text-anchor="end">' + g + "</text>";
    monate.forEach(function (m, idx) {
      var x = L + band * idx + (band - bw) / 2, basis = 0, gesamt = summe(m);
      var mName = MONATE_LANG[parseInt(m.slice(5), 10) - 1] + " " + m.slice(0, 4);
      var segmente = THEMEN.filter(function (t) { return z[m][t.key]; });
      segmente.forEach(function (t, sIdx) {
        var n = z[m][t.key], y0 = y(basis), y1 = y(basis + n), hgt = Math.max(1, y0 - y1 - (sIdx ? 2 : 0));
        var top = y0 - (sIdx ? 2 : 0) - hgt;
        var istOben = sIdx === segmente.length - 1, r = Math.min(4, hgt);
        var d = istOben ? "M" + x + " " + (top + hgt) + "V" + (top + r) + "Q" + x + " " + top + " " + (x + r) + " " + top + "H" + (x + bw - r) + "Q" + (x + bw) + " " + top + " " + (x + bw) + " " + (top + r) + "V" + (top + hgt) + "Z"
          : "M" + x + " " + top + "H" + (x + bw) + "V" + (top + hgt) + "H" + x + "Z";
        svg += '<path class="segment" d="' + d + '" style="' + themaStil(t.key) + '" data-tip="' + esc(mName + ": " + t.name + ", " + n + " " + plural(n, "Eintrag", "Einträge")) + '"/>';
        basis += n;
      });
      if (gesamt) svg += '<text class="summe-text" x="' + (x + bw / 2) + '" y="' + (y(gesamt) - 7) + '" text-anchor="middle">' + gesamt + "</text>";
      svg += '<text class="achse-text" x="' + (x + bw / 2) + '" y="' + (H - 9) + '" text-anchor="middle">' + MONATE[parseInt(m.slice(5), 10) - 1] + (m.slice(5) === "01" || idx === 0 ? " " + m.slice(2, 4) : "") + "</text>";
    });
    svg += '<line class="grundlinie" x1="' + L + '" x2="' + (B - Rr) + '" y1="' + y(0) + '" y2="' + y(0) + '"/></svg>';
    var legende = '<ul class="stapel-legende">' + THEMEN.map(function (t) {
      return '<li><a href="' + hashMit("schutzrechte", new URLSearchParams({ thema: t.key })) + '" style="' + themaStil(t.key) + '"><span class="farbfeld"></span>' + esc(t.name) + "</a></li>";
    }).join("") + "</ul>";
    var tabelle = '<details class="stapel-tabelle"><summary>Werte als Tabelle</summary><div class="tabelle-rahmen"><table><thead><tr><th scope="col">Thema</th>' +
      monate.map(function (m) { return '<th scope="col">' + MONATE[parseInt(m.slice(5), 10) - 1] + " " + m.slice(2, 4) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      THEMEN.map(function (t) { return '<tr><th scope="row">' + esc(t.name) + "</th>" + monate.map(function (m) { return '<td class="tab">' + (z[m][t.key] || 0) + "</td>"; }).join("") + "</tr>"; }).join("") +
      '<tr class="summe-zeile"><th scope="row">Gesamt</th>' + monate.map(function (m) { return '<td class="tab">' + summe(m) + "</td>"; }).join("") + "</tr></tbody></table></div></details>";
    return '<div class="stapel-rahmen">' + svg + legende + tabelle + "</div>";
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

  function schutzrechte(r, rub) {
    var p = r.params;
    var filterP = new URLSearchParams(p);
    if (rub) filterP.set("art", rub.art);
    var sort = SORTIERUNG[p.get("sort")] ? p.get("sort") : "datum";
    var ansicht = p.get("ansicht") === "tabelle" ? "tabelle" : "karten";
    var liste = filterAnwenden(D.radar.eintraege, filterP).sort(SORTIERUNG[sort].fn);
    aktuelleListe = liste;
    var anmelderListe = (D.radar.anmelder || []).map(function (a) { return [a.name, a.name + " (" + a.anzahl + ")"]; });
    var aktiv = ["thema", "art", "amt", "relevanz", "von", "bis", "anmelder", "neu", "frist", "q"].some(function (k) { return p.get(k); });
    var hier = rub ? rub.key : "schutzrechte";

    var ohneThema = new URLSearchParams(filterP); ohneThema.delete("thema");
    var basisThema = filterAnwenden(D.radar.eintraege, ohneThema);
    var inRubrik = rub ? D.radar.eintraege.filter(function (e) { return e.art === rub.art; }) : D.radar.eintraege;
    var chips = [
      { wert: inRubrik.length, name: rub ? "in dieser Rubrik" : "Schutzrechte im Radar", farbe: rub ? "--r-" + rub.key : "--band-tinte-2" },
      { wert: inRubrik.filter(function (e) { return e.neu; }).length, name: "neu diese Woche", farbe: "--patina-band", link: hashMit(hier, new URLSearchParams({ neu: "1" })) }
    ];
    if (!rub || rub.key === "erteilungen") chips.push({ wert: inRubrik.filter(fristLaeuft).length, name: "mit laufender Einspruchsfrist", farbe: "--messing-band", link: hashMit(hier, new URLSearchParams({ frist: "laufend" })) });
    else chips.push({ wert: inRubrik.filter(function (e) { return e.relevanz === "hoch"; }).length, name: "hoch relevant", farbe: "--band-tinte-2", link: hashMit(hier, new URLSearchParams({ relevanz: "hoch" })) });
    var html = kopfband({
      kicker: rub ? "Rubrik · Kennbuchstaben " + esc(rub.codes) : "Register",
      titel: esc(rub ? rub.name : "Alle Schutzrechte"),
      text: esc(rub ? rub.text : "Erteilungen, Offenlegungen, Gebrauchsmuster und internationale Anmeldungen aus Deutschland und Europa, nach Patentfamilie zusammengefasst. Die Reiter unten führen zu den einzelnen Rubriken."),
      chips: chips, figKey: "schutzrechte", figAttr: rub ? ' data-aktiv="' + rub.key + '"' : "",
      unten: rubrikReiter(hier, p)
    });
    var mehrZahl = ["art", "amt", "anmelder", "von", "bis"].filter(function (k) { return p.get(k); }).length;
    var chipsAktiv = [];
    if (p.get("q")) chipsAktiv.push({ text: "Suche: " + p.get("q"), weg: ohneParam(hier, p, "q") });
    if (p.get("thema")) chipsAktiv.push({ text: "Thema: " + themaName(p.get("thema")), weg: ohneParam(hier, p, "thema") });
    if (p.get("art")) chipsAktiv.push({ text: "Art: " + p.get("art"), weg: ohneParam(hier, p, "art") });
    if (p.get("amt")) chipsAktiv.push({ text: "Amt: " + (AEMTER[p.get("amt")] || p.get("amt")), weg: ohneParam(hier, p, "amt") });
    if (p.get("relevanz")) chipsAktiv.push({ text: "Relevanz " + p.get("relevanz"), weg: ohneParam(hier, p, "relevanz") });
    if (p.get("anmelder")) chipsAktiv.push({ text: "Anmelder: " + p.get("anmelder"), weg: ohneParam(hier, p, "anmelder") });
    if (p.get("von")) chipsAktiv.push({ text: "ab " + datum(p.get("von")), weg: ohneParam(hier, p, "von") });
    if (p.get("bis")) chipsAktiv.push({ text: "bis " + datum(p.get("bis")), weg: ohneParam(hier, p, "bis") });
    if (p.get("neu") === "1") chipsAktiv.push({ text: "neu diese Woche", weg: ohneParam(hier, p, "neu") });
    if (p.get("frist") === "laufend") chipsAktiv.push({ text: "Einspruchsfrist läuft", weg: ohneParam(hier, p, "frist") });
    html += filterLeiste({
      kat: themenFilter(basisThema, p, hier),
      suche: '<label class="feld suche"><span class="visuell-verborgen">Volltextsuche</span>' + ICON.suche + '<input type="search" name="q" value="' + esc(p.get("q") || "") + '" placeholder="Suchen: Titel, Inhalt, Anmelder, Nummer, Patentklasse" autocomplete="off"></label>',
      schnell: schnellLink(hier, p, "neu", "1", "Neu", "Nur Einträge dieser Woche") + schnellLink(hier, p, "relevanz", "hoch", "Hoch relevant") +
        (!rub || rub.key === "erteilungen" ? schnellLink(hier, p, "frist", "laufend", "Frist läuft", "Nur Erteilungen mit laufender Einspruchsfrist") : ""),
      mehr: (rub ? "" : '<div class="pop-feld">' + auswahl("art", "Art", ARTEN.map(function (a) { return [a, a]; }), p.get("art")) + "</div>") +
        '<div class="pop-feld">' + auswahl("amt", "Amt", Object.keys(AEMTER).map(function (k) { return [k, AEMTER[k]]; }), p.get("amt")) + "</div>" +
        '<div class="pop-feld">' + auswahl("anmelder", "Anmelder", anmelderListe, p.get("anmelder")) + "</div>" +
        '<div class="pop-feld zwei"><label class="feld"><span>Veröffentlicht ab</span><input type="date" name="von" value="' + esc(p.get("von") || "") + '"></label>' +
        '<label class="feld"><span>bis</span><input type="date" name="bis" value="' + esc(p.get("bis") || "") + '"></label></div>',
      mehrZahl: mehrZahl, chips: chipsAktiv, zuruecksetzen: "#/" + hier
    });

    html += '<div class="ergebnis-leiste"><h2 class="ergebnis-zahl"><span class="ez-n">' + liste.length.toLocaleString("de-DE") + "</span> " + plural(liste.length, "Schutzrecht", "Schutzrechte") + "</h2>" +
      '<div class="werkzeug-reihe"><div class="segment" role="group" aria-label="Ansicht">' +
      '<button type="button" data-ansicht="karten" aria-pressed="' + (ansicht === "karten") + '">' + SYM.karten + "Karten</button>" +
      '<button type="button" data-ansicht="tabelle" aria-pressed="' + (ansicht === "tabelle") + '">' + SYM.tabelle + "Tabelle</button></div>" +
      '<label class="sortier"><span class="visuell-verborgen">Sortierung</span><select name="sort" form="filter" aria-label="Sortierung">' + Object.keys(SORTIERUNG).map(function (k) { return '<option value="' + k + '"' + (k === sort ? " selected" : "") + ">" + SORTIERUNG[k].name + "</option>"; }).join("") + "</select></label>" +
      exportMenue(false) + "</div></div>";

    if (!liste.length) {
      html += leer(aktiv ? "Keine Schutzrechte zu diesen Filtern." : "Noch keine Schutzrechte im Radar.", aktiv ? "Lockere die Filter oder setze sie zurück." : "");
    } else if (ansicht === "tabelle") {
      html += tabelle(liste, sort);
    } else {
      var listeHtml = sort === "datum" ? zeitleiste(liste, "veroeffentlicht", { neuMarke: true }) : '<ul class="liste karten">' + liste.map(function (e) { return karte(e, { neuMarke: true }); }).join("") + "</ul>";
      var monat = String(liste[0].veroeffentlicht).slice(0, 7);
      html += '<div class="liste-raster"><div class="liste-haupt">' + listeHtml + "</div>" +
        '<aside class="seitenspalte" aria-label="Kalender und Kennzahlen">' + (sort === "datum" ? '<div class="sk-karte kal-karte">' + kalender(liste, "veroeffentlicht", monat) + '<p class="kal-hinweis">Punkte zeigen Veröffentlichungstage. Antippen springt zur Woche.</p></div>' : "") +
        auswahlStatistik(liste) + "</aside></div>";
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
      ["q", "thema", "art", "amt", "relevanz", "anmelder", "von", "bis", "ende", "sort"].forEach(function (k) {
        var el = f.elements[k]; if (!el) return;
        if (el.value && !(k === "sort" && (el.value === "datum" || (r.name === "bestand" && el.value === "neu")))) p.set(k, el.value); else p.delete(k);
      });
      if (!document.body.contains(f)) return;
      if (RUBRIK[r.name]) p.delete("art");
      var ziel = hashMit(r.name, p);
      if (r.name === "schutzrechte" && RUBRIK_NACH_ART[p.get("art")]) {
        var art = p.get("art"); p.delete("art");
        ziel = hashMit(RUBRIK_NACH_ART[art].key, p);
      }
      if (ziel !== location.hash) {
        var fokusName = document.activeElement && document.activeElement.name;
        var pos = document.activeElement && document.activeElement.selectionStart;
        var popOffen = !!document.querySelector("#filter-pop:not([hidden])");
        history.replaceState(null, "", ziel);
        zeichnen(false, true);
        if (popOffen) popUmschalten(document.querySelector('[data-pop="filter-pop"]'), true);
        if (fokusName) {
          var neuF = document.getElementById("filter");
          var neuEl = neuF && neuF.elements[fokusName];
          if (neuEl) { neuEl.focus({ preventScroll: true }); if (pos != null && neuEl.setSelectionRange) try { neuEl.setSelectionRange(pos, pos); } catch (e) {} }
        }
      }
    }
    f.addEventListener("input", function (ev) {
      clearTimeout(timer);
      timer = setTimeout(anwenden, ev.target.name === "q" ? 250 : 0);
    });
    f.addEventListener("change", anwenden);
    document.querySelectorAll('[form="filter"]').forEach(function (el) { el.addEventListener("change", anwenden); });
  };

  function tabelle(liste, sort) {
    function kopf(k, text) { return '<th scope="col"><button type="button" data-sort="' + k + '"' + (sort === k ? ' aria-current="true"' : "") + ">" + text + (sort === k ? " ↓" : "") + "</button></th>"; }
    return '<div class="tabelle-rahmen"><table><thead><tr>' + kopf("titel", "Titel") + "<th scope=\"col\">Art</th><th scope=\"col\">Nummer</th>" + kopf("datum", "Veröffentlicht") +
      kopf("anmelder", "Anmelder") + "<th scope=\"col\">Thema</th>" + kopf("relevanz", "Relevanz") + kopf("frist", "Einspruch bis") + "<th scope=\"col\"><span class=\"visuell-verborgen\">Merken</span></th></tr></thead><tbody>" +
      liste.map(function (e) {
        var fk = fristKlasse(e), merk = Merk.hat(e.id);
        return '<tr style="' + themaStil(e.thema) + '"><td class="titel-zelle"><a href="#/eintrag/' + encodeURIComponent(e.id) + '">' + esc(e.titel) + "</a>" + (e.neu_erteilt ? ' <span class="etikett neu-erteilt">neu erteilt</span>' : "") + '</td><td class="art-zelle">' + kindMini(e.art, e.amt, e.kind) + " " + esc(e.art) + '</td><td class="nummer">' + esc(e.nummer) + '</td><td class="tab">' + datum(e.veroeffentlicht) +
          "</td><td>" + esc((e.anmelder || []).join(", ")) + '</td><td><span class="thema-marke" style="' + themaStil(e.thema) + '">' + esc(themaName(e.thema)) + '</span></td><td><span class="relevanz ' + esc(e.relevanz) + '">' + esc(e.relevanz) + "</span></td><td>" +
          (e.einspruch_bis ? '<span class="frist ' + fk + '">' + datum(e.einspruch_bis) + "</span>" : "–") + '</td><td><button type="button" class="knopf klein merken" data-merken="' + esc(e.id) + '" aria-pressed="' + merk + '" aria-label="' + (merk ? "Von der Merkliste entfernen" : "Auf die Merkliste") + '">' + ICON.merken + "</button></td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  /* ---------- Detail ---------- */
  function eintrag(r) {
    var e = D.byId[r.arg];
    if (!e) return leer("Dieser Eintrag ist nicht (mehr) im Radar.", "Er wurde möglicherweise mit einem anderen Familienmitglied zusammengeführt.") + '<p style="margin-top:14px"><a href="#/schutzrechte">Zu allen Schutzrechten</a></p>';
    var fk = fristKlasse(e), merk = Merk.hat(e.id);
    var rb = RUBRIK_NACH_ART[e.art];
    var inidVeroeff = e.art === "Erteilung" ? ["(45)", "Erteilung veröffentlicht"] : e.art === "Gebrauchsmuster" ? ["(43)", "Bekanntmachung"] : ["(43)", "Veröffentlicht"];
    var html = detailBand({
      thema: e.thema, schluessel: e.id,
      zurueck: { href: "#/" + (rb ? rb.key : "schutzrechte"), text: rb ? rb.name : "Alle Schutzrechte" },
      badges: kindMarke(e) + '<span class="db-pille">' + esc(e.art) + "</span>" + '<span class="db-pille">' + esc(themaName(e.thema)) + "</span>" +
        (e.neu_erteilt ? '<span class="db-pille signal">neu erteilt</span>' : "") + (e.neu ? '<span class="db-pille signal">neu diese Woche</span>' : ""),
      titel: esc(e.titel),
      unter: '<p class="db-original"><span class="inid">(54)</span> ' + esc(e.titel_original) + "</p>"
    });
    var kacheln = [];
    if (e.einspruch_bis) {
      var t = tageBis(e.einspruch_bis);
      kacheln.push(fakt(SYM.uhr, "Einspruch möglich bis", datum(e.einspruch_bis), t < 0 ? "Frist abgelaufen" : t === 0 ? "endet heute" : "noch " + t + " " + plural(t, "Tag", "Tage"), "fk-frist " + (fk || "laeuft")));
    }
    kacheln.push(fakt(SYM.kalender, '<span class="inid">' + inidVeroeff[0] + "</span>" + inidVeroeff[1], datum(e.veroeffentlicht), "angemeldet " + datum(e.angemeldet) + (e.prioritaet && e.prioritaet < e.angemeldet ? ", Priorität " + datum(e.prioritaet) : "")));
    kacheln.push(fakt(SYM.anmelder, '<span class="inid">(71)</span>Anmelder', (e.anmelder || []).map(function (a) { return '<a href="' + hashMit("schutzrechte", new URLSearchParams({ anmelder: a })) + '">' + esc(a) + "</a>"; }).join(", ") || "–",
      e.anmelder_land ? esc(landName(e.anmelder_land)) : ""));
    kacheln.push(fakt(zThema(e.thema, "fk-thema"), "Thema", '<a href="' + hashMit("schutzrechte", new URLSearchParams({ thema: e.thema })) + '">' + esc(THEMA[e.thema] ? THEMA[e.thema].knapp : themaName(e.thema)) + "</a>",
      '<span class="relevanz ' + esc(e.relevanz) + '">' + (e.relevanz === "hoch" ? "hoch relevant" : "mittel relevant") + "</span>"));
    kacheln.push(fakt(SYM.seite, '<span class="inid">(11)</span>Nummer', '<span class="nummer">' + esc(e.nummer) + "</span>", esc(e.art) + ", " + esc(AEMTER[e.amt] || e.amt)));
    if (!e.einspruch_bis) kacheln.push(fakt(SYM.tabelle, '<span class="inid">(51)</span>Patentklassen', esc((e.klassen || []).slice(0, 3).join(", ") || "–"), (e.klassen || []).length > 3 ? "und " + (e.klassen.length - 3) + " weitere" : ""));
    kacheln.push(fakt(SYM.radar, "Im Radar seit", datum(e.aufgenommen), e.familie && e.familie.length ? e.familie.length + " weitere " + plural(e.familie.length, "Veröffentlichung", "Veröffentlichungen") + " der Familie" : "eine Veröffentlichung in der Familie"));
    function zeile(inid, name, wert) { return "<dt>" + (inid ? '<span class="inid">' + inid + "</span>" : "") + esc(name) + "</dt><dd>" + wert + "</dd>"; }
    var quelle = (e.links || [])[0];
    html += '<div class="detail"><article class="detail-haupt" style="' + themaStil(e.thema) + '">' +
      '<div class="faktenraster">' + kacheln.join("") + "</div>" +
      '<section class="d-abschnitt"><h2>Was ist neu?</h2><p class="absatz">' + esc(e.was_neu) + "</p></section>" +
      '<section class="d-abschnitt"><h2>Bezug</h2><p class="absatz">' + esc(e.bezug) + "</p></section>" +
      '<section class="d-abschnitt"><h2>Verlauf</h2>' + verlauf(e) + "</section>" +
      '<details class="d-mehr"><summary>Alle bibliografischen Daten</summary><dl class="daten">' +
      zeile("(11)", "Nummer", '<span class="nummer">' + esc(e.nummer) + "</span>") +
      zeile("", "Art", esc(e.art) + ", " + esc(AEMTER[e.amt] || e.amt)) +
      (e.anmeldenummer ? zeile("(21)", "Aktenzeichen", '<span class="nummer">' + esc(e.anmeldenummer) + "</span>") : "") +
      zeile("(22)", "Anmeldetag", datum(e.angemeldet)) +
      (e.prioritaet ? zeile("(30)", "Priorität", datum(e.prioritaet)) : "") +
      zeile(inidVeroeff[0], inidVeroeff[1], datum(e.veroeffentlicht)) +
      zeile("(51)", "Klassen", esc((e.klassen || []).join(", "))) +
      zeile("(54)", "Bezeichnung", esc(e.titel_original)) +
      zeile("(71)", "Anmelder", (e.anmelder || []).map(function (a) { return '<a href="' + hashMit("schutzrechte", new URLSearchParams({ anmelder: a })) + '">' + esc(a) + "</a>"; }).join("<br>")) +
      zeile("", "Relevanz", '<span class="relevanz ' + esc(e.relevanz) + '">' + esc(e.relevanz) + "</span>") +
      zeile("", "Im Radar seit", datum(e.aufgenommen)) + "</dl>" +
      '<p class="hinweis-text inid-hinweis">Die Zahlen in Klammern sind die international genormten Kennungen (INID) der Angaben auf Patentschriften.</p></details>' +
      '<div class="aktion-leiste">' + merkKnopf(e, "knopf") + '<button type="button" class="knopf" data-teilen aria-label="Link kopieren">' + ICON.teilen + "<span>Link kopieren</span></button>" +
      (quelle ? '<a class="knopf primaer" href="' + esc(quelle.url) + '" target="_blank" rel="noopener noreferrer">Zur Schrift<span class="al-lang"> bei ' + esc(quelle.label) + '</span> <span aria-hidden="true">↗</span></a>' : "") + "</div>" +
      "</article><aside class=\"detail-seite\">";
    if (e.einspruch_bis) {
      html += '<div class="kasten frist-kasten ' + fk + '"><h2>Einspruch möglich bis</h2><div class="frist-datum">' + datum(e.einspruch_bis) + "</div><p>" +
        (fk === "abgelaufen" ? "Frist abgelaufen." : "Noch " + tageBis(e.einspruch_bis) + " Tage.") + " Neun Monate ab Veröffentlichung der Erteilung am " + datum(e.erteilung_datum) +
        " (" + (e.amt === "EP" ? "Art. 99 EPÜ" : "§ 59 PatG") + ").</p><p class=\"hinweis-text\" style=\"margin:0\">Frist im amtlichen Register prüfen.</p></div>";
    }
    if (e.familie && e.familie.length) {
      html += '<div class="kasten"><h2>Weitere Familienmitglieder</h2><ul class="familie-liste">' + e.familie.map(function (f) {
        var k = kindAusNummer(f.nummer);
        return "<li>" + kindMini(f.art, k.amt, k.kind) + '<span><span class="nummer">' + esc(f.nummer) + '</span><small>' + esc(f.art || "") + (f.datum ? ", " + datum(f.datum) : "") + "</small></span></li>";
      }).join("") + "</ul></div>";
    }
    html += '<div class="kasten"><h2>Amtliche Quellen</h2><ul class="quellen-links">' + (e.links || []).map(function (l) {
      return '<li><a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label) + '<span aria-hidden="true">↗</span></a></li>';
    }).join("") + '</ul><p class="hinweis-text db-hinweis">Das Bild oben ist ein Materialbild zum Thema, keine Abbildung aus der Schrift.</p></div></aside></div>';
    return html;
  }
  /* Kopf der Detailseiten: Materialbild des Themas mit Titel darüber */
  function detailBand(o) {
    var motiv = window.Motiv ? window.Motiv.svg(THEMA[o.thema] ? o.thema : "", o.schluessel) : "";
    return '<header class="detail-band" style="' + themaStil(o.thema) + '"><div class="db-bild" aria-hidden="true">' + motiv + '</div><div class="db-innen">' +
      '<a class="band-zurueck" href="' + o.zurueck.href + '">' + ICON.zurueck + esc(o.zurueck.text) + "</a>" +
      '<div class="db-badges">' + o.badges + "</div><h1>" + o.titel + "</h1>" + (o.unter || "") + "</div></header>";
  }
  function fakt(sym, titel, wert, sub, klasse) {
    return '<div class="fakt' + (klasse ? " " + klasse : "") + '">' + sym + '<span class="fk-titel">' + titel + "</span><strong>" + wert + "</strong>" + (sub ? '<span class="fk-sub">' + sub + "</span>" : "") + "</div>";
  }

  function verlauf(e) {
    var h = heute(), punkte = [];
    var rbFarbe = function (art) { var r = RUBRIK_NACH_ART[art]; return r ? "--r-" + r.key : "--tinte-3"; };
    if (e.prioritaet && e.prioritaet < (e.angemeldet || "9")) punkte.push({ d: e.prioritaet, name: "Priorität", inid: "(30)", farbe: "--tinte-3" });
    if (e.angemeldet) punkte.push({ d: e.angemeldet, name: "Anmeldung", inid: "(22)", farbe: "--tinte-3" });
    if (e.art === "Erteilung") {
      var ert = e.erteilung_datum || e.veroeffentlicht;
      var frueh = (e.familie || []).filter(function (f) { return f.datum && f.datum < ert && (f.art === "Offenlegung" || f.art === "Internationale Anmeldung"); })
        .sort(function (a, b) { return a.datum.localeCompare(b.datum); })[0];
      if (frueh) punkte.push({ d: frueh.datum, name: frueh.art === "Offenlegung" ? "Offenlegung" : "Internationale Veröffentlichung", inid: "(43)", farbe: rbFarbe(frueh.art) });
      punkte.push({ d: e.erteilung_datum || e.veroeffentlicht, name: "Erteilung", inid: "(45)", farbe: "--r-erteilungen" });
      if (e.einspruch_bis) {
        var u = urgenz(tageBis(e.einspruch_bis));
        punkte.push({ d: e.einspruch_bis, name: "Ende der Einspruchsfrist", farbe: u === "unter-30" ? "--kupfer" : u === "unter-90" ? "--messing" : u === "abgelaufen" ? "--tinte-3" : "--patina" });
      }
    } else if (e.art === "Gebrauchsmuster") {
      punkte.push({ d: e.veroeffentlicht, name: "Eintragung bekannt gemacht", inid: "(43)", farbe: "--r-gebrauchsmuster" });
    } else {
      punkte.push({ d: e.veroeffentlicht, name: e.art === "Offenlegung" ? "Offenlegung" : "Internationale Veröffentlichung", inid: "(43)", farbe: rbFarbe(e.art) });
    }
    punkte = punkte.filter(function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(x.d || ""); }).sort(function (a, b) { return a.d.localeCompare(b.d); });
    var letztes = punkte.length ? punkte[punkte.length - 1].d : h;
    if (letztes > h) punkte.push({ d: h, name: "heute", heute: true });
    punkte.sort(function (a, b) { return a.d.localeCompare(b.d) || (a.heute ? -1 : 0); });
    if (e.art === "Offenlegung") punkte.push({ offen: true, name: "Prüfung läuft, Erteilung offen" });
    if (e.art === "Internationale Anmeldung") punkte.push({ offen: true, name: "Nationale oder regionale Phase offen" });
    function dauer(a, b) {
      var t = Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 86400000);
      if (t < 45) return t + " " + plural(t, "Tag", "Tage");
      var m = Math.round(t / 30.44);
      return m < 24 ? m + " Monate" : String(Math.round(m / 12 * 10) / 10).replace(".", ",") + " Jahre";
    }
    var out = '<ol class="verlauf">';
    punkte.forEach(function (x, i) {
      if (i) {
        var vor = punkte[i - 1];
        var tage = x.offen || !vor.d ? 120 : Math.max(1, (new Date(x.d) - new Date(vor.d)) / 86400000);
        var zukunft = x.offen || (vor.d && vor.d >= h && !vor.heute) || vor.heute;
        out += '<li class="vl-strecke' + (zukunft ? " zukunft" : "") + '" style="flex-grow:' + Math.max(1, Math.sqrt(tage) / 4).toFixed(2) + '" aria-hidden="true"><span>' + (x.offen || !vor.d ? "" : dauer(vor.d, x.d)) + "</span></li>";
      }
      out += '<li class="vl-punkt' + (x.heute ? " vl-heute" : "") + (x.offen ? " vl-offen" : "") + '"' + (x.farbe ? ' style="--vf:var(' + x.farbe + ')"' : "") + '><span class="vl-marke"></span><span class="vl-name">' +
        (x.inid ? '<span class="inid">' + x.inid + "</span>" : "") + esc(x.name) + "</span>" + (x.d && !x.heute ? '<span class="vl-datum">' + datum(x.d) + "</span>" : x.heute ? '<span class="vl-datum">' + datum(x.d) + "</span>" : "") + "</li>";
    });
    return out + "</ol>";
  }
  eintrag.titel = function (r) { var e = D.byId[r.arg]; return e ? e.titel : "Eintrag"; };

  /* ---------- Fristen ---------- */
  function fristen(r) {
    var p = r.params, thema = p.get("thema"), q = (p.get("q") || "").toLowerCase().trim(), amt = p.get("amt"), fenster = p.get("fenster");
    var woerter = q ? q.split(/\s+/) : [];
    var alleMitFrist = D.radar.eintraege.filter(function (e) { return e.einspruch_bis; });
    var laufendAlle = alleMitFrist.filter(fristLaeuft);
    function passt(e, ohneThema) {
      if (!ohneThema && thema && e.thema !== thema) return false;
      if (amt && e.amt !== amt) return false;
      if (fenster && tageBis(e.einspruch_bis) >= parseInt(fenster, 10)) return false;
      if (woerter.length) {
        var text = [e.titel, e.titel_original, (e.anmelder || []).join(" "), e.nummer, e.nummer_kompakt, (e.klassen || []).join(" "), themaName(e.thema)].join(" ").toLowerCase();
        for (var i = 0; i < woerter.length; i++) if (text.indexOf(woerter[i]) < 0) return false;
      }
      return true;
    }
    var laufend = laufendAlle.filter(function (e) { return passt(e); }).sort(function (a, b) { return a.einspruch_bis.localeCompare(b.einspruch_bis); });
    var abgelaufen = alleMitFrist.filter(function (e) { return !fristLaeuft(e) && passt(e); }).sort(function (a, b) { return b.einspruch_bis.localeCompare(a.einspruch_bis); });
    aktuelleListe = laufend;
    var n30 = laufendAlle.filter(function (e) { return tageBis(e.einspruch_bis) < 30; }).length;
    var n90 = laufendAlle.filter(function (e) { var t = tageBis(e.einspruch_bis); return t >= 30 && t < 90; }).length;
    var html = kopfband({
      kicker: "Kalender",
      titel: "Einspruchsfristen",
      text: "Gegen ein erteiltes Patent kann innerhalb von neun Monaten nach Veröffentlichung der Erteilung Einspruch eingelegt werden (DE: § 59 PatG, EP: Art. 99 EPÜ). Fristen bitte immer im amtlichen Register prüfen.",
      chips: [{ wert: laufendAlle.length, name: "laufende Fristen", farbe: "--patina-band", link: "#/fristen" }, { wert: n30, name: "enden in unter 30 Tagen", farbe: "--kupfer-band", link: "#/fristen?fenster=30" }, { wert: n90, name: "in 30 bis 90 Tagen", farbe: "--messing-band", link: "#/fristen?fenster=90" }],
      figKey: "fristen", stil: "--ak: var(--messing)"
    });
    var chips = [];
    if (p.get("q")) chips.push({ text: "Suche: " + p.get("q"), weg: ohneParam("fristen", p, "q") });
    if (thema) chips.push({ text: "Thema: " + themaName(thema), weg: ohneParam("fristen", p, "thema") });
    if (amt) chips.push({ text: "Amt: " + (AEMTER[amt] || amt), weg: ohneParam("fristen", p, "amt") });
    if (fenster) chips.push({ text: "endet in unter " + fenster + " Tagen", weg: ohneParam("fristen", p, "fenster") });
    html += filterLeiste({
      kat: themenFilter(laufendAlle.filter(function (e) { return passt(e, true); }), p, "fristen"),
      suche: '<label class="feld suche"><span class="visuell-verborgen">Fristen durchsuchen</span>' + ICON.suche + '<input type="search" name="q" value="' + esc(p.get("q") || "") + '" placeholder="Suchen: Titel, Anmelder, Nummer, Patentklasse" autocomplete="off"></label>',
      schnell: schnellLink("fristen", p, "fenster", "30", "unter 30 Tagen", "Fristen, die in weniger als 30 Tagen enden") + schnellLink("fristen", p, "fenster", "90", "unter 90 Tagen") +
        schnellLink("fristen", p, "amt", "DE", "DE", "Nur deutsche Patente") + schnellLink("fristen", p, "amt", "EP", "EP", "Nur europäische Patente"),
      chips: chips, zuruecksetzen: "#/fristen"
    });
    html += '<section class="kachel k-leiste fristen-kachel" aria-labelledby="fl-titel">' + kKopf("fl-titel", "Die nächsten neun Monate", '<p class="k-text">Jeder Punkt ist eine Erteilung mit laufender Frist. Antippen öffnet den Eintrag.</p>') + fristenLeiste(laufend) + "</section>";
    html += '<div class="ergebnis-leiste"><h2 class="ergebnis-zahl"><span class="ez-n">' + laufend.length + "</span> laufende " + plural(laufend.length, "Frist", "Fristen") + "</h2>" +
      '<div class="werkzeug-reihe">' + exportMenue(true) + "</div></div>";
    if (!laufend.length) html += leer(chips.length ? "Zu diesen Filtern laufen zurzeit keine Einspruchsfristen." : "Zurzeit keine laufenden Einspruchsfristen.", chips.length ? "Lockere die Filter oder setze sie zurück." : "");
    else {
      var monate = {};
      laufend.forEach(function (e) { var m = e.einspruch_bis.slice(0, 7); (monate[m] = monate[m] || []).push(e); });
      var dringend = laufend.filter(function (e) { return tageBis(e.einspruch_bis) < 30; }).length, bald = laufend.filter(function (e) { var t = tageBis(e.einspruch_bis); return t >= 30 && t < 90; }).length;
      var ep = laufend.filter(function (e) { return e.amt === "EP"; }).length;
      html += '<div class="liste-raster"><div class="liste-haupt frist-monate">' + Object.keys(monate).sort().map(function (m) {
        var liste = monate[m];
        return '<section class="frist-monat"><h2 class="monat-kopf" id="m-' + m + '">' + MONATE_LANG[parseInt(m.slice(5), 10) - 1] + " " + m.slice(0, 4) + " <span>" + liste.length + " " + plural(liste.length, "Frist", "Fristen") + "</span></h2>" +
          '<ol class="frist-liste">' + liste.map(fristZeile).join("") + "</ol></section>";
      }).join("") + "</div>" +
        '<aside class="seitenspalte" aria-label="Kalender und Kennzahlen"><div class="sk-karte kal-karte">' + kalender(laufend, "einspruch_bis", laufend[0].einspruch_bis.slice(0, 7)) + '<p class="kal-hinweis">Punkte zeigen Tage, an denen Fristen enden. Antippen springt zum Eintrag.</p></div>' +
        '<div class="sk-karte"><p class="sk-titel">In dieser Auswahl</p><p class="sk-zahl">' + laufend.length + " " + plural(laufend.length, "Frist", "Fristen") + "</p>" +
        '<ul class="sk-balken">' + [["unter 30 Tage", dringend, "--kupfer"], ["30 bis 90 Tage", bald, "--messing"], ["über 90 Tage", laufend.length - dringend - bald, "--patina"]].map(function (x) {
          return '<li style="--sf:var(' + x[2] + ')"><span>' + x[0] + "</span><b>" + x[1] + '</b><i><em style="width:' + Math.round(100 * x[1] / Math.max(1, laufend.length)) + '%"></em></i></li>';
        }).join("") + "</ul>" +
        '<dl class="sk-werte"><div><dt>Europäische Patente</dt><dd>' + ep + "</dd></div><div><dt>Deutsche Patente</dt><dd>" + (laufend.length - ep) + "</dd></div><div><dt>nächstes Fristende</dt><dd>" + datum(laufend[0].einspruch_bis) + "</dd></div></dl></div></aside></div>";
    }
    if (abgelaufen.length) {
      html += '<details class="d-mehr abgelaufen-liste"><summary>Abgelaufene Fristen (' + abgelaufen.length + ")</summary>" + '<ul class="liste kompakt">' + abgelaufen.map(function (e) { return karte(e, { kompakt: true }); }).join("") + "</ul></details>";
    }
    return html;
  }
  fristen.danach = function (r) { schutzrechte.danach(r); };
  function fristZeile(e) {
    var t = tageBis(e.einspruch_bis), u = urgenz(t);
    var start = e.erteilung_datum || e.veroeffentlicht;
    var gesamt = Math.max(1, Math.round((new Date(e.einspruch_bis + "T00:00:00Z") - new Date(start + "T00:00:00Z")) / 86400000));
    var rest = Math.max(0, Math.min(100, Math.round(100 * t / gesamt)));
    return '<li class="frist-zeile ' + u + '" style="' + themaStil(e.thema) + '" data-flip="' + esc(e.id) + '" data-tag-anker="' + e.einspruch_bis + '">' + datumKachel(e.einspruch_bis, u) +
      '<div class="fz-info"><div class="karte-oben">' + kindMini(e.art, e.amt, e.kind) + '<span class="nummer">' + esc(e.nummer) + "</span>" + themaChip(e.thema) + "</div>" +
      '<a class="fz-titel" href="#/eintrag/' + encodeURIComponent(e.id) + '">' + esc(e.titel) + '</a><span class="fz-anm">' + esc((e.anmelder || []).join(", ")) + "</span></div>" +
      '<div class="fz-rest"><span class="fz-tage"><b>' + t + "</b> " + plural(t, "Tag", "Tage") + '</span><span class="fz-balken" role="img" aria-label="' + rest + ' Prozent der Frist verbleiben"><span style="width:' + Math.max(2, rest) + '%"></span></span><span class="fz-text">von ' + gesamt + " Tagen ab Erteilung</span></div></li>";
  }
  fristen.titel = function () { return "Einspruchsfristen"; };

  /* ---------- Anmelder ---------- */
  function anmelder(r) {
    var p = r.params, land = p.get("land");
    var alle = D.radar.anmelder || [];
    var laender = {};
    alle.forEach(function (a) { var k = a.land || "?"; laender[k] = laender[k] || { anmelder: 0, eintraege: 0 }; laender[k].anmelder++; laender[k].eintraege += a.anzahl; });
    var landListe = Object.keys(laender).sort(function (x, y) { return laender[y].anmelder - laender[x].anmelder || x.localeCompare(y); });
    var liste = land ? alle.filter(function (a) { return (a.land || "?") === land; }) : alle;
    var max = alle.length ? alle[0].anzahl : 1;
    var html = kopfband({
      kicker: "Rangliste",
      titel: "Anmelder",
      text: "Rangliste nach Anzahl der Patentfamilien im Radar. Die Farben zeigen, in welchen Themen ein Anmelder aktiv ist. Ein Klick auf den Namen zeigt alle seine Einträge.",
      chips: [{ wert: alle.length, name: "Anmelder", farbe: "--band-tinte-2" }, { wert: landListe.filter(function (k) { return k !== "?"; }).length, name: "Länder", farbe: "--patina-band" },
        alle.length ? { wert: alle[0].anzahl, name: "Einträge beim aktivsten Anmelder", farbe: "--messing-band" } : null].filter(Boolean),
      figKey: "anmelder"
    });
    if (!alle.length) return html + leer("Noch keine Anmelder erfasst.", "");
    var maxLand = laender[landListe[0]].anmelder;
    var sichtbar = landListe.slice(0, 11), rest = landListe.slice(11);
    html += '<section class="abschnitt" style="margin-top:0" aria-labelledby="land-titel"><div class="abschnitt-kopf"><h2 id="land-titel">Herkunft der Anmelder</h2>' + (land ? '<a href="#/anmelder">Alle Länder zeigen</a>' : '<span class="hinweis-text">Ein Klick filtert die Rangliste</span>') + "</div>" +
      '<ul class="land-kacheln">' + sichtbar.map(function (k) {
        var x = laender[k];
        return '<li><a href="' + (land === k ? "#/anmelder" : hashMit("anmelder", new URLSearchParams({ land: k }))) + '"' + (land === k ? ' aria-current="true"' : "") + '><span class="land-code">' + esc(k === "?" ? "–" : k) + '</span><span class="land-name">' + esc(landName(k === "?" ? "" : k)) + '</span><span class="land-zahl"><b>' + x.anmelder + "</b> " + plural(x.anmelder, "Anmelder", "Anmelder") + '</span><span class="land-balken"><span style="width:' + Math.max(4, Math.round(100 * x.anmelder / maxLand)) + '%"></span></span></a></li>';
      }).join("") + (rest.length ? '<li class="land-rest"><span class="land-code">+' + rest.length + '</span><span class="land-name">weitere Länder</span><span class="land-zahl">' + esc(rest.map(function (k) { return k === "?" ? "ohne Angabe" : k; }).join(", ")) + "</span></li>" : "") + "</ul></section>";
    html += '<section class="abschnitt" aria-labelledby="rang-titel"><div class="abschnitt-kopf"><h2 id="rang-titel">' + (land ? "Anmelder aus " + esc(landName(land)) : "Rangliste") + "</h2>" +
      '<label class="anm-suche feld"><span class="visuell-verborgen">Anmelder suchen</span>' + ICON.suche + '<input type="search" id="anm-suche" placeholder="Anmelder suchen" autocomplete="off"></label></div>' +
      '<ol class="anm-rangliste">' + liste.map(function (a) {
        var rang = alle.indexOf(a) + 1;
        var segs = THEMEN.filter(function (t) { return (a.themen || {})[t.key]; }).map(function (t) {
          var n = a.themen[t.key];
          return '<span class="anm-seg" style="' + themaStil(t.key) + ";flex-grow:" + n + '" data-tip="' + esc(t.name + ": " + n + " " + plural(n, "Eintrag", "Einträge")) + '"></span>';
        }).join("");
        var chipsA = Object.keys(a.themen || {}).sort(function (x, y) { return a.themen[y] - a.themen[x] || THEMEN.indexOf(THEMA[x]) - THEMEN.indexOf(THEMA[y]); }).map(function (k) {
          return themaChip(k, a.themen[k], hashMit("schutzrechte", new URLSearchParams({ anmelder: a.name, thema: k })));
        }).join("");
        return '<li data-name="' + esc(a.name.toLowerCase()) + '"><span class="anm-rang">' + rang + '</span><div class="anm-kopf"><a class="anm-name" href="' + hashMit("schutzrechte", new URLSearchParams({ anmelder: a.name })) + '">' + esc(a.name) + "</a>" +
          (a.land ? '<span class="land-marke" title="' + esc(landName(a.land)) + '">' + esc(a.land) + "</span>" : "") +
          (a.bestand ? '<a class="anm-bestand" href="' + hashMit("bestand", new URLSearchParams({ anmelder: a.name })) + '">' + a.bestand + " im Bestand</a>" : "") + "</div>" +
          '<div class="anm-mitte"><span class="anm-balken" style="width:' + Math.max(5, Math.round(100 * a.anzahl / max)) + '%">' + segs + '</span><div class="themen-chips">' + chipsA + "</div></div>" +
          '<span class="anm-zahl"><b>' + a.anzahl + "</b><small>" + plural(a.anzahl, "Eintrag", "Einträge") + "</small></span></li>";
      }).join("") + '</ol><p class="hinweis-text anm-leer" hidden>Kein Anmelder passt zur Suche.</p></section>';
    return html;
  }
  anmelder.titel = function () { return "Anmelder"; };
  anmelder.danach = function () {
    var feld = document.getElementById("anm-suche");
    if (!feld) return;
    feld.addEventListener("input", function () {
      var q = feld.value.toLowerCase().trim(), treffer = 0;
      main.querySelectorAll(".anm-rangliste li").forEach(function (li) {
        var ja = !q || li.getAttribute("data-name").indexOf(q) >= 0;
        li.hidden = !ja; if (ja) treffer++;
      });
      main.querySelector(".anm-leer").hidden = treffer > 0;
    });
  };

  /* ---------- Bestand: alle laufenden Schutzrechte ---------- */
  var BESTAND_ART = {
    patent: { name: "Patent erteilt", mehr: "erteilte Patente", art: "Erteilung", farbe: "--r-erteilungen" },
    gm: { name: "Gebrauchsmuster", mehr: "Gebrauchsmuster", art: "Gebrauchsmuster", farbe: "--r-gebrauchsmuster" },
    anmeldung: { name: "Anmeldung", mehr: "Anmeldungen ohne veröffentlichte Erteilung", art: "Offenlegung", farbe: "--r-offenlegungen" }
  };
  var BESTAND_REIHE = ["patent", "gm", "anmeldung"];
  var BESTAND_SORT = {
    neu: { name: "Neueste Anmeldung zuerst", f: function (a, b) { return b.angemeldet.localeCompare(a.angemeldet) || a.id.localeCompare(b.id); } },
    ablauf: { name: "Läuft zuerst aus", f: function (a, b) { return a.ende.localeCompare(b.ende) || a.id.localeCompare(b.id); } },
    spaet: { name: "Läuft zuletzt aus", f: function (a, b) { return b.ende.localeCompare(a.ende) || a.id.localeCompare(b.id); } },
    anmelder: { name: "Anmelder A–Z", f: function (a, b) { return (a.anmName || "~").localeCompare(b.anmName || "~", "de") || b.angemeldet.localeCompare(a.angemeldet); } },
    titel: { name: "Titel A–Z", f: function (a, b) { return a.titel.localeCompare(b.titel, "de"); } }
  };
  var BESTAND_ENDE = { "12m": "in den nächsten 12 Monaten", "1-5": "in 1 bis 5 Jahren", "5-10": "in 5 bis 10 Jahren", "10+": "in mehr als 10 Jahren" };
  var BESTAND_SEITE = 100;
  var bestandLaeuft = false;
  function nrBasis(n) { return String(n || "").replace(/\s/g, "").toUpperCase().replace(/[A-Z]\d?$/, ""); }
  function ladeBestand() {
    if (D.bestand || bestandLaeuft) return;
    bestandLaeuft = true;
    json("data/bestand.json", (D.radar.bestand && D.radar.bestand.stand) || D.radar.stand).then(function (b) {
      var f = {};
      b.felder.forEach(function (n, i) { f[n] = i; });
      var imRadar = {};
      D.radar.eintraege.forEach(function (e) {
        [e.nummer].concat((e.familie || []).map(function (x) { return x.nummer; })).forEach(function (n) { imRadar[nrBasis(n)] = e.id; });
      });
      var h = heute(), liste = [], byId = {}, anmZahl = {};
      b.eintraege.forEach(function (z) {
        var e = { id: z[f.id], amt: z[f.amt], art: z[f.art], nummer: z[f.nummer], dok: z[f.dokumente] || [], angemeldet: z[f.angemeldet],
          veroeffentlicht: z[f.veroeffentlicht], erteilt: z[f.erteilt], ende: z[f.ende], thema: z[f.thema], titel: z[f.titel] || "",
          klassen: z[f.klassen] || [], geaendert: !!z[f.geaendert], bestand: true };
        if (!e.ende || e.ende < h || !BESTAND_ART[e.art]) return;
        e.anmNamen = (z[f.anmelder] || []).map(function (i) { return b.anmelder[i]; }).filter(Boolean);
        e.laender = (z[f.anmelder] || []).map(function (i) { return (b.anmelder_land || [])[i] || ""; });
        e.anmName = e.anmNamen[0] || "";
        e.radar = imRadar[nrBasis(e.nummer)] || null;
        e.such = (e.titel + " " + e.nummer + " " + e.nummer.replace(/\s/g, "") + " " + e.anmNamen.join(" ") + " " + e.klassen.join(" ")).toLowerCase();
        e.anmNamen.forEach(function (n) { anmZahl[n] = (anmZahl[n] || 0) + 1; });
        liste.push(e); byId[e.id] = e;
      });
      D.bestand = { meta: b, liste: liste, byId: byId, anmZahl: anmZahl };
    }).catch(function (err) {
      D.bestandFehler = true;
      if (window.console) console.error(err);
    }).then(function () {
      bestandLaeuft = false;
      if (route().name === "bestand") zeichnen(false);
      if (suche && suche.open) sucheRendern();
    });
  }
  function restText(ende, kurz) {
    var t = tageBis(ende);
    if (t < 0) return "abgelaufen";
    if (t === 0) return "endet heute";
    if (t < 62) return "noch " + t + " " + plural(t, "Tag", "Tage");
    var a = new Date(heute() + "T00:00:00Z"), b = new Date(ende + "T00:00:00Z");
    var m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth()) - (b.getUTCDate() < a.getUTCDate() ? 1 : 0);
    var j = Math.floor(m / 12); m = m % 12;
    if (kurz) return "noch " + (j ? j + " J." : "") + (j && m ? " " : "") + (m ? m + " Mon." : "");
    return "noch " + (j ? j + " " + plural(j, "Jahr", "Jahre") : "") + (j && m ? ", " : "") + (m ? m + " " + plural(m, "Monat", "Monate") : "");
  }
  function endePasst(e, w) {
    var t = tageBis(e.ende);
    if (/^\d{4}$/.test(w)) return e.ende.slice(0, 4) === w;
    if (w === "12m") return t < 365;
    if (w === "1-5") return t >= 365 && t < 1826;
    if (w === "5-10") return t >= 1826 && t < 3652;
    if (w === "10+") return t >= 3652;
    return true;
  }
  function bestandFiltern(liste, p, ohne) {
    var q = (p.get("q") || "").toLowerCase().trim(), woerter = q ? q.split(/\s+/) : [];
    var th = ohne === "thema" ? null : p.get("thema"), art = p.get("art"), amt = p.get("amt");
    var an = ohne === "anmelder" ? null : p.get("anmelder"), en = ohne === "ende" ? null : p.get("ende");
    return liste.filter(function (e) {
      if (th && e.thema !== th) return false;
      if (art && e.art !== art) return false;
      if (amt && e.amt !== amt) return false;
      if (an && e.anmNamen.indexOf(an) < 0) return false;
      if (en && !endePasst(e, en)) return false;
      for (var i = 0; i < woerter.length; i++) if (e.such.indexOf(woerter[i]) < 0) return false;
      return true;
    });
  }
  function bestandZahlen(liste) {
    var z = { gesamt: liste.length, patent: 0, gm: 0, anmeldung: 0, bald: 0 };
    liste.forEach(function (e) { z[e.art]++; if (e.art !== "anmeldung" && tageBis(e.ende) < 365) z.bald++; });
    return z;
  }
  function bestandKopf(z, mitText) {
    var kurz = D.radar.bestand || {};
    var stand = (D.bestand && D.bestand.meta.stand) || kurz.stand;
    var ab = (D.bestand && D.bestand.meta.ab) || kurz.ab;
    var chips = z ? [
      { wert: z.gesamt.toLocaleString("de-DE"), name: "Schutzrechte im Bestand", farbe: "--band-tinte-2", link: "#/bestand" },
      { wert: z.patent.toLocaleString("de-DE"), name: "erteilte Patente", farbe: "--r-erteilungen", link: hashMit("bestand", new URLSearchParams({ art: "patent" })) },
      { wert: z.gm.toLocaleString("de-DE"), name: "Gebrauchsmuster", farbe: "--r-gebrauchsmuster", link: hashMit("bestand", new URLSearchParams({ art: "gm" })) },
      { wert: z.anmeldung.toLocaleString("de-DE"), name: "Anmeldungen", farbe: "--r-offenlegungen", link: hashMit("bestand", new URLSearchParams({ art: "anmeldung" })) },
      { wert: z.bald.toLocaleString("de-DE"), name: "laufen in 12 Monaten aus", farbe: "--kupfer-band", link: hashMit("bestand", new URLSearchParams({ ende: "12m", sort: "ablauf" })) }
    ] : [];
    return kopfband({
      kicker: "Recherche-Datenbank" + (stand ? " · Stand " + datum(stand) : ""),
      titel: "Bestand",
      text: "Alle Patente, Patentanmeldungen und Gebrauchsmuster aus Deutschland und Europa zu den Themen des Radars, deren längstmögliche Laufzeit noch nicht abgelaufen ist" + (ab ? ", veröffentlicht ab " + ab.slice(0, 4) : "") + ". " +
        (mitText === false ? "" : "Ob ein Schutzrecht tatsächlich noch gilt, zeigt das amtliche Register; der Link steht an jedem Eintrag."),
      chips: chips, figKey: "bestand"
    });
  }
  function bestand(r) {
    if (r.arg) return bestandDetail(r);
    var p = r.params;
    if (!D.bestand) {
      if (!D.radar.bestand) return bestandKopf(null) + leer("Der Bestand wird gerade aufgebaut.", "Er erscheint nach der nächsten Aktualisierung.");
      if (!D.bestandFehler) ladeBestand();
      var k = D.radar.bestand;
      return bestandKopf({ gesamt: k.gesamt, patent: k.patente, gm: k.gebrauchsmuster, anmeldung: k.anmeldungen, bald: k.auslaufend_12m }) +
        (D.bestandFehler ? leer("Der Bestand konnte nicht geladen werden.", "Bitte die Seite neu laden.") : '<div class="laden" role="status">Bestand wird geladen …</div>');
    }
    var B = D.bestand, alle = B.liste;
    var sort = BESTAND_SORT[p.get("sort")] ? p.get("sort") : "neu";
    var liste = bestandFiltern(alle, p).sort(BESTAND_SORT[sort].f);
    aktuelleListe = liste;
    var html = bestandKopf(bestandZahlen(alle));
    if (!B.meta.vollstaendig) html += '<p class="hinweis-kasten">Der Bestand wird noch aufgebaut. Bisher sind die jüngeren Veröffentlichungsjahre erfasst; ältere folgen mit den nächsten Abrufen.</p>';
    var an = p.get("anmelder"), en = p.get("ende");
    var endeOpt = Object.keys(BESTAND_ENDE).map(function (k) { return [k, BESTAND_ENDE[k]]; });
    if (en && /^\d{4}$/.test(en)) endeOpt.push([en, "im Jahr " + en]);
    var chips = [];
    if (p.get("q")) chips.push({ text: "Suche: " + p.get("q"), weg: ohneParam("bestand", p, "q") });
    if (p.get("thema")) chips.push({ text: "Thema: " + themaName(p.get("thema")), weg: ohneParam("bestand", p, "thema") });
    if (p.get("art") && BESTAND_ART[p.get("art")]) chips.push({ text: "Art: " + BESTAND_ART[p.get("art")].name, weg: ohneParam("bestand", p, "art") });
    if (p.get("amt")) chips.push({ text: "Amt: " + (AEMTER[p.get("amt")] || p.get("amt")), weg: ohneParam("bestand", p, "amt") });
    if (an) chips.push({ text: "Anmelder: " + an, weg: ohneParam("bestand", p, "anmelder") });
    if (en) chips.push({ text: "Laufzeit endet " + (BESTAND_ENDE[en] || "im Jahr " + en), weg: ohneParam("bestand", p, "ende") });
    html += filterLeiste({
      kat: themenFilter(bestandFiltern(alle, p, "thema"), p, "bestand"),
      suche: '<label class="feld suche"><span class="visuell-verborgen">Im Bestand suchen</span>' + ICON.suche + '<input type="search" name="q" value="' + esc(p.get("q") || "") + '" placeholder="Im Bestand suchen: Titel, Anmelder, Nummer, Patentklasse" autocomplete="off"></label>',
      schnell: BESTAND_REIHE.map(function (k) { return schnellLink("bestand", p, "art", k, { patent: "Patente", gm: "Gebrauchsmuster", anmeldung: "Anmeldungen" }[k], BESTAND_ART[k].mehr); }).join("") +
        schnellLink("bestand", p, "ende", "12m", "läuft bald aus", "Längste Laufzeit endet in den nächsten 12 Monaten"),
      mehr: '<div class="pop-feld">' + auswahl("amt", "Amt", [["DE", AEMTER.DE], ["EP", AEMTER.EP]], p.get("amt")) + "</div>" +
        '<div class="pop-feld">' + auswahl("ende", "Laufzeit endet", endeOpt, en) + "</div>",
      mehrZahl: ["amt", "ende"].filter(function (k) { return p.get(k); }).length, chips: chips, zuruecksetzen: "#/bestand"
    });
    html += ablaufDiagramm(bestandFiltern(alle, p, "ende"), p);
    if (!an) html += topAnmelder(bestandFiltern(alle, p, "anmelder"), p);
    html += '<div class="ergebnis-leiste"><h2 class="ergebnis-zahl"><span class="ez-n">' + liste.length.toLocaleString("de-DE") + "</span> " + plural(liste.length, "Schutzrecht", "Schutzrechte") + "</h2>" +
      '<div class="werkzeug-reihe"><label class="sortier"><span class="visuell-verborgen">Sortierung</span><select name="sort" form="filter" aria-label="Sortierung">' +
      Object.keys(BESTAND_SORT).map(function (k) { return '<option value="' + k + '"' + (k === sort ? " selected" : "") + ">" + BESTAND_SORT[k].name + "</option>"; }).join("") + "</select></label>" +
      exportMenue(false) + "</div></div>";
    if (!liste.length) return html + leer("Keine Schutzrechte zu diesen Filtern.", "Lockere die Filter oder setze sie zurück.");
    html += '<ol class="bestand-liste" data-gezeigt="' + Math.min(BESTAND_SEITE, liste.length) + '">' + liste.slice(0, BESTAND_SEITE).map(bestandZeile).join("") + "</ol>";
    if (liste.length > BESTAND_SEITE) html += '<p class="mehr-zeile"><button type="button" class="knopf" data-mehr>Weitere ' + Math.min(BESTAND_SEITE, liste.length - BESTAND_SEITE) + " anzeigen</button> <span class=\"hinweis-text\">" + BESTAND_SEITE + " von " + liste.length.toLocaleString("de-DE") + " gezeigt</span></p>";
    return html;
  }
  bestand.titel = function (r) {
    if (r.arg && D.bestand && D.bestand.byId[r.arg]) return D.bestand.byId[r.arg].titel;
    return "Bestand";
  };
  bestand.danach = function (r) {
    if (r.arg) return;
    schutzrechte.danach(r);
    var knopf = main.querySelector("[data-mehr]");
    if (!knopf) return;
    knopf.addEventListener("click", function () {
      var ol = main.querySelector(".bestand-liste");
      var n = parseInt(ol.getAttribute("data-gezeigt"), 10);
      var naechste = aktuelleListe.slice(n, n + BESTAND_SEITE);
      ol.insertAdjacentHTML("beforeend", naechste.map(bestandZeile).join(""));
      n += naechste.length;
      ol.setAttribute("data-gezeigt", n);
      var rest = aktuelleListe.length - n;
      if (rest <= 0) { knopf.parentNode.remove(); return; }
      knopf.textContent = "Weitere " + Math.min(BESTAND_SEITE, rest) + " anzeigen";
      knopf.nextElementSibling.textContent = n.toLocaleString("de-DE") + " von " + aktuelleListe.length.toLocaleString("de-DE") + " gezeigt";
    });
  };
  function ablaufDiagramm(liste, p) {
    var jahr0 = parseInt(heute().slice(0, 4), 10), je = {}, max = 0, jahre = [];
    liste.forEach(function (e) {
      var j = parseInt(e.ende.slice(0, 4), 10);
      var x = je[j] = je[j] || { patent: 0, gm: 0, anmeldung: 0, n: 0 };
      x[e.art]++; x.n++;
    });
    var bis = jahr0;
    Object.keys(je).forEach(function (j) { bis = Math.max(bis, parseInt(j, 10)); max = Math.max(max, je[j].n); });
    if (!max) return "";
    for (var j = jahr0; j <= Math.max(bis, jahr0 + 10); j++) jahre.push(j);
    var aktiv = p.get("ende");
    return '<section class="abschnitt ablauf" aria-labelledby="ablauf-titel"><div class="abschnitt-kopf"><h2 id="ablauf-titel">Wann die Laufzeit endet</h2><span class="hinweis-text">Längstmögliche Laufzeit je Jahr. Ein Klick auf ein Jahr filtert die Liste.</span></div>' +
      '<div class="ablauf-rahmen"><ol class="ablauf-saeulen" style="--jahre:' + jahre.length + '">' + jahre.map(function (j) {
        var x = je[j] || { patent: 0, gm: 0, anmeldung: 0, n: 0 };
        var q = new URLSearchParams(p);
        if (aktiv === String(j)) q.delete("ende"); else q.set("ende", String(j));
        var segs = BESTAND_REIHE.filter(function (a) { return x[a]; }).map(function (a) {
          return '<span class="as-seg" style="--sf:var(' + BESTAND_ART[a].farbe + ");flex-grow:" + x[a] + '" data-tip="' + esc(j + " · " + BESTAND_ART[a].name + ": " + x[a].toLocaleString("de-DE")) + '"></span>';
        }).join("");
        var hoch = x.n ? Math.max(2, 100 * x.n / max) : 0;
        return '<li class="' + (j % 5 === 0 || j === jahr0 ? "as-marke" : "") + '"><a href="' + hashMit("bestand", q) + '"' + (aktiv === String(j) ? ' aria-current="true"' : "") +
          ' aria-label="' + esc(j + ": " + x.n + " Schutzrechte") + '"><span class="as-zahl">' + (x.n ? x.n.toLocaleString("de-DE") : "") + '</span><span class="as-saeule"><span class="as-stapel" style="height:' + hoch.toFixed(1) + '%">' + segs + "</span></span>" +
          '<span class="as-jahr">' + j + "</span></a></li>";
      }).join("") + "</ol>" +
      '<ul class="stapel-legende">' + BESTAND_REIHE.map(function (a) {
        var q = new URLSearchParams(p); if (p.get("art") === a) q.delete("art"); else q.set("art", a);
        return '<li><a href="' + hashMit("bestand", q) + '" style="--themafarbe:var(' + BESTAND_ART[a].farbe + ')"' + (p.get("art") === a ? ' aria-current="true"' : "") + '><span class="farbfeld"></span>' + esc(BESTAND_ART[a].name) + "</a></li>";
      }).join("") + "</ul></div></section>";
  }
  function topAnmelder(liste, p) {
    var z = {};
    liste.forEach(function (e) { e.anmNamen.forEach(function (n) { z[n] = (z[n] || 0) + 1; }); });
    var top = Object.keys(z).sort(function (a, b) { return z[b] - z[a] || a.localeCompare(b, "de"); }).slice(0, 12);
    if (top.length < 2) return "";
    return '<div class="top-anmelder"><span class="ta-titel">Häufigste Anmelder in dieser Auswahl</span><div class="ta-chips">' + top.map(function (n) {
      var q = new URLSearchParams(p); q.set("anmelder", n);
      return '<a class="ta-chip" href="' + hashMit("bestand", q) + '">' + esc(n) + " <b>" + z[n].toLocaleString("de-DE") + "</b></a>";
    }).join("") + "</div></div>";
  }
  function bestandZeile(e) {
    var A = BESTAND_ART[e.art], t = tageBis(e.ende);
    var gesamt = Math.max(1, Math.round((new Date(e.ende + "T00:00:00Z") - new Date(e.angemeldet + "T00:00:00Z")) / 86400000));
    var rest = Math.max(0, Math.min(100, Math.round(100 * t / gesamt)));
    var kind = (e.dok[e.dok.length - 1] || [])[0] || "";
    var bald = e.art !== "anmeldung" && t < 365;
    return '<li class="bestand-zeile b-' + e.art + (bald ? " bald" : "") + '" data-flip="b-' + esc(e.id) + '" style="' + themaStil(e.thema) + ";--af:var(" + A.farbe + ')">' +
      '<span class="ende-kachel" aria-hidden="true"><small>bis</small><b>' + e.ende.slice(0, 4) + "</b><span>" + MONATE[parseInt(e.ende.slice(5, 7), 10) - 1] + "</span></span>" +
      '<div class="fz-info"><div class="karte-oben">' + kindMini(A.art, e.amt, kind) + '<span class="nummer">' + esc(e.nummer) + '</span><span class="b-art">' + esc(A.name) + "</span>" + themaChip(e.thema) +
      (e.radar ? '<span class="etikett im-radar">auch im Radar</span>' : "") + "</div>" +
      '<a class="fz-titel" href="#/bestand/' + encodeURIComponent(e.id) + '">' + esc(e.titel) + "</a>" +
      '<span class="fz-anm">' + esc(e.anmNamen.join(", ") || "Anmelder unbekannt") + (e.laender[0] ? ' <span class="land-marke">' + esc(e.laender[0]) + "</span>" : "") +
      '<span class="b-daten"> · angemeldet ' + datum(e.angemeldet) + (e.erteilt ? ", erteilt " + datum(e.erteilt) : "") + "</span></span></div>" +
      '<div class="fz-rest"><span class="fz-tage">' + (e.art === "anmeldung" ? "<small>falls erteilt:</small> " : "") + esc(restText(e.ende, true)) + "</span>" +
      '<span class="fz-balken" role="img" aria-label="' + rest + ' Prozent der längsten Laufzeit verbleiben"><span style="width:' + Math.max(2, rest) + '%"></span></span>' +
      '<span class="fz-text">längstens bis ' + datum(e.ende) + "</span></div></li>";
  }
  function pruefziffer(n12) {
    var s = 0;
    n12.split("").reverse().forEach(function (z, i) { s += parseInt(z, 10) * (i + 2); });
    var p = (11 - s % 11) % 11;
    return p === 10 ? 0 : p;
  }
  function depatisId(e, kind) {
    var z = nrBasis(e.nummer).slice(2);
    return e.amt + (e.amt === "EP" ? ("000000000" + z).slice(-9) : z) + kind;
  }
  function bestandLinks(e) {
    var z = nrBasis(e.nummer).slice(2), kind = (e.dok[e.dok.length - 1] || [])[0] || "", l = [];
    if (e.amt === "DE" && z.length === 12) l.push({ label: "DPMAregister", url: "https://register.dpma.de/DPMAregister/pat/register?AKZ=" + z + pruefziffer(z), rechtsstand: true });
    if (e.amt === "EP") l.push({ label: "Europäisches Patentregister", url: "https://register.epo.org/smartSearch?searchMode=smart&query=EP" + z + "&lng=de", rechtsstand: true });
    l.push({ label: "Espacenet", url: "https://worldwide.espacenet.com/patent/search?q=pn%3D" + e.amt + z + kind });
    e.dok.slice().reverse().forEach(function (d) {
      l.push({ label: "DEPATISnet (" + d[0] + ")", url: "https://depatisnet.dpma.de/DepatisNet/depatisnet?action=bibdat&docid=" + depatisId(e, d[0]) });
    });
    return l;
  }
  function bestandVerlauf(e) {
    var h = heute(), punkte = [{ d: e.angemeldet, name: "Anmeldung", inid: "(22)", farbe: "--tinte-3" }];
    e.dok.forEach(function (d) {
      if (!d[1]) return;
      var k = d[0];
      if (k === "U1") punkte.push({ d: d[1], name: "Eintragung bekannt gemacht", inid: "(43)", farbe: "--r-gebrauchsmuster" });
      else if (k === "B2") punkte.push({ d: d[1], name: "Geänderte Patentschrift", inid: "(45)", farbe: "--r-erteilungen" });
      else if (k.charAt(0) === "B") punkte.push({ d: d[1], name: "Erteilung", inid: "(45)", farbe: "--r-erteilungen" });
      else punkte.push({ d: d[1], name: "Offenlegung", inid: "(43)", farbe: "--r-offenlegungen" });
    });
    if (e.art !== "anmeldung") punkte.push({ d: e.ende, name: "Laufzeitende, längstens", farbe: tageBis(e.ende) < 365 ? "--kupfer" : "--patina" });
    punkte = punkte.filter(function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(x.d || ""); }).sort(function (a, b) { return a.d.localeCompare(b.d); });
    punkte.push({ d: h, name: "heute", heute: true });
    punkte.sort(function (a, b) { return a.d.localeCompare(b.d) || (a.heute ? -1 : 0); });
    if (e.art === "anmeldung") punkte.push({ offen: true, name: "Keine Erteilung veröffentlicht" });
    function dauer(a, b) {
      var t = Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 86400000);
      if (t < 45) return t + " " + plural(t, "Tag", "Tage");
      var m = Math.round(t / 30.44);
      return m < 24 ? m + " Monate" : String(Math.round(m / 12 * 10) / 10).replace(".", ",") + " Jahre";
    }
    var out = '<ol class="verlauf">';
    punkte.forEach(function (x, i) {
      if (i) {
        var vor = punkte[i - 1];
        var tage = x.offen ? 400 : Math.max(1, (new Date(x.d) - new Date(vor.d)) / 86400000);
        var zukunft = x.offen || vor.heute || vor.d > h;
        out += '<li class="vl-strecke' + (zukunft ? " zukunft" : "") + '" style="flex-grow:' + Math.max(1, Math.sqrt(tage) / 4).toFixed(2) + '" aria-hidden="true"><span>' + (x.offen ? "" : dauer(vor.d, x.d)) + "</span></li>";
      }
      out += '<li class="vl-punkt' + (x.heute ? " vl-heute" : "") + (x.offen ? " vl-offen" : "") + '"' + (x.farbe ? ' style="--vf:var(' + x.farbe + ')"' : "") + '><span class="vl-marke"></span><span class="vl-name">' +
        (x.inid ? '<span class="inid">' + x.inid + "</span>" : "") + esc(x.name) + "</span>" + (x.d ? '<span class="vl-datum">' + datum(x.d) + "</span>" : "") + "</li>";
    });
    return out + "</ol>";
  }
  function bestandDetail(r) {
    if (!D.bestand) {
      if (!D.bestandFehler) ladeBestand();
      return D.bestandFehler ? leer("Der Bestand konnte nicht geladen werden.", "Bitte die Seite neu laden.") : '<div class="laden" role="status">Bestand wird geladen …</div>';
    }
    var e = D.bestand.byId[r.arg];
    if (!e) return leer("Dieses Schutzrecht ist nicht (mehr) im Bestand.", "Seine längstmögliche Laufzeit ist vermutlich abgelaufen.") + '<p style="margin-top:14px"><a href="#/bestand">Zum Bestand</a></p>';
    var A = BESTAND_ART[e.art], t = tageBis(e.ende), kind = (e.dok[e.dok.length - 1] || [])[0] || "";
    var links = bestandLinks(e), register = links.filter(function (l) { return l.rechtsstand; })[0];
    var html = detailBand({
      thema: e.thema, schluessel: e.id,
      zurueck: { href: "#/bestand", text: "Bestand" },
      badges: kindMini(A.art, e.amt, kind) + '<span class="db-pille">' + esc(A.name) + '</span><span class="db-pille">' + esc(themaName(e.thema)) + "</span>" +
        (e.radar ? '<a class="db-pille signal" href="#/eintrag/' + encodeURIComponent(e.radar) + '">auch im Radar</a>' : ""),
      titel: esc(e.titel)
    });
    var rechtsText = e.art === "anmeldung"
      ? "Zu dieser Anmeldung ist keine Erteilung veröffentlicht. Eine Anmeldung allein gibt noch keinen Schutz. Ob sie noch geprüft wird, zurückgenommen oder zurückgewiesen wurde, zeigt das Register. Wird sie erteilt, läuft das Patent längstens bis " + datum(e.ende) + "."
      : e.art === "gm"
        ? "Ein Gebrauchsmuster läuft längstens zehn Jahre nach Ablauf des Monats, in dem es angemeldet wurde (§ 23 GebrMG), hier also bis " + datum(e.ende) + ". Es muss nach drei, sechs und acht Jahren verlängert werden; ob das geschehen ist, zeigt das Register."
        : "Ein Patent läuft längstens 20 Jahre ab dem Anmeldetag (" + (e.amt === "EP" ? "Art. 63 EPÜ" : "§ 16 PatG") + "), hier also bis " + datum(e.ende) + ". Es erlischt früher, wenn die Jahresgebühren nicht gezahlt werden, der Inhaber verzichtet oder es widerrufen oder für nichtig erklärt wird." +
          (e.amt === "EP" ? " Ein europäisches Patent wirkt in den Staaten, in denen es validiert wurde; die Länder zeigt das Europäische Patentregister." : "");
    var bald = e.art !== "anmeldung" && t < 365;
    var kacheln = [
      fakt(SYM.uhr, e.art === "anmeldung" ? "Falls erteilt, längstens bis" : "Längstens bis", datum(e.ende), t <= 0 ? "endet heute" : restText(e.ende), "fk-frist " + (bald ? "unter-30" : e.art === "anmeldung" ? "offen" : "laeuft")),
      fakt(SYM.kalender, '<span class="inid">(22)</span>Angemeldet', datum(e.angemeldet), e.erteilt ? "erteilt " + datum(e.erteilt) : "veröffentlicht " + datum(e.veroeffentlicht)),
      fakt(SYM.anmelder, '<span class="inid">(71)</span>Anmelder', e.anmNamen.map(function (a) { return '<a href="' + hashMit("bestand", new URLSearchParams({ anmelder: a })) + '">' + esc(a) + "</a>"; }).join(", ") || "–",
        e.laender.filter(Boolean).length ? esc(e.laender.filter(Boolean).map(landName).filter(function (x, i, l) { return l.indexOf(x) === i; }).join(", ")) : ""),
      fakt(zThema(e.thema, "fk-thema"), "Thema", '<a href="' + hashMit("bestand", new URLSearchParams({ thema: e.thema })) + '">' + esc(THEMA[e.thema] ? THEMA[e.thema].knapp : themaName(e.thema)) + "</a>", "aus Patentklasse und Titel"),
      fakt(SYM.seite, '<span class="inid">(11)</span>Nummer', '<span class="nummer">' + esc(e.nummer) + "</span>", esc(A.name) + ", " + esc(AEMTER[e.amt] || e.amt)),
      fakt(SYM.tabelle, '<span class="inid">(51)</span>Patentklassen', esc(e.klassen.slice(0, 3).join(", ") || "–"), e.klassen.length > 3 ? "und " + (e.klassen.length - 3) + " weitere" : "")
    ];
    function zeile(inid, name, wert) { return "<dt>" + (inid ? '<span class="inid">' + inid + "</span>" : "") + esc(name) + "</dt><dd>" + wert + "</dd>"; }
    html += '<div class="detail"><article class="detail-haupt" style="' + themaStil(e.thema) + '">' +
      '<div class="faktenraster">' + kacheln.join("") + "</div>" +
      '<section class="d-abschnitt"><h2>Laufzeit</h2>' + bestandVerlauf(e) + "</section>" +
      '<div class="rechtsstand-kasten"><div><h3>' + (e.art === "anmeldung" ? "Stand der Anmeldung prüfen" : "Gilt es noch?") + "</h3><p>" + esc(rechtsText) + "</p></div></div>" +
      (e.radar ? '<p class="im-radar-hinweis">Dieses Schutzrecht ist auch im Radar beschrieben, mit Zusammenfassung „Was ist neu?“. <a href="#/eintrag/' + encodeURIComponent(e.radar) + '">Zum Radar-Eintrag</a></p>' : "") +
      '<details class="d-mehr"><summary>Alle bibliografischen Daten</summary><dl class="daten">' +
      zeile("(11)", "Nummer", '<span class="nummer">' + esc(e.nummer) + "</span>") +
      zeile("", "Art", esc(A.name) + ", " + esc(AEMTER[e.amt] || e.amt)) +
      zeile("(22)", "Anmeldetag", datum(e.angemeldet)) +
      (e.erteilt ? zeile("(45)", "Erteilt", datum(e.erteilt)) : zeile("(43)", "Veröffentlicht", datum(e.veroeffentlicht))) +
      zeile("", "Längstens bis", datum(e.ende)) +
      zeile("(51)", "Klassen", esc(e.klassen.join(", ") || "–")) +
      zeile("(71)", "Anmelder", e.anmNamen.map(function (a, i) { return '<a href="' + hashMit("bestand", new URLSearchParams({ anmelder: a })) + '">' + esc(a) + "</a>" + (e.laender[i] ? ' <span class="land-marke" title="' + esc(landName(e.laender[i])) + '">' + esc(e.laender[i]) + "</span>" : ""); }).join("<br>") || "–") +
      zeile("", "Thema", '<span class="thema-marke" style="' + themaStil(e.thema) + '">' + esc(themaName(e.thema)) + "</span>") + "</dl>" +
      '<p class="hinweis-text inid-hinweis">Anmelder wie zuletzt veröffentlicht. Spätere Übertragungen stehen im Register.</p></details>' +
      '<div class="aktion-leiste">' + (register ? '<a class="knopf primaer" href="' + esc(register.url) + '" target="_blank" rel="noopener noreferrer">Rechtsstand<span class="al-lang"> im ' + (e.amt === "EP" ? "EP-Register" : "DPMAregister") + '</span> prüfen <span aria-hidden="true">↗</span></a>' : "") +
      '<button type="button" class="knopf" data-teilen aria-label="Link kopieren">' + ICON.teilen + "<span>Link kopieren</span></button>" +
      (e.anmName ? '<a class="knopf" href="' + hashMit("bestand", new URLSearchParams({ anmelder: e.anmName })) + '" aria-label="Alle Schutzrechte dieses Anmelders">' + SYM.anmelder + "<span>Alle dieses Anmelders</span></a>" : "") + "</div>" +
      "</article><aside class=\"detail-seite\">";
    html += '<div class="kasten"><h2>Veröffentlichungen</h2><ul class="familie-liste">' + e.dok.slice().reverse().map(function (d) {
      var art = d[0] === "U1" ? "Gebrauchsmuster" : d[0].charAt(0) === "B" ? "Erteilung" : "Offenlegung";
      var name = d[0] === "U1" ? "Gebrauchsmuster" : d[0] === "B2" ? "Geänderte Patentschrift" : d[0].charAt(0) === "B" ? "Patentschrift" : "Offenlegungsschrift";
      return "<li>" + kindMini(art, e.amt, d[0]) + '<span><span class="nummer">' + esc(e.nummer.replace(/[A-Z]\d?$/, d[0])) + "</span><small>" + esc(name) + (d[1] ? ", " + datum(d[1]) : "") + "</small></span></li>";
    }).join("") + "</ul></div>";
    html += '<div class="kasten"><h2>Amtliche Quellen</h2><ul class="quellen-links">' + links.map(function (l) {
      return '<li><a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label + (l.rechtsstand ? " (Rechtsstand)" : "")) + '<span aria-hidden="true">↗</span></a></li>';
    }).join("") + '</ul><p class="hinweis-text db-hinweis">Das Bild oben ist ein Materialbild zum Thema, keine Abbildung aus der Schrift.</p></div></aside></div>';
    return html;
  }

  /* ---------- News ---------- */
  function news() {
    var liste = D.news.slice().sort(function (a, b) { return String(b.datum).localeCompare(a.datum); });
    var quellen = {};
    liste.forEach(function (n) { quellen[n.quelle] = 1; });
    var html = kopfband({
      kicker: "Presseschau",
      titel: "News",
      text: "Patent- und Innovationsnachrichten aus Dach und Entwässerung: Patentstreitigkeiten, Rechtsänderungen, Meldungen der Ämter und der Fachpresse. Höchstens zehn Meldungen pro Woche.",
      chips: [{ wert: liste.length, name: plural(liste.length, "Meldung", "Meldungen"), farbe: "--band-tinte-2" }, { wert: Object.keys(quellen).length, name: "Quellen", farbe: "--patina-band" }]
        .concat(liste.length ? [{ name: "neueste vom " + datum(liste[0].datum), farbe: "--messing-band" }] : []),
      figKey: "news"
    });
    if (!liste.length) return html + leer("Noch keine Meldungen.", "Neue Meldungen erscheinen mit der nächsten wöchentlichen Aktualisierung.");
    var monate = [];
    liste.forEach(function (n) { var m = String(n.datum).slice(0, 7); if (!monate.length || monate[monate.length - 1].m !== m) monate.push({ m: m, liste: [] }); monate[monate.length - 1].liste.push(n); });
    return html + monate.map(function (g) {
      return '<section class="news-monat"><h2>' + MONATE_LANG[parseInt(g.m.slice(5), 10) - 1] + " " + g.m.slice(0, 4) + '</h2><ul class="news-liste">' + g.liste.map(function (n) {
        var stil = n.thema ? themaStil(n.thema) : "--themafarbe: var(--tinte-3)";
        return '<li style="' + stil + '">' + datumKachel(n.datum, "news-tag") +
          '<span class="news-symbol">' + (n.thema ? zThema(n.thema) : '<svg class="ic-thema" viewBox="0 0 48 48" aria-hidden="true"><path d="M8 10h26v30H12a4 4 0 0 1-4-4z"/><path d="M34 18h6v18a4 4 0 0 1-8 0V10"/><path d="M14 17h14M14 23h14M14 29h9"/></svg>') + "</span>" +
          '<div class="news-inhalt"><div class="news-meta"><span class="quelle-marke">' + esc(n.quelle) + "</span>" + (n.thema ? themaChip(n.thema) : "") + "</div><h3>" + esc(n.titel) + "</h3><p>" + esc(n.text) + "</p>" +
          '<a class="news-link" href="' + esc(n.url) + '" target="_blank" rel="noopener noreferrer">Zur Meldung bei ' + esc(n.quelle) + ' <span aria-hidden="true">↗</span></a></div></li>';
      }).join("") + "</ul></section>";
    }).join("");
  }
  news.titel = function () { return "News"; };

  /* ---------- Berichte ---------- */
  function berichte(r) {
    if (r.arg) return bericht(r.arg);
    var liste = D.berichte.slice().sort(function (a, b) { return String(b.zeitraum.bis).localeCompare(a.zeitraum.bis) || (a.art === "monat" ? -1 : 1); });
    var monat = liste.filter(function (b) { return b.art === "monat"; }), woche = liste.filter(function (b) { return b.art !== "monat"; });
    var html = kopfband({
      kicker: "Archiv",
      titel: "Berichte",
      text: "Wochenzusammenfassungen nach jeder Aktualisierung und ein kompakter Monatsbericht am ersten Montag des Monats. Monatsberichte lassen sich auf A4 drucken oder als PDF speichern.",
      chips: [{ wert: monat.length, name: plural(monat.length, "Monatsbericht", "Monatsberichte"), farbe: "--messing-band" }, { wert: woche.length, name: plural(woche.length, "Wochenbericht", "Wochenberichte"), farbe: "--patina-band" }],
      figKey: "berichte"
    });
    if (!liste.length) return html + leer("Noch keine Berichte.", "");
    function kachel(b) {
      var k = b.kennzahlen || {};
      var istMonat = b.art === "monat";
      var marke = istMonat ? '<span class="bk-marke monat"><small>' + esc(String(b.zeitraum.bis).slice(0, 4)) + "</small>" + esc(MONATE[parseInt(String(b.zeitraum.bis).slice(5, 7), 10) - 1]) + "</span>"
        : '<span class="bk-marke woche"><small>KW</small>' + kw(b.zeitraum.bis).woche + "</span>";
      return '<li><a class="bericht-kachel ' + (istMonat ? "bk-monat" : "bk-woche") + '" href="#/berichte/' + encodeURIComponent(b.id) + '">' + marke +
        '<span class="bk-kopf"><span class="bk-art">' + (istMonat ? "Monatsbericht" : "Wochenbericht") + "</span><strong>" + esc(b.titel) + '</strong><span class="bk-zeit">' + datum(b.zeitraum.von) + " bis " + datum(b.zeitraum.bis) + "</span></span>" +
        '<span class="bk-zahlen"><span style="--kf:var(--patina)"><b>' + (k.neu || 0) + "</b> neu</span>" + '<span style="--kf:var(--r-erteilungen)"><b>' + (k.erteilungen || 0) + "</b> Erteilungen</span>" +
        '<span style="--kf:var(--r-gebrauchsmuster)"><b>' + (k.gebrauchsmuster || 0) + "</b> Gebrauchsmuster</span></span>" +
        (b.themen ? themenBalken(b.themen, "Neue Einträge nach Thema") : "") +
        (b.kurz ? '<span class="bk-kurz">' + esc(b.kurz) + "</span>" : "") + "</a></li>";
    }
    if (monat.length) html += '<section class="abschnitt" style="margin-top:0"><div class="abschnitt-kopf"><h2>Monatsberichte</h2></div><ul class="berichte-liste monate">' + monat.map(kachel).join("") + "</ul></section>";
    if (woche.length) html += '<section class="abschnitt"><div class="abschnitt-kopf"><h2>Wochenberichte</h2></div><ul class="berichte-liste">' + woche.map(kachel).join("") + "</ul></section>";
    return html;
  }
  berichte.titel = function (r) { var b = r.arg && D.berichte.filter(function (x) { return x.id === r.arg; })[0]; return b ? b.titel : "Berichte"; };

  function eintragZeile(id, extra) {
    var e = D.byId[id];
    if (!e) return "";
    return '<li class="bz-zeile" style="' + themaStil(e.thema) + '">' + kindMini(e.art, e.amt, e.kind) + '<span class="bz-symbol-klein">' + zThema(e.thema) + "</span>" +
      '<span class="bz-text"><a href="#/eintrag/' + encodeURIComponent(e.id) + '">' + esc(e.titel) + "</a><small>" + esc((e.anmelder || []).join(", ")) + ', <span class="nummer">' + esc(e.nummer) + "</span>" + (extra ? extra(e) : "") + "</small></span></li>";
  }
  function bericht(id) {
    var b = D.berichte.filter(function (x) { return x.id === id; })[0];
    if (!b) return leer("Bericht nicht gefunden.", "") + '<p style="margin-top:14px"><a href="#/berichte">Alle Berichte</a></p>';
    var k = b.kennzahlen || {};
    var artName = b.art === "monat" ? "Monatsbericht" : "Wochenbericht";
    var html = kopfband({
      oben: '<a class="band-zurueck" href="#/berichte">' + ICON.zurueck + "Alle Berichte</a>",
      kicker: artName,
      titel: esc(b.titel),
      text: "Zeitraum " + datum(b.zeitraum.von) + " bis " + datum(b.zeitraum.bis) + ", erstellt am " + datum(b.erstellt) + ".",
      figKey: "berichte"
    });
    html += '<div class="bericht-werkzeuge"><button type="button" class="knopf" data-drucken>' + ICON.druck + 'Drucken oder als PDF speichern</button><button type="button" class="knopf" data-teilen>' + ICON.teilen + "Link kopieren</button></div>" +
      '<article class="bericht"><header class="nur-druck"><p class="hinweis-text" style="margin:0">' + artName + " Patent-Radar Bau &amp; Dach</p><h1>" + esc(b.titel) + '</h1><p class="zeitraum">Zeitraum ' + datum(b.zeitraum.von) + " bis " + datum(b.zeitraum.bis) + ", erstellt am " + datum(b.erstellt) + "</p></header>" +
      (b.zusammenfassung ? '<p class="absatz">' + esc(b.zusammenfassung) + "</p>" : "") +
      kennzahlBlock([
        { wert: k.neu || 0, name: "neue Einträge", farbe: "--patina" }, { wert: k.erteilungen || 0, name: "davon Erteilungen", farbe: "--r-erteilungen" },
        { wert: k.gebrauchsmuster || 0, name: "davon Gebrauchsmuster", farbe: "--r-gebrauchsmuster" }, { wert: k.fristen_laufend || 0, name: "laufende Einspruchsfristen", farbe: "--messing" }
      ]);
    if (b.themen && Object.keys(b.themen).length) {
      html += "<h2>Neue Einträge nach Thema</h2>" + themenBalken(b.themen, "Neue Einträge nach Thema") +
        '<ul class="stapel-legende bericht-legende">' + THEMEN.filter(function (t) { return b.themen[t.key]; }).map(function (t) {
          return '<li><span style="' + themaStil(t.key) + '" class="leg-eintrag"><span class="farbfeld"></span>' + esc(t.name) + " <b>" + b.themen[t.key] + "</b></span></li>";
        }).join("") + "</ul>";
    }
    if (b.top && b.top.length) html += "<h2>" + (b.art === "monat" ? "Top 5 des Monats" : "Top 3 der Woche") + '</h2><ol class="bericht-eintraege">' + b.top.map(function (i) { return eintragZeile(i); }).join("") + "</ol>";
    if (b.fristen && b.fristen.length) html += "<h2>" + (b.art === "monat" ? "Einspruchsfristen der nächsten 90 Tage" : "Neue Einspruchsfristen") + '</h2><ul class="bericht-eintraege">' + b.fristen.map(function (i) { return eintragZeile(i, function (e) { return ', Einspruch bis <span class="frist ' + fristKlasse(e) + '">' + datum(e.einspruch_bis) + "</span>"; }); }).join("") + "</ul>";
    if (b.trends) html += "<h2>Trends</h2><p>" + esc(b.trends) + "</p>";
    if (b.anmelder && b.anmelder.length) {
      var maxA = b.anmelder[0].anzahl || 1;
      html += '<h2>Aktivste Anmelder</h2><ul class="bericht-anmelder">' + b.anmelder.map(function (a) {
        return '<li><a href="' + hashMit("schutzrechte", new URLSearchParams({ anmelder: a.name })) + '">' + esc(a.name) + '</a><span class="ba-balken"><span style="width:' + Math.max(4, Math.round(100 * a.anzahl / maxA)) + '%"></span></span><b>' + a.anzahl + "</b></li>";
      }).join("") + "</ul>";
    }
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
    var html = kopfband({
      kicker: "Eigene Auswahl",
      titel: "Merkliste",
      text: "Die Merkliste wird nur in diesem Browser gespeichert und nicht übertragen.",
      chips: [{ wert: liste.length, name: "gemerkt", farbe: "--patina-band" }],
      figKey: "merkliste"
    });
    if (!liste.length) return html + '<div class="leer leer-bild"><strong>Die Merkliste ist leer.</strong>Über „Merken“ an einem Eintrag landet er hier.<p><a class="knopf primaer" href="#/schutzrechte">Zu den Schutzrechten</a></p></div>';
    html += '<div class="ergebnis-leiste"><span class="ergebnis-zahl"><strong>' + liste.length + "</strong> gemerkt</span><div class=\"werkzeug-reihe\">" + exportKnoepfe() + "</div></div>";
    return html + '<ul class="liste">' + liste.map(function (e) { return karte(e); }).join("") + "</ul>";
  }
  merkliste.titel = function () { return "Merkliste"; };

  /* ---------- Hinweise ---------- */
  function hinweise() {
    var R = D.radar, abd = R.abdeckung || {};
    var quellen = (abd.quellen || []).map(function (q) {
      var st = String(q.status || "").toLowerCase();
      return '<li class="quelle-karte"><span class="qk-name">' + esc(q.name) + '</span><span class="qk-umfang">' + esc(q.umfang || "") + '</span><span class="qk-fuss"><span>Datenstand ' + (q.stand ? datum(q.stand) : "–") + '</span><span class="status-marke ' + (st === "aktuell" ? "gut" : st ? "warn" : "") + '">' + esc(q.status || "–") + "</span></span></li>";
    }).join("");
    var schritte = [
      ["Abruf", "Jeden Montag werden die Veröffentlichungen der Vorwochen über Patentklassen (CPC/IPC) und Stichwörter abgerufen. Ein rollierendes Fenster von 30 Tagen fängt verspätet eingespielte Daten auf; bereits bekannte Nummern werden übersprungen."],
      ["Prüfung", "Treffer werden thematisch geprüft und als hoch oder mittel relevant eingestuft. Bauthemen ohne Dachbezug werden nicht aufgenommen."],
      ["Familien", "Dokumente derselben Patentfamilie werden zu einem Eintrag zusammengefasst; gezeigt wird der weiteste Stand, also Erteilung vor Anmeldung. Wird eine bereits gezeigte Anmeldung erteilt, wird der Eintrag aktualisiert und als „neu erteilt“ markiert."],
      ["Belege", "Jeder Eintrag beruht auf einer amtlichen Nummer und verlinkt auf Espacenet und das jeweilige amtliche Register. Daten und Fristen stammen aus den amtlichen Daten; Einspruchsfristen werden aus dem Veröffentlichungstag der Erteilung berechnet."],
      ["Texte", "Die Texte unter „Was ist neu?“ und „Bezug“ sind eigene Zusammenfassungen und ersetzen nicht die Lektüre der Patentschrift."],
      ["Bilder", "Die Zeichnungen auf dieser Seite sind eigene Symbolbilder im Stil von Patentzeichnungen. Sie zeigen keine Inhalte aus den Patentschriften."]
    ];
    function km(art, amt, kind) { return kindMini(art, amt, kind); }
    var glossar = [
      { rubrik: "offenlegungen", titel: "Offenlegung", text: "Veröffentlichung einer Patentanmeldung, meist 18 Monate nach dem Prioritätstag. Ein Schutzrecht besteht damit noch nicht." },
      { rubrik: "erteilungen", titel: "Erteilung", text: "Nach der Prüfung gewährtes Patent. Ab der Veröffentlichung der Erteilung läuft die neunmonatige Einspruchsfrist." },
      { rubrik: "gebrauchsmuster", titel: "Gebrauchsmuster", text: "Ungeprüftes Schutzrecht für technische Erfindungen mit bis zu zehn Jahren Laufzeit. Es wird ohne Prüfung auf Neuheit eingetragen und kann über einen Löschungsantrag angegriffen werden." },
      { rubrik: "international", titel: "Internationale Anmeldung", text: "Anmeldung nach dem Patentzusammenarbeitsvertrag (PCT), veröffentlicht von der WIPO. Sie kann später in nationale oder regionale Verfahren übergehen, etwa als europäische Anmeldung." },
      { zeichen: "§", farbe: "--messing", titel: "Einspruch", text: "Verfahren, mit dem Dritte ein erteiltes Patent innerhalb von neun Monaten nach Veröffentlichung der Erteilung angreifen können (DE: § 59 PatG, EP: Art. 99 EPÜ)." },
      { zeichen: "DE·EP", farbe: "--patina", titel: "Patentfamilie", text: "Alle Anmeldungen und Patente, die auf dieselbe Erfindung und dieselbe Priorität zurückgehen, etwa eine deutsche und eine europäische Fassung." },
      { zeichen: "A1", farbe: "--tinte-3", titel: "Kind-Codes", text: "Kennbuchstaben hinter der Nummer. DE: A1 Offenlegungsschrift, B3 Patentschrift ohne vorherige Offenlegung, B4 Patentschrift nach Offenlegung, U1 Gebrauchsmuster. EP: A1 Anmeldung mit Recherchenbericht, A2 Anmeldung ohne Recherchenbericht, B1 Patentschrift, B2 geänderte Patentschrift nach Einspruch. WO: A1 internationale Anmeldung.",
        zusatz: '<span class="gl-kinds">' + km("Offenlegung", "DE", "A1") + km("Erteilung", "DE", "B4") + km("Gebrauchsmuster", "DE", "U1") + km("Offenlegung", "EP", "A2") + km("Erteilung", "EP", "B1") + km("Internationale Anmeldung", "WO", "A1") + "</span>" },
      { zeichen: "10", farbe: "--t-entwaesserung", titel: "Bezugszeichen", text: "Zahlen in Patentzeichnungen, die auf einzelne Bauteile verweisen. In der Zeichnung auf der Übersicht führen sie zu den Themen des Radars." },
      { zeichen: "(11)", farbe: "--tinte-3", titel: "INID-Kennungen", text: "International genormte Zahlen in Klammern für die Angaben auf Patentschriften, etwa (11) Nummer, (22) Anmeldetag, (54) Bezeichnung oder (71) Anmelder." },
      { zeichen: "EP", farbe: "--r-offenlegungen", titel: "Einheitliche Wirkung", text: "Europäische Patente können nach der Erteilung einheitliche Wirkung in den teilnehmenden EU-Staaten erhalten (Einheitspatent). Den Status zeigt das Europäische Patentregister." }
    ];
    var html = kopfband({
      kicker: "Quellen und Methode",
      titel: "Hinweise",
      text: "Quellen, Methode und Abdeckung des Radars, die wichtigsten Begriffe und wie lange es dauert, bis eine Erfindung sichtbar wird.",
      chips: [{ wert: "✓", name: "keine Cookies", farbe: "--patina-band" }, { wert: "✓", name: "kein Tracking", farbe: "--patina-band" }, { wert: "✓", name: "alles lokal geladen", farbe: "--patina-band" }],
      figKey: "hinweise"
    });
    html += '<div class="text-seite">' +
      '<p class="rechtlich">Automatisierte Übersicht öffentlicher Veröffentlichungen. Keine Rechtsberatung. Vor Entscheidungen bitte durch eine Patentanwältin oder einen Patentanwalt prüfen lassen.</p>' +
      '<h2 class="mit-zeichen"><span class="h-zeichen" style="--hz:var(--r-offenlegungen)">1</span>Quellen und Abdeckung</h2>' +
      (abd.status === "eingeschraenkt" ? '<p><span class="abdeckung-hinweis">Eingeschränkte Abdeckung</span> ' + esc(abd.hinweis || "") + "</p>" : "") +
      (quellen ? '<ul class="quellen-karten">' + quellen + "</ul>" : "") +
      '<p style="margin-top:14px">Erfasst werden Offenlegungsschriften (A1), Patentschriften (B3, B4) und Gebrauchsmuster (U1) des Deutschen Patent- und Markenamts sowie europäische Anmeldungen (A1, A2) und erteilte europäische Patente (B1, B2) des Europäischen Patentamts. Internationale Anmeldungen (WO) werden nur aufgenommen, wenn sie thematisch klar passen; sie sind nicht vollständig erfasst.</p>' +
      '<h2 class="mit-zeichen"><span class="h-zeichen" style="--hz:var(--patina)">2</span>Methode</h2><ol class="schritte">' +
      schritte.map(function (s, i) { return '<li><span class="schritt-nr">' + (i + 1) + "</span><div><strong>" + esc(s[0]) + "</strong><p>" + esc(s[1]) + "</p></div></li>"; }).join("") + "</ol>" +
      '<h2 class="mit-zeichen"><span class="h-zeichen" style="--hz:var(--kupfer)">3</span>Bestand und Laufzeiten</h2>' +
      "<p>Der <a href=\"#/bestand\">Bestand</a> ist eine Recherche-Datenbank neben dem Radar. Er enthält alle deutschen und europäischen Patentanmeldungen, Patente und Gebrauchsmuster in den Patentklassen des Radars, die seit " + esc(((R.bestand && R.bestand.ab) || "2006").slice(0, 4)) + " veröffentlicht wurden und deren längstmögliche Laufzeit noch nicht abgelaufen ist. Offenlegung und Patentschrift derselben Anmeldung bilden einen Eintrag. Deutsche und europäische Fassungen derselben Erfindung stehen getrennt, weil sie eigenständige Schutzrechte sind. Anders als die Radar-Einträge wird der Bestand nicht einzeln gesichtet: Das Thema ergibt sich automatisch aus den Patentklassen und dem Titel. Klassen mit vielen fachfremden Treffern, etwa Blechumformung, Stahlherstellung oder allgemeine Solargestelle, zählen nur, wenn der Titel ein Dach-Stichwort enthält; Titel zu Fahrzeugen, Zäunen, Pergolen und Ähnlichem entfallen. Einzelne fachfremde Treffer sind trotzdem möglich.</p>" +
      '<ul class="laufzeit-regeln"><li style="--lf:var(--r-erteilungen)"><strong>Patent</strong><span>längstens 20 Jahre ab dem Anmeldetag (DE: § 16 PatG, EP: Art. 63 EPÜ)</span></li>' +
      '<li style="--lf:var(--r-gebrauchsmuster)"><strong>Gebrauchsmuster</strong><span>längstens zehn Jahre nach Ablauf des Anmeldemonats (§ 23 GebrMG), Verlängerung nach drei, sechs und acht Jahren</span></li>' +
      '<li style="--lf:var(--r-offenlegungen)"><strong>Anmeldung</strong><span>noch kein Schutz. Gezeigt wird, wie lange ein daraus erteiltes Patent längstens liefe. Anmeldungen ohne veröffentlichte Erteilung erscheinen bis zehn Jahre nach dem Anmeldetag; ältere sind in aller Regel zurückgenommen oder zurückgewiesen.</span></li></ul>' +
      "<p>„Längstens bis“ ist eine Obergrenze. Ein Schutzrecht kann früher enden, etwa wenn Jahresgebühren nicht gezahlt werden, der Inhaber verzichtet, es widerrufen oder für nichtig erklärt wird oder eine Anmeldung zurückgenommen oder zurückgewiesen wird. Diese Rechtsstandsdaten sind ohne Anmeldung beim Amt nicht automatisch abrufbar. Deshalb führt jeder Eintrag direkt zum DPMAregister oder zum Europäischen Patentregister. Ein europäisches Patent wirkt nur in den Staaten, in denen es validiert wurde.</p>" +
      '<h2 class="mit-zeichen"><span class="h-zeichen" style="--hz:var(--r-erteilungen)">4</span>Die 18-Monats-Regel</h2>' +
      "<p>Patentanmeldungen werden erst 18 Monate nach dem Prioritätstag veröffentlicht. Was heute im Radar erscheint, wurde also meist eineinhalb Jahre zuvor angemeldet. Jüngere Entwicklungen sind noch nicht sichtbar. Gebrauchsmuster werden dagegen schon mit der Eintragung bekannt gemacht, oft wenige Monate nach der Anmeldung.</p>" +
      zeitstrahl() +
      '<h2 class="mit-zeichen"><span class="h-zeichen" style="--hz:var(--r-gebrauchsmuster)">5</span>Glossar</h2><ul class="glossar-karten">' +
      glossar.map(function (g) {
        var farbe = g.rubrik ? "--r-" + g.rubrik : g.farbe;
        var zeichen = g.rubrik ? zRubrik(g.rubrik, "gl-icon") : '<span class="gl-text">' + esc(g.zeichen) + "</span>";
        return '<li style="--gf:var(' + farbe + ')"><span class="gl-zeichen">' + zeichen + '</span><div><h3>' + esc(g.titel) + "</h3><p>" + esc(g.text) + "</p>" + (g.zusatz || "") + "</div></li>";
      }).join("") + "</ul>" +
      '<div class="info-karten"><section><h2>Datenschutz</h2><p>Diese Seite setzt keine Cookies, verwendet keine Analyse- oder Tracking-Dienste und lädt keine Inhalte von fremden Servern. Merkliste und Farbmodus werden nur im eigenen Browser gespeichert.</p></section>' +
      '<section><h2>Benachrichtigung</h2><p>Der <a href="feed.xml">RSS-Feed</a> enthält die wöchentlichen Neuheiten und lässt sich mit einem RSS-zu-E-Mail-Dienst abonnieren.</p></section></div></div>';
    return html;
  }
  function zeitstrahl() {
    function seg(klasse, flex, zeit, text, radar) {
      return '<li class="zs-seg ' + klasse + '" style="flex-grow:' + flex + '"><span class="zs-balken"></span><span class="zs-zeit">' + zeit + (radar ? ' <span class="zs-radar">ab hier im Radar</span>' : "") + '</span><span class="zs-text">' + text + "</span></li>";
    }
    return '<figure class="zeitstrahl"><div class="zs-spur"><span class="zs-label">' + kindMini("Erteilung", "", "Patent") + '</span><ol class="zs-bahn">' +
      seg("zs-verborgen", 18, "0 bis 18 Monate", "Angemeldet, noch nicht öffentlich") +
      seg("zs-offen", 14, "ab 18 Monaten", "Offenlegung, Prüfung läuft, oft mehrere Jahre", true) +
      seg("zs-einspruch", 9, "Erteilung", "danach 9 Monate Einspruchsfrist") +
      seg("zs-schutz", 10, "bis 20 Jahre", "Schutz höchstens 20 Jahre ab Anmeldung") + "</ol></div>" +
      '<div class="zs-spur"><span class="zs-label">' + kindMini("Gebrauchsmuster", "", "GM") + '</span><ol class="zs-bahn">' +
      seg("zs-verborgen", 4, "wenige Monate", "Angemeldet, Eintragung ohne Sachprüfung") +
      seg("zs-gm", 47, "Eintragung", "Bekanntmachung, Schutz höchstens 10 Jahre ab Anmeldung", true) + "</ol></div>" +
      '<figcaption class="hinweis-text">Schematisch, nicht maßstäblich. Die Dauer der Prüfung ist von Fall zu Fall verschieden.</figcaption></figure>';
  }
  hinweise.titel = function () { return "Hinweise"; };

  function nichtGefunden() {
    return kopfband({ kicker: "Nicht gefunden", titel: "Diese Seite gibt es nicht", text: "Der Link ist vielleicht veraltet. Die Suche oben findet Schutzrechte, Anmelder und Seiten." }) +
      '<div class="werkzeug-reihe" style="margin-top:24px"><a class="knopf primaer" href="#/">Zur Übersicht</a><button type="button" class="knopf" data-suche>' + ICON.suche + "Suchen</button></div>";
  }

  /* ---------- Export ---------- */
  function exportKnoepfe() {
    return '<button type="button" class="knopf klein" data-export="xlsx">' + ICON.export + 'Excel</button><button type="button" class="knopf klein" data-export="csv">' + ICON.export + "CSV</button>";
  }
  function exportZeilen(liste) {
    var basis = location.href.split("#")[0];
    if (liste.length && liste[0].bestand) return liste.map(function (e) {
      var l = bestandLinks(e), reg = l.filter(function (x) { return x.rechtsstand; })[0];
      return {
        "Titel": e.titel, "Art": BESTAND_ART[e.art].name, "Amt": e.amt, "Nummer": e.nummer,
        "Veröffentlichungen": e.dok.map(function (d) { return d[0] + (d[1] ? " (" + d[1] + ")" : ""); }).join(", "),
        "Anmelder": e.anmNamen.join("; "), "Land": e.laender.filter(Boolean).join("; "),
        "Angemeldet": e.angemeldet, "Erste Veröffentlichung": e.veroeffentlicht || "", "Erteilung veröffentlicht": e.erteilt || "",
        "Längstens bis": e.ende, "Restlaufzeit längstens (Tage)": tageBis(e.ende), "Thema": themaName(e.thema), "Patentklassen": e.klassen.join(", "),
        "Rechtsstand (Register)": reg ? reg.url : "", "Espacenet": (l.filter(function (x) { return x.label === "Espacenet"; })[0] || {}).url || "",
        "Link": basis + "#/bestand/" + encodeURIComponent(e.id)
      };
    });
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
  function dateiname(endung) { return "patent-radar-" + (route().name === "bestand" ? "bestand-" : "") + heute() + "." + endung; }
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
      window.XLSX.utils.book_append_sheet(wb, ws, route().name === "bestand" ? "Bestand" : "Patent-Radar");
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
  var tip = document.createElement("div");
  tip.className = "tip"; tip.hidden = true; tip.setAttribute("role", "tooltip");
  document.body.appendChild(tip);
  main.addEventListener("mousemove", function (ev) {
    var t = ev.target.closest && ev.target.closest("[data-tip]");
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.getAttribute("data-tip"); tip.hidden = false;
    var x = Math.min(window.innerWidth - tip.offsetWidth - 8, ev.clientX + 14), yy = ev.clientY - tip.offsetHeight - 12;
    tip.style.left = Math.max(8, x) + "px"; tip.style.top = (yy < 8 ? ev.clientY + 18 : yy) + "px";
  });
  main.addEventListener("mouseleave", function () { tip.hidden = true; });
  function binden() {
    main.querySelectorAll("[data-merken]").forEach(function (b) {
      b.addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var id = b.getAttribute("data-merken");
        var jetzt = Merk.umschalten(id, true);
        if (jetzt && window.Bewegung && !reduziert) {
          window.Bewegung.funken(b);
          var k = b.closest(".karte, .t5, li, .detail-seite") || main;
          var quelle = k.querySelector(".karte-bild, .t5-bild, .mini-bild") || main.querySelector(".detail-band .db-bild") || b;
          var ziele = Array.prototype.filter.call(document.querySelectorAll(".merk-link, .un-mehr"), function (x) { return x.offsetWidth > 0; });
          window.Bewegung.flug(quelle, ziele[0], function () { Merk.zaehler(true); });
        } else Merk.zaehler(jetzt);
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
        history.replaceState(null, "", hashMit(r.name, p)); zeichnen(false);
      });
    });
    main.querySelectorAll("[data-sort]").forEach(function (b) {
      b.addEventListener("click", function () {
        var r = route(); var p = r.params; var k = b.getAttribute("data-sort");
        if (k === "datum") p.delete("sort"); else p.set("sort", k);
        history.replaceState(null, "", hashMit(r.name, p)); zeichnen(false);
      });
    });
    main.querySelectorAll("[data-drucken]").forEach(function (b) { b.addEventListener("click", function () { window.print(); }); });
    main.querySelectorAll("[data-pop]").forEach(function (b) {
      b.addEventListener("click", function (ev) { ev.stopPropagation(); popUmschalten(b); });
    });
    main.querySelectorAll("[data-pop-zu]").forEach(function (b) { b.addEventListener("click", function () { allePopsZu(); }); });
    main.querySelectorAll(".pop").forEach(function (p) { p.addEventListener("click", function (ev) { ev.stopPropagation(); }); });
    main.querySelectorAll("[data-bestand-suche]").forEach(function (f) {
      f.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var v = f.elements.q.value.trim();
        location.hash = hashMit("bestand", new URLSearchParams(v ? { q: v } : {}));
      });
    });
    main.querySelectorAll(".kat-leiste").forEach(katLeiste);
    main.querySelectorAll(".kal").forEach(function (k) { kalenderBinden(k.parentNode); });
  }
  function popUmschalten(knopf, auf) {
    if (!knopf) return;
    var pop = document.getElementById(knopf.getAttribute("data-pop"));
    if (!pop) return;
    var oeffnen = auf != null ? auf : pop.hidden;
    allePopsZu();
    pop.hidden = !oeffnen; knopf.setAttribute("aria-expanded", String(oeffnen));
    if (oeffnen && auf == null) { var erstes = pop.querySelector("select, input, button"); if (erstes) erstes.focus({ preventScroll: true }); }
  }
  function allePopsZu() {
    document.querySelectorAll(".pop").forEach(function (p) { p.hidden = true; });
    document.querySelectorAll("[data-pop]").forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
  }
  document.addEventListener("click", function () { allePopsZu(); });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") allePopsZu(); });
  function katLeiste(l) {
    var spur = l.querySelector(".kat-spur");
    function lage() {
      l.classList.toggle("kann-links", spur.scrollLeft > 4);
      l.classList.toggle("kann-rechts", spur.scrollLeft + spur.clientWidth < spur.scrollWidth - 4);
    }
    l.querySelectorAll(".kat-pfeil").forEach(function (b) {
      b.addEventListener("click", function () { spur.scrollBy({ left: (b.classList.contains("links") ? -1 : 1) * spur.clientWidth * .7, behavior: reduziert ? "auto" : "smooth" }); });
    });
    spur.addEventListener("scroll", lage, { passive: true });
    var aktiv = spur.querySelector('[aria-current="true"]');
    if (aktiv && aktiv.offsetLeft + aktiv.offsetWidth > spur.clientWidth) spur.scrollLeft = aktiv.offsetLeft - 40;
    lage();
  }
  function kalenderBinden(rahmen) {
    rahmen.addEventListener("click", function (ev) {
      var k = rahmen.querySelector(".kal");
      var pfeil = ev.target.closest("[data-kal]"), tag = ev.target.closest("[data-tag]");
      if (pfeil) {
        var m = k.getAttribute("data-monat"), j = parseInt(m.slice(0, 4), 10), mo = parseInt(m.slice(5, 7), 10) - 1 + parseInt(pfeil.getAttribute("data-kal"), 10);
        var neu = new Date(Date.UTC(j, mo, 1)).toISOString().slice(0, 7);
        k.outerHTML = kalender(aktuelleListe, k.getAttribute("data-feld"), neu);
        return;
      }
      if (tag) {
        var iso = tag.getAttribute("data-tag"), ziel = main.querySelector('[data-tag-anker="' + iso + '"]');
        if (!ziel) { var w = kw(iso); ziel = main.querySelector('.tag-gruppe[data-woche="' + w.jahr + "-" + w.woche + '"]'); }
        if (ziel) ziel.scrollIntoView({ behavior: reduziert ? "auto" : "smooth", block: "start" });
      }
    });
  }

  /* ---------- Schnellsuche als Befehlspalette (Strg K) ---------- */
  var SEITEN = [
    { name: "Übersicht", ziel: "#/", sub: "Ausgabe der Woche", w: "start übersicht ausgabe woche", sym: SYM.alle },
    { name: "Alle Schutzrechte", ziel: "#/schutzrechte", sub: "Register mit Filtern und Kalender", w: "schutzrechte register liste patente", sym: SYM.karten },
    { name: "Bestand", ziel: "#/bestand", sub: "Alle laufenden Schutzrechte, Recherche-Datenbank", w: "bestand datenbank recherche laufzeit restlaufzeit", sym: SYM.tabelle },
    { name: "Einspruchsfristen", ziel: "#/fristen", sub: "Kalender der laufenden Fristen", w: "fristen einspruch kalender", sym: SYM.uhr },
    { name: "Anmelder", ziel: "#/anmelder", sub: "Rangliste und Herkunft", w: "anmelder rangliste firmen länder wettbewerb", sym: SYM.anmelder },
    { name: "News", ziel: "#/news", sub: "Presseschau", w: "news meldungen presse nachrichten", sym: SYM.seite },
    { name: "Berichte", ziel: "#/berichte", sub: "Wochen- und Monatsberichte zum Drucken", w: "berichte monatsbericht wochenbericht pdf drucken", sym: ICON.druck },
    { name: "Merkliste", ziel: "#/merkliste", sub: "Gemerkte Einträge", w: "merkliste gemerkt favoriten", sym: ICON.merken },
    { name: "Hinweise", ziel: "#/hinweise", sub: "Quellen, Methode, Glossar, Datenschutz", w: "hinweise quellen methode glossar hilfe datenschutz", sym: SYM.radar }
  ];
  RUBRIKEN.forEach(function (rb) { SEITEN.push({ name: rb.name, ziel: "#/" + rb.key, sub: "Rubrik, " + rb.codes, w: rb.name + " " + rb.art + " " + rb.codes + " rubrik", rubrik: rb.key }); });
  THEMEN.forEach(function (t) { SEITEN.push({ name: t.name, ziel: hashMit("schutzrechte", new URLSearchParams({ thema: t.key })), sub: "Thema: " + t.kurz, w: t.name + " " + t.kurz + " thema", thema: t.key }); });
  var suche = document.getElementById("suche"), sucheFeld = document.getElementById("suche-feld"), sucheTreffer = document.getElementById("suche-treffer");
  var sucheAuswahl = 0, sucheListe = [];
  function oeffneSuche() {
    if (!D.radar || !suche) return;
    allePopsZu();
    sucheFeld.value = ""; sucheAuswahl = 0; sucheRendern();
    if (suche.showModal) { if (!suche.open) suche.showModal(); } else suche.setAttribute("open", "");
    sucheFeld.focus();
  }
  function alleWoerter(text, w) { for (var i = 0; i < w.length; i++) if (text.indexOf(w[i]) < 0) return false; return true; }
  function namensRang(name, q) { var n = String(name).toLowerCase(); return n.indexOf(q) === 0 ? 30 : n.indexOf(q) > 0 ? 15 : 0; }
  function seitenTreffer(x) {
    return { gruppe: "Seiten und Themen", ziel: x.ziel, name: x.name, sub: x.sub,
      bild: x.thema ? '<span class="st-icon" style="' + themaStil(x.thema) + '">' + zThema(x.thema, "st-thema") + "</span>" : x.rubrik ? '<span class="st-icon rk-' + x.rubrik + '">' + zRubrik(x.rubrik, "kr-ic") + "</span>" : '<span class="st-icon">' + x.sym + "</span>" };
  }
  function radarTreffer(e, gruppe) {
    return { gruppe: gruppe || "Schutzrechte im Radar", ziel: "#/eintrag/" + encodeURIComponent(e.id), name: e.titel, sub: e.nummer + " · " + anmText(e), bild: miniBild(e),
      rechts: fristLaeuft(e) ? '<span class="st-marke frist">Frist läuft</span>' : e.neu ? '<span class="st-marke">neu</span>' : "" };
  }
  function sucheRendern() {
    var q = sucheFeld.value.trim().toLowerCase(), w = q ? q.split(/\s+/) : [];
    var t = [];
    if (!w.length) {
      D.radar.eintraege.filter(function (e) { return e.neu; }).sort(SORTIERUNG.relevanz.fn).slice(0, 5).forEach(function (e) { t.push(radarTreffer(e, "Neu diese Woche")); });
      SEITEN.slice(0, 5).forEach(function (x) { t.push(seitenTreffer(x)); });
    } else {
      var se = [];
      SEITEN.forEach(function (x) { if (alleWoerter((x.name + " " + x.w + " " + x.sub).toLowerCase(), w)) se.push({ p: namensRang(x.name, q), x: x }); });
      se.sort(function (a, b) { return b.p - a.p; }).slice(0, 4).forEach(function (o) { t.push(seitenTreffer(o.x)); });
      var ra = [];
      D.radar.eintraege.forEach(function (e) {
        var text = e._suche || (e._suche = [e.titel, e.titel_original, e.was_neu, e.bezug, (e.anmelder || []).join(" "), e.nummer, e.nummer_kompakt,
          (e.klassen || []).join(" "), (e.familie || []).map(function (f) { return f.nummer; }).join(" "), themaName(e.thema)].join(" ").toLowerCase());
        if (alleWoerter(text, w)) ra.push({ p: namensRang(e.titel, q) + (e.relevanz === "hoch" ? 3 : 0) + (e.neu ? 2 : 0) + (String(e.nummer_kompakt || "").toLowerCase().indexOf(q.replace(/\s/g, "")) >= 0 ? 40 : 0), e: e });
      });
      var an = [];
      (D.radar.anmelder || []).forEach(function (a) { if (alleWoerter(a.name.toLowerCase(), w)) an.push({ p: namensRang(a.name, q) + Math.min(a.anzahl, 10), a: a }); });
      an.sort(function (a, b) { return b.p - a.p; }).slice(0, ra.length ? 3 : 6).forEach(function (o) {
        var a = o.a;
        t.push({ gruppe: "Anmelder", ziel: hashMit("schutzrechte", new URLSearchParams({ anmelder: a.name })), name: a.name, bild: '<span class="st-icon st-land">' + esc(a.land || "–") + "</span>",
          sub: a.anzahl + " im Radar" + (a.bestand ? ", " + a.bestand.toLocaleString("de-DE") + " im Bestand" : "") + (a.land ? " · " + landName(a.land) : "") });
      });
      ra.sort(function (a, b) { return b.p - a.p || String(b.e.veroeffentlicht).localeCompare(a.e.veroeffentlicht); }).slice(0, 12).forEach(function (o) { t.push(radarTreffer(o.e)); });
      if (D.bestand) {
        var be = [];
        D.bestand.liste.forEach(function (e) { if (alleWoerter(e.such, w)) be.push({ p: namensRang(e.titel, q) + (e.nummer.replace(/\s/g, "").toLowerCase().indexOf(q.replace(/\s/g, "")) >= 0 ? 40 : 0), e: e }); });
        be.sort(function (a, b) { return b.p - a.p || b.e.angemeldet.localeCompare(a.e.angemeldet); });
        be.slice(0, 8).forEach(function (o) {
          var e = o.e;
          t.push({ gruppe: "Bestand" + (be.length > 8 ? " (" + be.length.toLocaleString("de-DE") + " Treffer)" : ""), ziel: "#/bestand/" + encodeURIComponent(e.id), name: e.titel, sub: e.nummer + " · " + (e.anmName || "Anmelder unbekannt"),
            bild: '<span class="st-datum"><small>bis</small><b>' + e.ende.slice(0, 4) + "</b></span>", rechts: '<span class="st-marke">' + esc(BESTAND_ART[e.art].name) + "</span>" });
        });
        if (be.length > 8) t.push({ gruppe: t[t.length - 1].gruppe, ziel: hashMit("bestand", new URLSearchParams({ q: sucheFeld.value.trim() })), name: "Alle " + be.length.toLocaleString("de-DE") + " Treffer im Bestand zeigen", sub: "Mit Filtern, Laufzeiten und Export", bild: '<span class="st-icon">' + SYM.pfeil + "</span>" });
      } else if (q.length >= 3 && !D.bestandFehler) {
        ladeBestand();
        t.push({ gruppe: "Bestand", info: true, name: "Bestand wird geladen …", sub: "Gleich werden auch die " + ((D.radar.bestand && D.radar.bestand.gesamt) || 0).toLocaleString("de-DE") + " laufenden Schutzrechte durchsucht.", bild: '<span class="st-icon">' + SYM.tabelle + "</span>" });
      }
    }
    sucheListe = t.filter(function (x) { return !x.info; });
    if (sucheAuswahl >= sucheListe.length) sucheAuswahl = 0;
    function mark(text) {
      var h = esc(text);
      w.forEach(function (x) { if (x.length < 2) return; var re = new RegExp("(" + esc(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"); h = h.replace(re, "<mark>$1</mark>"); });
      return h;
    }
    var letzte = null, i = 0;
    sucheTreffer.innerHTML = t.length ? t.map(function (x) {
      var kopf = x.gruppe !== letzte ? '<li class="st-gruppe" role="presentation">' + esc(x.gruppe) + "</li>" : "";
      letzte = x.gruppe;
      if (x.info) return kopf + '<li class="st-info" role="presentation">' + x.bild + '<span class="st-text"><span class="st-name">' + esc(x.name) + '</span><span class="st-sub">' + esc(x.sub) + "</span></span></li>";
      var n = i++;
      return kopf + '<li role="option" id="st-' + n + '" data-i="' + n + '" aria-selected="' + (n === sucheAuswahl) + '">' + x.bild +
        '<span class="st-text"><span class="st-name">' + mark(x.name) + '</span><span class="st-sub">' + mark(x.sub || "") + "</span></span>" + (x.rechts || "") + "</li>";
    }).join("") : '<li class="suche-leer" role="presentation">Nichts gefunden. Anderen Begriff versuchen, zum Beispiel einen Anmelder, eine Nummer oder ein Thema.</li>';
    sucheFeld.setAttribute("aria-activedescendant", sucheListe.length ? "st-" + sucheAuswahl : "");
  }
  function markiereSuche() {
    sucheTreffer.querySelectorAll("li[data-i]").forEach(function (li) {
      var an = +li.getAttribute("data-i") === sucheAuswahl;
      li.setAttribute("aria-selected", an); if (an) li.scrollIntoView({ block: "nearest" });
    });
    sucheFeld.setAttribute("aria-activedescendant", "st-" + sucheAuswahl);
  }
  function sucheWaehle(i) {
    var x = sucheListe[i]; if (!x) return;
    suche.close();
    if (location.hash === x.ziel || (x.ziel === "#/" && !location.hash)) zeichnen(true); else location.hash = x.ziel;
  }
  if (suche) {
    sucheFeld.addEventListener("input", function () { sucheAuswahl = 0; sucheRendern(); });
    sucheFeld.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowDown") { sucheAuswahl = Math.min(sucheListe.length - 1, sucheAuswahl + 1); markiereSuche(); ev.preventDefault(); }
      else if (ev.key === "ArrowUp") { sucheAuswahl = Math.max(0, sucheAuswahl - 1); markiereSuche(); ev.preventDefault(); }
      else if (ev.key === "Enter") { sucheWaehle(sucheAuswahl); ev.preventDefault(); }
      else if (ev.key === "Escape") { suche.close(); ev.preventDefault(); }
    });
    sucheTreffer.addEventListener("click", function (ev) { var li = ev.target.closest("li[data-i]"); if (li) sucheWaehle(+li.getAttribute("data-i")); });
    sucheTreffer.addEventListener("mousemove", function (ev) { var li = ev.target.closest("li[data-i]"); if (li && +li.getAttribute("data-i") !== sucheAuswahl) { sucheAuswahl = +li.getAttribute("data-i"); markiereSuche(); } });
    suche.addEventListener("click", function (ev) { if (ev.target === suche) suche.close(); });
    document.getElementById("suche-zu").addEventListener("click", function () { suche.close(); });
    document.addEventListener("click", function (ev) { var k = ev.target.closest && ev.target.closest("[data-suche]"); if (k) { ev.preventDefault(); oeffneSuche(); } });
    document.addEventListener("keydown", function (ev) {
      var tippt = /INPUT|SELECT|TEXTAREA/.test(ev.target.tagName || "") || ev.target.isContentEditable;
      if ((ev.ctrlKey || ev.metaKey) && (ev.key === "k" || ev.key === "K")) { ev.preventDefault(); if (suche.open) suche.close(); else oeffneSuche(); }
      else if (ev.key === "/" && !tippt && !suche.open) { ev.preventDefault(); oeffneSuche(); }
    });
  }

  /* ---------- Start ---------- */
  function json(pfad, v) {
    return fetch(pfad + "?v=" + encodeURIComponent(v || Date.now()), { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(pfad + ": " + r.status);
      return r.json();
    });
  }
  Merk.laden(); Merk.zaehler();
  /* Materialbilder einmal als CSS-Hintergründe erzeugen (von allen Karten geteilt) */
  if (window.Motiv) {
    var mst = document.createElement("style");
    mst.textContent = window.Motiv.bandStile();
    document.head.appendChild(mst);
  }
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
    zeichnen(true);
  }).catch(function (err) {
    main.innerHTML = '<div class="seite">' + leer("Die Daten konnten nicht geladen werden.", "Bitte die Seite neu laden. Besteht das Problem weiter, liegt eine Störung bei der Aktualisierung vor.") + "</div>";
    if (window.console) console.error(err);
  });
})();
