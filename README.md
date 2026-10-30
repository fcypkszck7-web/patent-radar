# Patent-Radar Bau & Dach

Wöchentliche Übersicht neuer Patentveröffentlichungen, Erteilungen und Gebrauchsmuster aus Deutschland und Europa zu Dach, Dachentwässerung und angrenzenden Bauthemen. Dazu Patent-News aus der Branche, Wochen- und Monatsberichte.

Die Seite ist statisch: Die Daten liegen als JSON im Ordner `data/`, Suche und Filter laufen im Browser.

## Aufbau

- `index.html`, `assets/` – Oberfläche (Schriften und Bibliotheken liegen lokal, keine externen Abrufe)
- `assets/zeichnungen.js` – eigene Strichzeichnungen im Stil von Patentfiguren, erzeugt mit `tools/zeichnungen.py`
- `data/eintraege.json` – gepflegte Einträge, `data/news.json` – Meldungen, `data/berichte.json` – Berichte, `data/meta.json` – Stand und Abdeckung
- `data/radar.json`, `feed.xml` – werden von `tools/build.py` erzeugt
- `tools/suchprofil.json` – Patentklassen und Stichwörter der Recherche

## Aktualisieren

```
python3 tools/build.py --lauf woche --wochenbericht "Kurzfassung der Woche"
```

Das Skript prüft alle Einträge (Nummern, Daten, Themen, Textlängen), berechnet Einspruchsfristen (neun Monate ab Veröffentlichung der Erteilung, § 59 PatG bzw. Art. 99 EPÜ), erzeugt Links zu Espacenet und den amtlichen Registern und schreibt `data/radar.json` sowie den RSS-Feed.

## Hinweis

Automatisierte Übersicht öffentlicher Veröffentlichungen. Keine Rechtsberatung. Vor Entscheidungen bitte durch eine Patentanwältin oder einen Patentanwalt prüfen lassen.

Datenquellen: DEPATISnet des Deutschen Patent- und Markenamts, Europäischer Publikationsserver des Europäischen Patentamts. Keine Cookies, kein Tracking.
