# App «Alchimista» — design doc v2

Data: 13/10/2026 · Repo: `biti87-arch/alchimista` · Fonte dati: `Alchimista_v2.4.1_FINALE.docx`

## STATO LAVORO

- ✅ Decisioni A–H (confermate da Massy il 13/10/2026)
- ✅ Contatori giornalieri
- ✅ Interpretazioni 1–3 (con le correzioni di Massy su 2 e 3)
- ✅ Parser del manuale (docx → txt/json → `alchimista.json`, 13/10/2026)
- ✅ Pagina HTML da provare (13/10/2026) — ⬜ prova di Massy
- ⬜ APK (Capacitor) e Windows (Electron): si compilano dai workflow a ogni push su `main`

## Decisioni

| | Decisione |
|---|---|
| **A** | Stessa architettura delle altre app: prima la pagina HTML, poi APK e Windows. Repo `biti87-arch/alchimista`. Dati letti dal manuale v2.4.1 (docx → txt → JSON con script Python, `template.html`, `build.py` → `www/index.html`). |
| **B** | **Scheda**: livello, Intelligenza, campo di ricerca, archetipo (18), doti per categoria (bombe, mutageni, veleni, generiche = senza categoria fra parentesi) filtrate per requisiti. **Formulario**: 8 formule al 1° (2 del campo), +2 per livello. Bombe e mutageni: serve la versione precedente. Veleni: serve un veleno di almeno 2 livelli inferiore (non per il 1° e 2° livello). Limiti e formule esclusive dell'archetipo. Le violazioni danno un avviso, non bloccano. Più personaggi salvati sul dispositivo. |
| **C** | **Alba**: reagenti calcolati (+1 con Reagente infuso extra; al 20° l'app tira 2d4+2) e agenti inibitori. **Alchimia di base** con i moltiplicatori: ×2; ×3 per le bombe con Bombe a go-go e per le 2 formule di Mutageni economici; ×1 per i veleni potenziati; cocktail 2 reagenti → 1. Modifiche e potenziamenti si scelgono qui. I reagenti avanzati restano in riserva. |
| **D** | **In gioco**: inventario con «usa»; alchimia rapida (1 reagente → 1 esemplare, scade dopo 1 minuto = 10 round). Contatore dei round con effetti attivi e scadenze in round, minuti o ore; un mutageno identico sostituisce quello attivo. Niente PF del personaggio: Bio-reazione è un contatore che mostra la cura (2 PF per livello). |
| **E** | **Bombe**: danni dal profilo, Bombe potenti (½ Int), effetti dei 10 tipi, CD della Sonica (+1 all'8° e al 16°), modifiche ≤ +5, diluite senza reagenti. Effetti d'archetipo: esperto, penetrante, perfezionamento specialistico, Corrosione, Gelo persistente, Saturazione di schegge, Arco elettrico, Onda dirompente, bombe gassose, Ectoplasmica, Rovospina e Trappole spinose (max 3 piazzate). Tiro dei dadi incluso. |
| **F** | **Mutageni**: durata calcolata (+1 livello con Studi mutagenici avanzati); concentrati a 2/3/4 fruitori con durata divisa (vedi interpretazione 3); cocktail; promemoria giornaliero/settimanale/mensile. |
| **G** | **Veleni**: CD = 10 + tossicità + Int (+1 e +1 con Tossicità aumentata e superiore). Potenziamenti entro il tetto di potenza (1 dose per reagente). Miscelazione tossica, Alterazione molecolare, permanenza 6/12/24 h. |
| **H** | **Solo testo**, senza calcoli: homunculus del Prometeico, attacco furtivo, doti da ladro, mutageni Del dottor Je-Kill e Della montagna (rimandano agli incantesimi Forma e al Libro delle Forme Elementali). Niente PDF nella prima versione. |

## Contatori giornalieri

| Capacità | Usi al giorno |
|---|---|
| Agenti inibitori | 3 + Int (illimitati con Agenti inibitori extra) |
| Bio-reazione, Liquido decatalizzante, Profumo irresistibile | 1 |
| Bombardamento sicuro, Veleni ultraletali | 2 |
| Alterazione molecolare, Fede tossica (per ogni selezione), Coprente ectoplasmatico | 3 |
| Pozione come mutageno, Arco elettrico | bonus di Int |
| Droghe psicotrope (riserva di adrenalina) | ½ livello + Int (min 1) |
| Tempesta in bottiglia | 3 + ½ livello |
| Trappola per fantasmi | 1 + 1 ogni 4 livelli oltre il 6° |
| Ri-mescita curativa | 1 + Int (+2 per ogni Ri-mescita curativa extra) |
| Lacrima di divinità caduta | 1 dose |

## Interpretazioni

**1. Livello ridotto dalle modifiche.** Il profilo ha solo righe dispari: si usa la riga dispari pari o inferiore al livello ridotto, come per le diluite. Esempio: livello 7 con modifica +2 → 5 → 4d8. Anche la CD della Sonica usa il livello ridotto.

**2. Metà bonus di Intelligenza dei reagenti.** Arrotondata **per eccesso**. Esempio: 3° livello, Int +3 → 3 + 2 = 5 reagenti. Minimo 1 reagente.

**3. Durata divisa dei concentrati.** La durata si divide equamente fra i fruitori **mantenendo la propria unità di tempo**: se è in ore o minuti, il risultato si scrive in ore e minuti; il resto sotto il minuto si scrive in round (1 round = 6 secondi, per difetto). Minimo 1 round a testa.
Esempi: 7 ore fra 2 → 3 h 30 min ciascuno; 7 ore fra 3 → 2 h 20 min; 5 minuti fra 2 → 2 min e 5 round; 6 round fra 4 → 1 round.

## Scelte di applicazione (13/10/2026, da confermare con la prova)

- **Nome dell'app**: «Laboratorio Alchemico» (senza apostrofi, per Android). Pacchetto `it.collana.alchimista`.
- **Metà bonus di Intelligenza per eccesso** applicata ovunque compaia: reagenti e Bombe potenti.
- **CD della Rovospina** sul livello ridotto dalle modifiche, come la Sonica (interpretazione 1).
- **Agenti inibitori**: uno per ogni fruitore diverso dall'alchimista.
- **Alba**: azzera il tempo, i contatori e gli oggetti di base; gli oggetti dell'alchimia rapida scadono col tempo.
- **Miscelazione tossica**: la dose miscelata mostra gli effetti di entrambi i veleni con la tossicità più alta.
- **Requisiti non interpretabili** (Forza 13 o Destrezza 13; devozione per Fede tossica) mostrati come «da verificare», senza bloccare.

## Note sul manuale

- I mutageni esclusivi degli archetipi (Je-Kill, Camaleontico, Aerostatico, Acquatico) e le bombe esclusive (Ectoplasmica, Rovospina) hanno il formato voluto: il parser li legge così.
- Punti aperti per una prossima patch:
  - il Percorso specialistico del Batteriologo non ha «Al 1° livello»;
  - tabella dei mutageni: «Rigenerante» senza «1.0» e «Tentacolare 1.0» con una sola versione nella scheda;
  - alcuni titoli di mutageni e veleni non hanno «mantieni con il successivo» (Antiepidemico, Della vista periferica, Roccia del morto, Lacrime di medusa e altri): possono finire isolati in fondo pagina.
