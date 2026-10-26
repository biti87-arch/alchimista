"""Legge txt/Alchimista_v2.4.x_FINALE.json (da estrai_testo.py) e scrive alchimista.json.
I controlli in fondo verificano i conteggi: se il manuale cambia struttura, lo script si ferma."""
import json, re, os, sys
R = os.path.dirname(os.path.abspath(__file__))
SRC = [f for f in os.listdir(os.path.join(R, 'txt')) if f.startswith('Alchimista') and f.endswith('.json')]
assert len(SRC) == 1, SRC
P = json.load(open(os.path.join(R, 'txt', SRC[0]), encoding='utf8'))
T = [d['t'].strip() for d in P]
ERR = []

def idx(text, start=0):
    for i in range(start, len(T)):
        if T[i] == text:
            return i
    raise SystemExit('non trovato: ' + text)

def norm(s):
    return s.replace('’', "'").replace(' ', ' ').strip()

# ---------- sezioni ----------
i_tab = idx('Tabella dell’alchimista', 30)
i_priv = idx('Privilegi di classe', i_tab + 7)
i_bombe = idx('Bombe alchemiche', i_priv)
i_mut = idx('Mutageni', i_bombe)
i_vel = idx('Veleni', i_mut)
i_doti = idx('Doti da alchimista', i_vel)
i_arch = idx("Archetipi dell'alchimista", i_doti)

# ---------- tabella di classe ----------
tab = []
cel = T[i_tab + 7:i_priv]
for k in range(0, len(cel), 6):
    r = cel[k:k + 6]
    tab.append({'liv': int(r[0].rstrip('°')), 'bab': r[1], 'tem': r[2], 'rif': r[3], 'vol': r[4],
                'priv': [x.strip() for x in r[5].split(',') if x.strip() and x.strip() != '—']})
assert [t['liv'] for t in tab] == list(range(1, 21)), 'tabella di classe'


def cella(lista, i):
    """aggiunge la cella i alla tabella in coda a lista (raggruppando per riga)."""
    if not lista or not isinstance(lista[-1], dict):
        lista.append({'tab': [], '_r': None})
    tb = lista[-1]
    if tb['_r'] != P[i]['r']:
        tb['tab'].append([]); tb['_r'] = P[i]['r']
    tb['tab'][-1].append(T[i])

def pulisci(lista):
    for x in lista:
        if isinstance(x, dict):
            x.pop('_r', None)
    return lista

# ---------- privilegi ----------
def blocchi(a, b, solo_titoli_neri=False):
    """divide i paragrafi a..b in voci {nome, testo[]} usando i titoli (h)."""
    out = []
    for i in range(a, b):
        d = P[i]
        if not T[i]:
            continue
        if d['h'] and (not solo_titoli_neri or not d['o']):
            out.append({'nome': T[i], 'testo': []})
        elif out:
            out[-1]['testo'].append(T[i])
    return out

priv = blocchi(i_priv + 1, i_bombe)
# scoperte specialistiche
scoperte = {}
for p in priv:
    m = re.match(r'Scoperta specialistica (\w+)$', p['nome'])
    if not m:
        continue
    liv = int(re.search(r'(\d+)°', p['testo'][0]).group(1))
    d = {'liv': liv}
    for r in p['testo'][1:]:
        mm = re.match(r'\*?\s*(Bombarolo|Mutagenista|Tossicologo):\s*(.*)', r)
        if not mm:
            continue
        s = mm.group(2)
        nomi = []
        m1 = re.search(r'ottiene la dote da alchimista ([^,.]+)', s)
        m2 = re.search(r'ottiene le doti da alchimista (.+?) e ([^,.]+)', s)
        if m2:
            nomi = [m2.group(1).strip(), m2.group(2).strip()]
        elif m1:
            nomi = [m1.group(1).strip()]
        d[mm.group(1).lower()] = {'doti': nomi, 'testo': s}
    scoperte[m.group(1)] = d
assert set(scoperte) == {'alpha', 'beta', 'gamma', 'lambda', 'epsilon', 'omega'}, scoperte.keys()

# ---------- bombe ----------
def sezione_regole(a, b):
    out = []
    for i in range(a, b):
        if not T[i] or P[i]['c']:
            continue
        if P[i]['o']:  # sottotitolo arancione (dalla v2.4.2 anche con «mantieni con il successivo»)
            out.append({'nome': T[i], 'testo': []})
        elif out:
            out[-1]['testo'].append(T[i])
        else:
            out.append({'nome': '', 'testo': [T[i]]})
    return out

i_prof = idx('Profilo generico delle bombe alchemiche', i_bombe)
regole_bombe = sezione_regole(i_bombe + 1, i_prof)
profilo = []
k = i_prof + 5
while P[k]['c']:
    lv, dn = T[k], T[k + 1]
    m = re.match(r'(\d+)d(\d+) al bersaglio primario e (\d+) da spargimento', dn)
    if m:
        profilo.append({'liv': int(lv), 'n': int(m.group(1)), 'd': int(m.group(2)), 'spa': int(m.group(3))})
    k += 2
profilo.sort(key=lambda x: x['liv'])
assert [p['liv'] for p in profilo] == list(range(1, 20, 2)), 'profilo bombe'

bombe = []
for i in range(k, i_mut):
    if P[i]['h']:
        m = re.match(r'(.+?)\s+\((.+)\)$', T[i])
        bombe.append({'nome': m.group(1).strip(), 'ingr': m.group(2), 'testo': []})
    elif T[i] and bombe:
        bombe[-1]['testo'].append(T[i])
assert len(bombe) == 10, [b['nome'] for b in bombe]

# ---------- mutageni ----------
i_el = idx('Elenco dei mutageni', i_mut)
regole_mut = sezione_regole(i_mut + 1, i_el)
TIT_LIV = re.compile(r'^[^:]{2,60}?(\s*\[[^\]]+\])?\s*\(Liv\.\s*[\d,\s]+\)$')
TAGM = ('concentrato', 'giornaliero', 'settimanale', 'mensile')

def tags_in(s):
    out = []
    for g in re.findall(r'\[([^\]]+)\]', s):
        for w in g.split(','):
            w = w.strip().lower()
            if w in TAGM:
                out.append(w)
    return out

def durata(s):
    """restituisce {q, u, per} dalla frase 'L'effetto dura ...' (u: round|min|ore|giorni; per: livelli per unità)."""
    s2 = norm(s)
    m = re.search(r"(?:L'effetto dura|dura|durata di|scompaiono dopo)\s+(?:fino a\s+)?(\d+)\s+(round|minut[oi]|or[ae]|giorn[oi])(?:\s+(per livello|ogni (\d+) livelli))?", s2)
    if not m:
        m = re.search(r"\bper (\d+) (round|minut[oi]|or[ae]|giorn[oi])()()\b", s2)
    if not m:
        return None
    q = int(m.group(1))
    u = {'r': 'round', 'm': 'min', 'o': 'ore', 'g': 'giorni'}[m.group(2)[0]]
    per = 0
    if m.group(3):
        per = 1 if m.group(3) == 'per livello' else int(m.group(4))
    return {'q': q, 'u': u, 'per': per}

def leggi_mutageno(nome_h, testi, esclusivo=None):
    m = re.match(r'(.+?)\s*(?:\[([^\]]+)\])?\s*\(Liv\.\s*([\d,\s]+)\)$', nome_h)
    if not m:
        ERR.append('mutageno: ' + nome_h)
        return None
    nome = m.group(1).strip()
    tag0 = [w.strip() for w in (m.group(2) or '').split(',') if w.strip()]
    livelli = [int(x) for x in re.findall(r'\d+', m.group(3))]
    # versioni: paragrafi "1.0: ..." oppure in un unico paragrafo
    corpo = []
    for t in testi:
        parti = re.split(r'(?:(?<=^)|(?<=\s))(\d\.0):\s', t)
        if len(parti) > 1:
            if parti[0].strip():
                corpo.append(('', parti[0].strip()))
            for j in range(1, len(parti), 2):
                corpo.append((parti[j], parti[j + 1].strip()))
        else:
            corpo.append(('', t))
    comune = ' '.join(t for v, t in corpo if not v)
    vv = [(v, t) for v, t in corpo if v]
    if not vv:
        vv = [('', comune)]
        comune = ''
    versioni = []
    for n, (v, t) in enumerate(vv):
        liv = livelli[n] if n < len(livelli) else livelli[-1]
        tg = list(dict.fromkeys(tag0 + tags_in(t)))
        du = durata(t) or (durata(comune) if comune else None)
        if du is None and versioni and re.match(r'Come la versione', t):
            du = versioni[0]['durata']
        versioni.append({'v': v, 'liv': liv, 'testo': t, 'tag': tg, 'durata': du})
    if len(versioni) != len(livelli):
        ERR.append(f'versioni/livelli {nome}: {len(versioni)} vs {livelli}')
    return {'nome': nome, 'livelli': livelli, 'tag': tag0, 'comune': comune, 'versioni': versioni, 'esclusivo': esclusivo}

mutageni = []
cur = None
for i in range(i_el, i_vel):
    if TIT_LIV.match(T[i]) and not P[i]['c']:
        cur = [T[i], []]
        mutageni.append(cur)
    elif cur and T[i] and not P[i]['c']:
        cur[1].append(T[i])
mut = []
for h, tt in mutageni:
    x = leggi_mutageno(h, tt)
    if x:
        mut.append(x)
# Rigenerante: dalla v2.4.2 del manuale è una voce sola con 1.0 e 2.0 (prima erano due voci)

# tabella dei mutageni (per controllo incrociato dei livelli)
tabm = {}
k = i_el + 1
while k < i_vel and (P[k]['c'] or not T[k]):
    k += 1
celle = [(i, T[i]) for i in range(i_el + 1, k) if P[i]['c']]
# ogni blocco di tabella: intestazioni "Livello oggetto N" poi celle per riga
col = []
for i, t in celle:
    m = re.match(r'Livello oggetto (\d+)', t)
    if m:
        if not col or col_chiuse:
            col = []; col_chiuse = False; pos = 0
        col.append(int(m.group(1)))
        continue
    col_chiuse = True
    if t:
        tabm[norm(t)] = col[pos % len(col)]
    pos += 1
for x in mut:
    for v in x['versioni']:
        key = norm(x['nome'] + (' ' + v['v'] if len(x['versioni']) > 1 else ''))
        if key not in tabm and norm(x['nome'] + ' 1.0') in tabm and len(x['versioni']) == 1:
            ERR.append(f'tabella dei mutageni: «{x["nome"]} 1.0» ma la scheda ha una sola versione')
            continue
        if key not in tabm and norm(x['nome']) in tabm and v['v'] == '1.0':
            ERR.append(f'tabella dei mutageni: «{x["nome"]}» senza «1.0»')
            continue
        if key in tabm and tabm[key] != v['liv']:
            ERR.append(f'livello tabella {key}: tabella {tabm[key]} scheda {v["liv"]}')
        if key not in tabm:
            ERR.append(f'non in tabella: {key}')

# ---------- veleni ----------
i_elv = idx('Elenco dei veleni', i_vel)
regole_vel = sezione_regole(i_vel + 1, i_elv)
celle = []
k = i_elv + 1
while P[k]['c']:
    celle.append(T[k]); k += 1
potenza = {}
for j in range(6, len(celle), 3):
    if celle[j] and celle[j + 2]:
        potenza[norm(celle[j + 2])] = (int(celle[j]), int(celle[j + 1]))
veleni = []
for i in range(k, i_doti):
    if TIT_LIV.match(T[i]):
        m = re.match(r'(.+?)\s*\(Liv\.\s*(\d+)\)$', T[i])
        veleni.append({'nome': m.group(1).strip(), 'liv': int(m.group(2)), 'flavor': '', 'tox': None, 'ts': '', 'effetto': ''})
    elif T[i] and veleni:
        v = veleni[-1]
        s = T[i]
        if s.startswith('Modificatore di tossicità:'):
            v['tox'] = int(re.search(r'([+-]?\d+)', s).group(1))
        elif s.startswith('Tiro Salvezza:'):
            v['ts'] = s.split(':', 1)[1].strip().rstrip('.')
        elif s.startswith('Effetto:'):
            v['effetto'] = s.split(':', 1)[1].strip()
        elif not v['effetto']:
            v['flavor'] = s
        else:
            v['effetto'] += '\n' + s
for v in veleni:
    lp = potenza.get(norm(v['nome']))
    if not lp:
        ERR.append('veleno senza potenza: ' + v['nome'])
        continue
    if lp[0] != v['liv']:
        ERR.append(f'livello veleno {v["nome"]}: {lp[0]} vs {v["liv"]}')
    v['pot'] = lp[1]
    if v['tox'] is None:
        ERR.append('tossicità mancante: ' + v['nome'])
missing = set(potenza) - {norm(v["nome"]) for v in veleni}
if missing: ERR.append("veleni senza scheda: " + ", ".join(sorted(missing)))

# ---------- doti ----------
CAT = {'bombe': 'bombe', 'mutageni': 'mutageni', 'veleni': 'veleni'}
def leggi_requisiti(s):
    """requisiti strutturati: alternative [{campo, liv}], doti richieste, altro (testo non interpretato)."""
    req = {'testo': s, 'alt': [], 'doti': [], 'altro': [], 'arch': None, 'no_arch': None, 'n_pot': 0}
    for c in [c.strip() for c in s.rstrip('.').split(';')]:
        if not c:
            continue
        m = re.fullmatch(r'Alchimista (?:(bombarolo|mutagenista|tossicologo) )?di (\d+)° livello(?: o alchimista di (\d+)° livello)?', c)
        if m:
            req['alt'].append({'campo': m.group(1), 'liv': int(m.group(2))})
            if m.group(3):
                req['alt'].append({'campo': None, 'liv': int(m.group(3))})
            continue
        m = re.fullmatch(r'Alchimista (bombarolo|mutagenista|tossicologo)', c)
        if m:
            req['alt'].append({'campo': m.group(1), 'liv': 1}); continue
        m = re.fullmatch(r'Alchimista (bombarolo|mutagenista|tossicologo|) ?di (\d+)° livello\. Non disponibile per l[\'’]archetipo (\w+)', c)
        if m:
            req['alt'].append({'campo': m.group(1) or None, 'liv': int(m.group(2))}); req['no_arch'] = m.group(3); continue
        m = re.fullmatch(r'Alchimista (?:(bombarolo|mutagenista|tossicologo) )?di (\d+)° livello o alchimista di (\d+)° livello\. Non disponibile per l[\'’]archetipo (\w+)', c)
        if m:
            req['alt'] += [{'campo': m.group(1), 'liv': int(m.group(2))}, {'campo': None, 'liv': int(m.group(3))}]
            req['no_arch'] = m.group(4); continue
        m = re.fullmatch(r'(?:Dote da alchimista )?(.+)', c)
        nm = m.group(1).strip().rstrip('.')
        if re.fullmatch(r'Tre doti da alchimista classificate come potenziamento', nm):
            req['n_pot'] = 3; continue
        if nm.lower() in ('mescicure',):
            req['arch'] = 'Mescicure'; continue
        req['doti'].append(nm)
    return req

def leggi_doti(a, b, esclusiva=None, solo_neri=False):
    out = []
    for i in range(a, b):
        if not T[i]:
            continue
        if P[i]['h'] and (P[i]['o'] or solo_neri):
            m = re.match(r'(.+?)\s*(?:\[(modifica|potenziamento)\s*\+(\d)\])?\s*(?:\((bombe|mutageni|veleni)\))?$', T[i])
            out.append({'nome': m.group(1).strip(), 'cat': CAT.get(m.group(4), 'generiche'),
                        'mod': int(m.group(3)) if m.group(2) == 'modifica' else None,
                        'pot': int(m.group(3)) if m.group(2) == 'potenziamento' else None,
                        'req': None, 'testo': [], 'speciale': [], 'eccezione': [], 'multipla': False, 'esclusiva': esclusiva})
        elif out and P[i]['c']:
            cella(out[-1]['testo'], i)
        elif out:
            d = out[-1]
            s = T[i]
            if s.startswith('Requisiti:'):
                d['req'] = leggi_requisiti(s.split(':', 1)[1].strip())
            elif s.startswith('Speciale:'):
                d['speciale'].append(s.split(':', 1)[1].strip())
                if re.search(r'può essere selezionata più volte|fino a due volte', s):
                    d['multipla'] = 2 if 'due volte' in s else True
            elif s.startswith('Eccezione:'):
                d['eccezione'].append(s.split(':', 1)[1].strip())
            else:
                d['testo'].append(s)
    return out

i_d0 = i_doti + 1
regole_doti = []
while not P[i_d0]['h']:
    if T[i_d0]:
        regole_doti.append(T[i_d0])
    i_d0 += 1
doti = leggi_doti(i_d0, i_arch)
# tabelle dentro le doti (Pozione mutagenica): righe di celle -> testo
for d in doti:
    pass

# ---------- archetipi ----------
NOMI_ARCH = ['Alchimista metabolico', 'Sabotatore', 'Toxicator', 'Sherpa', 'Ectochimista', 'Profumiere',
             'Rovochimista', 'Piromane', 'Prometeico', 'Mescicure', 'Alchimista nautico', 'Aerochimista',
             'Batteriologo', 'Acidiere', 'Criochimista', 'Granatiere', 'Fulminatore', 'Detonatore sonico']
pos = []
for i in range(i_arch + 1, len(T)):
    if P[i]['o'] and not P[i]['c'] and T[i] in NOMI_ARCH:
        pos.append(i)
assert [T[i] for i in pos] == NOMI_ARCH, [T[i] for i in pos]
pos.append(len(T))
archetipi = []
mut_escl = []
bombe_escl = []
doti_escl = []
for a, b in zip(pos, pos[1:]):
    nome = T[a]
    ar = {'nome': nome, 'flavor': T[a + 1], 'abilita': '', 'competenze': '', 'voci': [], 'campo': None}
    cur = None
    for i in range(a + 2, b):
        s = T[i]
        if not s:
            continue
        if P[i]['c'] and cur is not None:
            cella(cur['testo'], i)
            continue
        if P[i]['h']:
            cur = {'nome': s, 'testo': [], 'dicitura': ''}
            ar['voci'].append(cur)
        elif cur is None:
            if s.startswith('Abilità di classe:'):
                ar['abilita'] = s.split(':', 1)[1].strip()
            elif s.startswith('Competenze offensive:'):
                ar['competenze'] = s.split(':', 1)[1].strip()
            else:
                ERR.append(f'{nome}: testo fuori voce: {s[:50]}')
        elif re.match(r'Privileg[io]+ di classe (modificat|sostituit)', s):
            cur['dicitura'] = s
        else:
            cur['testo'].append(s)
    # campo obbligato
    for v in ar['voci']:
        pulisci(v['testo'])
        m = re.search(r'deve scegliere (\w+) come campo di ricerca', ' '.join(t for t in v['testo'] if isinstance(t, str)), re.I)
        if v['nome'] == 'Percorso specialistico' and m:
            ar['campo'] = m.group(1).lower()
    # doti sostituite e privilegi sostituiti
    sost = []
    for v in ar['voci']:
        dd = v['dicitura']
        for m in re.finditer(r'Dote da alchimista (?:al|all[\'’]|dell[\'’])\s*([\d°,\s e]+?)\s*livello', dd):
            sost += [int(x) for x in re.findall(r'(\d+)°', m.group(1))]
        for m in re.finditer(r'Scoperta specialistica (\w+)', dd):
            if 'sostituit' in dd:
                ar.setdefault('scoperte_sostituite', []).append(m.group(1))
    ar['doti_sostituite'] = sorted(set(sost))
    # mutageni / bombe / doti esclusive
    voci = []
    for v in ar['voci']:
        if '(Liv' in v['nome'] and not v['dicitura']:
            x = leggi_mutageno(v['nome'], v['testo'], esclusivo=nome)
            if x:
                mut_escl.append(x)
            continue
        if v['nome'] == 'Bomba esclusiva':
            t0, t1 = v['testo'][0], v['testo'][1]
            m = re.match(r'(\w+) \(([^)]+)\)\s*(.*)', t1)
            bombe_escl.append({'nome': m.group(1), 'ingr': m.group(2), 'testo': [m.group(3)], 'esclusiva': nome,
                               'formula': t0})
            v['testo'] = [t0]
        if v['nome'] == 'Dote da alchimista esclusiva':
            pass
        voci.append(v)
    ar['voci'] = voci
    archetipi.append(ar)

# dote esclusiva del Mescicure (titolo nero dentro l'archetipo) e Trappole spinose
for ar in archetipi:
    nuove = []
    for v in ar['voci']:
        m = re.match(r'(.+?)\s*(?:\[(modifica|potenziamento)\s*\+(\d)\])?\s*\((bombe|mutageni|veleni)\)$', v['nome'])
        if m and not v['dicitura']:
            d = {'nome': m.group(1).strip(), 'cat': m.group(4), 'mod': None, 'pot': None, 'req': None, 'testo': [],
                 'speciale': [], 'eccezione': [], 'multipla': False, 'esclusiva': ar['nome']}
            for s in v['testo']:
                if s.startswith('Requisiti:'):
                    d['req'] = leggi_requisiti(s.split(':', 1)[1].strip())
                elif s.startswith('Speciale:'):
                    d['speciale'].append(s.split(':', 1)[1].strip())
                    if 'due volte' in s:
                        d['multipla'] = 2
                else:
                    d['testo'].append(s)
            doti_escl.append(d)
            continue
        nuove.append(v)
    ar['voci'] = nuove

# ---------- tabelle dentro le voci (homunculus, pozione mutagenica) ----------
def tabelle_in(a, b):
    return [T[i] for i in range(a, b) if P[i]['c']]

# ---------- controlli ----------
for d in doti:
    pulisci(d['testo'])
nomi_doti = {d['nome'] for d in doti} | {d['nome'] for d in doti_escl}
for d in doti + doti_escl:
    if d['req']:
        for n in list(d['req']['doti']):
            if n not in nomi_doti:
                d['req']['doti'].remove(n); d['req']['altro'].append(n)
for s, d in scoperte.items():
    for c in ('bombarolo', 'mutagenista', 'tossicologo'):
        for n in d[c]['doti']:
            if n not in nomi_doti:
                ERR.append(f'scoperta {s} {c}: dote sconosciuta {n}')
if len(doti) != 64:
    ERR.append(f'doti: {len(doti)}')
nv = sum(len(x['versioni']) for x in mut)
if nv != len(tabm):
    ERR.append(f'versioni dei mutageni {nv}, voci in tabella {len(tabm)}')
if len(mut_escl) != 6:
    ERR.append(f'mutageni esclusivi: {len(mut_escl)}')
if len(bombe_escl) != 2:
    ERR.append(f'bombe esclusive: {len(bombe_escl)}')
for x in mut:
    if x['nome'] == 'Dei colpi guidati':
        x['versioni'][0]['durata'] = {'q': 3, 'u': 'round', 'per': 0}
ISTANT = {'Curativo', 'Del canto del gallo', 'Del dottor Kramer', 'Dell’infusione elementale', 'Dello smemorato',
          'Dissolvente', 'Liberatore', 'Purificante', 'Riciclante', 'Rigenerante', 'Rinvigorente', 'Ristoratore',
          'Spezza-fattura', 'Dello scatto letale'}
for x in mut + mut_escl:
    for v in x['versioni']:
        if v['durata'] is None and x['nome'] in ISTANT:
            v['istantaneo'] = True
        elif v['durata'] is None:
            ERR.append(f'durata non letta: {x["nome"]} {v["v"]}')

DATI = {
    'fonte': SRC[0][:-5] + '.docx',
    'tabella': tab, 'privilegi': priv, 'scoperte': scoperte,
    'regole': {'bombe': regole_bombe, 'mutageni': regole_mut, 'veleni': regole_vel, 'doti': regole_doti},
    'profilo': profilo, 'bombe': bombe + bombe_escl,
    'mutageni': mut + mut_escl, 'veleni': veleni,
    'doti': doti + doti_escl, 'archetipi': archetipi,
}
json.dump(DATI, open(os.path.join(R, 'alchimista.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('privilegi', len(priv), 'bombe', len(DATI['bombe']), 'mutageni', len(DATI['mutageni']),
      'veleni', len(veleni), 'doti', len(DATI['doti']), 'archetipi', len(archetipi))
if ERR:
    print('SEGNALAZIONI', len(ERR))
    for e in ERR:
        print(' -', e)
