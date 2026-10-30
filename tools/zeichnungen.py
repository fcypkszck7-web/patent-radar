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
    f'<path class="f" d="M{pt(links(s20 + 6, 2))} L{pt(links(s20 + 6, 8))} Q{pt(links(s20 + 34, 30))} {pt(links(s20 + 76, 9))} L{pt(links(s20 + 76, 2))} Z"/>',
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
    f'<circle class="s deckend" pathLength="1" cx="{f(oese[0])}" cy="{f(oese[1])}" r="6"/>',
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
solar.append(f'<circle class="s deckend" pathLength="1" cx="{sonne[0]}" cy="{sonne[1]}" r="10"/>')
solar.append(f'<path class="s duenn" pathLength="1" d="{strahlen}"/>')

# 10 Dachentwässerung: Rinne, Rinnenhaken, Fallrohr mit Rohrschellen, Tropfen
G = (80.0, 284.0)
r = 15.0
entw = [
    f'<path class="f" d="M{f(G[0] - r + 2)} {f(G[1] + 5)} L{f(G[0] + r - 2)} {f(G[1] + 5)} A{f(r - 1)} {f(r - 1)} 0 0 1 {f(G[0] - r + 2)} {f(G[1] + 5)} Z"/>',
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
    '<path class="f" d="M584 322 L584 310 Q600 305 616 310 T648 310 T680 310 T712 310 T728 309 L728 322 Z"/>',
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
    f'<circle class="f" cx="{f(DA[0])}" cy="{f(DA[1])}" r="{f(RA)}"/>',
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
    (30, "schneeschutz", (34, 176), links(s20, 22)),
    (40, "solar", (676, 160), rechts(150, 24)),
    (20, "sicherheit", (238, 48), oese),
    (80, "deckung", (452, 82), rechts(270, 7)),
    (50, "zubehoer", (122, 132), links(176, 15)),
    (60, "gruendach", (700, 268), (668, 307)),
    (70, "werkstoffe", (386, 318), (DA[0] + 34, DA[1] - 14)),
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

# ---------------- Seitenfiguren für die Kopfbänder (320 × 200) ----------------
def s(d, extra=""):
    # Gestrichelte Linien ohne pathLength, sonst wird das Strichmuster auf die Pfadlänge 1 skaliert
    laenge = "" if "strichliert" in extra else ' pathLength="1"'
    return f'<path class="s{extra}"{laenge} d="{d}"/>'


def farbe(var):
    return f' style="--tf:var({var})"'


def fig(nr, inhalt, label):
    return (f'<svg class="fig-zeichnung fig-seite" viewBox="0 0 320 200" role="img" aria-label="{label}">' + inhalt +
            f'<text class="fig-titel" x="300" y="194" text-anchor="end">Fig. {nr}</text></svg>')


def bogen(cx, cy, r, a0, a1):
    x0, y0 = cx + r * math.cos(math.radians(a0)), cy + r * math.sin(math.radians(a0))
    x1, y1 = cx + r * math.cos(math.radians(a1)), cy + r * math.sin(math.radians(a1))
    gross = 1 if (a1 - a0) % 360 > 180 else 0
    return f"M{f(x0)} {f(y0)}A{f(r)} {f(r)} 0 {gross} 1 {f(x1)} {f(y1)}"


# Fig. 2: vier Schriften als Fächer, je Rubrik ein Blatt mit Kennbuchstaben
BLATT_UMRISS = "M0 0H74L96 22V124H0Z"
def blatt(key, code, x, y, rot, extra, name):
    return (f'<a class="teil blatt" data-rubrik="{key}" href="#/{key}" aria-label="{name}">'
            f'<g transform="translate({x} {y}) rotate({rot} 48 62)"{farbe("--r-" + key)}>'
            f'<path class="deckend" d="{BLATT_UMRISS}"/>' + s(BLATT_UMRISS) + s("M74 0V22H96", " duenn") +
            '<rect class="voll" x="10" y="11" width="32" height="18" rx="3"/>'
            f'<text class="blatt-code" x="26" y="24" text-anchor="middle">{code}</text>' +
            s("M12 42H80M12 51H84M12 60H64M12 74H84M12 83H72M12 92H56", " duenn") + extra + "</g></a>")


SIEGEL = s("M72 104m-11 0a11 11 0 1 0 22 0a11 11 0 1 0-22 0", " akzent") + '<circle class="voll" cx="72" cy="104" r="4.5"/>' + s("M65 113l-4 14 6-3 3 5 2-13M79 113l4 14-6-3-3 5", " akzent")
LUPE = s("M30 104m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0", " akzent") + s("M37.5 111.5 47 121", " akzent dick")
STEMPEL = '<rect class="voll" x="12" y="98" width="34" height="18" rx="2" transform="rotate(-8 29 107)" opacity=".85"/>' + s("M14 122H46", " akzent")
GLOBUS = s("M30 104m-12 0a12 12 0 1 0 24 0a12 12 0 1 0-24 0", " akzent") + s("M30 92c-6 6-6 18 0 24c6-6 6-18 0-24M18 104h24", " akzent duenn")
FIG_SCHUTZRECHTE = fig(2,
    blatt("international", "WO", 26, 54, -11, GLOBUS, "International") +
    blatt("gebrauchsmuster", "U1", 82, 42, -4, STEMPEL, "Gebrauchsmuster") +
    blatt("offenlegungen", "A1", 140, 37, 3, LUPE, "Offenlegungen") +
    blatt("erteilungen", "B1", 197, 44, 10, SIEGEL, "Erteilungen"),
    "Vier Schriften im Fächer: internationale Anmeldung, Gebrauchsmuster, Offenlegung und Patentschrift")

# Fig. 3: Kalenderblatt und Sanduhr
kal = ['<path class="deckend" d="M28 36h150v136H28z"/>', s("M28 36h150v136H28z"), s("M28 60H178"),
       s("M60 28v16M146 28v16", " dick"), '<text class="blatt-titel" x="103" y="53" text-anchor="middle">9 Monate</text>']
markiert = {(0, 3): "--kupfer-band", (1, 1): "--messing-band", (1, 5): "--messing-band", (2, 2): "--messing-band",
            (2, 6): "--patina-band", (3, 0): "--patina-band", (3, 4): "--patina-band", (0, 6): "--patina-band"}
for zeile in range(4):
    for spalte in range(7):
        x, y = 38 + spalte * 20, 70 + zeile * 24
        if (zeile, spalte) in markiert:
            kal.append(f'<rect class="voll" x="{x}" y="{y}" width="14" height="14" rx="3"{farbe(markiert[(zeile, spalte)])}/>')
        else:
            kal.append(f'<rect class="s duenn" pathLength="1" x="{x}" y="{y}" width="14" height="14" rx="3"/>')
uhr = [s("M210 30H290M210 178H290", " dick"), s("M218 30V178M282 30V178", " duenn"),
       s("M228 36C228 80 246 94 246 104C246 114 228 128 228 172M272 36C272 80 254 94 254 104C254 114 272 128 272 172"),
       f'<g{farbe("--messing-band")}><path class="voll" d="M235 62C239 82 248 94 250 100C252 94 261 82 265 62Z"/>'
       '<path class="voll" d="M232 172C236 154 246 147 250 146C254 147 264 154 268 172Z"/>' + s("M250 101V145", " akzent strichliert") + "</g>"]
FIG_FRISTEN = fig(3, "".join(kal) + "".join(uhr), "Kalenderblatt mit markierten Fristtagen und eine Sanduhr")

# Fig. 4: Gebäude der Anmelder mit Dächern aus den Themen des Radars
geb = [s("M12 172H308"),
       # Halle mit Sheddach und Solarmodulen
       '<path class="deckend" d="M24 172V116H124V172Z"/>', s("M24 172V116H124V172"),
       f'<g{farbe("--t-solar")}>' + s("M24 116 24 96 49 116 49 96 74 116 74 96 99 116 99 96 124 116", " akzent") + "</g>",
       s("M34 132h14v12H34zM58 132h14v12H58zM82 132h14v12H82zM104 150h12v22h-12z", " duenn"),
       # Bürogebäude mit Absturzsicherung auf dem Flachdach
       '<path class="deckend" d="M136 172V56H192V172Z"/>', s("M136 172V56H192V172"),
       f'<g{farbe("--t-sicherheit")}>' + s("M136 46H192M140 56V46M154 56V46M168 56V46M182 56V46", " akzent") + "</g>"]
for zeile in range(6):
    for spalte in range(3):
        geb.append(s(f"M{144 + spalte * 16} {66 + zeile * 17}h10v10h-10z", " duenn"))
geb += ['<path class="deckend" d="M210 172V124H284V172Z"/>', s("M210 172V124H284V172"),
        f'<g{farbe("--t-deckung")}>' + s("M200 128 247 88 294 128", " akzent dick") + "</g>",
        f'<g{farbe("--t-solar")}><path class="voll" d="M256 101l14 11.8-9 0-14-11.8z" opacity=".9"/></g>',
        f'<g{farbe("--t-entwaesserung")}>' + s("M198 128a6 6 0 0 0 12 0M204 134V172", " akzent") + "</g>",
        f'<g{farbe("--t-schneeschutz")}>' + s("M226 112l9-7.6M222 108v8", " akzent") + "</g>",
        s("M240 148h14v24h-14zM262 136h14v12h-14z", " duenn")]
FIG_ANMELDER = fig(4, "".join(geb), "Gebäude verschiedener Anmelder mit Dächern, Solarmodulen, Geländer und Dachrinne")

# Fig. 5: Zeitung mit Radarwellen
news = ['<g transform="rotate(5 140 104)"><path class="deckend" d="M70 34h150v142H70z"/>' + s("M70 34h150v142H70z", " duenn") + "</g>",
        '<g transform="rotate(-4 140 104)"><path class="deckend" d="M54 30h150v146H54z"/>' + s("M54 30h150v146H54z") +
        s("M66 46H192", " dick") + s("M66 54H192", " duenn") + s("M66 68H170M66 78H150", " dick") +
        '<path class="deckend" d="M66 90h60v46H66z"/>' + s("M66 90h60v46H66z", " duenn") +
        f'<g{farbe("--t-deckung")}>' + s("M72 120 96 100 120 120", " akzent") + "</g>" +
        f'<g{farbe("--t-solar")}><path class="voll" d="M99 104l9 7.5h-6l-9-7.5z"/></g>' +
        f'<g{farbe("--t-entwaesserung")}>' + s("M69 120a4 4 0 0 0 8 0", " akzent") + "</g>" +
        s("M134 92H192M134 100H186M134 108H192M134 116H178M134 124H192M134 132H170M66 148H192M66 156H180M66 164H150", " duenn") + "</g>"]
news.append(f'<g{farbe("--patina-band")}>' + s(bogen(262, 64, 14, -150, -30), " akzent") + s(bogen(262, 64, 26, -150, -30), " akzent") +
            s(bogen(262, 64, 38, -150, -30), " akzent duenn") + '<circle class="voll" cx="262" cy="64" r="4"/>' + s("M262 68V112", " akzent") + "</g>")
FIG_NEWS = fig(5, "".join(news), "Zeitungsseite mit Dachmotiv und Radarwellen")

# Fig. 6: Klemmbrett mit gestapeltem Säulendiagramm und Ring
ber = ['<path class="deckend" d="M58 30h152v156H58z"/>', s("M58 30h152v156H58z"),
       '<path class="deckend" d="M108 22h52v18h-52z"/>', s("M108 22h52v18h-52z"),
       s("M74 54H170", " dick"), s("M74 64H140", " duenn"), s("M76 164H194")]
saeulen = [[("--t-solar", 18), ("--t-deckung", 12), ("--t-entwaesserung", 8)],
           [("--t-solar", 26), ("--t-zubehoer", 14), ("--t-gruendach", 10)],
           [("--t-deckung", 20), ("--t-sicherheit", 12), ("--t-solar", 16)],
           [("--t-entwaesserung", 14), ("--t-solar", 30), ("--t-zubehoer", 18)],
           [("--t-deckung", 24), ("--t-gruendach", 14), ("--t-solar", 34)]]
for i, saeule in enumerate(saeulen):
    x, basis = 82 + i * 22, 162
    for var, h in saeule:
        ber.append(f'<rect class="voll" x="{x}" y="{basis - h}" width="14" height="{h}" rx="1.5"{farbe(var)}/>')
        basis -= h + 2
teile = [("--t-solar", 0, 140), ("--t-deckung", 144, 230), ("--t-zubehoer", 234, 290), ("--t-entwaesserung", 294, 356)]
for var, a0, a1 in teile:
    ber.append(f'<path class="ring" d="{bogen(262, 104, 30, a0 - 90, a1 - 90)}"{farbe(var)}/>')
ber.append(s("M262 104m-44 0a44 44 0 1 0 88 0a44 44 0 1 0-88 0", " duenn strichliert"))
FIG_BERICHTE = fig(6, "".join(ber), "Klemmbrett mit gestapeltem Säulendiagramm und Ringdiagramm")

# Fig. 7: Aufgeschlagenes Buch mit Lupe und kleinem Zeitstrahl
buch = ['<path class="deckend" d="M160 64C130 50 92 50 52 60V164C92 154 130 154 160 168C190 154 228 154 268 164V60C228 50 190 50 160 64Z"/>',
        s("M160 64C130 50 92 50 52 60V164C92 154 130 154 160 168"), s("M160 64C190 50 228 50 268 60V164C228 154 190 154 160 168"),
        s("M160 64V168", " duenn"), s("M52 164C92 160 130 162 160 174C190 162 228 160 268 164", " duenn"),
        s("M68 76C96 70 126 70 146 78M68 88C96 82 126 82 146 90M68 100C96 94 120 94 146 102M68 112C96 106 126 106 146 114M68 124C90 118 110 118 130 124", " duenn"),
        s("M176 122H252", " duenn")]
for x, var in ((182, "--r-offenlegungen"), (212, "--r-erteilungen"), (242, "--kupfer-band")):
    buch.append(f'<circle class="voll" cx="{x}" cy="122" r="5"{farbe(var)}/>')
buch.append(s("M180 84H232M180 94H250M180 104H222", " duenn"))
buch.append(f'<g{farbe("--patina-band")}>' + s("M236 52m-24 0a24 24 0 1 0 48 0a24 24 0 1 0-48 0", " akzent") + s("M253 69 280 96", " akzent dick") + "</g>")
FIG_HINWEISE = fig(7, "".join(buch), "Aufgeschlagenes Buch mit Zeitstrahl und Lupe")

# Fig. 8: Karteikarten mit Lesezeichen
merk = []
for i, (x, y) in enumerate(((96, 30), (84, 44), (72, 58))):
    merk.append(f'<path class="deckend" d="M{x} {y}h152v112H{x}z"/>' + s(f"M{x} {y}h152v112H{x}z", "" if i == 2 else " duenn"))
merk.append(s("M86 84H176M86 96H196M86 108H160M86 130H200M86 142H180", " duenn"))
merk.append(f'<g{farbe("--patina-band")}><path class="voll" d="M196 52V102L208 92 220 102V52Z"/></g>')
merk.append(f'<g{farbe("--messing-band")}>' + s("M86 70l4 4 8-9", " akzent") + "</g>")
FIG_MERKLISTE = fig(8, "".join(merk), "Karteikarten mit Lesezeichen")

SEITE = {"schutzrechte": FIG_SCHUTZRECHTE, "fristen": FIG_FRISTEN, "anmelder": FIG_ANMELDER, "news": FIG_NEWS,
         "berichte": FIG_BERICHTE, "hinweise": FIG_HINWEISE, "merkliste": FIG_MERKLISTE}

js = ("/* Zeichnungen des Patent-Radars: eigene Strichzeichnungen im Stil von Patentfiguren. */\n"
      "window.PRZ = " + json.dumps({"hero": HERO, "thema": THEMA, "rubrik": RUBRIK, "seite": SEITE}, ensure_ascii=False) + ";\n")
open(ZIEL, "w", encoding="utf-8").write(js)
print(len(js), "Zeichen")
