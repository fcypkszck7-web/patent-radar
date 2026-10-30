"""Erzeugt assets/zeichnungen.js: Hauptzeichnung (Fig. 1) im Stil einer Patentzeichnung, Themen- und Rubriksymbole."""
import json
import math
import sys

ZIEL = sys.argv[1] if len(sys.argv) > 1 else "assets/zeichnungen.js"


def f(x):
    return f"{x:.1f}".rstrip("0").rstrip(".")


def pt(p):
    return f"{f(p[0])} {f(p[1])}"


def add(a, b, k=1.0):
    return (a[0] + b[0] * k, a[1] + b[1] * k)


# ---------------- Geometrie Fig. 1 ----------------
E1 = (96.0, 262.0)      # Traufe links (Dachfläche)
R = (352.0, 100.0)      # First
E2 = (608.0, 262.0)     # Traufe rechts
L = math.dist(E1, R)
u = ((R[0] - E1[0]) / L, (R[1] - E1[1]) / L)          # links, nach oben
n = (u[1], -u[0])                                       # Normale links (nach außen oben)
v = ((R[0] - E2[0]) / L, (R[1] - E2[1]) / L)           # rechts, nach oben
n2 = (-v[1], v[0])                                      # Normale rechts (nach außen oben)
if n[1] > 0:
    n = (-n[0], -n[1])
if n2[1] > 0:
    n2 = (-n2[0], -n2[1])


def links(s, h=0.0):
    return add(add(E1, u, s), n, h)


def rechts(s, h=0.0):
    return add(add(E2, v, s), n2, h)


teile = []   # (gruppe, svg)


def strich(d, extra=""):
    return f'<path class="s" pathLength="1" d="{d}"{extra}/>'


# Bauwerk: Dach, Wände, Gelände
bau = []
Ri = (R[0], R[1] + 13 / abs(u[0]))
E1i = links(4, -13)
E2i = rechts(4, -13)
bau.append(strich(f"M{pt(E1)} L{pt(R)} L{pt(E2)}"))
bau.append(strich(f"M{pt(E1i)} L{pt(Ri)} L{pt(E2i)}"))
bau.append(strich(f"M{pt(E1)} L{pt(E1i)} M{pt(E2)} L{pt(E2i)}"))
# Wände (Schnitt, doppelt)
for x in (124, 136, 568, 580):
    y0 = E1i[1] + (x - E1i[0]) * (Ri[1] - E1i[1]) / (Ri[0] - E1i[0]) if x < 352 else E2i[1] + (x - E2i[0]) * (Ri[1] - E2i[1]) / (Ri[0] - E2i[0])
    bau.append(strich(f"M{x} {f(y0)} L{x} 420"))
# Geschossdecke
bau.append(strich("M136 300 L568 300 M136 308 L568 308"))
# Gelände mit Schraffur
bau.append(strich("M18 420 L742 420"))
schraffur = " ".join(f"M{x} 420 l-9 10" for x in range(30, 742, 14))
bau.append(f'<path class="s duenn" pathLength="1" d="{schraffur}"/>')
# Wandschraffur (Schnitt)
ws = []
for x0, x1 in ((124, 136), (568, 580)):
    for y in range(266, 420, 9):
        ws.append(f"M{x0} {y + 8} L{x1} {y - 4}")
bau.append(f'<path class="s duenn" pathLength="1" d="{" ".join(ws)}"/>')
# Deckenschraffur
ds = " ".join(f"M{x} 308 l8 -8" for x in range(140, 566, 10))
bau.append(f'<path class="s duenn" pathLength="1" d="{ds}"/>')


def ziegel(fn, s0, s1, schritt=17.0, hub=6.0):
    d = []
    s = s0
    while s + schritt <= s1 + 0.1:
        a = fn(s, 1)
        b = fn(s + schritt, 1)
        m = fn(s + schritt * 0.5, 1 + hub)
        d.append(f"M{pt(a)} Q{pt(m)} {pt(b)}")
        s += schritt
    return " ".join(d)


# 50 Dachdeckung: Ziegel links und rechts
deckung = [strich(ziegel(links, 6, 296)), strich(ziegel(rechts, 6, 296))]

# 20 Schneeschutz: Halter senkrecht zur Dachfläche mit zwei Rohren, Schneepolster dahinter
s20 = 62
fuss = links(s20, 2)
kopf = links(s20, 26)
schnee = [
    strich(f"M{pt(links(s20 - 7, 2))} L{pt(links(s20 + 7, 2))}"),
    strich(f"M{pt(fuss)} L{pt(kopf)}"),
    f'<circle class="s" pathLength="1" cx="{f(kopf[0])}" cy="{f(kopf[1])}" r="4.2"/>',
    f'<circle class="s" pathLength="1" cx="{f(links(s20, 15)[0])}" cy="{f(links(s20, 15)[1])}" r="4.2"/>',
    f'<path class="s strichliert" d="M{pt(links(s20 + 6, 8))} Q{pt(links(s20 + 34, 30))} {pt(links(s20 + 76, 9))}"/>',
]
flocken = []
for s, h in ((s20 + 26, 22), (s20 + 48, 26), (s20 + 64, 17)):
    c = links(s, h)
    flocken.append(f"M{f(c[0] - 3)} {f(c[1])} h6 M{f(c[0])} {f(c[1] - 3)} v6 M{f(c[0] - 2.1)} {f(c[1] - 2.1)} l4.2 4.2 M{f(c[0] - 2.1)} {f(c[1] + 2.1)} l4.2 -4.2")
schnee.append(f'<path class="s duenn" pathLength="1" d="{" ".join(flocken)}"/>')

# 60 Dachfenster (Dachzubehör) auf der linken Seite
a, b = 152, 198
p1, p2 = links(a, 3), links(b, 3)
p3, p4 = links(b, 15), links(a, 15)
fenster = [
    f'<path class="s deckend" pathLength="1" d="M{pt(p1)} L{pt(p2)} L{pt(p3)} L{pt(p4)} Z"/>',
    strich(f"M{pt(links(a + 4, 11))} L{pt(links(b - 4, 11))} M{pt(links(a + 4, 8))} L{pt(links(b - 4, 8))}"),
    strich(f"M{pt(links(a - 6, 1))} L{pt(links(a, 6))} M{pt(links(b + 6, 1))} L{pt(links(b, 6))}"),
]

# 40 Dachsicherheit: Anschlagpunkt mit Öse nahe First, Dachtritt darunter
s40 = 262
basis = links(s40, 2)
oben = links(s40, 26)
oese = links(s40, 32)
tritt_a = links(222, 3)
tritt_b = (tritt_a[0], tritt_a[1] - 13)
sicherheit = [
    strich(f"M{pt(links(s40 - 7, 2))} L{pt(links(s40 + 7, 2))} M{pt(basis)} L{pt(oben)}"),
    f'<circle class="s" pathLength="1" cx="{f(oese[0])}" cy="{f(oese[1])}" r="6"/>',
    strich(f"M{pt(tritt_a)} L{pt(tritt_b)} M{f(tritt_b[0] - 14)} {f(tritt_b[1])} L{f(tritt_b[0] + 14)} {f(tritt_b[1])} M{f(tritt_b[0] - 14)} {f(tritt_b[1] + 3)} L{f(tritt_b[0] + 14)} {f(tritt_b[1] + 3)}"),
]

# 30 Solar: Dachhaken, Schiene, Modul auf der rechten Seite
solar = []
for s in (88, 206):
    a0 = rechts(s, -3)
    a1 = rechts(s, 13)
    a2 = add(a1, v, -5)
    solar.append(strich(f"M{pt(a0)} L{pt(a1)} L{pt(a2)}"))
solar.append(strich(f"M{pt(rechts(64, 13))} L{pt(rechts(232, 13))}"))
m1, m2, m3, m4 = rechts(70, 16), rechts(226, 16), rechts(226, 24), rechts(70, 24)
solar.append(f'<path class="s deckend" pathLength="1" d="M{pt(m1)} L{pt(m2)} L{pt(m3)} L{pt(m4)} Z"/>')
zellen = " ".join(f"M{pt(rechts(s, 16))} L{pt(rechts(s, 24))}" for s in range(83, 226, 13))
solar.append(f'<path class="s duenn" pathLength="1" d="{zellen}"/>')
sonne = (690, 70)
strahlen = " ".join(
    f"M{f(sonne[0] + 16 * math.cos(w))} {f(sonne[1] + 16 * math.sin(w))} L{f(sonne[0] + 23 * math.cos(w))} {f(sonne[1] + 23 * math.sin(w))}"
    for w in [i * math.pi / 4 for i in range(8)])
solar.append(f'<circle class="s" pathLength="1" cx="{sonne[0]}" cy="{sonne[1]}" r="10"/>')
solar.append(f'<path class="s duenn" pathLength="1" d="{strahlen}"/>')

# 10 Dachentwässerung: Rinne, Rinnenhaken, Fallrohr mit Rohrschellen, Tropfen
G = (80.0, 284.0)
r = 15.0
entw = [
    strich(f"M{f(G[0] - r)} {f(G[1])} A{f(r)} {f(r)} 0 0 0 {f(G[0] + r)} {f(G[1])}"),
    f'<circle class="s" pathLength="1" cx="{f(G[0] - r - 2)}" cy="{f(G[1] - 1)}" r="2.6"/>',
    strich(f"M{f(G[0] - r - 4)} {f(G[1] + 1)} A{f(r + 4)} {f(r + 4)} 0 0 0 {f(G[0] + r + 4)} {f(G[1])} L{f(G[0] + r + 4)} 272 L118 262"),
    # Fallrohr: Ablauf, Bogen zur Wand, senkrecht, Auslauf
    strich("M75 299 L75 312 Q75 322 87 330 L99 338 Q105 342 105 350 L105 404 Q105 412 96 414"),
    strich("M85 299 L85 309 Q85 316 93 321 L107 330 Q115 335 115 345 L115 404 Q115 418 100 420"),
]
for y in (362, 394):
    entw.append(strich(f"M102 {y} h16 v6 h-16 Z M118 {y + 3} L124 {y + 3}"))
tropfen = " ".join(f"M{x} {y} q-3 5 0 6 q3 -1 0 -6" for x, y in ((92, 246), (84, 262), (88, 232)))
entw.append(f'<path class="s duenn" pathLength="1" d="{tropfen}"/>')

# 70 Gründach am Anbau rechts
gruen = [
    strich("M580 322 L732 322 L732 420 M580 334 L732 334"),
    strich("M732 322 L732 304 L740 304 L740 420"),
    f'<path class="s strichliert" d="M584 316 L728 316"/>',
    strich("M584 310 Q600 305 616 310 T648 310 T680 310 T712 310 T728 309"),
]
pfl = []
for x in range(592, 726, 15):
    pfl.append(f"M{x} 309 q-2 -9 -7 -12 M{x} 309 q1 -10 5 -14 M{x + 4} 309 q3 -6 8 -7")
gruen.append(f'<path class="s duenn" pathLength="1" d="{" ".join(pfl)}"/>')
gs = " ".join(f"M{x} 334 l8 -12" for x in range(584, 730, 9))
gruen.append(f'<path class="s duenn" pathLength="1" d="{gs}"/>')

# 80 Werkstoffe: Einzelheit A (vergrößerter Schnitt durch einen beschichteten Haken)
DA = (300.0, 362.0)
RA = 50.0
werk = [
    f'<circle class="s strichliert" cx="{f(G[0] + 6)}" cy="{f(G[1] - 2)}" r="21"/>',
    f'<circle class="s" pathLength="1" cx="{f(DA[0])}" cy="{f(DA[1])}" r="{f(RA)}"/>',
    f'<path class="s strichliert duenn" d="M{f(G[0] + 27)} {f(G[1] + 2)} Q190 330 {f(DA[0] - RA + 2)} {f(DA[1] - 6)}"/>',
]
# Bandstahl mit Schraffur, beidseitig beschichtet
x0, x1 = DA[0] - 42, DA[0] + 42
werk.append(strich(f"M{f(x0)} {f(DA[1] - 9)} L{f(x1)} {f(DA[1] - 9)} M{f(x0)} {f(DA[1] + 9)} L{f(x1)} {f(DA[1] + 9)}"))
werk.append(strich(f"M{f(x0)} {f(DA[1] - 14)} L{f(x1)} {f(DA[1] - 14)} M{f(x0)} {f(DA[1] + 14)} L{f(x1)} {f(DA[1] + 14)}"))
hs = " ".join(f"M{f(x)} {f(DA[1] + 9)} l12 -18" for x in range(int(x0) + 2, int(x1) - 10, 7))
werk.append(f'<path class="s duenn" pathLength="1" d="{hs}"/>')
bohr = f'<circle class="s deckend" pathLength="1" cx="{f(DA[0] + 18)}" cy="{f(DA[1])}" r="5"/>'
werk.append(bohr)

# Bezugszeichen: (Nummer, Thema, Zahlposition, Ziel)
bez = [
    (10, "entwaesserung", (30, 330), (G[0] - 8, G[1] + 12)),
    (20, "schneeschutz", (34, 176), links(s20, 22)),
    (30, "solar", (676, 160), rechts(150, 24)),
    (40, "sicherheit", (238, 48), oese),
    (50, "deckung", (452, 82), rechts(270, 7)),
    (60, "zubehoer", (122, 132), links(176, 15)),
    (70, "gruendach", (700, 268), (668, 307)),
    (80, "werkstoffe", (386, 318), (DA[0] + 34, DA[1] - 14)),
]
TEILE = {"entwaesserung": entw, "schneeschutz": schnee, "solar": solar, "sicherheit": sicherheit,
         "deckung": deckung, "zubehoer": fenster, "gruendach": gruen, "werkstoffe": werk}

svg = ['<svg class="fig-zeichnung" viewBox="0 0 760 452" role="group" aria-labelledby="fig1-titel">',
       '<title id="fig1-titel">Fig. 1: Schnitt durch ein Gebäude mit Dach. Die Bezugszeichen führen zu den Themen des Radars.</title>',
       '<g class="bau">' + "".join(bau) + "</g>"]
# Reihenfolge: Deckung zuerst, dann Bauteile darauf
for nummer, thema, zpos, ziel in sorted(bez, key=lambda b: (b[1] != "deckung", b[0])):
    nx, ny = zpos
    # Bezugslinie: leicht geschwungen von der Zahl zum Teil
    sx = nx + (8 if ziel[0] > nx else -8)
    sy = ny - 5
    mx = (sx + ziel[0]) / 2 + (ziel[1] - sy) * 0.18
    my = (sy + ziel[1]) / 2 - (ziel[0] - sx) * 0.18
    linie = f'<path class="s bezug" pathLength="1" d="M{f(sx)} {f(sy)} Q{f(mx)} {f(my)} {f(ziel[0])} {f(ziel[1])}"/>'
    zahl = f'<text class="bz" x="{f(nx)}" y="{f(ny)}" text-anchor="middle">{nummer}</text>'
    svg.append(f'<a class="teil" data-thema="{thema}" href="#/schutzrechte?thema={thema}">'
               f'<g class="teil-strich">{"".join(TEILE[thema])}</g>{linie}{zahl}</a>')
svg.append(f'<text class="bz bz-a" x="{f(G[0] - 30)}" y="{f(G[1] - 18)}">A</text>')
svg.append(f'<text class="bz bz-a" x="{f(DA[0] - RA - 4)}" y="{f(DA[1] + RA + 4)}">A</text>')
svg.append('<text class="fig-titel" x="380" y="448" text-anchor="middle">Fig. 1</text>')
svg.append("</svg>")
HERO = "".join(svg)

# ---------------- Themensymbole (48 × 48) ----------------
THEMA = {
    "entwaesserung": '<path d="M7 17a13 13 0 0 0 26 0"/><circle cx="5.6" cy="15.6" r="1.8"/><path d="M5 18a15 15 0 0 0 30 0V11l6-4"/><path d="M17 30v13M23 30v13" /><path d="M14 5q-2.4 4 0 5q2.4-1 0-5M21 2q-2 3.4 0 4.2q2-.8 0-4.2"/>',
    "schneeschutz": '<path d="M3 41 45 17"/><path d="M15 36.5 8.6 25.5"/><circle cx="8.2" cy="24.6" r="2.6"/><circle cx="11.3" cy="30" r="2.6"/><path d="M19 32q8-10 18-12" stroke-dasharray="2.4 2.4"/><path d="M33 6v8M29 10h8M30.2 7.2l5.6 5.6M30.2 12.8l5.6-5.6"/>',
    "solar": '<path d="M3 43 45 21"/><path d="M14 37.3 11.2 32l3-1.6M32 27.9l-2.8-5.3 3-1.6"/><path d="M8 30.5 38 14.8l3 5.8-30 15.7z"/><path d="M15.5 26.6l3 5.8M23 22.7l3 5.8M30.5 18.8l3 5.8"/>',
    "sicherheit": '<path d="M3 43 45 19"/><path d="M28 30.4 22.3 20.5"/><path d="M24 33h8"/><circle cx="21" cy="17.8" r="3.6"/><path d="M17.6 19.5q-8 4-9 14"/>',
    "deckung": '<path d="M4 14q5 5 10 0q5 5 10 0q5 5 10 0q5 5 10 0"/><path d="M4 25q5 5 10 0q5 5 10 0q5 5 10 0q5 5 10 0"/><path d="M4 36q5 5 10 0q5 5 10 0q5 5 10 0q5 5 10 0"/><path d="M9 19v6M19 19v6M29 19v6M39 19v6M14 30v6M24 30v6M34 30v6"/>',
    "zubehoer": '<path d="M3 41 45 17"/><path d="M11 36.4 9 33l12-6.9 2 3.4z"/><path d="M12.2 32.6l8.6-4.9"/><path d="M33 23.6V8h6v12.2"/><path d="M31 8h10"/>',
    "gruendach": '<path d="M4 30h40M4 35h40M4 40h40"/><path d="M8 40l5-5M16 40l5-5M24 40l5-5M32 40l5-5M40 40l4-4" /><path d="M10 30q-1-7-5-9M10 30q1-8 5-11M22 30q-1-6-4-8M22 30q2-9 6-12M34 30q-1-7-5-9M34 30q1-8 5-10"/>',
    "werkstoffe": '<circle cx="24" cy="24" r="19"/><path d="M8 20h32M8 28h32M9 17.5h30M9 30.5h30"/><path d="M11 28l7-8M17 28l7-8M23 28l7-8M29 28l7-8"/>',
}

# ---------------- Rubriksymbole (56 × 56) ----------------
BLATT = '<path d="M12 5h22l10 10v36H12z"/><path d="M34 5v10h10"/><path d="M18 20h14M18 25h20M18 30h12"/>'
RUBRIK = {
    "erteilungen": BLATT + '<circle cx="35" cy="39" r="6.5"/><circle cx="35" cy="39" r="3"/><path d="M31 44.5 29 53l4-2 2 3 1.4-8.6M39 44.5l2 8.5-3.6-1.6"/>',
    "offenlegungen": BLATT + '<circle cx="34" cy="38" r="6"/><path d="M38.4 42.4 45 49"/>',
    "gebrauchsmuster": BLATT + '<path d="M24.5 35.4 43 32l2.3 12.5-18.5 3.4z"/><path d="M27.5 38l13-2.4 1.3 7-13 2.4z"/>',
    "international": BLATT + '<circle cx="35" cy="40" r="8"/><ellipse cx="35" cy="40" rx="3.6" ry="8"/><path d="M27 40h16M28.6 35.5h12.8M28.6 44.5h12.8"/>',
}

js = ("/* Zeichnungen des Patent-Radars: eigene Strichzeichnungen im Stil von Patentfiguren. */\n"
      "window.PRZ = " + json.dumps({"hero": HERO, "thema": THEMA, "rubrik": RUBRIK}, ensure_ascii=False) + ";\n")
open(ZIEL, "w", encoding="utf-8").write(js)
print(len(js), "Zeichen")
