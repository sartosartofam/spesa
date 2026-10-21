# Decisioni (ADR)

Decisioni prese per il progetto. In caso di conflitto con `docs/studio-di-progetto.md`, prevale questo file. Ogni modifica sostanziale va fatta con una PR e approvata dall'umano.

## ADR-0001 — Stati degli articoli

**Decisione.** `items.status` è un enum con due soli valori: `to_buy` e `bought`. L'urgenza è un flag booleano `urgent`.
- `to_buy`: articolo nella lista attiva.
- `bought`: articolo preso e archiviato nello storico.
- `urgent = true`: qualcuno ha segnalato "è finito"; l'articolo va comprato subito e genera notifica.
- Quando un articolo viene preso, `status = 'bought'`, `bought_at = now()` e `urgent = false`.

**Perché.** Il terzo stato `finished` era ambiguo: un articolo già in lista è già "da comprare". "È finito" è un evento (segnalazione), non uno stato del ciclo di vita. Due stati + un flag semplificano query, UI, notifiche e test.

**Conseguenze.** Lo scaffold usa ancora `finished`: va allineato nella fase backend/frontend. "È finito" da storico o da un form dedicato rimette l'articolo in lista con `urgent = true`.

## ADR-0002 — Autenticazione

**Decisione.** MVP con email + password tramite Supabase Auth. Nessuna registrazione pubblica: i membri vengono creati dall'umano (dashboard Supabase o script admin locale) e collegati a una riga di `members`. Magic link post-MVP.

**Perché.** Una famiglia è un gruppo chiuso di 2–6 persone. La registrazione aperta aggiunge superficie d'attacco e lavoro inutile. Email + password è il flusso più semplice da testare in locale.

**Conseguenze.** In produzione `enable_signup` resta disabilitato. In locale si possono creare utenti di test con la chiave `service_role` locale. La gestione inviti è manuale per l'MVP.

## ADR-0003 — Backup ed export

**Decisione.** Export settimanale tramite una Edge Function `export` protetta da un token dedicato, con `service_role` disponibile solo nell'ambiente Supabase. Output JSON su Cloudflare R2 / Backblaze B2. Ripristino di prova obbligatorio prima di considerare l'MVP concluso.

**Perché.** La `anon key` non basta se la RLS limita la lettura ai membri autenticati. La `service_role` non deve mai stare sul Raspberry Pi, sulle macchine di sviluppo o nel frontend. Una Edge Function tiene il segreto dove deve stare.

**Conseguenze.** Il token dell'export è un secret di produzione, gestito dall'umano. Il Pi esegue solo la chiamata HTTP e l'upload. Frequenza minima accettabile: mensile.

## ADR-0004 — Autonomia degli agenti

**Decisione.** Livello 2:

- gli agenti lavorano su branch `feat/*`, `test/*`, `chore/*` creati da `dev`;
- aprono PR verso `dev`;
- se la CI è verde, possono abilitare l'auto-merge (squash) sulla PR;
- `main` è promosso solo dall'umano, dopo review e test;
- nessuna credenziale di produzione sulle macchine di sviluppo: gli agenti usano solo Supabase locale;
- un task = una issue = un branch = una PR piccola.

**Perché.** L'auto-merge su `dev` dà autonomia reale senza mettere a rischio la produzione e i deploy Vercel. Il collo di bottiglia umano resta solo sulla promozione.

**Conseguenze.** La CI deve essere veloce e affidabile. `dev` va protetto con check obbligatori. Le modifiche a RLS, schema e sicurezza richiedono comunque review umana prima di `main`.

## ADR-0005 — Stack frontend

**Decisione.** Preact + Vite. Lo scaffold esistente è la base; niente SvelteKit.

**Perché.** Lo scaffold è già scritto, la UI è mobile-first e l'astrazione `ItemsRepository` permette di collegare Supabase senza riscrivere i componenti. SvelteKit aggiungerebbe struttura e routing ma costringerebbe a ripartire.

**Conseguenze.** Il routing è minimale (due viste: lista attiva e storico). Se in futuro servono route complesse, si valuta un router client-side, non un rewrite del framework.
