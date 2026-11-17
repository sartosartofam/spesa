# Sicurezza e checklist di produzione

Cosa è già protetto nel codice e cosa resta da fare **prima del go-live**. Le azioni marcate come umane richiedono accesso a Supabase Cloud, Vercel o GitHub e non vanno eseguite dagli agenti.

Ultimo aggiornamento: 14 novembre 2026.

**Stato attuale.** Progetto Supabase cloud e progetto Vercel configurati. Non ancora attivi: keepalive (il progetto è in pausa, nessun ping in funzione), backup automatico, branch protection e deploy di produzione (`main` è fermo all'initial commit). La sequenza delle azioni è in `docs/ROADMAP.md` → Fase 3.

## Cosa è già nel repository

- RLS attiva su tutte le tabelle `public`; le policy filtrano per `family_id` o per il membro corrente.
- `family_invites` non è leggibile né scrivibile direttamente dai ruoli API: creazione e riscatto passano solo dalle RPC `security definer`.
- Le funzioni `security definer` hanno `search_path = ''` e privilegi limitati.
- `members.email` non è esposta al client; l'email serve solo per inviti e deduplica interna.
- I codici invito sono token bearer da 128 bit. Nel database resta solo lo SHA-256 (`family_invites.code_hash`), mai il codice in chiaro.
- Al massimo 10 inviti attivi per famiglia; la creazione è serializzata con un advisory lock.
- Password minima 12 caratteri, senza requisiti di composizione (scelta locale: prima del go-live scende a 8 con composizione, vedi sotto).
- `secure_password_change` attivo nella configurazione locale.
- Il messaggio per un'email già registrata è generico, per limitare l'enumerazione degli account.
- Header di sicurezza in `vercel.json`: CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP e CORP.
- JetBrains Mono è self-hosted: nessuna richiesta a Google Fonts.
- Informativa privacy pubblica su `/privacy`, raggiungibile da landing, login, registrazione, area riservata e impostazioni.
- Cancellazione account tramite RPC `delete_current_account()`: elimina solo `auth.uid()`, gestisce famiglia condivisa e fa scattare le cascade dei dati personali.
- `robots.txt` permissivo; landing e privacy indicizzabili, login, registrazione e area riservata con `noindex, nofollow`.
- Donazioni solo tramite IBAN o link, senza widget o iframe di terze parti.
- La Edge Function `send-push` usa `service_role` solo lato server, verifica JWT e appartenenza alla famiglia, esclude l'autore e non espone endpoint o chiavi.
- Le notifiche push applicano un'allowlist agli endpoint noti, validano le chiavi, rimuovono le subscription `404`/`410` e non inseriscono dati sensibili nel payload.
- `npm audit` pulito al momento dell'ultima verifica.

## Perché non hashiamo i dati applicativi

L'hashing è utile per i token bearer, non per i dati che l'app deve mostrare e interrogare. Nomi degli articoli, categorie, quantità, note, email e chiavi push servono in chiaro per UI, ricerca, ordinamento, join e realtime: hasharli romperebbe il prodotto e non sarebbe una vera cifratura.

La protezione di quei dati dipende da RLS, TLS, accesso minimo al database e backup cifrati. I codici invito sono hashati, perché non devono essere leggibili da un dump e non servono mai in chiaro dopo la creazione. Il token di export invece vive come secret (Supabase in produzione, env locale): è confrontato a runtime via SHA-256, ma resta un secret configurabile e ruotabile, non un dato del database.

## Bloccanti prima del go-live

### Supabase Cloud

- [ ] **Riattivare il progetto** dal dashboard: con il piano free un progetto inattivo per ~7 giorni va in pausa e il DNS smette di risolvere (l'app in produzione mostrerebbe solo errori di rete). Non si perdono dati.
- [ ] Applicare le migrazioni con il flusso di release scelto. Non usare `supabase db push` da una macchina di sviluppo senza autorizzazione.
- [ ] Impostare il **Site URL** sul dominio finale e aggiungere solo redirect URL esatti (niente wildcard) per login, conferma email e reset password.
- [ ] Attivare la conferma email e provarla con un indirizzo reale.
- [ ] Configurare SMTP proprio (SPF, DKIM, DMARC) al posto dell'invio di default. Verificare che le email non finiscano in spam.
- [ ] **Politica password**: attivare `secure_password_change` e impostare `minimum_password_length = 8` con `password_requirements = lower_upper_letters_digits_symbols`. Il locale oggi richiede 12 caratteri senza composizione: prima del go-live va allineato `supabase/config.toml`, aggiornati i messaggi 12 → 8 in `src/lib/auth.ts`, `RegisterPage` e `ResetPasswordPage`, e riscritte le password demo (`scripts/seed-auth.mjs`, `e2e/support/auth.ts`, `e2e-backend/support/backend.ts`) insieme ai relativi test.
- [ ] Tenere disattivati anonymous sign-in e manual linking.
- [ ] Attivare un captcha (Turnstile o hCaptcha) su signup/login.
- [ ] Tarare i rate limit Auth. I valori locali (30 email/ora, 30 signup/5 min, 150 refresh/5 min) sono pensati per lo sviluppo, non per la produzione.
- [ ] Verificare JWT expiry (1 ora) e refresh token rotation; valutare una durata di sessione più corta se serve.
- [ ] Disattivare l'esposizione automatica delle nuove tabelle e, se non usato, il GraphQL endpoint.
- [ ] Impostare backup/PITR secondo il piano scelto e verificare la retention.
- [ ] Applicare SSL/TLS obbligatorio e, se possibile, network restrictions.
- [ ] Fare una review RLS con **due famiglie reali/fittizie** e con `anon`: nessun dato deve trapelare tra famiglie.
- [ ] Controllare che `keepalive` resti leggibile solo in `select` da `anon`.
- [ ] Se migri un database già esistente, revoca gli inviti attivi creati prima dell'hardening: restano validi fino alla scadenza per compatibilità, ma erano codici da 12 hex.
- [ ] Nei log applicativi non far comparire codici invito, token, password o email complete.

Query utile da eseguire nel SQL editor di produzione:

```sql
-- Nessuna tabella public senza RLS.
select tablename
from pg_tables
where schemaname = 'public' and rowsecurity = false;

-- Nessun accesso diretto del client agli inviti.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'family_invites'
  and grantee in ('anon', 'authenticated');
```

### Keepalive

- [ ] Verificare che `SUPABASE_URL` e `SUPABASE_ANON_KEY` nei repository secrets puntino al progetto reale: i valori attuali fanno fallire il ping con `Could not resolve host`.
- [ ] Avviare il cron sul Raspberry Pi (`scripts/keepalive/ping.sh`) e il workflow GitHub Actions: due ping indipendenti, così il guasto di uno non spegne il progetto.
- [ ] Controllare il primo ping verde e poi una volta a settimana che il workflow resti verde.
- [ ] Mai `service_role` sul Pi né in Actions: il ping usa solo la chiave pubblica.

Nota: finché il progetto è in pausa e i ping non sono attivi, il workflow `keepalive` risulta rosso ogni notte. È il sintomo atteso, non un incidente da indagare.

### Privacy e dati personali

- [ ] Sostituire in `src/lib/landing-content.ts` l'IBAN e l'intestatario delle donazioni con i dati reali.
- [ ] Rileggere l'informativa `/privacy` con i dati reali e aggiornare la data.
- [ ] Provare la cancellazione account in staging con un utente vero: l'account deve sparire, la lista personale deve essere eliminata e, se ci sono altri membri, la famiglia deve restare con un owner.
- [ ] Verificare che login, registrazione e `/app` rispondano con `noindex, nofollow` e che la landing resti indicizzabile.
- [ ] Non introdurre banner cookie finché restano solo cookie tecnici; se in futuro si aggiungono analytics o tracker, serve una cookie policy e un consenso.

### Vercel

- [ ] Impostare solo variabili pubbliche: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SITE_URL` e, se Web Push è attivo, `VITE_VAPID_PUBLIC_KEY`. **Mai** `service_role`, `SECRET_KEY`, token di export o `VAPID_PRIVATE_KEY`.
- [ ] Verificare `Settings → Git`: repository collegato, **Production Branch = `main`** (non `dev`), Node.js 24.x, build `npm run build`, output `dist`.
- [ ] Verificare che chi firma i commit abbia accesso al progetto Vercel: in caso contrario i deploy vengono rifiutati con un errore di autorizzazione.
- [ ] Verificare gli header con `curl -I https://<dominio>/` e controllare che CSP, HSTS, `X-Frame-Options` e `Permissions-Policy` siano presenti.
- [ ] Se usi un dominio Supabase custom, aggiungilo a `connect-src` nella CSP: la policy attuale copre `https://*.supabase.co` e `wss://*.supabase.co`.
- [ ] Valutare `Strict-Transport-Security: ...; preload` solo quando il dominio è definitivo e tutti i sottodomini sono HTTPS.
- [ ] Proteggere i preview deployment se non devono essere pubblici.
- [ ] Controllare i log del primo deploy: nessun errore CSP, nessuna richiesta a origini esterne, nessun secret nel bundle.

### GitHub

- [ ] Default branch `dev`; `main` solo per la promozione umana.
- [ ] **Branch protection o ruleset** su `main` e `dev`: PR obbligatoria, 0 approvazioni (servono agli agenti), check obbligatori `lint, typecheck, unit, build`, `migrazioni e RLS (pgTAP)`, `Playwright`; no force push, no cancellazione del branch, no push diretti.
- [ ] Non attivare "Require review from Code Owners" su `dev`: bloccherebbe l'auto-merge degli agenti.
- [ ] Auto-merge e squash merge attivi, delete branch on merge attivo.
- [ ] Attivare secret scanning, push protection e Dependabot alerts/updates.
- [ ] Nei repository secrets tenere solo `SUPABASE_URL` e `SUPABASE_ANON_KEY` per il keepalive. Nessuna `service_role` in Actions.
- [ ] Impostare permessi di default minimi per `GITHUB_TOKEN` (i workflow dichiarano già `permissions` espliciti) e rivedere quelli che usano secrets.
- [ ] Se serve, proteggere l'environment di produzione con approvazione umana.

### Backup ed export

- [x] Edge Function `export` (ADR-0003) implementata in `supabase/functions/export/index.ts`, con token dedicato letto dal secret `EXPORT_TOKEN`; confronto costante nel tempo su SHA-256 e risposta 401 per token assente o sbagliato. Nessun JWT utente viene richiesto (`verify_jwt = false` in `supabase/config.toml`).
- [ ] Ruotare periodicamente il secret `EXPORT_TOKEN` e conservarlo solo nei secret Supabase di produzione.
- [ ] Usare un bucket privato su Cloudflare R2 o Backblaze B2, con credenziali minime e cifratura at rest.
- [ ] Programmare l'export settimanale e monitorare i fallimenti.
- [x] Eseguito un **restore di prova** in locale con `scripts/backup/restore-local.mjs`: export → reset → upsert di tutte le tabelle (families, members, items, family_invites, push_subscriptions, user_settings, keepalive) con conteggi e relazioni verificati.
- [ ] Non mettere mai la `service_role` sul Raspberry Pi o nel frontend: il Pi chiama solo la Edge Function protetta dal token.

### Web Push

Cosa è già nel codice:

- [x] Allowlist degli endpoint push noti, HTTPS obbligatorio e rifiuto degli URL arbitrari (protezione SSRF), sia nel client sia nella Edge Function.
- [x] Rimozione delle subscription scadute (`404`/`410`).
- [x] Payload senza email, note o altri dati sensibili.
- [x] JWT obbligatorio, controllo dell'appartenenza alla famiglia e autore escluso dai destinatari.
- [x] Log solo con id subscription e status, mai endpoint o chiavi complete.
- [x] Logout e cancellazione account rimuovono la subscription del dispositivo.
- [x] Rate limit dell'invio: 12 richieste al minuto per utente via RPC
      `consume_rate_limit` (tabella dedicata con RLS e nessuna policy,
      `service_role` only); oltre il budget la function risponde `429`
      prima di interrogare il resto.

Il Web Push è **spento per scelta** (decisione 3 novembre 2026): senza `VITE_VAPID_PUBLIC_KEY` la sezione Notifiche non compare e la function risponde `push_not_configured`. Se un giorno si attiva:

- [ ] Generare le chiavi VAPID definitive e mettere `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` solo nei secret Supabase.
- [ ] Mettere `VITE_VAPID_PUBLIC_KEY` su Vercel e fare il deploy della Edge Function `send-push`, poi monitorare i fallimenti e le `429` (`rate_limited`) nei log della function.
- [ ] Provare l'opt-in e la consegna da almeno due dispositivi reali, incluso un iPhone con la PWA installata.
- [ ] Verificare che una subscription revocata non riceva più notifiche.

### Pannello admin

Fetta 1 (issue #109): monitoraggio in sola lettura, senza servizi esterni.

Cosa è già nel codice:

- [x] Tabella `admins (user_id)` con RLS attiva, nessuna policy e `revoke all` ad `anon`/`authenticated`: le righe si inseriscono solo con SQL/CLI, mai dal client.
- [x] `is_admin()` `security definer`, `stable`, `search_path = ''`, eseguibile dai soli `authenticated`, espone solo un booleano sul chiamante.
- [x] `admin_overview()` `security definer` che restituisce solo aggregati e timestamp; chi non è admin riceve `42501`. Nessun nome, nota, email o chiave push nel payload.
- [x] Test pgTAP per `anon`, utente normale e admin (`supabase/tests/admin_panel.test.sql`).

Da fare quando il pannello arriva in produzione:

- [ ] Assegnare l'admin a mano con SQL/CLI (`insert into public.admins ...`) e ricordare che dopo un restore la riga va reinserita: `admins` non è nell'export.
- [ ] Verificare con un utente non admin che `/admin` non riveli l'esistenza del pannello (rotta `noindex`, non linkata, `NotFoundPage` per chi non è admin) e che la RPC risponda `42501`.
- [ ] Ruotare l'elenco degli admin quando un account cambia titolare: la riga sparisce da sola solo se l'utente viene cancellato (`on delete cascade`).

### Segnalazioni e incidenti

- [ ] Aprire un canale di segnalazione sicurezza (anche solo un indirizzo email) e indicarlo nel repository.
- [ ] In caso di sospetta compromissione: ruotare JWT secret, `service_role`, token di export e chiavi VAPID; revocare le sessioni; invalidare gli inviti attivi; rideployare e controllare i log.
- [ ] Se viene ruotata la publishable key, aggiornare Vercel e il cron del Pi.
- [ ] Conservare un piccolo runbook con i comandi di revoca e i contatti.

## Verifiche da ripetere prima del rilascio

```bash
npm ci
npm run verify
npx supabase test db
npm run test:e2e
npm run test:e2e:backend   # richiede lo stack locale con il seed
npm audit --omit=dev
```

Controlli manuali utili:

```bash
# Nel codice deve comparire solo il guard che rifiuta le chiavi secret.
rg -n "sb_secret|service_role" src vercel.json --glob '!**/*.test.*'

# Nel bundle non devono esserci valori di chiavi secret completi.
rg -o "sb_secret_[A-Za-z0-9]{20,}" dist || true

# Header del deploy.
curl -sSI https://<dominio>/ | sed -n '1,40p'
```

L'unico match atteso nel codice è il controllo in `src/lib/supabase.ts`, che rifiuta esplicitamente le chiavi `secret` e `service_role`.

Poi provare in staging/produzione:

- registrazione con email reale e conferma;
- login, reload e logout;
- creazione famiglia al primo accesso;
- invito tra due account e cambio famiglia;
- isolamento tra due famiglie;
- aggiunta, spunta, urgenza e storico;
- accesso anonimo negato a liste e membri;
- opt-in push, notifica su aggiunta/urgenza e revoca, con chiavi VAPID
  configurate.

## Note

- I test e i seed usano solo dati fittizi. Non inserire nomi, email o note reali
  nel repository.
- Le modifiche a RLS, schema e funzioni `security definer` richiedono review
  umana prima di `main`.
- La configurazione locale in `supabase/config.toml` non è la configurazione di
  produzione: serve a rendere i test realistici.
