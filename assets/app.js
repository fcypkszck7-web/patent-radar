/* Patent-Radar Bau & Dach – Anwendung. Statisch, ohne externe Abrufe, ohne Cookies. */
(function () {
  "use strict";

  var THEMEN = [
    { key: "entwaesserung", name: "Dachentwässerung", kurz: "Rinnen, Rinnenhalter, Fallrohre, Laubschutz, Flachdach- und Notentwässerung" },
    { key: "sicherheit", name: "Dachsicherheit", kurz: "Dachtritte, Laufanlagen, Sicherheitsdachhaken, Absturzsicherung, Anschlagpunkte" },
    { key: "schneeschutz", name: "Schneeschutz", kurz: "Schneefang, Schneefanggitter, Schneestopper" },
    { key: "solar", name: "Solar auf dem Dach", kurz: "Befestigung und Montagesysteme, auch mit Schneeschutz" },
    { key: "zubehoer", name: "Dachzubehör und Anschlüsse", kurz: "Durchführungen, Lüftung, Kamin- und Wandanschlüsse, Blitzschutz" },
    { key: "gruendach", name: "Gründach, Regenwasser und Dämmung", kurz: "Begrünung, Regenwassernutzung, Dämmung" },
    { key: "werkstoffe", name: "Werkstoffe und Fertigung", kurz: "Bleche, Beschichtungen, Umform- und Fügeverfahren mit Dachbezug" },
    { key: "deckung", name: "Dachdeckung und Abdichtung", kurz: "Steil-, Flach- und Metalldach, Bahnen, Unterkonstruktion" }
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
  function themenFilter(liste, p, ziel) {
    var aktiv = p.get("thema");
    var zahl = {};
    liste.forEach(function (e) { zahl[e.thema] = (zahl[e.thema] || 0) + 1; });
    function link(k) {
      var q = new URLSearchParams(p);
      if (k) q.set("thema", k); else q.delete("thema");
      return hashMit(ziel, q);
    }
    return '<nav class="themen-filter" aria-label="Nach Thema filtern"><a class="tf-alle" href="' + link("") + '"' + (!aktiv ? ' aria-current="true"' : "") + "><span>Alle Themen</span><b>" + liste.length + "</b></a>" +
      THEMEN.map(function (t) {
        var n = zahl[t.key] || 0, an = aktiv === t.key;
        return '<a href="' + link(an ? "" : t.key) + '" style="' + themaStil(t.key) + '"' + (an ? ' aria-current="true"' : "") + (n || an ? "" : ' class="leer-thema"') + ' title="' + esc(t.kurz) + '">' +
          zThema(t.key, "ic-thema") + "<span>" + esc(t.name) + "</span><b>" + n + "</b></a>";
      }).join("") + "</nav>";
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
    var n = name === "eintrag" || RUBRIK[name] ? "schutzrechte" : name;
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
  RUBRIKEN.forEach(function (rb) {
    var fn = function (r) { return schutzrechte(r, rb); };
    fn.titel = function () { return rb.name; };
    fn.danach = function (r) { schutzrechte.danach(r); };
    ANSICHTEN[rb.key] = fn;
  });
  var letzteRoute = "", gezeichnet = {};
  function zeichnen(fokus) {
    var r = route();
    if (r.name === "schutzrechte" && RUBRIK_NACH_ART[r.params.get("art")]) {
      var ziel = RUBRIK_NACH_ART[r.params.get("art")].key;
      r.params.delete("art");
      history.replaceState(null, "", hashMit(ziel, r.params));
      r = route();
    }
    var fn = ANSICHTEN[r.name] || nichtGefunden;
    setzeNav(r.name);
    main.innerHTML = '<div class="seite einblenden">' + fn(r) + "</div>";
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
  }
  window.addEventListener("hashchange", function () { zeichnen(true); });

  /* ---------- Bausteine ---------- */
  function karte(e, opt) {
    opt = opt || {};
    var fk = fristKlasse(e);
    var frist = e.einspruch_bis ? '<span class="frist ' + fk + '">Einspruch bis ' + datum(e.einspruch_bis) + (fk === "abgelaufen" ? " (abgelaufen)" : "") + "</span>" : "";
    var merk = Merk.hat(e.id);
    return '<li class="karte" style="' + themaStil(e.thema) + '">' +
      '<div class="karte-rand">' + kindMarke(e) + zThema(e.thema) + "</div>" +
      '<div class="karte-inhalt"><div class="karte-oben"><span class="art-marke">' + esc(e.art) + "</span>" +
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
      "</div></div></li>";
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

    html += '<section class="bezugszeichen" aria-labelledby="bz-titel"><h2 id="bz-titel">Bezugszeichenliste <span>Themen des Radars, ein Klick zeigt alle Einträge</span></h2><ul>' +
      THEMEN.map(function (t) {
        var n = jeThema[t.key] || 0;
        return '<li><a href="' + hashMit("schutzrechte", new URLSearchParams({ thema: t.key })) + '" data-thema="' + t.key + '" style="' + themaStil(t.key) + '">' +
          '<span class="bz-symbol">' + zThema(t.key) + '</span><span class="bz-nr">' + BEZUG[t.key] + '</span><span class="bz-name">' + esc(t.name) + '</span><span class="bz-zahl">' + n + "</span>" +
          '<span class="bz-balken" aria-hidden="true"><span style="width:' + Math.max(2, Math.round(100 * n / maxThema)) + '%"></span></span></a></li>';
      }).join("") + "</ul></section></div></div>";

    html += '<section class="abschnitt" aria-labelledby="rubriken-titel"><div class="abschnitt-kopf"><h2 id="rubriken-titel">Rubriken</h2><a href="#/schutzrechte">Alle ' + alle.length + " Schutzrechte</a></div>" + rubrikKacheln(alle) + "</section>";

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

    html += '<section class="abschnitt" aria-labelledby="trend-titel"><div class="abschnitt-kopf"><h2 id="trend-titel">Neue Veröffentlichungen je Monat und Thema</h2>' +
      '<span class="hinweis-text">' + (R.voll_ab ? "Vollständig erfasst ab " + MONATE_LANG[parseInt(R.voll_ab.slice(5, 7), 10) - 1] + " " + R.voll_ab.slice(0, 4) : "") + "</span></div>" + trend() + "</section>";

    var top8 = (R.anmelder || []).slice(0, 8);
    var max = top8.length ? top8[0].anzahl : 1;
    html += '<section class="abschnitt" aria-labelledby="anm-titel"><div class="abschnitt-kopf"><h2 id="anm-titel">Top-Anmelder nach Themen</h2><a href="#/anmelder">Rangliste</a></div>' +
      (top8.length ? '<div class="anm-rahmen"><ul class="anm-liste">' + top8.map(function (a) {
        var segs = THEMEN.filter(function (t) { return (a.themen || {})[t.key]; }).map(function (t) {
          var n = a.themen[t.key];
          return '<span class="anm-seg" style="' + themaStil(t.key) + ";flex-grow:" + n + '" data-tip="' + esc(a.name + ": " + t.name + ", " + n + " " + plural(n, "Eintrag", "Einträge")) + '"></span>';
        }).join("");
        return '<li><a class="anm-name" href="' + hashMit("schutzrechte", new URLSearchParams({ anmelder: a.name })) + '">' + esc(a.name) + '</a><span class="anm-balken" style="width:' + Math.max(6, Math.round(100 * a.anzahl / max)) + '%">' + segs + '</span><span class="anm-zahl">' + a.anzahl + "</span></li>";
      }).join("") + "</ul>" + '<ul class="stapel-legende">' + THEMEN.map(function (t) {
        return '<li><a href="' + hashMit("schutzrechte", new URLSearchParams({ thema: t.key })) + '" style="' + themaStil(t.key) + '"><span class="farbfeld"></span>' + esc(t.name) + "</a></li>";
      }).join("") + "</ul></div>" : leer("Noch keine Anmelder erfasst.", "")) + "</section>";
    return html;
  }
  uebersicht.titel = function () { return "Übersicht"; };
  var schonGezeichnet = false;
  uebersicht.danach = function () {
    var svg = main.querySelector(".fig-zeichnung");
    if (!svg) return;
    var teile = svg.querySelectorAll(".teil");
    teile.forEach(function (t, i) {
      var k = t.getAttribute("data-thema");
      var n = main.querySelector('.bezugszeichen a[data-thema="' + k + '"] .bz-zahl');
      t.setAttribute("aria-label", BEZUG[k] + " " + themaName(k) + ", " + (n ? n.textContent : "0") + " Einträge");
      t.style.setProperty("--v", (0.75 + i * 0.16).toFixed(2) + "s");
    });
    if (!schonGezeichnet && !reduziert) svg.classList.add("zeichnet");
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

  function rubrikKacheln(alle) {
    return '<ul class="rubriken">' + RUBRIKEN.map(function (rb) {
      var liste = alle.filter(function (e) { return e.art === rb.art; });
      var neuN = liste.filter(function (e) { return e.neu; }).length;
      var zusatz = rb.key === "erteilungen" ? liste.filter(fristLaeuft).length + " mit laufender Einspruchsfrist" : (neuN ? neuN + " neu diese Woche" : "Codes " + rb.codes);
      return '<li><a class="rubrik-kachel rk-' + rb.key + '" href="#/' + rb.key + '">' + zRubrik(rb.key) +
        '<span class="rk-kopf"><span class="rk-name">' + esc(rb.name) + '</span><span class="rk-zahl">' + liste.length + "</span></span>" +
        '<span class="rk-text">' + esc(rb.kurz) + '</span><span class="rk-zusatz">' + esc(zusatz) + "</span></a></li>";
    }).join("") + "</ul>";
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
    html += themenFilter(basisThema, p, hier);
    html += '<form class="filter" id="filter" role="search" onsubmit="return false">' +
      '<label class="feld suche"><span class="visuell-verborgen">Volltextsuche</span>' + ICON.suche + '<input type="search" name="q" value="' + esc(p.get("q") || "") + '" placeholder="Suche nach Titel, Inhalt, Anmelder, Nummer oder Patentklasse" autocomplete="off"></label>' +
      '<div class="filter-zeile">' +
      (rub ? "" : auswahl("art", "Art", ARTEN.map(function (a) { return [a, a]; }), p.get("art"))) +
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
      (aktiv ? ' gefunden <a href="#/' + hier + '" style="margin-left:8px">Filter zurücksetzen</a>' : "") + "</span>" +
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
    var fristChip = e.einspruch_bis ? { name: (fk === "abgelaufen" ? "Einspruchsfrist abgelaufen am " : "Einspruch bis ") + datum(e.einspruch_bis), farbe: fk === "unter-30" ? "--kupfer-band" : fk === "unter-90" ? "--messing-band" : fk === "abgelaufen" ? "--band-tinte-2" : "--patina-band", link: "#/fristen" } : null;
    var html = kopfband({
      klasse: "kopfband-detail", stil: themaStil(e.thema),
      oben: '<a class="band-zurueck" href="#/' + (rb ? rb.key : "schutzrechte") + '">' + ICON.zurueck + esc(rb ? rb.name : "Alle Schutzrechte") + "</a>",
      kicker: kindMarke(e) + '<span class="art-marke">' + esc(e.art) + '</span><span class="nummer">' + esc(e.nummer) + "</span>" + (e.neu_erteilt ? '<span class="etikett neu-erteilt">neu erteilt</span>' : "") + (e.neu ? '<span class="etikett neu">neu diese Woche</span>' : ""),
      titel: esc(e.titel),
      unterzeile: '<p class="band-original"><span class="inid">(54)</span> ' + esc(e.titel_original) + "</p>",
      chips: [{ name: themaName(e.thema), farbe: "--themafarbe", link: hashMit("schutzrechte", new URLSearchParams({ thema: e.thema })) }, { name: "Relevanz " + e.relevanz, farbe: "--band-tinte-2" }].concat(fristChip ? [fristChip] : []),
      fig: zThema(e.thema, "fig-zeichnung symbol-gross"),
      figAttr: ' aria-label="Symbolbild zum Thema ' + esc(themaName(e.thema)) + '"',
      figText: '<span class="bz-nr">' + (BEZUG[e.thema] || "") + "</span> Symbolbild zum Thema, keine Zeichnung aus der Patentschrift"
    });
    html += '<div class="detail"><article class="detail-haupt" style="' + themaStil(e.thema) + '">' +
      '<h2>Was ist neu?</h2><p class="absatz">' + esc(e.was_neu) + "</p>" +
      '<h2>Bezug</h2><p class="absatz">' + esc(e.bezug) + "</p>" +
      "<h2>Verlauf</h2>" + verlauf(e) +
      '<div class="werkzeug-reihe" style="margin-top:22px"><button type="button" class="knopf merken" data-merken="' + esc(e.id) + '" aria-pressed="' + merk + '">' + ICON.merken + "<span>" + (merk ? "Gemerkt" : "Merken") + '</span></button><button type="button" class="knopf" data-teilen>' + ICON.teilen + "Link kopieren</button></div>" +
      "</article><aside class=\"detail-seite\">";
    if (e.einspruch_bis) {
      html += '<div class="kasten frist-kasten ' + fk + '"><h2>Einspruch möglich bis</h2><div class="frist-datum">' + datum(e.einspruch_bis) + "</div><p>" +
        (fk === "abgelaufen" ? "Frist abgelaufen." : "Noch " + tageBis(e.einspruch_bis) + " Tage.") + " Neun Monate ab Veröffentlichung der Erteilung am " + datum(e.erteilung_datum) +
        " (" + (e.amt === "EP" ? "Art. 99 EPÜ" : "§ 59 PatG") + ").</p><p class=\"hinweis-text\" style=\"margin:0\">Frist im amtlichen Register prüfen.</p></div>";
    }
    var inidVeroeff = e.art === "Erteilung" ? ["(45)", "Veröffentlichung der Erteilung"] : e.art === "Gebrauchsmuster" ? ["(43)", "Bekanntmachung"] : ["(43)", "Veröffentlichung"];
    function zeile(inid, name, wert) { return "<dt>" + (inid ? '<span class="inid">' + inid + "</span>" : "") + esc(name) + "</dt><dd>" + wert + "</dd>"; }
    html += '<div class="kasten"><h2>Daten</h2><dl class="daten">' +
      zeile("(11)", "Nummer", '<span class="nummer">' + esc(e.nummer) + "</span>") +
      zeile("", "Art", esc(e.art) + ", " + esc(AEMTER[e.amt] || e.amt)) +
      (e.anmeldenummer ? zeile("(21)", "Aktenzeichen", '<span class="nummer">' + esc(e.anmeldenummer) + "</span>") : "") +
      zeile("(22)", "Anmeldetag", datum(e.angemeldet)) +
      (e.prioritaet ? zeile("(30)", "Priorität", datum(e.prioritaet)) : "") +
      zeile(inidVeroeff[0], inidVeroeff[1], datum(e.veroeffentlicht)) +
      zeile("(51)", "Klassen", esc((e.klassen || []).join(", "))) +
      zeile("(71)", "Anmelder", (e.anmelder || []).map(function (a) { return '<a href="' + hashMit("schutzrechte", new URLSearchParams({ anmelder: a })) + '">' + esc(a) + "</a>"; }).join("<br>")) +
      zeile("", "Thema", '<span class="thema-marke" style="' + themaStil(e.thema) + '">' + esc(themaName(e.thema)) + "</span>") +
      zeile("", "Relevanz", '<span class="relevanz ' + esc(e.relevanz) + '">' + esc(e.relevanz) + "</span>") +
      zeile("", "Im Radar seit", datum(e.aufgenommen)) + "</dl>" +
      '<p class="hinweis-text inid-hinweis">Die Zahlen in Klammern sind die international genormten Kennungen (INID) der Angaben auf Patentschriften.</p></div>';
    if (e.familie && e.familie.length) {
      html += '<div class="kasten"><h2>Weitere Familienmitglieder</h2><ul class="familie-liste">' + e.familie.map(function (f) {
        var k = kindAusNummer(f.nummer);
        return "<li>" + kindMini(f.art, k.amt, k.kind) + '<span><span class="nummer">' + esc(f.nummer) + '</span><small>' + esc(f.art || "") + (f.datum ? ", " + datum(f.datum) : "") + "</small></span></li>";
      }).join("") + "</ul></div>";
    }
    html += '<div class="kasten"><h2>Amtliche Quellen</h2><ul class="quellen-links">' + (e.links || []).map(function (l) {
      return '<li><a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label) + '<span aria-hidden="true">↗</span></a></li>';
    }).join("") + "</ul></div></aside></div>";
    return html;
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
    var p = r.params, thema = p.get("thema");
    var alleMitFrist = D.radar.eintraege.filter(function (e) { return e.einspruch_bis; });
    var laufendAlle = alleMitFrist.filter(fristLaeuft);
    var alle = thema ? alleMitFrist.filter(function (e) { return e.thema === thema; }) : alleMitFrist;
    var laufend = alle.filter(fristLaeuft).sort(function (a, b) { return a.einspruch_bis.localeCompare(b.einspruch_bis); });
    var abgelaufen = alle.filter(function (e) { return !fristLaeuft(e); }).sort(function (a, b) { return b.einspruch_bis.localeCompare(a.einspruch_bis); });
    aktuelleListe = laufend;
    var n30 = laufendAlle.filter(function (e) { return tageBis(e.einspruch_bis) < 30; }).length;
    var n90 = laufendAlle.filter(function (e) { var t = tageBis(e.einspruch_bis); return t >= 30 && t < 90; }).length;
    var html = kopfband({
      kicker: "Kalender",
      titel: "Einspruchsfristen",
      text: "Gegen ein erteiltes Patent kann innerhalb von neun Monaten nach Veröffentlichung der Erteilung Einspruch eingelegt werden (DE: § 59 PatG, EP: Art. 99 EPÜ). Fristen bitte immer im amtlichen Register prüfen.",
      chips: [{ wert: laufendAlle.length, name: "laufende Fristen", farbe: "--patina-band" }, { wert: n30, name: "enden in unter 30 Tagen", farbe: "--kupfer-band" }, { wert: n90, name: "in 30 bis 90 Tagen", farbe: "--messing-band" }],
      figKey: "fristen"
    });
    html += themenFilter(laufendAlle, p, "fristen");
    html += fristenLeiste(laufend);
    html += '<div class="ergebnis-leiste" style="margin-top:22px"><span class="ergebnis-zahl"><strong>' + laufend.length + "</strong> laufende " + plural(laufend.length, "Frist", "Fristen") + (thema ? " zum Thema " + esc(themaName(thema)) : "") + "</span>" +
      '<div class="werkzeug-reihe">' + exportKnoepfe() + "</div></div>";
    if (!laufend.length) html += leer(thema ? "Zu diesem Thema laufen zurzeit keine Einspruchsfristen." : "Zurzeit keine laufenden Einspruchsfristen.", "");
    else {
      var monate = {};
      laufend.forEach(function (e) { var m = e.einspruch_bis.slice(0, 7); (monate[m] = monate[m] || []).push(e); });
      html += '<div class="frist-monate">' + Object.keys(monate).sort().map(function (m) {
        var liste = monate[m];
        return '<section class="frist-monat"><h2><span>' + MONATE_LANG[parseInt(m.slice(5), 10) - 1] + " " + m.slice(0, 4) + '</span><span class="fm-zahl">' + liste.length + " " + plural(liste.length, "Frist", "Fristen") + "</span></h2>" +
          '<ol class="frist-liste">' + liste.map(fristZeile).join("") + "</ol></section>";
      }).join("") + "</div>";
    }
    if (abgelaufen.length) {
      html += '<details class="abschnitt"><summary>Abgelaufene Fristen (' + abgelaufen.length + ")</summary>" + '<ul class="liste kompakt" style="margin-top:12px">' + abgelaufen.map(function (e) { return karte(e, { kompakt: true }); }).join("") + "</ul></details>";
    }
    return html;
  }
  function fristZeile(e) {
    var t = tageBis(e.einspruch_bis), u = urgenz(t);
    var start = e.erteilung_datum || e.veroeffentlicht;
    var gesamt = Math.max(1, Math.round((new Date(e.einspruch_bis + "T00:00:00Z") - new Date(start + "T00:00:00Z")) / 86400000));
    var rest = Math.max(0, Math.min(100, Math.round(100 * t / gesamt)));
    return '<li class="frist-zeile ' + u + '" style="' + themaStil(e.thema) + '">' + datumKachel(e.einspruch_bis, u) +
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
          (a.land ? '<span class="land-marke" title="' + esc(landName(a.land)) + '">' + esc(a.land) + "</span>" : "") + "</div>" +
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
      '<h2 class="mit-zeichen"><span class="h-zeichen" style="--hz:var(--r-erteilungen)">3</span>Die 18-Monats-Regel</h2>' +
      "<p>Patentanmeldungen werden erst 18 Monate nach dem Prioritätstag veröffentlicht. Was heute im Radar erscheint, wurde also meist eineinhalb Jahre zuvor angemeldet. Jüngere Entwicklungen sind noch nicht sichtbar. Gebrauchsmuster werden dagegen schon mit der Eintragung bekannt gemacht, oft wenige Monate nach der Anmeldung.</p>" +
      zeitstrahl() +
      '<h2 class="mit-zeichen"><span class="h-zeichen" style="--hz:var(--r-gebrauchsmuster)">4</span>Glossar</h2><ul class="glossar-karten">' +
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
