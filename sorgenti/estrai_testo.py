"""Estrae i paragrafi dai .docx in docx/:
- txt/<nome>.txt: una riga per paragrafo (per leggere e confrontare)
- txt/<nome>.json: paragrafi con i flag di formattazione usati dal parser
  t = testo, h = titolo (keepNext + prima parte in grassetto), o = titolo arancione (#C45911),
  c = paragrafo dentro una tabella (r = numero della riga), l = voce di elenco puntato."""
import zipfile, re, html, os, json
R = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(R, 'txt'), exist_ok=True)

def testo(p):
    return html.unescape(''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p)))

def runs(p):
    return [r for r in re.findall(r'<w:r[ >].*?</w:r>', p, re.S) if re.search(r'<w:t[^>]*>[^<]', r)]

def grassetto(r):
    return bool(re.search(r'<w:b/>|<w:b w:val="(true|1)"/>', r))

for f in sorted(os.listdir(os.path.join(R, 'docx'))):
    if not f.endswith('.docx'):
        continue
    x = zipfile.ZipFile(os.path.join(R, 'docx', f)).read('word/document.xml').decode()
    body = x[x.index('<w:body>'):]
    # posizioni delle celle di tabella
    celle = [(m.start(), m.end()) for m in re.finditer(r'<w:tc>.*?</w:tc>', body, re.S)]
    righe = [(m.start(), m.end()) for m in re.finditer(r'<w:tr[ >].*?</w:tr>', body, re.S)]
    out = []
    for m in re.finditer(r'<w:p[ >].*?</w:p>', body, re.S):
        p = m.group(0)
        t = testo(p)
        rr = runs(p)
        ppr = re.search(r'<w:pPr>.*?</w:pPr>', p, re.S)
        ppr = ppr.group(0) if ppr else ''
        kn = '<w:keepNext' in ppr and 'w:val="false"' not in re.search(r'<w:keepNext[^>]*>', ppr).group(0) if '<w:keepNext' in ppr else False
        h = bool(kn and rr and grassetto(rr[0]))
        o = bool(rr and 'C45911' in rr[0])
        c = any(a <= m.start() < b for a, b in celle)
        l = '<w:numPr>' in ppr
        d = {'t': t, 'h': h, 'o': o, 'c': c, 'l': l}
        if c:
            d['r'] = next(n for n, (a, b) in enumerate(righe) if a <= m.start() < b)
        out.append(d)
    base = os.path.join(R, 'txt', f[:-5])
    open(base + '.txt', 'w', encoding='utf8').write('\n'.join(d['t'] for d in out))
    json.dump(out, open(base + '.json', 'w', encoding='utf8'), ensure_ascii=False)
    print(f, len(out), 'titoli', sum(d['h'] for d in out))
