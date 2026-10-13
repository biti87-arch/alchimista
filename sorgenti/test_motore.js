/* Test del motore: node sorgenti/test_motore.js (stampa solo errori e conteggi) */
const M = require('./motore.js');
const D = require('./alchimista.json');
M.init(D);
let ok = 0, ko = 0;
function eq(a, b, msg) { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { ko++; console.log('ERRORE', msg, '→', JSON.stringify(a), 'atteso', JSON.stringify(b)); } }
const S = o => Object.assign({ liv: 1, int: 3, campo: 'bombarolo', arch: '', doti: [], formule: [], opz: {} }, o);

// reagenti: metà Int per eccesso fino al 5°, Int pieno dal 6°
eq(M.reagentiGiorno(S({ liv: 3, int: 3 })), 5, 'reagenti 3° Int+3');
eq(M.reagentiGiorno(S({ liv: 5, int: 4 })), 7, 'reagenti 5° Int+4');
eq(M.reagentiGiorno(S({ liv: 6, int: 4 })), 10, 'reagenti 6° Int+4');
eq(M.reagentiGiorno(S({ liv: 8, int: 4, doti: ['Reagente infuso extra'] })), 13, 'reagenti con dote');
eq(M.reagentiGiorno(S({ liv: 1, int: -3 })), 1, 'reagenti minimo 1');

// durate divise mantenendo l'unità
eq(M.fmtDurata(M.dividi(7 * 600, 2), 'ore'), '3 h 30 min', '7 ore fra 2');
eq(M.fmtDurata(M.dividi(7 * 600, 3), 'ore'), '2 h 20 min', '7 ore fra 3');
eq(M.fmtDurata(M.dividi(5 * 10, 2), 'min'), '2 min e 5 round', '5 minuti fra 2');
eq(M.fmtDurata(M.dividi(6, 4), 'round'), '1 round', '6 round fra 4');
eq(M.fmtDurata(M.dividi(3, 4), 'round'), '1 round', 'minimo 1 round');

// durata dei mutageni con Studi mutagenici avanzati (mutagenista 3°: +1)
const sm = S({ liv: 5, campo: 'mutagenista' });
eq(M.mutagenoInfo(sm, 'Antitossina', '2.0').totRound, 6 * 600, 'Antitossina 2.0 al 5° con Studi = 6 ore');
eq(M.mutagenoInfo(sm, 'Antitossina', '2.0').conc, true, 'Antitossina 2.0 concentrato');
eq(M.mutagenoInfo(sm, 'Dell’istrice', '').totRound, 3, 'Istrice: 1 round ogni 2 livelli, L=6 → 3');
eq(M.maxFruitori(S({ liv: 11, campo: 'mutagenista' })), 4, 'mutagenista 11° → 4 fruitori');
eq(M.maxFruitori(S({ liv: 14, campo: 'bombarolo', doti: ['Mutageni concentrati superiori'] })), 3, 'altro campo con dote → 3');

// bombe: livello ridotto dalle modifiche → riga dispari pari o inferiore
const sb = S({ liv: 10, int: 4, doti: ['Bombe adesive', 'Esplosione ampliata'], formule: ['B|Acida|1', 'B|Acida|3', 'B|Acida|5', 'B|Acida|7'] });
let b = M.bombaInfo(sb, 'Acida', 7, ['Bombe adesive', 'Esplosione ampliata']);
eq([b.livRid, b.n, b.d], [5, 4, 8], 'Acida 7 con +2 → livello 5, 4d8');
eq(b.bonus, 2, 'Bombe potenti = metà Int per eccesso (+4 → 2)');
eq(b.spa, 3 + 2 + 1, 'spargimento acida: 3 + potenti 2 + 1');
b = M.bombaInfo(S({ liv: 10, int: 3 }), 'Acida', 7, ['Bombe adesive']);
eq([b.livRid, b.n, b.d], [6, 4, 8], 'livello 6 → riga 5');
// Sonica: dado ridotto e CD con livello ridotto
const ss = S({ liv: 9, int: 3, formule: ['B|Sonica|1', 'B|Sonica|3', 'B|Sonica|5', 'B|Sonica|7', 'B|Sonica|9'] });
b = M.bombaInfo(ss, 'Sonica', 9, []);
eq([b.n, b.d], [5, 10], 'Sonica 9: 5d12 → 5d10');
eq(b.cd[0].cd, 10 + 4 + 3 + 1, 'CD Sonica 9 al 9°');
// diluite: metà del livello massimo, riga dispari inferiore
b = M.bombaInfo(S({ liv: 10, int: 3, formule: ['B|Incendiaria|1', 'B|Incendiaria|3', 'B|Incendiaria|5', 'B|Incendiaria|7', 'B|Incendiaria|9'] }), 'Incendiaria', 9, [], { diluita: true });
eq([b.livOgg, b.n, b.d], [4, 3, 8], 'diluita da 9 → 4 → riga 3');
// esperto: +1 per la formula
eq(M.livEffBomba(S({ liv: 4, arch: 'Acidiere', campo: 'bombarolo' }), 'Acida'), 5, 'Esperto corrosivo');
// Rovospina: metà danni, niente spargimento
const sr = S({ liv: 6, int: 4, arch: 'Rovochimista' });
b = M.bombaInfo(sr, 'Rovospina', 5, []);
eq([b.spa, b.cd[0].cd], [0, 10 + 2 + 4], 'Rovospina 5');
eq(M.bombaInfo(sr, 'Rovospina', 7, ['Bombe subacquee']).cd[0].cd, 10 + 3 + 4, 'Rovospina 7 con +1: CD sul livello 6');
eq(M.tiraBomba(sr, b, '', () => 0.999).totale, Math.floor(32 / 2) + 2, 'Rovospina tiro massimo 4d8 → 16 + 2');
eq(M.modificheDisponibili(S({ liv: 6, arch: 'Rovochimista', doti: ['Bombe adesive', 'Bombe subacquee'] }), 'Rovospina').map(x => x.nome), ['Bombe subacquee', 'Trappole spinose'], 'modifiche ammesse sulla Rovospina');
// perfezionamento: modifica gratuita
const sa = S({ liv: 11, arch: 'Acidiere', doti: [] });
eq(M.totaleModifica(sa, 'Acida', ['Bombe energo-penetranti']), 0, 'Bombe energo-penetranti gratuita per l’acidiere');

// doti automatiche e requisiti
eq(M.dotiAuto(S({ liv: 5, campo: 'tossicologo' })).map(d => d.nome), ['Avvelenamento rapido', 'Miscelazione tossica', 'Attacco venefico concentrato', 'Veleno durevole'], 'scoperte tossicologo 5°');
eq(M.dotiAuto(S({ liv: 5, arch: 'Toxicator' })).map(d => d.nome), ['Attacco venefico concentrato', 'Veleno durevole'], 'Toxicator senza alpha');
eq(M.requisiti(S({ liv: 6, campo: 'mutagenista' }), M.dote('Bombe potenti')).ok, true, 'Bombe potenti alchimista 6°');
eq(M.requisiti(S({ liv: 5, campo: 'mutagenista' }), M.dote('Bombe potenti')).ok, false, 'Bombe potenti mutagenista 5°');
eq(M.requisiti(S({ liv: 10, arch: 'Profumiere' }), M.dote('Lancio mutagenico')).ok, false, 'Lancio mutagenico vietato al profumiere');
eq(M.slotDoti(S({ liv: 20, arch: 'Toxicator' })), [4, 8, 12, 16, 20], 'slot del Toxicator');
eq(M.slotDoti(S({ liv: 12, arch: 'Rovochimista' })), [10], 'slot del Rovochimista');

// formulario
eq(M.formuleConsentite(S({ liv: 5 })), 16, 'formule al 5°');
eq(M.formuleConsentite(S({ liv: 5, doti: ['Formulario alchemico espanso', 'Formulario alchemico espanso'], opz: { espanso: [1, 2] } })), 19, 'formulario espanso');
let W = M.validaFormulario(S({ liv: 3, formule: ['B|Acida|3', 'V|Cuore di Finkert', 'V|Bacio dello spettro'] }));
eq(W.some(w => /serve prima il livello 1/.test(w)), true, 'progressione bombe');
W = M.validaFormulario(S({ liv: 3, campo: 'tossicologo', formule: ['V|Cuore di Finkert', 'V|Bacio dello spettro'] }));
eq(W.some(w => /Bacio dello spettro: serve un veleno di livello 1/.test(w)), true, 'veleno 3 richiede un veleno di livello ≤1');
eq(M.esclusive(S({ liv: 8, arch: 'Sabotatore' })), ['M|Camaleontico|1.0', 'M|Camaleontico|2.0'], 'esclusive del sabotatore');

// veleni
const sv = S({ liv: 10, int: 4, campo: 'tossicologo', doti: ['Tossicità aumentata'], formule: ['V|Rosa pallida'] });
eq(M.cdVeleno(sv, M.veleno('Rosa pallida')), 10 + 5 + 4 + 1, 'CD Rosa pallida');
eq(M.permanenzaVeleno(sv), 24, 'Veleno durevole del tossicologo');
eq(M.verificaPotenziamenti(sv, 'Rosa pallida', ['Veleni estesi']).length, 1, 'tetto di potenza superato');
eq(M.esemplari(sv, 'V|Rosa pallida', { pot: ['Veleni miscelabili'] }), 2, 'miscelabili: 2 dosi');
eq(M.esemplari(sv, 'V|Rosa pallida', { pot: ['Veleni estesi'] }), 1, 'potenziato: 1 dose');

// cure
const c = M.curaInfo(S({ liv: 3, campo: 'bombarolo' }), M.mutagenoInfo(S({ liv: 3 }), 'Curativo', '1.0').testo);
eq(c, { n: 1, d: 8, fisso: 3 }, 'Curativo 1.0 al 3°');
eq(M.curaInfo(S({ liv: 20 }), M.mutagenoInfo(S({ liv: 20 }), 'Curativo', '5.0').testo), { n: 0, d: 0, fisso: 150 }, 'Curativo 5.0 al 20° (massimo 150)');

// contatori
eq(M.contatori(S({ liv: 9, int: 3, arch: 'Fulminatore' })).map(x => x.k), ['inibitori', 'bioreazione', 'arco'], 'contatori fulminatore 9°');
eq(M.attaccoFurtivo(S({ liv: 18, arch: 'Toxicator' })), 5, 'attacco furtivo 18°');

// tutti i mutageni, bombe e veleni si calcolano senza errori a tutti i livelli
let n = 0;
for (let liv = 1; liv <= 20; liv++) {
  const s = S({ liv, int: 4, campo: 'mutagenista' });
  for (const m of D.mutageni) for (const v of m.versioni) { const i = M.mutagenoInfo(s, m.nome, v.v); if (!i.istantaneo && !(i.totRound > 0)) { ko++; console.log('durata', m.nome, v.v); } n++; }
  for (const b2 of D.bombe) for (let l = 1; l <= 19; l += 2) { const i = M.bombaInfo(s, b2.nome, l, []); if (!(i.n > 0 && i.d > 0)) { ko++; console.log('bomba', b2.nome, l); } n++; }
  for (const v of D.veleni) { if (!(M.cdVeleno(s, v) > 10)) { ko++; console.log('veleno', v.nome); } n++; }
}
for (const b2 of D.bombe) if (!M.tipoDanno(b2)) { ko++; console.log('tipo di danno non letto:', b2.nome); }
console.log(`test: ${ok} ok, ${ko} errori; ${n} calcoli completi`);
process.exit(ko ? 1 : 0);
