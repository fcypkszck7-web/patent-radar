#!/usr/bin/env python3
"""Prüft die Daten des Patent-Radars, berechnet Fristen, Links und Kennzahlen
und erzeugt data/radar.json sowie feed.xml.

Aufruf (aus dem Repository-Hauptordner):
  python3 tools/build.py [--sperrwort WORT ...] [--lauf woche|erstbefuellung]
                         [--wochenbericht "Text"] [--monatsbericht JJJJ-MM [--trends "Text"]]
                         [--heute JJJJ-MM-TT]

Ohne Optionen werden nur Prüfung und Erzeugung ausgeführt. Bei Fehlern endet
das Skript mit Code 1 und schreibt nichts; ein Treffer der Wortprüfung endet
mit Code 2.
"""
import argparse
import calendar
import datetime as dt
import json
import os
import re
import sys
from email.utils import format_datetime
from xml.sax.saxutils import escape

WURZEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATEN = os.path.join(WURZEL, "data")

THEMEN = {
    "entwaesserung": "Dachentwässerung",
    "schneeschutz": "Schneeschutz",
    "solar": "Solar auf dem Dach",
    "sicherheit": "Dachsicherheit",
    "deckung": "Dachdeckung und Abdichtung",
    "zubehoer": "Dachzubehör und Anschlüsse",
    "gruendach": "Gründach, Regenwasser und Dämmung",
    "werkstoffe": "Werkstoffe und Fertigung",
}
ARTEN = {
    "DE": {"A1": "Offenlegung", "B3": "Erteilung", "B4": "Erteilung", "U1": "Gebrauchsmuster"},
    "EP": {"A1": "Offenlegung", "A2": "Offenlegung", "B1": "Erteilung", "B2": "Erteilung"},
    "WO": {"A1": "Internationale Anmeldung", "A2": "Internationale Anmeldung", "A3": "Internationale Anmeldung"},
}
# Einspruch nur gegen die erste Veröffentlichung der Erteilung (EP B2 = Fassung nach Einspruch).
MIT_EINSPRUCH = {("DE", "B3"), ("DE", "B4"), ("EP", "B1")}
MUSTER = {
    "DE": re.compile(r"^DE(\d{12}|\d{7,8})(A1|B3|B4|U1)$"),
    "EP": re.compile(r"^EP(\d{7})(A1|A2|B1|B2)$"),
    "WO": re.compile(r"^WO(\d{10})(A1|A2|A3)$"),
}
PFLICHT = ["id", "titel", "titel_original", "was_neu", "bezug", "amt", "nummer", "anmelder",
           "veroeffentlicht", "thema", "relevanz", "klassen", "aufgenommen", "quelle"]
DATUMSFELDER = ["veroeffentlicht", "angemeldet", "prioritaet", "erteilung_datum", "aufgenommen"]

fehler = []
warnungen = []


def lade(name, standard):
    pfad = os.path.join(DATEN, name)
    if not os.path.exists(pfad):
        return standard
    with open(pfad, encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError as e:
            fehler.append(f"{name}: ungültiges JSON ({e})")
            return standard


def schreibe(name, daten):
    pfad = os.path.join(DATEN, name) if not os.path.isabs(name) else name
    with open(pfad, "w", encoding="utf-8") as f:
        json.dump(daten, f, ensure_ascii=False, indent=1)
        f.write("\n")


def ist_datum(s):
    try:
        dt.date.fromisoformat(s)
        return True
    except (TypeError, ValueError):
        return False


def plus_monate(iso, monate):
    d = dt.date.fromisoformat(iso)
    m = d.month - 1 + monate
    j = d.year + m // 12
    m = m % 12 + 1
    tag = min(d.day, calendar.monthrange(j, m)[1])
    return dt.date(j, m, tag).isoformat()


def kompakt(nummer):
    return re.sub(r"[\s/.\-]", "", nummer or "").upper()


def saetze(text):
    teile = re.split(r"(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9„\"(])", text.strip())
    return [t for t in teile if t]


def pruefziffer(nummer12):
    """Prüfziffer deutscher Aktenzeichen (Gewichte 2 bis 13 von rechts, Modulo 11)."""
    s = sum(int(z) * (i + 2) for i, z in enumerate(reversed(nummer12)))
    p = (11 - s % 11) % 11
    return 0 if p == 10 else p


def links(e):
    k = e["nummer_kompakt"]
    l = [{"label": "Espacenet", "url": f"https://worldwide.espacenet.com/patent/search?q=pn%3D{k}"}]
    if e["amt"] == "DE":
        akz = re.sub(r"\D", "", e.get("akz") or "")
        an = re.sub(r"\D", "", e.get("anmeldenummer") or "")
        if not akz and len(an) == 12:
            akz = an + str(pruefziffer(an))
        if len(akz) == 13:
            l.append({"label": "DPMAregister", "url": f"https://register.dpma.de/DPMAregister/pat/register?AKZ={akz}"})
        l.append({"label": "DEPATISnet (DPMA)", "url": f"https://depatisnet.dpma.de/DepatisNet/depatisnet?action=bibdat&docid={k}"})
    elif e["amt"] == "EP":
        if e.get("anmeldenummer"):
            l.append({"label": "Europäisches Patentregister", "url": f"https://register.epo.org/application?number=EP{e['anmeldenummer']}&lng=de"})
        else:
            l.append({"label": "Europäisches Patentregister", "url": f"https://register.epo.org/smartSearch?searchMode=smart&query={k[:-2]}&lng=de"})
    elif e["amt"] == "WO":
        l.append({"label": "PATENTSCOPE", "url": f"https://patentscope.wipo.int/search/de/detail.jsf?docId={k[:-2]}"})
    for extra in e.get("links_extra", []) or []:
        if isinstance(extra, dict) and extra.get("url", "").startswith("https://"):
            l.append({"label": extra.get("label", "Weitere Quelle"), "url": extra["url"]})
    return l


BESTAND_ART = {"patent", "anmeldung", "gm"}
# Anmeldungen ohne veröffentlichte Erteilung nur bis zu diesem Alter zeigen; ältere sind in aller Regel
# zurückgenommen, zurückgewiesen oder gelten als zurückgenommen (DE: Prüfungsantrag binnen 7 Jahren, § 44 PatG).
ANMELDUNG_JAHRE = 10


def namenschluessel(n):
    t = (n or "").lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss"), ("é", "e"), ("è", "e")):
        t = t.replace(a, b)
    t = re.sub(r"gesellschaft mit beschr(ae|a)nkter haftung", "gmbh", t)
    t = re.sub(r"\bges\.?\s*m\.?\s*b\.?\s*h\.?", "gmbh", t)
    t = re.sub(r"\bg\.\s*m\.\s*b\.\s*h\.?", "gmbh", t)
    t = re.sub(r"aktiengesellschaft", "ag", t)
    t = re.sub(r"kommanditgesellschaft", "kg", t)
    return re.sub(r"[^a-z0-9]", "", t)


STAAT_ORT = re.compile(r",\s*(?!Co\.)(?:[A-Z][a-z]{1,4}\.|[A-Z]\.\s?[A-Z]\.)\s*,\s*[^,]+$")
RECHTSFORM_ORT = re.compile(r"^(.*?\b(?:GmbH\s*&\s*Co\.?\s*KG|GmbH|mbH|AG|KGaA|KG|SE|e\.\s?V\.|LLC|L\.L\.C\.|Inc\.?|Ltd\.?|Limited|"
                            r"Corp\.?|Corporation|B\.\s?V\.|N\.\s?V\.|S\.A\.S\.|S\.A\.|SAS|SARL|S\.p\.A\.|S\.r\.l\.|AB|A/S|ApS|Oyj|Oy|"
                            r"Sp\. z o\.o\.|s\.r\.o\.|PLC|GesmbH|Ges\.m\.b\.H\.))\s*,\s*[^,]+$", re.I)


def ohne_ort(name):
    """'Ford Global Technologies, LLC, Mich., Dearborn' -> 'Ford Global Technologies, LLC';
    'Roto Frank AG, Leinfelden-Echterdingen' -> 'Roto Frank AG'"""
    n = STAAT_ORT.sub("", (name or "").strip())
    m = RECHTSFORM_ORT.match(n)
    return m.group(1).strip() if m else n


def anzeige_nummer(amt, nr, kind):
    """DE102015104643 + B4 -> 'DE 10 2015 104 643 B4'; EP1845319 + B1 -> 'EP 1845319 B1'"""
    z = nr[2:]
    if amt == "DE" and z.startswith("0000"):
        z = str(int(z))
    if amt == "DE" and len(z) == 12:
        return f"DE {z[:2]} {z[2:6]} {z[6:9]} {z[9:]} {kind}"
    return f"{amt} {z} {kind}"


def baue_bestand(quelle, heute, radar_eintraege):
    """data/bestand.json aus rohdaten/bestand.json des Datenabrufs: nur Schutzrechte, deren
    längstmögliche Laufzeit noch nicht abgelaufen ist; Anmelder vereinheitlicht."""
    with open(quelle, encoding="utf-8") as f:
        roh = json.load(f)
    grenze_anm = plus_monate(heute, -12 * ANMELDUNG_JAHRE)
    rechte = [r for r in roh.get("schutzrechte", []) if r.get("ende_laengstens", "") >= heute
              and not (r.get("art") == "anmeldung" and r.get("angemeldet", "") < grenze_anm)]
    # Vereinheitlichte Schreibweisen aus dem Radar übernehmen
    vorgabe = {}
    for e in radar_eintraege:
        for o, n in zip(e.get("anmelder_original") or [], e.get("anmelder") or []):
            vorgabe.setdefault(namenschluessel(o), n)
        for n in e.get("anmelder") or []:
            vorgabe.setdefault(namenschluessel(n), n)
    varianten, laender, haeufig = {}, {}, {}
    for r in rechte:
        r["anmelder"] = [[ohne_ort(n), l] for n, l in r.get("anmelder") or []]
    for r in rechte:
        for name, land in r.get("anmelder") or []:
            k = namenschluessel(name)
            if not k:
                continue
            varianten.setdefault(k, {})
            varianten[k][name] = varianten[k].get(name, 0) + 1
            if land:
                laender.setdefault(k, {})
                laender[k][land] = laender[k].get(land, 0) + 1
            haeufig[k] = haeufig.get(k, 0) + 1

    def anzeigename(k):
        if k in vorgabe:
            return vorgabe[k]
        v = varianten[k]
        gemischt = [n for n in v if n != n.upper()]
        pool = gemischt or list(v)
        return max(pool, key=lambda n: (v[n], -len(n)))

    # Restliche Ortsangaben: 'Firma, Ort' auf 'Firma' zurückführen, wenn es 'Firma' auch ohne Ort gibt
    umleiten = {}
    for k, v in varianten.items():
        if k in vorgabe:
            continue
        name = max(v, key=v.get)
        if ", " in name:
            kurz = namenschluessel(name.rsplit(", ", 1)[0])
            if kurz != k and kurz in varianten:
                umleiten[k] = kurz
    for k, ziel in umleiten.items():
        haeufig[ziel] = haeufig.get(ziel, 0) + haeufig.pop(k, 0)
        laender.setdefault(ziel, {})
        for l, c in laender.pop(k, {}).items():
            laender[ziel][l] = laender[ziel].get(l, 0) + c

    def ziel(k):
        return umleiten.get(k, k)

    # Gleicher Anzeigename = ein Anmelder
    nach_name = {}
    for k in haeufig:
        nach_name.setdefault(anzeigename(k), []).append(k)
    namen = sorted(nach_name, key=lambda n: (-sum(haeufig[k] for k in nach_name[n]), n.lower()))
    index = {k: i for i, n in enumerate(namen) for k in nach_name[n]}
    eintraege, zaehl = [], {"patent": 0, "anmeldung": 0, "gm": 0}
    for r in rechte:
        if r.get("art") not in BESTAND_ART or r.get("thema") not in THEMEN:
            warnungen.append(f"Bestand {r.get('id')}: Art oder Thema unbekannt, ausgelassen")
            continue
        doks = r.get("dokumente") or []
        if not doks or not ist_datum(r.get("angemeldet")):
            continue
        letzt = doks[-1]
        nr = re.sub(r"[A-Z]\d?$", "", letzt["nummer"])
        if r["amt"] == "EP" or nr[2:].startswith("0000"):
            nr = nr[:2] + str(int(nr[2:]))
        t = r.get("titel") or {}
        titel = t.get("de") or t.get("en") or t.get("fr") or next(iter(t.values()), "")
        anm, gesehen = [], set()
        for name, _ in r.get("anmelder") or []:
            k = ziel(namenschluessel(name))
            if k in index and index[k] not in gesehen:
                anm.append(index[k])
                gesehen.add(index[k])
        zaehl[r["art"]] += 1
        eintraege.append([
            f"{r['amt'].lower()}-{nr[2:]}", r["amt"], r["art"], anzeige_nummer(r["amt"], nr, letzt["kind"]),
            [[d["kind"], d.get("pub")] for d in doks], r["angemeldet"], r.get("veroeffentlicht"), r.get("erteilt"),
            r["ende_laengstens"], r["thema"], titel, anm, r.get("klassen") or [], 1 if r.get("geaendert") else 0,
        ])
    eintraege.sort(key=lambda z: (z[5], z[0]), reverse=True)
    bestand = {
        "stand": roh.get("stand"), "quelle": roh.get("quelle", "DEPATISnet (DPMA)"), "ab": roh.get("ab"),
        "vollstaendig": bool(roh.get("vollstaendig")), "heute": heute, "anmeldungen_jahre": ANMELDUNG_JAHRE,
        "felder": ["id", "amt", "art", "nummer", "dokumente", "angemeldet", "veroeffentlicht", "erteilt", "ende",
                   "thema", "titel", "anmelder", "klassen", "geaendert"],
        "anmelder": namen,
        "anmelder_land": [land_von([laender.get(k, {}) for k in nach_name[n]]) for n in namen],
        "eintraege": eintraege,
    }
    return bestand


def schreibe_bestand(bestand):
    """Kompakt, ein Schutzrecht je Zeile (kleine Diffs, kleine Datei)."""
    kopf = {k: v for k, v in bestand.items() if k != "eintraege"}
    with open(os.path.join(DATEN, "bestand.json"), "w", encoding="utf-8") as f:
        f.write(json.dumps(kopf, ensure_ascii=False, separators=(",", ":"))[:-1] + ',"eintraege":[\n')
        f.write(",\n".join(json.dumps(z, ensure_ascii=False, separators=(",", ":")) for z in bestand["eintraege"]))
        f.write("\n]}\n")


def land_von(zaehlungen):
    gesamt = {}
    for z in zaehlungen:
        for l, c in z.items():
            gesamt[l] = gesamt.get(l, 0) + c
    return max(gesamt, key=gesamt.get) if gesamt else None


def bestand_kurz(bestand, heute):
    if not bestand or not bestand.get("eintraege"):
        return None
    f = {n: i for i, n in enumerate(bestand["felder"])}
    laufend = [z for z in bestand["eintraege"] if z[f["ende"]] >= heute]
    in12 = plus_monate(heute, 12)
    return {
        "stand": bestand.get("stand"), "ab": bestand.get("ab"), "vollstaendig": bestand.get("vollstaendig"),
        "anmeldungen_jahre": bestand.get("anmeldungen_jahre"),
        "gesamt": len(laufend),
        "patente": sum(1 for z in laufend if z[f["art"]] == "patent"),
        "anmeldungen": sum(1 for z in laufend if z[f["art"]] == "anmeldung"),
        "gebrauchsmuster": sum(1 for z in laufend if z[f["art"]] == "gm"),
        "auslaufend_12m": sum(1 for z in laufend if z[f["ende"]] < in12 and z[f["art"]] != "anmeldung"),
        "anmelder": len(bestand.get("anmelder") or []),
    }


def pruefe_eintrag(e, heute):
    wo = e.get("id", "?")
    for feld in PFLICHT:
        if feld not in e or e[feld] in (None, "", []):
            fehler.append(f"Eintrag {wo}: Pflichtfeld '{feld}' fehlt")
    if fehler and any(x.startswith(f"Eintrag {wo}:") for x in fehler):
        return False
    if not re.match(r"^[a-z0-9][a-z0-9\-]*$", e["id"]):
        fehler.append(f"Eintrag {wo}: id nur aus Kleinbuchstaben, Ziffern und Bindestrichen")
    amt = e["amt"]
    if amt not in MUSTER:
        fehler.append(f"Eintrag {wo}: Amt '{amt}' unbekannt (DE, EP, WO)")
        return False
    k = kompakt(e["nummer"])
    m = MUSTER[amt].match(k)
    if not m:
        fehler.append(f"Eintrag {wo}: Nummer '{e['nummer']}' passt nicht zu Amt {amt}")
        return False
    kind = m.group(2)
    e["kind"] = kind
    e["nummer_kompakt"] = k
    erwartet = ARTEN[amt][kind]
    if e.get("art") and e["art"] != erwartet:
        fehler.append(f"Eintrag {wo}: Art '{e['art']}' passt nicht zu {kind} (erwartet {erwartet})")
    e["art"] = erwartet
    for feld in DATUMSFELDER:
        if e.get(feld) and not ist_datum(e[feld]):
            fehler.append(f"Eintrag {wo}: {feld} '{e[feld]}' ist kein Datum JJJJ-MM-TT")
    if ist_datum(e.get("veroeffentlicht")) and e["veroeffentlicht"] > heute:
        fehler.append(f"Eintrag {wo}: Veröffentlichung liegt in der Zukunft")
    if e["thema"] not in THEMEN:
        fehler.append(f"Eintrag {wo}: Thema '{e['thema']}' unbekannt")
    if e["relevanz"] not in ("hoch", "mittel"):
        fehler.append(f"Eintrag {wo}: Relevanz muss 'hoch' oder 'mittel' sein (niedrig wird nicht veröffentlicht)")
    if not isinstance(e["anmelder"], list) or not all(isinstance(a, str) and a.strip() for a in e["anmelder"]):
        fehler.append(f"Eintrag {wo}: anmelder muss eine Liste von Namen sein")
    if not isinstance(e["klassen"], list):
        fehler.append(f"Eintrag {wo}: klassen muss eine Liste sein")
    n = len(saetze(e["was_neu"]))
    if n < 2 or n > 4 or len(e["was_neu"]) > 750:
        fehler.append(f"Eintrag {wo}: 'Was ist neu?' braucht 2 bis 3 Sätze in eigenen Worten (jetzt {n} Sätze, {len(e['was_neu'])} Zeichen)")
    if len(e["bezug"]) > 260 or len(saetze(e["bezug"])) > 2:
        fehler.append(f"Eintrag {wo}: 'Bezug' muss ein kurzer Satz sein")
    for f in e.get("familie", []) or []:
        if not isinstance(f, dict) or not f.get("nummer"):
            fehler.append(f"Eintrag {wo}: Familienmitglied ohne Nummer")
            continue
        fk = kompakt(f["nummer"])
        cc = fk[:2]
        if cc in MUSTER and not MUSTER[cc].match(fk):
            fehler.append(f"Eintrag {wo}: Familiennummer '{f['nummer']}' ungültig")
        if f.get("datum") and not ist_datum(f["datum"]):
            fehler.append(f"Eintrag {wo}: Familiendatum '{f['datum']}' ungültig")
    if erwartet == "Erteilung":
        e.setdefault("erteilung_datum", e["veroeffentlicht"])
        if (amt, kind) in MIT_EINSPRUCH and ist_datum(e["erteilung_datum"]):
            e["einspruch_bis"] = plus_monate(e["erteilung_datum"], 9)
            e["frist_status"] = "laufend" if e["einspruch_bis"] >= heute else "abgelaufen"
        else:
            e.pop("einspruch_bis", None)
    else:
        e.pop("einspruch_bis", None)
        e.pop("erteilung_datum", None)
        e.pop("frist_status", None)
        if e.get("neu_erteilt"):
            fehler.append(f"Eintrag {wo}: 'neu erteilt' nur bei Erteilungen")
    e["links"] = links(e)
    return True


def pruefe_woerter(sperrwoerter, anmelder_namen):
    """Sucht nicht-öffentliche Wörter in allen Textdateien. Anmeldernamen aus den
    amtlichen Daten sind erlaubt, sonst nichts."""
    if not sperrwoerter:
        return []
    woerter = [w.lower() for w in sperrwoerter if w.strip()]
    namen = sorted({a.lower() for a in anmelder_namen}, key=len, reverse=True)
    treffer = []

    def suche(text, ort, namen_erlauben=False):
        t = text.lower()
        if namen_erlauben:
            for n in namen:
                t = t.replace(n, " ")
        for w in woerter:
            if w in t:
                i = t.index(w)
                treffer.append(f"{ort}: …{text[max(0, i - 40):i + 40]}…")

    def json_laufen(obj, ort, pfad=""):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if k in ("anmelder", "anmelder_original") and (isinstance(v, list) or isinstance(v, str)):
                    werte = v if isinstance(v, list) else [v]
                    for x in werte:
                        if isinstance(x, str):
                            continue
                        json_laufen(x, ort, pfad + "/" + k)
                    continue
                if k == "name" and pfad.endswith("/anmelder"):
                    continue
                suche(str(k), f"{ort} (Schlüssel {pfad}/{k})")
                json_laufen(v, ort, pfad + "/" + k)
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                json_laufen(v, ort, pfad)
        elif isinstance(obj, str):
            suche(obj, f"{ort} ({pfad})")

    for basis, ordner, dateien in os.walk(WURZEL):
        rel = os.path.relpath(basis, WURZEL)
        if rel.startswith(".git") or rel.startswith(os.path.join("assets", "fonts")) or rel.startswith(os.path.join("assets", "vendor")):
            ordner[:] = []
            continue
        ordner[:] = [o for o in ordner if o != ".git"]
        for name in dateien:
            pfad = os.path.join(basis, name)
            relpfad = os.path.relpath(pfad, WURZEL)
            suche(relpfad, "Dateiname")
            if not name.endswith((".json", ".html", ".css", ".js", ".py", ".md", ".xml", ".txt", ".yml", ".yaml")):
                continue
            with open(pfad, encoding="utf-8", errors="ignore") as f:
                text = f.read()
            if name.endswith(".json"):
                try:
                    obj = json.loads(text)
                except json.JSONDecodeError:
                    suche(text, relpfad)
                    continue
                if relpfad == os.path.join("data", "radar.json") and isinstance(obj, dict):
                    obj = dict(obj)
                    obj.pop("anmelder", None)
                json_laufen(obj, relpfad)
            elif name == "feed.xml":
                suche(text, relpfad, namen_erlauben=True)
            else:
                suche(text, relpfad)
    return treffer


def pruefe_extern():
    """Keine Ressourcen von fremden Servern einbinden."""
    probleme = []
    regeln = {
        "index.html": re.compile(r"<(?:script|link|img|iframe)[^>]+(?:src|href)=[\"']https?://", re.I),
        os.path.join("assets", "app.css"): re.compile(r"(?:url\(\s*[\"']?https?://|@import)", re.I),
        os.path.join("assets", "app.js"): re.compile(r"(?:fetch\(\s*[\"']https?://|\.src\s*=\s*[\"']https?://)", re.I),
    }
    for datei, muster in regeln.items():
        pfad = os.path.join(WURZEL, datei)
        if os.path.exists(pfad):
            with open(pfad, encoding="utf-8") as f:
                text = f.read()
            if muster.search(text):
                probleme.append(f"{datei}: lädt Ressourcen von einem fremden Server")
            if datei == "index.html" and 'name="robots" content="noindex, nofollow"' not in text:
                probleme.append("index.html: <meta name=\"robots\" content=\"noindex, nofollow\"> fehlt")
    return probleme


def iso_woche(d):
    j, w, _ = dt.date.fromisoformat(d).isocalendar()
    return j, w


def wochenstart(d):
    x = dt.date.fromisoformat(d)
    return (x - dt.timedelta(days=x.weekday())).isoformat()


def rang(e):
    return (0 if e["relevanz"] == "hoch" else 1, -(e.get("punkte") or 0), -(int(e["veroeffentlicht"].replace("-", ""))))


def feed(radar, berichte, basis):
    eintraege = sorted(radar["eintraege"], key=lambda e: (e["aufgenommen"], e.get("erteilung_datum") or e["veroeffentlicht"]), reverse=True)[:60]
    items = []
    for b in sorted(berichte, key=lambda b: b["erstellt"], reverse=True)[:6]:
        art = "Monatsbericht" if b["art"] == "monat" else "Wochenbericht"
        datum_ = dt.datetime.fromisoformat(b["erstellt"] + "T07:00:00+00:00")
        items.append((b["erstellt"], f"""<item><title>{escape(art + ': ' + b['titel'])}</title><link>{escape(basis + '#/berichte/' + b['id'])}</link><guid isPermaLink="false">{escape('bericht:' + b['id'] + ':' + b['erstellt'])}</guid><pubDate>{format_datetime(datum_)}</pubDate><description>{escape(b.get('zusammenfassung') or b.get('kurz') or '')}</description></item>"""))
    for e in eintraege:
        datum_ = dt.datetime.fromisoformat(e["aufgenommen"] + "T07:00:00+00:00")
        zusatz = []
        if e.get("neu_erteilt"):
            zusatz.append("Neu erteilt.")
        if e.get("einspruch_bis"):
            zusatz.append(f"Einspruch möglich bis {dt.date.fromisoformat(e['einspruch_bis']).strftime('%d.%m.%Y')} (Frist im amtlichen Register prüfen).")
        text = f"{e['was_neu']} Anmelder: {', '.join(e['anmelder'])}. Thema: {THEMEN[e['thema']]}, Relevanz {e['relevanz']}. {' '.join(zusatz)}".strip()
        guid = f"{e['id']}:{e['nummer_kompakt']}"
        items.append((e["aufgenommen"], f"""<item><title>{escape(e['art'] + ': ' + e['titel'] + ' (' + e['nummer'] + ')')}</title><link>{escape(basis + '#/eintrag/' + e['id'])}</link><guid isPermaLink="false">{escape(guid)}</guid><pubDate>{format_datetime(datum_)}</pubDate><category>{escape(THEMEN[e['thema']])}</category><description>{escape(text)}</description></item>"""))
    items.sort(key=lambda x: x[0], reverse=True)
    jetzt = dt.datetime.fromisoformat(radar["stand"] + "T07:00:00+00:00")
    return ("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<rss version=\"2.0\"><channel>"
            "<title>Patent-Radar Bau &amp; Dach</title>"
            f"<link>{escape(basis)}</link>"
            "<description>Neue Patente, Erteilungen und Gebrauchsmuster zu Dach, Dachentwässerung und angrenzenden Bauthemen. Wöchentliche Aktualisierung.</description>"
            "<language>de-de</language>"
            f"<lastBuildDate>{format_datetime(jetzt)}</lastBuildDate>"
            + "".join(i[1] for i in items) + "</channel></rss>\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sperrwort", action="append", default=[])
    ap.add_argument("--lauf", choices=["woche", "erstbefuellung"])
    ap.add_argument("--wochenbericht")
    ap.add_argument("--monatsbericht")
    ap.add_argument("--trends", default="")
    ap.add_argument("--heute")
    ap.add_argument("--bestand", help="rohdaten/bestand.json aus dem Daten-Repository; erzeugt data/bestand.json neu")
    args = ap.parse_args()

    heute = args.heute or dt.date.today().isoformat()
    eintraege = lade("eintraege.json", [])
    meta = lade("meta.json", {})
    news = lade("news.json", [])
    berichte = lade("berichte.json", [])
    if fehler:
        return abbruch()

    if args.lauf:
        meta["lauf"] = {"datum": heute, "art": args.lauf}
        meta["stand"] = heute
    meta.setdefault("stand", heute)
    meta.setdefault("lauf", {"datum": meta["stand"], "art": "woche"})
    lauf = meta["lauf"]

    ids, nummern = set(), {}
    gueltig = []
    for e in eintraege:
        e = dict(e)
        if pruefe_eintrag(e, heute):
            if e["id"] in ids:
                fehler.append(f"Eintrag {e['id']}: id doppelt")
            ids.add(e["id"])
            for n in [e["nummer_kompakt"]] + [kompakt(f["nummer"]) for f in e.get("familie", []) or []]:
                if n in nummern and nummern[n] != e["id"]:
                    fehler.append(f"Nummer {n} kommt in {nummern[n]} und {e['id']} vor – Familie zusammenführen")
                nummern[n] = e["id"]
            gueltig.append(e)

    for e in gueltig:
        if e["aufgenommen"] > heute:
            fehler.append(f"Eintrag {e['id']}: Aufnahmedatum in der Zukunft")
        if e["aufgenommen"] == lauf["datum"]:
            if lauf["art"] == "erstbefuellung":
                ref = e.get("erteilung_datum") or e["veroeffentlicht"]
                e["neu"] = ref >= (dt.date.fromisoformat(lauf["datum"]) - dt.timedelta(days=14)).isoformat()
            else:
                e["neu"] = True
        else:
            e["neu"] = False

    news_ids = set()
    for n in news:
        for feld in ("id", "datum", "quelle", "titel", "text", "url"):
            if not n.get(feld):
                fehler.append(f"News {n.get('id', '?')}: Feld '{feld}' fehlt")
        if n.get("datum") and not ist_datum(n["datum"]):
            fehler.append(f"News {n.get('id')}: Datum ungültig")
        if n.get("url") and not n["url"].startswith("https://"):
            fehler.append(f"News {n.get('id')}: Link muss mit https:// beginnen")
        if n.get("text") and (len(saetze(n["text"])) > 3 or len(n["text"]) > 420):
            fehler.append(f"News {n.get('id')}: höchstens zwei Sätze in eigenen Worten")
        if n.get("thema") and n["thema"] not in THEMEN:
            fehler.append(f"News {n.get('id')}: Thema unbekannt")
        if n.get("id") in news_ids:
            fehler.append(f"News {n.get('id')}: id doppelt")
        news_ids.add(n.get("id"))
    wochen = {}
    for n in news:
        if ist_datum(n.get("datum", "")):
            wochen.setdefault(iso_woche(n["datum"]), 0)
            wochen[iso_woche(n["datum"])] += 1
    for (j, w), anzahl in wochen.items():
        if anzahl > 10:
            fehler.append(f"News: KW {w}/{j} hat {anzahl} Meldungen (höchstens 10)")

    nach_id = {e["id"]: e for e in gueltig}
    weiter = {w["von"]: w["zu"] for w in meta.get("weiterleitungen", [])}

    def aufloesen(i):
        return weiter.get(i, i)

    # Anmelder-Rangliste
    index = {}
    for e in gueltig:
        laender = e.get("anmelder_land") or []
        for i, a in enumerate(e["anmelder"]):
            x = index.setdefault(a, {"name": a, "anzahl": 0, "themen": {}, "laender": {}})
            x["anzahl"] += 1
            x["themen"][e["thema"]] = x["themen"].get(e["thema"], 0) + 1
            if i < len(laender) and laender[i]:
                x["laender"][laender[i]] = x["laender"].get(laender[i], 0) + 1
    anmelder = []
    for x in index.values():
        land = max(x["laender"], key=x["laender"].get) if x["laender"] else None
        anmelder.append({"name": x["name"], "anzahl": x["anzahl"], "land": land, "themen": x["themen"]})
    anmelder.sort(key=lambda a: (-a["anzahl"], a["name"].lower()))

    def verteilung(liste, feld):
        zaehl = {}
        for e in liste:
            zaehl[e[feld]] = zaehl.get(e[feld], 0) + 1
        return zaehl

    def laufende():
        return [e for e in gueltig if e.get("einspruch_bis") and e["einspruch_bis"] >= heute]

    # Berichte erzeugen
    if args.wochenbericht is not None:
        j, w = iso_woche(lauf["datum"])
        neu = sorted([e for e in gueltig if e["neu"]], key=rang)
        von = (dt.date.fromisoformat(lauf["datum"]) - dt.timedelta(days=7)).isoformat()
        b = {
            "id": f"woche-{j}-{w:02d}", "art": "woche", "titel": f"Kalenderwoche {w}/{j}",
            "zeitraum": {"von": von, "bis": lauf["datum"]}, "erstellt": heute,
            "zusammenfassung": args.wochenbericht.strip(),
            "kurz": (f"{len(neu)} neue Einträge" if neu else "Keine neuen relevanten Veröffentlichungen"),
            "kennzahlen": {"neu": len(neu), "erteilungen": sum(1 for e in neu if e["art"] == "Erteilung"),
                           "gebrauchsmuster": sum(1 for e in neu if e["art"] == "Gebrauchsmuster"),
                           "fristen_laufend": len(laufende())},
            "themen": verteilung(neu, "thema"), "arten": verteilung(neu, "art"),
            "top": [e["id"] for e in neu[:3]],
            "fristen": [e["id"] for e in sorted(neu, key=lambda e: e.get("einspruch_bis") or "9") if e.get("einspruch_bis")],
            "news": [n["id"] for n in news if ist_datum(n.get("datum", "")) and von <= n["datum"] <= lauf["datum"]][:10],
            "hinweise": list((meta.get("abdeckung") or {}).get("hinweise_woche") or []),
        }
        berichte = [x for x in berichte if x["id"] != b["id"]] + [b]

    if args.monatsbericht:
        if not re.match(r"^\d{4}-\d{2}$", args.monatsbericht):
            fehler.append("--monatsbericht erwartet JJJJ-MM")
        else:
            j, m = map(int, args.monatsbericht.split("-"))
            von = dt.date(j, m, 1).isoformat()
            bis = dt.date(j, m, calendar.monthrange(j, m)[1]).isoformat()
            im_monat = [e for e in gueltig if von <= e["aufgenommen"] <= bis]
            top = sorted(im_monat, key=rang)[:5]
            in90 = (dt.date.fromisoformat(heute) + dt.timedelta(days=90)).isoformat()
            fristen90 = sorted([e for e in laufende() if e["einspruch_bis"] <= in90], key=lambda e: e["einspruch_bis"])
            zaehl = {}
            for e in im_monat:
                for a in e["anmelder"]:
                    zaehl[a] = zaehl.get(a, 0) + 1
            aktiv = sorted(zaehl.items(), key=lambda x: (-x[1], x[0].lower()))[:5]
            monatsnews = [n for n in news if ist_datum(n.get("datum", "")) and von <= n["datum"] <= bis]
            monatsname = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"][m - 1]
            b = {
                "id": f"monat-{j}-{m:02d}", "art": "monat", "titel": f"{monatsname} {j}",
                "zeitraum": {"von": von, "bis": bis}, "erstellt": heute,
                "zusammenfassung": "", "kurz": f"{len(im_monat)} neue Einträge, {len(fristen90)} Fristen in 90 Tagen",
                "kennzahlen": {"neu": len(im_monat), "erteilungen": sum(1 for e in im_monat if e["art"] == "Erteilung"),
                               "gebrauchsmuster": sum(1 for e in im_monat if e["art"] == "Gebrauchsmuster"),
                               "fristen_laufend": len(laufende())},
                "themen": verteilung(im_monat, "thema"), "arten": verteilung(im_monat, "art"),
                "top": [e["id"] for e in top],
                "fristen": [e["id"] for e in fristen90],
                "trends": args.trends.strip(),
                "anmelder": [{"name": n, "anzahl": c} for n, c in aktiv],
                "news": [n["id"] for n in sorted(monatsnews, key=lambda n: n["datum"], reverse=True)[:5]],
                "hinweise": list((meta.get("abdeckung") or {}).get("hinweise_monat") or []),
            }
            alt = next((x for x in berichte if x["id"] == b["id"]), None)
            if alt and alt.get("zusammenfassung"):
                b["zusammenfassung"] = alt["zusammenfassung"]
            berichte = [x for x in berichte if x["id"] != b["id"]] + [b]

    for b in berichte:
        for feld in ("id", "art", "titel", "zeitraum", "erstellt"):
            if not b.get(feld):
                fehler.append(f"Bericht {b.get('id', '?')}: Feld '{feld}' fehlt")
        for liste in ("top", "fristen"):
            b[liste] = [aufloesen(i) for i in b.get(liste, [])]
            for i in b[liste]:
                if i not in nach_id:
                    fehler.append(f"Bericht {b.get('id')}: Eintrag {i} unbekannt")
        for i in b.get("news", []):
            if i not in news_ids:
                fehler.append(f"Bericht {b.get('id')}: News {i} unbekannt")

    for w in meta.get("weiterleitungen", []):
        if w["zu"] not in nach_id:
            fehler.append(f"Weiterleitung {w['von']} → {w['zu']}: Ziel unbekannt")

    if fehler:
        return abbruch()

    bestand = None
    if args.bestand:
        if not os.path.exists(args.bestand):
            fehler.append(f"--bestand: Datei {args.bestand} nicht gefunden")
            return abbruch()
        bestand = baue_bestand(args.bestand, heute, gueltig)
        woerter = [w.lower() for w in args.sperrwort if w.strip()]
        if woerter:
            ti = bestand["felder"].index("titel")
            vorher = len(bestand["eintraege"])
            bestand["eintraege"] = [z for z in bestand["eintraege"] if not any(w in (z[ti] or "").lower() for w in woerter)]
            if len(bestand["eintraege"]) < vorher:
                warnungen.append(f"Bestand: {vorher - len(bestand['eintraege'])} Einträge mit nicht-öffentlichem Wort im Titel ausgelassen")
    alt_bestand = bestand or lade("bestand.json", None)
    if fehler:
        return abbruch()

    if alt_bestand and alt_bestand.get("eintraege"):
        fb = {n: i for i, n in enumerate(alt_bestand["felder"])}
        zaehl_b = {}
        for z in alt_bestand["eintraege"]:
            if z[fb["ende"]] >= heute:
                for i in z[fb["anmelder"]]:
                    zaehl_b[i] = zaehl_b.get(i, 0) + 1
        namen_b = {alt_bestand["anmelder"][i]: n for i, n in zaehl_b.items()}
        for a in anmelder:
            if namen_b.get(a["name"]):
                a["bestand"] = namen_b[a["name"]]

    alle_lauf = laufende()
    radar = {
        "stand": meta["stand"], "heute": heute, "lauf": lauf,
        "daten_ab": meta.get("daten_ab"), "voll_ab": meta.get("voll_ab"),
        "abdeckung": meta.get("abdeckung", {}),
        "weiterleitungen": meta.get("weiterleitungen", []),
        "kennzahlen": {"gesamt": len(gueltig), "neu": sum(1 for e in gueltig if e["neu"]),
                       "erteilungen": sum(1 for e in gueltig if e["art"] == "Erteilung"),
                       "gebrauchsmuster": sum(1 for e in gueltig if e["art"] == "Gebrauchsmuster"),
                       "fristen_laufend": len(alle_lauf)},
        "anmelder": anmelder,
        "bestand": bestand_kurz(alt_bestand, heute),
        "eintraege": sorted(gueltig, key=lambda e: e["veroeffentlicht"], reverse=True),
    }
    basis = meta.get("basis_url", "./")

    # Erst prüfen, dann schreiben
    extern = pruefe_extern()
    if extern:
        fehler.extend(extern)
        return abbruch()

    alte = {}
    for name in ("radar.json", "berichte.json", "meta.json", "bestand.json"):
        p = os.path.join(DATEN, name)
        alte[name] = open(p, encoding="utf-8").read() if os.path.exists(p) else None
    alt_feed = open(os.path.join(WURZEL, "feed.xml"), encoding="utf-8").read() if os.path.exists(os.path.join(WURZEL, "feed.xml")) else None

    schreibe("radar.json", radar)
    schreibe("berichte.json", sorted(berichte, key=lambda b: (b["zeitraum"]["bis"], b["art"]), reverse=True))
    schreibe("meta.json", meta)
    if bestand is not None:
        schreibe_bestand(bestand)
    with open(os.path.join(WURZEL, "feed.xml"), "w", encoding="utf-8") as f:
        f.write(feed(radar, berichte, basis))

    namen = {a for e in gueltig for a in e["anmelder"]} | {a for e in gueltig for a in (e.get("anmelder_original") or [])}
    treffer = pruefe_woerter(args.sperrwort, namen)
    if treffer:
        # Zustand vor dem Lauf wiederherstellen
        for name, inhalt in alte.items():
            p = os.path.join(DATEN, name)
            if inhalt is None:
                os.path.exists(p) and os.remove(p)
            else:
                open(p, "w", encoding="utf-8").write(inhalt)
        fp = os.path.join(WURZEL, "feed.xml")
        if alt_feed is None:
            os.path.exists(fp) and os.remove(fp)
        else:
            open(fp, "w", encoding="utf-8").write(alt_feed)
        print("Nicht-öffentliches Wort gefunden – nichts veröffentlichen:")
        for t in treffer[:30]:
            print("  " + t)
        sys.exit(2)

    if radar.get("bestand"):
        b = radar["bestand"]
        print(f"Bestand: {b['gesamt']} laufende Schutzrechte ({b['patente']} Patente, {b['anmeldungen']} Anmeldungen, "
              f"{b['gebrauchsmuster']} Gebrauchsmuster), {b['anmelder']} Anmelder, Stand {b['stand']}"
              + ("" if b.get("vollstaendig") else " – Erstbefüllung noch nicht vollständig"))
    k = radar["kennzahlen"]
    print(f"OK: {k['gesamt']} Einträge, {k['neu']} neu, {k['erteilungen']} Erteilungen, {k['gebrauchsmuster']} Gebrauchsmuster, "
          f"{k['fristen_laufend']} laufende Einspruchsfristen, {len(news)} News, {len(berichte)} Berichte.")
    for w in warnungen:
        print("Hinweis: " + w)


def abbruch():
    print("FEHLER – nichts geschrieben:")
    for f in fehler:
        print("  " + f)
    sys.exit(1)


if __name__ == "__main__":
    main()
