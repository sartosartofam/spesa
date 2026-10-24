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

## ADR-0002 — Autenticazione, registrazione e famiglie

**Decisione.** MVP con email + password tramite Supabase Auth e registrazione pubblica.

- Chi si registra crea un account e, al primo accesso autenticato, una famiglia personale con ruolo `owner`.
- La creazione della famiglia passa dalla funzione SQL `public.ensure_current_family()`, `security definer` e idempotente: il client non può inserirsi in una famiglia esistente né scegliere un `family_id` arbitrario.
- Le email sono normalizzate (trim + lowercase) nel client e nel database.
- La conferma email è obbligatoria prima del primo accesso.
- Per ora vale una sola famiglia per utente. Gli inviti con codice permettono di entrare in un'altra famiglia o cambiare la propria; la multi-famiglia è rimandata a una fase successiva.
- Gli inviti sono monouso, scadono dopo 7 giorni e sono gestiti dalle RPC `create_family_invite()` e `redeem_family_invite(code)`, entrambe `security definer`. La tabella `family_invites` non è accessibile direttamente dal client.
- Un `owner` può nominare un altro `owner` della stessa famiglia con la RPC `promote_family_owner(member_id)`. Serve a sbloccare il cambio famiglia quando l'owner non è l'unico membro.
- Magic link post-MVP.

**Perché.** La registrazione pubblica rende l'app utilizzabile senza intervento manuale dell'umano, mantenendo isolamento tra famiglie grazie alla RPC e alla RLS. Una famiglia per utente evita ambiguità su quale lista mostrare e quale `family_id` usare nelle query; gli inviti coprono il caso reale di più persone nella stessa famiglia.

**Conseguenze.**

- In locale `enable_signup = true`, `enable_confirmations = true` e le email di conferma si leggono su Mailpit (`http://127.0.0.1:54324`).
- In produzione l'attivazione di signup, conferma email e SMTP è un'azione umana. La conferma email va testata con un indirizzo reale prima del push in produzione.
- La gestione manuale degli utenti resta possibile per seed e test, ma non è più il flusso principale.
- Accettando un invito, l'utente passa alla famiglia di destinazione con ruolo `member`. Se era l'unico membro della famiglia di partenza, la vecchia famiglia e la sua lista vengono eliminate; se era owner con altri membri, il cambio è bloccato finché non nomina un altro owner dalla sezione Famiglia. Gli inviti attivi creati dall'utente per la vecchia famiglia vengono revocati.
- Rate limiting e protezione anti-bot restano a carico della configurazione Supabase e vanno verificati prima della produzione.

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
