"""Anmeldernamen zu Firmen bündeln (Schreibweisen, Rechtsformen, Länderzusätze)."""
import re

RECHTSFORM = set("""gmbh mbh ag kg kgaa se ev llc inc ltd limited corp corporation bv nv sas sa sarl spa srl ab as aps oy oyj plc
gesmbh ges sp oo zoo sro co cie und and the of kommanditgesellschaft aktiengesellschaft gesellschaft mit beschraenkter haftung
holding holdings group gruppe international int intl industries industrie ind company cy kft spolka pty ug haftungsbeschraenkt ohg gbr ek
srls sl sau spzoo lda ltda bvba sprl gie snc eurl kk cokg gmbhco kommanditges ab publ asa oü ou""".split())
ZUSATZ = set("""technology technologies tech technik techniek technique systems system systeme solutions products produkte produktions fertigungs
vertriebs vertrieb europe european europa deutschland germany austria oesterreich osterreich schweiz suisse switzerland france italia italy uk usa us
nederland netherlands benelux danmark denmark sverige sweden polska espana iberica china japan america north werk werke manufacturing mfg
innovation innovations innovative services service""".split())
ALLGEMEIN = set("""mounting solar roof roofing dach bau metall metal steel stahl energy power green sonne eco smart home haus house building
construction premium global united general standard nord sued west ost alpha beta nova euro top modern modul profil system technik industrie
werner wagner fischer mueller schmidt schneider weber meyer becker hoffmann schulz koch bauer richter klein wolf neumann schwarz zimmermann
braun krueger hofmann hartmann lange schmitt werner krause meier schmid schulze maier koehler herrmann koenig walter mayer huber kaiser
fuchs peters lang scholz moeller weiss jung hahn schubert vogel friedrich keller guenther frank berger winkler roth beck lorenz baumann
franke albrecht schuster simon ludwig boehm winter kraus martin schumacher kraemer vogt stein jaeger sommer gross seidel heinrich brandt haas
schreiber graf schulte dietrich ziegler kuhn kuehn pohl engel horn busch bergmann thomas voigt sauer arnold wolff pfeiffer""".split())
ORTE_ORGA = set("""univ universitaet universite university universidad universita hochschule technische ecole institut institute inst
china ningbo shanghai beijing jiangsu zhejiang shenzhen guangdong xiamen hangzhou suzhou tianjin van von de der la le nat national state found
foundation research advanced energy power generation engineering construction materials material electric development wirtschaft technik
bureau group korea japan""".split())
# Gleichwertige Zusätze, nur für den Vergleich (nicht für Suchausdrücke)
GLEICH = {"tech": "technology", "technologies": "technology", "technik": "technology", "techniek": "technology",
          "technique": "technology", "system": "systems", "systeme": "systems", "produkte": "products",
          "solution": "solutions", "intl": "international", "internat": "international", "internationale": "international"}
PERSON = re.compile(r"^[A-ZÄÖÜ][\w'\-]+(?: [a-z]{2,3})?, [A-ZÄÖÜ][\w.\- ]+$")


def falten(t):
    t = t.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss"), ("é", "e"), ("è", "e"), ("á", "a"), ("ó", "o"), ("í", "i"), ("ø", "o"), ("å", "a")):
        t = t.replace(a, b)
    return t


def kern(name):
    """Unterscheidende Wörter eines Firmennamens ohne Rechtsform, Länder und Allerweltszusätze."""
    t = falten(name)
    t = re.sub(r"gesellschaft mit beschr(ae|a)nkter haftung", " ", t)
    t = re.sub(r"(?<![a-z0-9])(g\.?\s?m\.?\s?b\.?\s?h|s\.?\s?p\.?\s?a|s\.?\s?r\.?\s?[lo]|b\.?\s?v|n\.?\s?v|s\.?\s?a\.?\s?s|s\.\s?a|s\sa|a\/s|e\.\s?v|e\sv|sp\.? z\.? o\.?\s?o|z\.?\s?o\.?\s?o)(?![a-z0-9])\.?", " ", t)
    w = [x for x in re.split(r"[^a-z0-9]+", t) if x]
    w1 = [x for x in w if x not in RECHTSFORM]
    w2 = [x for x in w1 if x not in ZUSATZ]
    if len(w2) == 1 and len(w1) > 1 and len(w2[0]) < 6:
        return tuple(w1)
    return tuple(w2 or w1 or w)


def vergleich(k):
    return tuple(GLEICH.get(w, w) for w in k)


def gruppieren(namen):
    """namen: Liste von Anmeldernamen. Ergebnis: (firmennamen, index je name)."""
    eltern = list(range(len(namen)))

    def wurzel(i):
        while eltern[i] != i:
            eltern[i] = eltern[eltern[i]]
            i = eltern[i]
        return i

    def eins(a, b):
        a, b = wurzel(a), wurzel(b)
        if a != b:
            eltern[max(a, b)] = min(a, b)

    kerne = [vergleich(kern(n)) for n in namen]
    person = [bool(PERSON.match(n.strip())) for n in namen]
    verschieden = {}
    for i, k in enumerate(kerne):
        if k and not person[i]:
            verschieden.setdefault(k[0], set()).add(k)
    nach_erstem = {}
    for i, k in enumerate(kerne):
        if k and not person[i]:
            nach_erstem.setdefault(k[0], []).append(i)
    for erstes, liste in nach_erstem.items():
        for x in range(len(liste)):
            for y in range(x + 1, len(liste)):
                a, b = kerne[liste[x]], kerne[liste[y]]
                kurz, lang = (a, b) if len(a) <= len(b) else (b, a)
                if a == b:
                    eins(liste[x], liste[y])
                elif (lang[:len(kurz)] == kurz and len("".join(kurz)) >= 5
                      and (len(kurz) > 1 or (len(kurz[0]) >= 6 and kurz[0] not in ALLGEMEIN and len(verschieden[erstes]) <= 3))):
                    eins(liste[x], liste[y])
                elif erstes not in ALLGEMEIN and erstes not in ORTE_ORGA and len(erstes) >= 3:
                    geteilt = {w for w in set(a[1:]) & set(b[1:]) if len(w) >= 6 and w not in ALLGEMEIN and w not in ORTE_ORGA}
                    if geteilt:
                        eins(liste[x], liste[y])
    gruppen = {}
    for i in range(len(namen)):
        gruppen.setdefault(wurzel(i), []).append(i)
    return gruppen, kerne


def anzeige(gruppe, namen, kerne, zahl):
    """Name einer Firmengruppe: bei einer Schreibweise der Name selbst, sonst der gemeinsame Kern
    in der Schreibweise der häufigsten gemischt geschriebenen Variante."""
    if len(gruppe) == 1:
        return namen[gruppe[0]]
    vorlage = sorted(gruppe, key=lambda i: (namen[i] == namen[i].upper(), -zahl.get(i, 0), len(namen[i])))[0]
    gewicht = {i: zahl.get(i, 0) + 1 for i in gruppe}
    summe = sum(gewicht.values())
    basis = kerne[vorlage]
    gemeinsam = list(basis[:1])
    for n in range(len(basis), 0, -1):
        anteil = sum(g for i, g in gewicht.items() if kerne[i][:n] == basis[:n])
        if anteil >= 0.6 * summe:
            gemeinsam = list(basis[:n])
            break
    text = namen[vorlage]
    # Bis zum Ende des letzten gemeinsamen Kernworts schneiden
    pos, gefaltet = 0, falten(text)
    for w in gemeinsam:
        m = re.search(r"(?<![a-z0-9])" + re.escape(w) + r"(?![a-z0-9])", gefaltet[pos:])
        if not m:
            return text
        pos += m.end()
    return text[:pos].strip(" ,-&")


def ist_person(name):
    return bool(PERSON.match((name or "").strip()))


def voll(name):
    """Alle Wörter eines Firmennamens ohne Rechtsform (Zusätze bleiben)."""
    t = falten(name)
    w = [x for x in re.split(r"[^a-z0-9]+", t) if x]
    return tuple(x for x in w if x not in RECHTSFORM) or tuple(w)


def suchkern(name):
    """Kern für die Suche nach einem frei angegebenen Namen: Allerweltswort allein genügt nicht."""
    k = kern(name)
    if len(k) == 1 and k[0] in ALLGEMEIN:
        k = voll(name)
    return k


def passt(gesucht, name):
    """True, wenn der Firmenkern eines Namens mit dem gesuchten Kern beginnt (keine Personen)."""
    if not gesucht or ist_person(name):
        return False
    g = vergleich(tuple(gesucht))
    return vergleich(kern(name))[:len(g)] == g or vergleich(voll(name))[:len(g)] == g


def suchausdruck(gesucht, varianten=()):
    """DEPATISnet-Ausdruck für das Anmelderfeld, z. B. pa=(k2 and systems).
    Wörter mit Umlaut werden in beiden Schreibweisen gesucht."""
    original = {}
    for n in varianten:
        for w in re.split(r"[^\wäöüÄÖÜß]+", n.lower()):
            if w and falten(w) != w:
                original.setdefault(falten(w), w)
    teile = []
    for w in gesucht:
        if len(w) < 2:
            continue
        teile.append(f"({original[w]} or {w})" if w in original else w)
    return "pa=(" + " and ".join(teile) + ")" if teile else None
