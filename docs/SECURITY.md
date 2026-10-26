# Sicurezza e checklist di produzione

Questo documento raccoglie ciò che è già protetto nel codice e le azioni che
restano da fare **prima del go-live**. Le azioni marcate come umane richiedono
accesso a Supabase Cloud, Vercel o GitHub e non vanno eseguite dagli agenti.

Ultimo aggiornamento: ottobre 2026.

## Cosa è già nel repository

- RLS attiva su tutte le tabelle `public`; le policy filtrano per `family_id` o
  per il membro corrente.
- `family_invites` non è leggibile né scrivibile direttamente dai ruoli API:
  creazione e riscatto passano solo dalle RPC `security definer`.
- Le funzioni `security definer` hanno `search_path = ''` e privilegi limitati.
- `members.email` non è esposta al client; l'email serve solo per inviti e
  deduplica interna.
- I codici invito sono token bearer da 128 bit. Nel database resta solo lo
  SHA-256 (`family_invites.code_hash`), mai il codice in chiaro.
- Al massimo 10 inviti attivi per famiglia; la creazione è serializzata con un
  advisory lock.
- Password minima 12 caratteri, senza requisiti di composizione.
- `secure_password_change` attivo nella configurazione locale.
- Il messaggio per un'email già registrata è generico, per limitare
  l'enumerazione degli account.
- Header di sicurezza in `vercel.json`: CSP, HSTS, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP e CORP.
- JetBrains Mono è self-hosted: nessuna richiesta a Google Fonts.
- `npm audit` pulito al momento dell'ultima verifica.

## Bloccanti prima del go-live

### Supabase Cloud

- [ ] Creare il progetto di produzione e applicare le migrazioni con il flusso
      di release scelto. Non usare `supabase db push` da una macchina di
      sviluppo senza autorizzazione.
- [ ] Impostare il **Site URL** sul dominio finale e aggiungere solo redirect
      URL esatti (niente wildcard) per login, conferma email e reset password.
- [ ] Attivare la conferma email e provarla con un indirizzo reale.
- [ ] Configurare SMTP proprio (SPF, DKIM, DMARC) al posto dell'invio di
      default. Verificare che le email non finiscano in spam.
- [ ] Impostare `minimum_password_length = 12`, `secure_password_change` attivo
      e nessun requisito di composizione.
- [ ] Tenere disattivati anonymous sign-in e manual linking.
- [ ] Attivare un captcha (Turnstile o hCaptcha) su signup/login.
- [ ] Tarare i rate limit Auth. I valori locali (30 email/ora, 30 signup/5 min,
      150 refresh/5 min) sono pensati per lo sviluppo, non per la produzione.
- [ ] Verificare JWT expiry (1 ora) e refresh token rotation; valutare una
      durata di sessione più corta se serve.
- [ ] Disattivare l'esposizione automatica delle nuove tabelle e, se non usato,
      il GraphQL endpoint.
- [ ] Impostare backup/PITR secondo il piano scelto e verificare la retention.
- [ ] Applicare SSL/TLS obbligatorio e, se possibile, network restrictions.
- [ ] Fare una review RLS con **due famiglie reali/fittizie** e con `anon`:
      nessun dato deve trapelare tra famiglie.
- [ ] Controllare che `keepalive` resti leggibile solo in `select` da `anon`.

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

### Vercel

- [ ] Impostare solo variabili pubbliche: `VITE_SUPABASE_URL` e
      `VITE_SUPABASE_PUBLISHABLE_KEY`. **Mai** `service_role`, `SECRET_KEY`,
      token di export o chiavi VAPID private.
- [ ] Verificare gli header con `curl -I https://<dominio>/` e controllare che
      CSP, HSTS, `X-Frame-Options` e `Permissions-Policy` siano presenti.
- [ ] Se usi un dominio Supabase custom, aggiungilo a `connect-src` nella CSP:
      la policy attuale copre `https://*.supabase.co` e
      `wss://*.supabase.co`.
- [ ] Valutare `Strict-Transport-Security: ...; preload` solo quando il dominio
      è definitivo e tutti i sottodomini sono HTTPS.
- [ ] Proteggere i preview deployment se non devono essere pubblici.
- [ ] Controllare i log del primo deploy: nessun errore CSP, nessuna richiesta a
      origini esterne, nessun secret nel bundle.

### GitHub

- [ ] Default branch `dev`; `main` solo per la promozione umana.
- [ ] Branch protection su `main` e `dev`: PR obbligatoria, check obbligatori
      (qualità, pgTAP, e2e), no force push, no push diretti.
- [ ] Abilitare auto-merge e squash merge su `dev`.
- [ ] Attivare secret scanning, push protection e Dependabot alerts/updates.
- [ ] Nei repository secrets tenere solo `SUPABASE_URL` e
      `SUPABASE_ANON_KEY` per il keepalive. Nessuna `service_role` in Actions.
- [ ] Impostare permessi di default minimi per `GITHUB_TOKEN` e rivedere i
      workflow che usano secrets.
- [ ] Se serve, proteggere l'ambiente di produzione con approvazione umana.

### Backup ed export

- [ ] Implementare la Edge Function `export` descritta in ADR-0003 con un token
      dedicato, generato con almeno 32 byte casuali.
- [ ] Salvare solo l'hash del token di export, ruotarlo periodicamente e
      conservarlo come secret della Edge Function.
- [ ] Usare un bucket privato su Cloudflare R2 o Backblaze B2, con credenziali
      minime e cifratura at rest.
- [ ] Programmare l'export settimanale e monitorare i fallimenti.
- [ ] Eseguire un **restore di prova** in locale: importare il JSON, verificare
      conteggi, relazioni e RLS, poi documentare l'esito.
- [ ] Non mettere mai la `service_role` sul Raspberry Pi o nel frontend: il Pi
      chiama solo l'Edge Function protetta dal token.

### Web Push

- [ ] Generare le chiavi VAPID; la chiave privata resta solo nella Edge Function.
- [ ] Applicare un'allowlist degli endpoint push noti e rifiutare URL arbitrari
      (protezione SSRF).
- [ ] Rimuovere le subscription scadute (`404`/`410`).
- [ ] Non inserire dati sensibili nel payload della notifica.
- [ ] Rate limitare l'invio e loggare solo metadati, non endpoint completi.

### Segnalazioni e incidenti

- [ ] Aprire un canale di segnalazione sicurezza (anche solo un indirizzo email)
      e indicarlo nel repository.
- [ ] In caso di sospetta compromissione: ruotare JWT secret, `service_role`,
      token di export e chiavi VAPID; revocare le sessioni; invalidare gli
      inviti attivi; rideployare e controllare i log.
- [ ] Se viene ruotata la publishable key, aggiornare Vercel e il cron del Pi.
- [ ] Conservare un piccolo runbook con i comandi di revoca e i contatti.

## Verifiche da ripetere prima del rilascio

```bash
npm ci
npm run verify
npx supabase test db
npm run test:e2e
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

L'unico match atteso nel codice è il controllo in `src/lib/supabase.ts`, che
rifiuta esplicitamente le chiavi `secret` e `service_role`.

Poi provare in staging/produzione:

- registrazione con email reale e conferma;
- login, reload e logout;
- creazione famiglia al primo accesso;
- invito tra due account e cambio famiglia;
- isolamento tra due famiglie;
- aggiunta, spunta, urgenza e storico;
- accesso anonimo negato a liste e membri;
- invio push e revoca subscription, quando disponibili.

## Note

- I test e i seed usano solo dati fittizi. Non inserire nomi, email o note reali
  nel repository.
- Le modifiche a RLS, schema e funzioni `security definer` richiedono review
  umana prima di `main`.
- La configurazione locale in `supabase/config.toml` non è la configurazione di
  produzione: serve a rendere i test realistici.
