# Laboratorio Alchemico

App per l'Alchimista della Collana (Vol. 2 - Classi): scheda con doti e formulario, alba con reagenti e alchimia di base, borsa con bombe, mutageni e veleni, alchimia rapida, contatori giornalieri, effetti attivi e testi del manuale. Tutti i 18 archetipi.

## Scaricare l'app
Nella pagina **Releases** del repository:
- **Android**: il file `Alchimista-N.apk` (release `v1.0.N`). Scaricalo dal telefono e aprilo per installarlo.
- **Windows**: release `win-1.0.N`, versione *portatile* (doppio clic, niente installazione) o *installazione*.

Le app si ricompilano da sole a ogni aggiornamento del ramo `main`.

## Come si aggiorna quando cambia il manuale
1. Metti il .docx aggiornato dell'Alchimista in `sorgenti/docx/` (togli il vecchio).
2. `python3 sorgenti/estrai_testo.py` → testo e paragrafi in `sorgenti/txt/`
3. `python3 sorgenti/parse_alchimista.py` → `sorgenti/alchimista.json` (stampa le segnalazioni sul manuale)
4. `node sorgenti/test_motore.js` → test del motore di calcolo
5. `python3 sorgenti/build.py` → `www/index.html`

Le icone si rigenerano con `python3 sorgenti/icone.py`.

## Struttura
- `sorgenti/motore.js`: calcoli (reagenti, formulario, bombe, mutageni, veleni, contatori) e configurazione degli archetipi.
- `sorgenti/template.html`: interfaccia; `build.py` inserisce motore e dati.

## Decisioni di design
Vedi `Alchimista_app_design_v2.md`.
