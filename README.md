# Patent-Radar Bau & Dach

Wöchentliche Übersicht neuer Patentveröffentlichungen, Erteilungen und Gebrauchsmuster aus Deutschland, Österreich, der Schweiz und Europa sowie internationaler Anmeldungen zu Dach, Dachentwässerung und angrenzenden Bauthemen. Dazu Patent-News aus der Branche, Wochen- und Monatsberichte sowie ein Bestand aller laufenden Schutzrechte zu diesen Themen als Recherche-Datenbank.

Die Seite ist statisch: Die Daten liegen als JSON im Ordner `data/`, Suche und Filter laufen im Browser.

## Aufbau

- `index.html`, `assets/app.js`, `assets/app.css` – Oberfläche: Schiefer-Farbschema (dunkel, wahlweise hell), Kachel-Übersicht, klebende Filterleiste mit Themen, Karten mit Materialbild, Detailseiten mit Faktenkacheln und Schnellsuche (Strg K oder /) über Radar, Bestand, Anmelder und Seiten
- `assets/fonts/` – Schrift Barlow und Barlow Condensed (SIL Open Font License, `OFL-Barlow.txt`), lokal eingebunden; keine externen Abrufe
- `assets/bewegung.js`, `assets/bewegung.css` – Bewegung, gemeinsam mit dem Start-up-Radar: Fallblatt-Anzeigetafel auf der Übersicht, Karte wächst zur Detailseite (und zurück an dieselbe Stelle), Filtern mit Federn und rollender Trefferzahl, Gummiband in der Navigation mit Kamerafahrt im Seitenkopf, Merken mit Flug in die Merkliste, Neigen mit Lichtreflex, Zeitleiste füllt sich beim Scrollen; bei „Bewegung reduzieren“ ohne Animation
- `assets/motive.js` – Materialbilder je Thema (Rohre, Riffelblech, Schnee auf Stehfalz, Solarmodule, Trapezblech, Gründach, Zinkblech, Dachziegel), im Browser als SVG erzeugt; Symbolbilder, keine Abbildungen aus den Schriften
- `assets/zeichnungen.js` – eigene Strichzeichnungen im Stil von Patentfiguren (Fig. 1 auf der Übersicht, Fig. 2 bis 9 in den Kopfbändern der Unterseiten), erzeugt mit `tools/zeichnungen.py`
- `data/eintraege.json` – gepflegte Einträge, `data/news.json` – Meldungen, `data/berichte.json` – Berichte, `data/meta.json` – Stand und Abdeckung
- `data/radar.json`, `feed.xml` – werden von `tools/build.py` erzeugt
- `data/bestand.json` – Bestand: Patentanmeldungen, Patente und Gebrauchsmuster aus DE, EP, AT und CH sowie internationale Anmeldungen (WO) in den Klassen des Suchprofils, dazu alle Schutzrechte von Fachanmeldern (Firmen, die regelmäßig in diesen Klassen anmelden; Thema „Weitere Technik“ außerhalb der Klassen), jeweils solange die längstmögliche Laufzeit noch nicht abgelaufen ist (erzeugt von `tools/build.py --bestand <Datei>` aus dem automatischen Datenabruf). Anmelder und, falls abweichend, Inhaber laut Schrift; verschiedene amtliche Schreibweisen eines Anmelders sind zu Firmen gebündelt (`firmen`, `anmelder_firma`)
- `data/zeichnungen/` – erste Zeichnung (PNG, verkleinert, Graustufen) und Anspruch 1 der Radar-Einträge aus den amtlichen Veröffentlichungen (EPA-Publikationsserver, DEPATISnet), mit Quellenangabe in `index.json` (erzeugt von `tools/build.py --zeichnungen <Ordner>`)
- `tools/suchprofil.json` – Patentklassen und Stichwörter der Recherche
- `tools/firmen.py` – bündelt Schreibweisen eines Anmelders (Rechtsform, Länderzusatz, Groß- und Kleinschreibung) zu einer Firma

## Aktualisieren

```
python3 tools/build.py --lauf woche --wochenbericht "Kurzfassung der Woche" [--bestand <Datei aus dem Datenabruf>] [--zeichnungen <Ordner aus dem Datenabruf>]
```

Das Skript prüft alle Einträge (Nummern, Daten, Themen, Textlängen), berechnet Einspruchsfristen (neun Monate ab Veröffentlichung der Erteilung, § 59 PatG bzw. Art. 99 EPÜ), erzeugt Links zu Espacenet und den amtlichen Registern und schreibt `data/radar.json` sowie den RSS-Feed.

Im Bestand gilt als Laufzeitende die längstmögliche Laufzeit: Patente 20 Jahre ab dem Anmeldetag (§ 16 PatG, Art. 63 EPÜ; ebenso AT und CH), Gebrauchsmuster zehn Jahre nach Ablauf des Anmeldemonats (§ 23 GebrMG; ebenso AT), internationale Anmeldungen 20 Jahre ab dem internationalen Anmeldetag für daraus erteilte Patente. Ob ein Schutzrecht tatsächlich noch in Kraft ist, zeigt das jeweilige Register.

## Hinweis

Automatisierte Übersicht öffentlicher Veröffentlichungen. Keine Rechtsberatung. Vor Entscheidungen bitte durch eine Patentanwältin oder einen Patentanwalt prüfen lassen.

Datenquellen: DEPATISnet des Deutschen Patent- und Markenamts, Europäischer Publikationsserver des Europäischen Patentamts. Keine Cookies, kein Tracking. Merkliste und Farbschema liegen nur im eigenen Browser.
