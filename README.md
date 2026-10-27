# Sonno

App web installabile (PWA): un pulsante avvia la sessione di sonno, che si ferma con un tocco al risveglio oppure in automatico alla riapertura dell'app (si sceglie nelle impostazioni). Il koala cambia in base allo stato.

## Struttura

| File | Cosa contiene |
|---|---|
| `index.html` | La struttura della pagina |
| `styles.css` | L'aspetto: colori, font, spaziature. **Qui va il design da Figma** |
| `js/app.js` | Logica: sessione, modalità, salvataggio sul telefono. La regola del koala è in cima (`KOALA`, `moodAfter`) |
| `img/` | Le illustrazioni del koala |
| `sw.js` | Il funzionamento offline |
| `manifest.webmanifest` | Nome, icona e colori dell'app installata |

I colori sono definiti come variabili all'inizio di `styles.css` (`--bg`, `--accent`, `--ink` …): sono il primo punto in cui riportare le scelte fatte in Figma.

## Pubblicare su GitHub Pages

1. Crea un repository pubblico su GitHub (per esempio `diario-sonno`) e carica questi file.
2. Nel repository: **Settings → Pages → Source: Deploy from a branch → Branch: `main`, cartella `/ (root)`** → Save.
3. Dopo un minuto l'app è online su `https://<tuo-utente>.github.io/diario-sonno/`.

## Installarla sul telefono

- **iPhone (Safari):** apri l'indirizzo, tocca Condividi → «Aggiungi alla schermata Home».
- **Android (Chrome):** apri l'indirizzo, menu ⋮ → «Installa app».

## Dove stanno i dati

Solo sul telefono, nel browser. Non c'è un server. Conseguenze:
- i dati non passano da un telefono all'altro;
- su iPhone, un'app web non aperta per settimane può essere ripulita dal sistema.


## Dopo una modifica

Aumenta il numero in `sw.js` (`sonno-v2` → `sonno-v3`), così i telefoni scaricano i file nuovi invece di usare quelli in memoria.
