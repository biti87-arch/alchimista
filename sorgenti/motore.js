/* Motore di calcolo dell'app Alchimista (Collana). Funzioni pure su D (dati del manuale) e S (personaggio).
   Usato dalla pagina (incluso da build.py) e dai test (node sorgenti/test_motore.js). */
(function (root) {
'use strict';

const CAMPI = ['bombarolo', 'mutagenista', 'tossicologo'];
const TIPO_CAMPO = { bombarolo: 'B', mutagenista: 'M', tossicologo: 'V' };
const U = { round: 1, min: 10, ore: 600, giorni: 14400 };

/* Configurazione degli archetipi: ciò che il testo del manuale stabilisce e che l'app deve calcolare.
   I testi completi restano quelli del manuale (D.archetipi). */
const ARCH = {
  'Alchimista metabolico': { solo: ['M'], noAltri: true,
    escl: [['M', 'Del dottor Je-Kill', '1.0', 4], ['M', 'Del dottor Je-Kill', '2.0', 6], ['M', 'Del dottor Je-Kill', '3.0', 8], ['M', 'Del dottor Je-Kill', '4.0', 10]] },
  'Sabotatore': { escl: [['M', 'Camaleontico', '1.0', 1], ['M', 'Camaleontico', '2.0', 8]], ladro: true },
  'Toxicator': { furtivo: true,
    contatori: [{ k: 'adrenalina', nome: 'Droghe psicotrope (adrenalina)', da: 1, max: S => Math.max(1, Math.floor(S.liv / 2) + S.int) }] },
  'Sherpa': { bombe: ['Criogenica', 'Folgorante', 'Sonica'], noTipi: ['V'],
    escl: [['M', 'Della montagna', '1.0', 6], ['M', 'Della montagna', '2.0', 8], ['M', 'Della montagna', '3.0', 10], ['M', 'Della montagna', '4.0', 12]],
    soloBase: ['Della montagna'],
    contatori: [{ k: 'tempesta', nome: 'Tempesta in bottiglia', da: 2, max: S => 3 + Math.floor(S.liv / 2) }] },
  'Ectochimista': { escl: [['B', 'Ectoplasmica', 1, 1]],
    contatori: [{ k: 'coprente', nome: 'Coprente ectoplasmatico', da: 1, max: () => 3 },
                { k: 'trappolafantasmi', nome: 'Trappola per fantasmi', da: 6, max: S => 1 + Math.floor((S.liv - 6) / 4) }] },
  'Profumiere': { gassose: true, dotiBonus: [['Pozione come mutageno', 4]],
    contatori: [{ k: 'profumo', nome: 'Profumo irresistibile (1 reagente)', da: 2, max: () => 1 }] },
  'Rovochimista': { escl: [['B', 'Rovospina', 1, 1]], trappoleSpinose: 6 },
  'Piromane': { bombe: ['Incendiaria'], esperto: ['Incendiaria'], potentiSolo: ['Incendiaria'], perf: ['Incendiaria', 'Esplosione ampliata'] },
  'Prometeico': {},
  'Mescicure': { sceltaEsclusione: true, dotiBonus: [['Mutageni curativi affidabili', 1]],
    contatori: [{ k: 'rimescita', nome: 'Ri-mescita curativa', da: 2, max: S => 1 + S.int + 2 * contaDote(S, 'Ri-mescita curativa extra') }] },
  'Alchimista nautico': { escl: [['M', 'Acquatico', '', 1]] },
  'Aerochimista': { escl: [['M', 'Aerostatico', '1.0', 1], ['M', 'Aerostatico', '2.0', 6]] },
  'Batteriologo': { noTipi: ['B'], furtivo: true, escl: [['M', 'Batteriologico', '1.0', 1]], soloBase: ['Batteriologico'] },
  'Acidiere': { bombe: ['Acida'], esperto: ['Acida'], perf: ['Acida', 'Bombe energo-penetranti'] },
  'Criochimista': { bombe: ['Criogenica'], esperto: ['Criogenica'], perf: ['Criogenica', 'Bombe adesive'] },
  'Granatiere': { bombe: ['Lacerante', 'Perforante'], esperto: ['Lacerante', 'Perforante'] },
  'Fulminatore': { bombe: ['Folgorante'], esperto: ['Folgorante'], perf: ['Folgorante', 'Esplosione lineare'],
    contatori: [{ k: 'arco', nome: 'Arco elettrico', da: 1, max: S => Math.max(0, S.int) }] },
  'Detonatore sonico': { bombe: ['Sonica'], esperto: ['Sonica'], perf: ['Sonica', 'Esplosione conica'] },
};
const ROVO_MOD = ['Bombe subacquee', 'Esplosione ampliata', 'Spargimento calcolato', 'Trappole spinose'];
const GASSOSE_NO = ['Bombe subacquee', 'Esplosione ampliata', 'Esplosione lineare', 'Esplosione conica', 'Mega-esplosione'];
const MOD_INCOMP = [['Esplosione ampliata', 'Esplosione lineare'], ['Esplosione ampliata', 'Esplosione conica'], ['Esplosione lineare', 'Esplosione conica']];

let D = null;
function init(dati) { D = dati; }
function arch(S) { return ARCH[S.arch] || {}; }
function cfgArch() { return ARCH; }

/* ---------- utilità ---------- */
const mezzoInt = i => Math.ceil(i / 2);        /* metà bonus di Intelligenza: per eccesso (decisione 13/10) */
function campo(S) { const a = D.archetipi.find(x => x.nome === S.arch); return (a && a.campo) || S.campo; }
function archDati(S) { return D.archetipi.find(x => x.nome === S.arch) || null; }
function dote(nome) { return D.doti.find(d => d.nome === nome) || null; }
function contaDote(S, nome) { return (S.doti || []).filter(n => n === nome).length + (dotiAuto(S).some(d => d.nome === nome) ? 1 : 0); }
function haDote(S, nome) { return contaDote(S, nome) > 0; }

/* doti ottenute automaticamente (scoperte specialistiche del campo e doti bonus dell'archetipo) */
function dotiAuto(S) {
  const out = [];
  const c = campo(S);
  const ad = archDati(S);
  const sost = (ad && ad.scoperte_sostituite) || [];
  if (c) for (const [k, sc] of Object.entries(D.scoperte)) {
    if (S.liv < sc.liv || sost.includes(k)) continue;
    for (const n of sc[c].doti) if (!out.some(x => x.nome === n)) out.push({ nome: n, fonte: 'Scoperta specialistica ' + k + ' (' + sc.liv + '°)' });
  }
  for (const [n, l] of (arch(S).dotiBonus || [])) if (S.liv >= l && !out.some(x => x.nome === n)) out.push({ nome: n, fonte: S.arch + ' (' + l + '°)' });
  if (S.arch === 'Piromane' && !out.some(x => x.nome === 'Bombe potenti')) out.push({ nome: 'Bombe potenti', fonte: 'Miscela infernale (solo incendiarie)' });
  return out;
}

/* ---------- livelli, reagenti, contatori ---------- */
function reagentiGiorno(S) {
  let r = S.liv + (S.liv >= 6 ? S.int : mezzoInt(S.int));
  r += contaDote(S, 'Reagente infuso extra');
  return Math.max(1, r);
}
function inibitoriMax(S) {
  if (arch(S).noAltri) return 0;
  if (haDote(S, 'Agenti inibitori extra')) return Infinity;
  return Math.max(0, 3 + S.int);
}
function slotDoti(S) {
  const ad = archDati(S);
  const sost = (ad && ad.doti_sostituite) || [];
  const out = [];
  for (let l = 2; l <= S.liv; l += 2) if (!sost.includes(l)) out.push(l);
  return out;
}
function contatori(S) {
  const out = [];
  const add = (k, nome, max, nota) => { if (max > 0 || max === Infinity) out.push({ k, nome, max, nota: nota || '' }); };
  add('inibitori', 'Agenti inibitori', inibitoriMax(S), inibitoriMax(S) === Infinity ? 'illimitati (Agenti inibitori extra)' : '3 + Int');
  if (S.liv >= 9) add('bioreazione', 'Bio-reazione', 1, 'cura ' + 2 * S.liv + ' PF prima dei danni');
  if (haDote(S, 'Liquido decatalizzante')) add('decatalizzante', 'Liquido decatalizzante', 1, '2 oggetti di base → 1 reagente');
  if (haDote(S, 'Bombardamento sicuro')) add('bombsicuro', 'Bombardamento sicuro', 2, 'ripeti un 1 naturale');
  if (haDote(S, 'Veleni ultraletali')) add('ultraletali', 'Veleni ultraletali', 2, 'il nemico ripete il TS');
  if (haDote(S, 'Alterazione molecolare')) add('alterazione', 'Alterazione molecolare', 3, 'Tempra ↔ Volontà, CD −2');
  if (haDote(S, 'Fede tossica')) add('fede', 'Fede tossica', 3 * contaDote(S, 'Fede tossica'), '33% di non consumare la dose');
  if (haDote(S, 'Pozione come mutageno')) add('pozione', 'Pozione come mutageno', Math.max(0, S.int), '');
  for (const c of (arch(S).contatori || [])) if (S.liv >= c.da) add(c.k, c.nome, c.max(S), '');
  return out;
}
function attaccoFurtivo(S) { return arch(S).furtivo && S.liv >= 2 ? 1 + Math.floor((S.liv - 2) / 4) : 0; }

/* ---------- requisiti delle doti ---------- */
function requisiti(S, d) {
  const ok = [], no = [], ver = [];
  if (d.esclusiva && d.esclusiva !== S.arch) no.push('solo ' + d.esclusiva);
  const r = d.req;
  if (r) {
    if (r.alt.length) {
      const c = campo(S);
      const sod = r.alt.some(a => (!a.campo || a.campo === c) && S.liv >= a.liv);
      if (!sod) no.push(r.alt.map(a => (a.campo ? 'alchimista ' + a.campo : 'alchimista') + ' di ' + a.liv + '°').join(' o '));
    }
    for (const n of r.doti) if (!haDote(S, n)) no.push('dote ' + n);
    if (r.no_arch && S.arch && S.arch.toLowerCase() === r.no_arch.toLowerCase()) no.push('non per ' + S.arch);
    if (r.arch && S.arch !== r.arch) no.push('solo ' + r.arch);
    if (r.n_pot) { const n = D.doti.filter(x => x.pot != null && haDote(S, x.nome)).length; if (n < r.n_pot) no.push(r.n_pot + ' doti di potenziamento'); }
    for (const a of r.altro) ver.push(a);
  }
  return { ok: !no.length, no, ver };
}
function doteSelezionabile(S, d) {
  const n = contaDote(S, d.nome);
  const max = d.multipla === true ? 99 : (d.multipla || 1);
  return n < max;
}

/* ---------- formulario ---------- */
function chiaveB(tipo, liv) { return 'B|' + tipo + '|' + liv; }
function chiaveM(nome, v) { return 'M|' + nome + '|' + v; }
function chiaveV(nome) { return 'V|' + nome; }
function bomba(nome) { return D.bombe.find(b => b.nome === nome); }
function mutageno(nome) { return D.mutageni.find(m => m.nome === nome); }
function veleno(nome) { return D.veleni.find(v => v.nome === nome); }
function versione(m, v) { return m.versioni.find(x => x.v === v) || m.versioni[0]; }
function nomeFormula(k) {
  const p = k.split('|');
  if (p[0] === 'B') return 'Bomba ' + p[1].toLowerCase() + ' (liv. ' + p[2] + ')';
  if (p[0] === 'M') return p[1] + (p[2] ? ' ' + p[2] : '');
  return p[1];
}
function livFormula(k) {
  const p = k.split('|');
  if (p[0] === 'B') return +p[2];
  if (p[0] === 'M') { const m = mutageno(p[1]); return m ? versione(m, p[2]).liv : 0; }
  const v = veleno(p[1]); return v ? v.liv : 0;
}
function esclusive(S) {
  return (arch(S).escl || []).filter(e => S.liv >= e[3]).map(e => e[0] === 'B' ? chiaveB(e[1], e[2]) : chiaveM(e[1], e[2]));
}
function formulario(S) { return [...new Set([...esclusive(S), ...(S.formule || [])])]; }
function formuleConsentite(S) {
  let n = 8 + 2 * (S.liv - 1);
  const esp = contaDote(S, 'Formulario alchemico espanso');
  for (let i = 0; i < esp; i++) n += ((S.opz && S.opz.espanso && S.opz.espanso[i]) === 2 ? 2 : 1);
  return n;
}
function espertoTipo(S, tipo) { return S.liv >= 4 && (arch(S).esperto || []).includes(tipo); }
function livEffBomba(S, tipo) { return S.liv + (espertoTipo(S, tipo) ? 1 : 0); }
function tipiEsclusi(S) {
  const a = arch(S); const out = new Set(a.noTipi || []);
  if (a.solo) for (const t of ['B', 'M', 'V']) if (!a.solo.includes(t)) out.add(t);
  if (a.sceltaEsclusione && S.opz && S.opz.escludi) out.add(S.opz.escludi);
  return out;
}
function bombeConsentite(S) {
  const a = arch(S);
  const base = D.bombe.filter(b => !b.esclusiva || b.esclusiva === S.arch).map(b => b.nome);
  return a.bombe ? base.filter(n => a.bombe.includes(n) || (bomba(n).esclusiva === S.arch)) : base;
}
function validaFormulario(S) {
  const W = [];
  const F = formulario(S);
  const scelte = (S.formule || []).filter(k => !esclusive(S).includes(k));
  const tot = F.length, max = formuleConsentite(S);
  if (tot > max) W.push(`Formule: ${tot} su ${max} consentite.`);
  const escl = tipiEsclusi(S);
  for (const k of F) {
    const p = k.split('|'), liv = livFormula(k);
    if (escl.has(p[0])) W.push(`${nomeFormula(k)}: il tuo archetipo non può avere formule di questo tipo.`);
    if (p[0] === 'B') {
      if (!bombeConsentite(S).includes(p[1])) W.push(`${nomeFormula(k)}: bomba non consentita.`);
      const lim = livEffBomba(S, p[1]);
      if (liv > lim) W.push(`${nomeFormula(k)}: livello oltre il tuo (${lim}).`);
      if (liv > 1 && !F.includes(chiaveB(p[1], liv - 2))) W.push(`${nomeFormula(k)}: serve prima il livello ${liv - 2}.`);
    } else if (p[0] === 'M') {
      const m = mutageno(p[1]);
      if (m && m.esclusivo && m.esclusivo !== S.arch) W.push(`${nomeFormula(k)}: solo per ${m.esclusivo}.`);
      if (liv > S.liv) W.push(`${nomeFormula(k)}: livello ${liv} oltre il tuo.`);
      if (m) { const i = m.versioni.findIndex(x => x.v === p[2]); if (i > 0 && !F.includes(chiaveM(p[1], m.versioni[i - 1].v))) W.push(`${nomeFormula(k)}: serve prima la versione ${m.versioni[i - 1].v}.`); }
    } else {
      if (liv > S.liv) W.push(`${nomeFormula(k)}: livello ${liv} oltre il tuo.`);
      if (liv >= 3 && !F.some(x => x[0] === 'V' && livFormula(x) <= liv - 2)) W.push(`${nomeFormula(k)}: serve un veleno di livello ${liv - 2} o inferiore.`);
    }
  }
  const c = campo(S);
  if (c) {
    const t = TIPO_CAMPO[c];
    const n = F.filter(k => k[0] === t).length;
    if (n < 2) W.push(`Servono almeno 2 formule del campo di ricerca (${c}): ne hai ${n}.`);
  }
  if (!c) W.push('Scegli il campo di ricerca.');
  void scelte;
  return W;
}
function maxLivBomba(S, tipo) {
  const F = formulario(S); let m = 0;
  for (const k of F) { const p = k.split('|'); if (p[0] === 'B' && p[1] === tipo) m = Math.max(m, +p[2]); }
  return m;
}
function tipiBombePossedute(S) { return [...new Set(formulario(S).filter(k => k[0] === 'B').map(k => k.split('|')[1]))]; }
function maxPotenza(S) {
  let m = 0;
  for (const k of formulario(S)) if (k[0] === 'V') { const v = veleno(k.split('|')[1]); if (v) m = Math.max(m, v.pot); }
  return m;
}

/* ---------- bombe ---------- */
function riga(liv) { const l = Math.max(1, liv % 2 ? liv : liv - 1); return D.profilo.find(r => r.liv === Math.min(19, l)); }
const DADI = [4, 6, 8, 10, 12];
function giuDado(d) { const i = DADI.indexOf(d); return i > 0 ? DADI[i - 1] : d; }
function suDado(d) { const i = DADI.indexOf(d); return i >= 0 && i < DADI.length - 1 ? DADI[i + 1] : d; }
function tipoDanno(b) {
  const t = b.testo.join(' ');
  const m = t.match(/infligge (?:al bersaglio primario )?danni (?:(?:da )?(energia negativa|[a-zàèéìòù]+)(?: e non letali)?)/i);
  if (!m) return '';
  return m[1] + (/danni contundenti e non letali/.test(t) ? ' e non letali' : '');
}
function modificheDisponibili(S, tipo, gassosa) {
  const out = [];
  for (const d of D.doti) if (d.mod != null && haDote(S, d.nome)) out.push({ nome: d.nome, mod: d.mod });
  const a = arch(S);
  if (a.trappoleSpinose && S.liv >= a.trappoleSpinose && tipo === 'Rovospina') out.push({ nome: 'Trappole spinose', mod: 2 });
  let r = out;
  if (tipo === 'Rovospina') r = r.filter(m => ROVO_MOD.includes(m.nome));
  else r = r.filter(m => m.nome !== 'Trappole spinose');
  if (gassosa) r = r.filter(m => !GASSOSE_NO.includes(m.nome));
  const pf = perfezionamento(S, tipo);
  if (pf && !r.some(m => m.nome === pf)) r.push({ nome: pf, mod: (dote(pf) || {}).mod || 0 });
  return r;
}
function perfezionamento(S, tipo) { const p = arch(S).perf; return p && S.liv >= 11 && p[0] === tipo ? p[1] : null; }
function verificaModifiche(S, tipo, mods) {
  const W = [];
  for (const [a, b] of MOD_INCOMP) if (mods.includes(a) && mods.includes(b)) W.push(`${a} e ${b} non si combinano.`);
  const tot = totaleModifica(S, tipo, mods);
  if (tot > 5) W.push(`Modifica totale +${tot}: il massimo è +5.`);
  return W;
}
function totaleModifica(S, tipo, mods) {
  const pf = perfezionamento(S, tipo);
  let t = 0;
  for (const n of mods) { if (n === pf) continue; const d = dote(n); t += n === 'Trappole spinose' ? 2 : (d && d.mod) || 0; }
  return t;
}
function bonusPotenti(S, tipo) {
  if (!haDote(S, 'Bombe potenti')) return 0;
  const a = arch(S);
  if (a.potentiSolo && !a.potentiSolo.includes(tipo)) return 0;
  return Math.max(0, mezzoInt(S.int));
}
function diluiteTipi(S) { return (S.opz && S.opz.diluite) || []; }
function diluiteMax(S) { return haDote(S, 'Bombe diluite') ? (S.liv >= 11 && campo(S) === 'bombarolo' && !(archDati(S) && (archDati(S).scoperte_sostituite || []).includes('lambda')) ? 2 : 1) : 0; }
/* info complete di una bomba: tipo, livello oggetto della formula usata, modifiche, diluita, gassosa */
function bombaInfo(S, tipo, liv, mods, opz) {
  opz = opz || {};
  mods = mods || [];
  const b = bomba(tipo);
  const le = livEffBomba(S, tipo);
  let livOgg = liv;
  if (opz.diluita) livOgg = Math.max(1, Math.floor(maxLivBomba(S, tipo) / 2));
  const tm = opz.diluita ? 0 : totaleModifica(S, tipo, mods);
  const livRid = Math.max(1, livOgg - tm);
  const r = riga(livRid);
  let n = r.n, d = r.d;
  if (tipo === 'Sonica') d = giuDado(d);
  const bp = bonusPotenti(S, tipo);
  let spa = r.spa + bp + (tipo === 'Acida' ? 1 : 0);
  const note = [];
  if (tipo === 'Rovospina') { spa = 0; note.push('Danni perforanti pari a metà del tiro (per difetto) + Bombe potenti per intero; niente spargimento.'); }
  if (mods.includes('Bombe subacquee')) spa = 0;
  const out = { tipo, livFormula: liv, livOgg, livRid, modTot: tm, n, d, bonus: bp, spa, danno: tipoDanno(b), note, cd: [] };
  const cdBase = 10 + Math.floor(S.liv / 2) + S.int;
  if (tipo === 'Sonica') {
    const cd = 10 + Math.floor(livRid / 2) + S.int + (le >= 8 ? 1 : 0) + (le >= 16 ? 1 : 0) + (mods.includes('Bombe debilitanti') ? 0 : 0);
    out.cd.push({ nome: 'Tempra contro assordato', cd });
  }
  if (tipo === 'Criogenica' && le >= 10) note.push('Dal 10° livello: il bersaglio ferito nel suo prossimo turno può fare solo passi di 1,5 m come azione di movimento.');
  if (tipo === 'Rovospina') {
    const cd = 10 + Math.floor(livRid / 2) + S.int + (S.arch === 'Rovochimista' && S.liv >= 12 ? 2 : 0);
    out.cd.push({ nome: 'Riflessi (rovi), prova di Forza per liberarsi', cd });
    if (S.arch === 'Rovochimista' && S.liv >= 8) note.push(`Rovi laceranti: ${S.liv >= 18 ? 4 : S.liv >= 14 ? 3 : S.liv >= 10 ? 2 : 1}d6 perforanti a inizio turno a chi è nei rovi.`);
    out.durataRovi = Math.max(1, S.int);
  }
  if (mods.some(m => /^Bombe debilitanti/.test(m)) || haDote(S, 'Bombe debilitanti')) {
    if (mods.includes('Bombe debilitanti')) out.cd.push({ nome: 'Tempra contro Bombe debilitanti', cd: cdBase + (tipo === 'Sonica' ? 2 : 0) });
  }
  if (mods.includes('Mega-esplosione')) out.cd.push({ nome: 'Riflessi dimezza (Mega-esplosione)', cd: cdBase });
  if (S.arch === 'Ectochimista' && S.liv >= 6) out.cdTrappola = 10 + S.liv + S.int;
  const pf = perfezionamento(S, tipo);
  if (pf && mods.includes(pf)) note.push(`${pf} gratuita (Perfezionamento specialistico).`);
  return out;
}
/* ripetizioni dei risultati bassi */
function ripetiBomba(S, tipo, bersaglio) {
  let rip = 0;
  if (tipo === 'Warp' && bersaglio === 'esterni') rip = 1;
  if (tipo === 'Essiccante' && bersaglio === 'acquatici') rip = 2;
  if (tipo === 'Resinosa' && bersaglio === 'costrutti') rip = 2;
  if (tipo === 'Ectoplasmica') rip = bersaglio === 'nonmorti' ? 2 : 1;
  if (S.arch === 'Piromane' && tipo === 'Incendiaria') rip = Math.max(rip, 1);
  return rip;
}
function bersagliBomba(tipo) {
  return { Warp: [['', 'qualsiasi'], ['esterni', 'esterni']], Essiccante: [['', 'qualsiasi'], ['acquatici', 'acquatici, vegetali, melme']],
    Resinosa: [['', 'qualsiasi'], ['costrutti', 'costrutti']], Ectoplasmica: [['', 'viventi'], ['nonmorti', 'non morti']] }[tipo] || [['', 'qualsiasi']];
}
function tiraBomba(S, info, bersaglio, rnd) {
  rnd = rnd || Math.random;
  let d = info.d;
  if (info.tipo === 'Warp' && bersaglio === 'esterni') d = info.d === 12 ? 12 : suDado(info.d);
  const rip = ripetiBomba(S, info.tipo, bersaglio);
  const dadi = [];
  for (let i = 0; i < info.n; i++) {
    let x = 1 + Math.floor(rnd() * d);
    if (x <= rip) x = 1 + Math.floor(rnd() * d);
    dadi.push(x);
  }
  let somma = dadi.reduce((a, b) => a + b, 0);
  if (info.tipo === 'Rovospina') somma = Math.floor(somma / 2);
  const totale = somma + info.bonus;
  return { dadi, d, rip, totale, spa: info.spa };
}

/* ---------- mutageni ---------- */
function livMutageni(S) { return S.liv + (haDote(S, 'Studi mutagenici avanzati') ? 1 : 0); }
function concentrato(S, nome, v) {
  const m = mutageno(nome); if (!m) return false;
  const ver = versione(m, v);
  return ver.tag.includes('concentrato') || ((S.opz && S.opz.nuovoConc) === chiaveM(nome, v));
}
function maxFruitori(S) {
  if (haDote(S, 'Mutageni concentrati superiori')) return campo(S) === 'mutagenista' ? 4 : 3;
  return 2;
}
function durataRound(S, du) {
  if (!du) return 0;
  const L = livMutageni(S);
  let q = du.q;
  if (du.per === 1) q = du.q * L;
  else if (du.per > 1) q = du.q * Math.max(1, Math.floor(L / du.per));
  return q * U[du.u];
}
function dividi(tot, n) { return Math.max(1, Math.floor(tot / Math.max(1, n))); }
/* formatta una durata in round mantenendo l'unità d'origine (decisione 13/10) */
function fmtDurata(r, unit) {
  if (r <= 0) return '—';
  const parti = [];
  if (unit === 'giorni') { const g = Math.floor(r / 14400); if (g) parti.push(g + (g === 1 ? ' giorno' : ' giorni')); r -= g * 14400; unit = 'ore'; }
  if (unit === 'ore') { const h = Math.floor(r / 600); if (h) parti.push(h + ' h'); r -= h * 600; unit = 'min'; }
  if (unit === 'min') { const m = Math.floor(r / 10); if (m) parti.push(m + ' min'); r -= m * 10; }
  if (r) parti.push(r + ' round');
  if (parti.length > 1 && /round$/.test(parti[parti.length - 1])) { const ultimo = parti.pop(); return parti.join(' ') + ' e ' + ultimo; }
  return parti.join(' ');
}
function mutagenoInfo(S, nome, v) {
  const m = mutageno(nome); const ver = versione(m, v);
  const tot = durataRound(S, ver.durata);
  const testo = (m.comune ? m.comune + ' ' : '') + ver.testo;
  const conc = concentrato(S, nome, ver.v);
  const freq = ver.tag.find(t => ['giornaliero', 'settimanale', 'mensile'].includes(t)) || '';
  const soloSe = /Solo (?:un|uno|una) [\wà ]+ può inocularsi/.test(m.versioni.map(x => x.testo).join(' ') + ' ' + (m.comune || '')) || !!m.esclusivo;
  const soloAnimali = /esclusivamente agli animali/.test(testo);
  return { nome, v: ver.v, liv: ver.liv, testo, tag: ver.tag, conc, freq, durata: ver.durata, totRound: tot,
    unit: ver.durata ? ver.durata.u : null, istantaneo: !ver.durata, maxFruitori: conc ? maxFruitori(S) : 1,
    soloSe: soloSe || !!arch(S).noAltri, soloAnimali, cura: curaInfo(S, testo) };
}
/* formule di cura nei testi dei mutageni */
function curaInfo(S, testo) {
  const L = livMutageni(S);
  let m = testo.match(/cur\w+[^.]*?(\d+)d(\d+)\s*(?:danni\s*)?\+\s*1\s*(?:danni\s*)?per livello(?:\s*\(massimo \+(\d+)\))?/);
  if (m) return { n: +m[1], d: +m[2], fisso: m[3] ? Math.min(L, +m[3]) : L };
  m = testo.match(/cur\w+[^.]*?(\d+) danni per livello \(massimo (\d+)\)/);
  if (m) return { n: 0, d: 0, fisso: Math.min(+m[1] * L, +m[2]) };
  m = testo.match(/cur\w+[^.]*?(\d+)d(\d+)(?:\s*\+\s*(\d+))? danni/);
  if (m) return { n: +m[1], d: +m[2], fisso: m[3] ? +m[3] : 0 };
  m = testo.match(/cura (?:il fruitore )?di (\d+) danni/);
  if (m) return { n: 0, d: 0, fisso: +m[1] };
  return null;
}
function tiraCura(S, c, rnd) {
  rnd = rnd || Math.random;
  const rip = haDote(S, 'Mutageni curativi miracolosi') ? 2 : haDote(S, 'Mutageni curativi affidabili') ? 1 : 0;
  const dadi = [];
  for (let i = 0; i < c.n; i++) { let x = 1 + Math.floor(rnd() * c.d); while (x <= rip) x = 1 + Math.floor(rnd() * c.d); dadi.push(x); }
  return { dadi, rip, totale: dadi.reduce((a, b) => a + b, 0) + c.fisso };
}

/* ---------- veleni ---------- */
function cdVeleno(S, v, alterato) {
  return 10 + v.tox + S.int + (haDote(S, 'Tossicità aumentata') ? 1 : 0) + (haDote(S, 'Tossicità aumentata superiore') ? 1 : 0) - (alterato ? 2 : 0);
}
function tsVeleno(v, alterato) {
  if (!alterato) return v.ts;
  if (/^Tempra/.test(v.ts)) return 'Volontà';
  if (/^Volontà/.test(v.ts)) return 'Tempra';
  return v.ts;
}
function potenziamentiDisponibili(S) {
  return D.doti.filter(d => d.pot != null && haDote(S, d.nome) && requisiti(S, d).ok).map(d => ({ nome: d.nome, pot: d.pot }));
}
function verificaPotenziamenti(S, nomeVel, pots) {
  const v = veleno(nomeVel); const W = [];
  const vals = pots.map(n => (dote(n) || {}).pot || 0);
  let somma = vals.reduce((a, b) => a + b, 0);
  const perfetto = S.opz && S.opz.vperfetto === nomeVel && haDote(S, 'Veleno perfetto') && vals.length;
  if (perfetto) { if (v.pot + somma > 9) W.push(`Potenza risultante ${v.pot + somma}: con Veleno perfetto il massimo è 9.`); somma -= Math.max(...vals); }
  const max = maxPotenza(S);
  if (v.pot + somma > max) W.push(`Potenza ${v.pot} + ${somma} = ${v.pot + somma}: supera la potenza massima del tuo formulario (${max}).`);
  return W;
}
function permanenzaVeleno(S) {
  if (haDote(S, 'Veleno durevole')) return campo(S) === 'tossicologo' ? 24 : 12;
  return 6;
}

/* ---------- moltiplicatori dell'alchimia di base ---------- */
function esemplari(S, k, opz) {
  opz = opz || {};
  const t = k[0];
  if (t === 'B') return haDote(S, 'Bombe a go-go') ? 3 : 2;
  if (t === 'M') {
    if (opz.cocktail) return 1;
    return ((S.opz && S.opz.economici) || []).includes(k) && haDote(S, 'Mutageni economici') ? 3 : 2;
  }
  if (t === 'V') {
    const p = opz.pot || [];
    if (!p.length) return 2;
    if (p.length === 1 && p[0] === 'Veleni miscelabili') return 2;
    return 1;
  }
  return 1;
}
function soloBase(S, k) {
  const p = k.split('|');
  return (arch(S).soloBase || []).includes(p[1]);
}

/* ---------- dadi ---------- */
function tira(n, d, rnd) { rnd = rnd || Math.random; let t = 0; for (let i = 0; i < n; i++) t += 1 + Math.floor(rnd() * d); return t; }

const API = { init, CAMPI, U, ARCH: cfgArch, campo, arch, archDati, dote, contaDote, haDote, dotiAuto, reagentiGiorno, inibitoriMax,
  slotDoti, contatori, attaccoFurtivo, requisiti, doteSelezionabile, chiaveB, chiaveM, chiaveV, bomba, mutageno, veleno, versione,
  nomeFormula, livFormula, esclusive, formulario, formuleConsentite, espertoTipo, livEffBomba, tipiEsclusi, bombeConsentite,
  validaFormulario, maxLivBomba, tipiBombePossedute, maxPotenza, riga, tipoDanno, modificheDisponibili, perfezionamento,
  verificaModifiche, totaleModifica, bonusPotenti, diluiteTipi, diluiteMax, bombaInfo, bersagliBomba, tiraBomba, livMutageni,
  concentrato, maxFruitori, durataRound, dividi, fmtDurata, mutagenoInfo, curaInfo, tiraCura, cdVeleno, tsVeleno,
  potenziamentiDisponibili, verificaPotenziamenti, permanenzaVeleno, esemplari, soloBase, tira, mezzoInt };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else root.M = API;
})(typeof window !== 'undefined' ? window : this);
