---
title: "Studio di progetto: webapp per la lista della spesa condivisa"
subtitle: "Fase 1 — solo spesa"
lang: it-IT
---

## 1. Obiettivo e vincoli

**Obiettivo:** una webapp leggera che permetta ai membri di una famiglia di aggiungere e spuntare articoli della spesa in tempo reale, con notifica immediata quando qualcuno segnala che qualcosa è finito.

**Vincoli di progetto (filosofia KISS):**

- Nessuna app nativa: solo webapp, accessibile da browser mobile e desktop.
- Numero utenti noto e piccolo (una famiglia, 2–6 persone): niente gestione multi-tenant complessa.
- Deve essere sicura (dati familiari, accesso ristretto) ma senza infrastruttura pesante.
- Deve essere comoda: aggiungere un articolo in 2 tap, notifiche push, funziona offline almeno in lettura.
- Costo di gestione: 0 €/mese, solo piani gratuiti permanenti (Vercel Hobby, Supabase Free, GitHub).
- Servizi gestiti: nessuna VM da amministrare; deploy automatico da Git e database con RLS.

## 2. Requisiti funzionali (MVP)

### Must have

- **Lista condivisa:** più utenti vedono e modificano la stessa lista in tempo reale.
- **Aggiunta rapida articolo:** campo testo + pulsante; suggerimenti dallo storico degli articoli già usati.
- **Spunta articolo:** "preso" / "da prendere"; gli articoli presi si archiviano (non si cancellano subito, per lo storico).
- **Segnalazione "è finito":** pulsante dedicato che aggiunge l'articolo alla lista con flag "urgente/finito" e genera una notifica.
- **Notifiche push:** quando un articolo viene aggiunto o segnalato come finito, gli altri membri ricevono una notifica (almeno su mobile).
- **Login familiare semplice:** accesso con email + password tramite Supabase Auth (magic link come estensione post-MVP); registrazione pubblica con famiglia personale e inviti con codice per entrare o cambiare famiglia.
- **Categorie base:** raggruppamento automatico o manuale (es. dispensa, freschi, surgelati, casa).
- **Storico:** articoli comprati di recente, per riaggiungerli in un tap.

### Nice to have (post-MVP)

- Quantità e note per articolo.
- Più liste (es. "spesa settimanale", "festa").
- Sincronizzazione offline completa (coda di modifiche).
- Integrazione faccende (fase 2).
- Widget / PWA installabile.

### Fuori scope (per ora)

- Gestione magazzino/scorte con quantità.
- Integrazione con supermercati / e-commerce.
- Multi-famiglia, ruoli avanzati, audit log.

## 3. Requisiti non funzionali

| Area | Requisito |
|:-------------------------------|:-----------------------------------------------------------|
| Sicurezza | HTTPS obbligatorio (gestito dai provider); autenticazione; RLS per famiglia; secret solo lato server; backup dati. |
| Prestazioni | Latenza < 300 ms per le operazioni base; real-time < 1 s. |
| Affidabilità | Nessuna perdita di articoli aggiunti; conflitti gestiti con last-write-wins; progetto sempre attivo (keepalive); export periodico indipendente. |
| Usabilità | Aggiunta articolo in ≤ 2 tap; interfaccia mobile-first. |
| Manutenibilità | Stack minimale, pochissimo codice custom, deploy automatico da Git. |
| Costo | 0 €/mese (Vercel Hobby + Supabase Free + GitHub + storage di backup gratuito). |

## 4. Architettura proposta (Vercel + Supabase)

**Scelta finale:** servizi gestiti con piani gratuiti permanenti. Frontend su Vercel, database/auth/realtime su Supabase, deploy automatico da GitHub. Nessuna VM da amministrare; l'unico componente casalingo è il Raspberry Pi che tiene vivo il progetto e produce l'export periodico.

```
[GitHub] --push--> [Vercel] --> [Browser/PWA]
                                     |
                                     | HTTPS / WebSocket
                                     v
                  [Supabase: Postgres + Auth + Realtime]
                                     ^
                                     |
             [Raspberry Pi] --ping giornaliero (keepalive)
                    |
                    '--> export JSON settimanale --> [Cloudflare R2 / B2]
```

I dettagli di integrazione, l'orchestrazione degli agenti e le procedure di keepalive ed export sono nella sezione 5.

## 5. Architettura di integrazione e orchestrazione degli agenti

### 5.1 Stack scelto e motivazione

Dopo aver valutato Oracle Cloud (troppo oneroso in termini di gestione e rischio di reclaim), la scelta finale ricade su una combinazione di servizi gestiti con piani gratuiti permanenti e senza scadenze.

| Componente | Servizio | Ruolo |
|:-------------------|:------------------------------|:--------------------------------------------------|
| Frontend + deploy | Vercel (Hobby) | Hosting statico, deploy automatico da Git, preview per ogni PR |
| Database + Auth + API | Supabase (Free) | Postgres, autenticazione, API REST auto-generate, RLS |
| Codebase | GitHub | Sorgente, trigger per i deploy Vercel |
| Keepalive | Raspberry Pi (locale) | Ping giornaliero a Supabase per evitare la pausa per inattività |

### 5.2 Flusso di integrazione Vercel ↔ Supabase

La connessione avviene tramite il Vercel Marketplace, che automatizza la sincronizzazione delle variabili d'ambiente.

**Cosa fa il Marketplace automaticamente:**

- Crea o collega un progetto Supabase.
- Inietta nel progetto Vercel le variabili essenziali: `POSTGRES_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_JWT_SECRET` e altre ancora.
- Non è necessario copiare manualmente le chiavi.

**Cosa deve fare l'umano:**

- Creare l'account Supabase e il progetto (richiede verifica email).
- Accedere al Vercel Marketplace e autorizzare l'integrazione.
- Accettare i termini del provider: questo passaggio non è delegabile agli agenti, perché Vercel CLI reindirizza al browser per la conferma umana.

### 5.3 Flusso di deploy GitHub → Vercel

Una volta connesso il repository GitHub a Vercel, il ciclo di deploy è automatico:

- **Push su un branch diverso da `main`:** Vercel crea un Preview Deployment con URL univoco.
- **Merge su `main`:** Vercel crea un Production Deployment.
- È possibile anche avviare deploy manuali dalla dashboard o tramite CLI.

### 5.4 Orchestrazione degli agenti: regole per il parallelismo

Questo è il punto critico. Gli agenti possono scrivere codice e gestire Supabase, ma se lavorano in parallelo sullo stesso progetto senza isolamento, le migrazioni e i dati di test si contaminano a vicenda. La documentazione ufficiale di Supabase è esplicita: agenti che operano su worktree o branch Git diversi devono avere ciascuno il proprio database locale.

**Regola operativa:**

- Ogni agente lavora su un **worktree Git separato**. Non condividere la stessa directory.
- Abilitare la funzionalità sperimentale `supabase stack` (o `supabase start --stack <nome>`): assegna a ogni worktree porte e database locali indipendenti.
- **Supabase locale per ogni agente:** l'agente esegue `supabase start` nel proprio worktree e ottiene un'istanza isolata su cui testare migrazioni e query.
- Solo dopo merge e test il codice viene pushato su `main`, e il deploy su Vercel userà il progetto Supabase cloud (quello reale, con i dati della famiglia).

Se il parallelismo è troppo complesso, l'alternativa è far lavorare gli agenti in sequenza: backend → frontend → test. Per una lista della spesa il volume di lavoro è contenuto, e la sequenza elimina il rischio di conflitti.

### 5.5 Consigli operativi per gli agenti

Dato che organizzazione, sviluppo e gestione sono a carico di una sola persona, tre consigli pratici per non farsi male con gli agenti:

1. **Un agente alla volta, in sequenza, per l'MVP.** Il parallelismo con worktree isolati è potente ma richiede setup e coordinamento. Per una lista della spesa il volume di codice è contenuto: fai scrivere il backend all'agente A, poi il frontend all'agente B, poi i test all'agente C. Ogni agente parte da un branch pulito, fa il suo lavoro, tu revisioni e fai merge. Meno rischio di conflitti, più controllo.

2. **Dai agli agenti un "contratto" scritto prima di farli partire.** Un file `AGENTS.md` nella root del repo con: chi tocca quali file, come si chiamano le tabelle, quali policy RLS esistono, quali variabili d'ambiente sono disponibili, cosa non devono mai fare (committare secret, modificare `main` direttamente, ecc.). Gli agenti leggono questo file e si orientano. È il modo più efficace per evitare che facciano cose incoerenti.

3. **Tieni il deploy manuale finché l'MVP non è stabile.** Anche se Vercel deploya automaticamente a ogni push, per le prime settimane fai in modo che il merge su `main` sia solo tuo. Gli agenti lavorano sui branch, tu revisioni, tu fai merge. Quando il progetto è stabile, puoi allentare.

### 5.6 Strumenti per agenti: MCP e CLI

**Supabase MCP Server.** Consente all'agente di interagire direttamente con il progetto Supabase: eseguire SQL, applicare migrazioni, leggere lo schema. La configurazione consigliata è:

- Modalità read-only durante lo sviluppo iniziale (`?read_only=true`), per evitare modifiche accidentali al database di produzione.
- Le operazioni distruttive (`DROP`, `DELETE`) richiedono conferma, ma questa è "un guardrail, non una garanzia di sicurezza": la revisione umana resta necessaria.

**Vercel MCP Server.** Consente all'agente di gestire deploy, leggere log e interrogare analytics. Si installa con `npx add-mcp https://mcp.vercel.com`.

**Vercel CLI.** Gli agenti possono usare i comandi `vercel integration` per gestire il ciclo di vita delle integrazioni (discover, add, list, remove). Tuttavia, l'accettazione dei termini e la scelta di piani a pagamento richiedono l'intervento umano.

### 5.7 Keepalive Supabase: specifica tecnica

Il piano gratuito di Supabase mette in pausa i progetti dopo 7 giorni di inattività. "Pochi user request al database ogni giorno" sono sufficienti per evitare la pausa.

**Soluzione adottata:** tabella `keepalive` dedicata + ping giornaliero dal Raspberry Pi.

```sql
-- Creazione tabella
create table public.keepalive (
  id int primary key default 1,
  last_ping timestamptz default now()
);
insert into public.keepalive (id) values (1);

-- Abilita RLS
alter table public.keepalive enable row level security;

-- Revoca tutti i permessi da anon e authenticated
revoke all on public.keepalive from anon, authenticated;

-- Concedi solo SELECT ad anon
grant select on public.keepalive to anon;

-- Policy: chiunque (anche anon) può leggere
create policy "Anyone can read keepalive"
on public.keepalive for select
to anon
using (true);
```

Ping dal Raspberry Pi (cron giornaliero):

```bash
# Esegui una volta al giorno, ad esempio alle 03:00
0 3 * * * curl -s \
  "https://<PROGETTO>.supabase.co/rest/v1/keepalive?select=*&limit=1" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>"
```

**Nota critica:** il ping deve interrogare realmente il database (query su una tabella), non un endpoint di health check. Solo così la richiesta attraversa PostgREST e raggiunge Postgres, resettando il timer di inattività.

**Secondo ping — GitHub Actions (A2).** Oltre al Raspberry Pi, un workflow schedulato giornaliero (`on: schedule`) esegue lo stesso `curl` alla tabella `keepalive`. Se uno dei due ping fallisce, l'altro copre. Costo aggiuntivo: 0 €; GitHub Actions consuma pochi secondi al giorno, ampiamente dentro i limiti del piano gratuito.

### 5.8 Export periodico e backup

**Stato attuale:** l'export settimanale è automatico ed eseguito dal Raspberry Pi. Il Pi scarica i dati da Supabase e li carica su Cloudflare R2 / Backblaze B2 in pipe, senza scrittura locale sulla SD.

- **Autenticazione dell'export:** da definire in fase di implementazione (Edge Function con token dedicato, oppure `pg_dump`). La `anon key` da sola non basta se la RLS limita la lettura ai membri autenticati.
- **`service_role`:** resta solo lato server, mai sul Raspberry Pi, mai nel frontend, mai in Git.
- **Storage:** Cloudflare R2 o Backblaze B2, 10 GB gratuiti, compatibili S3.
- **Frequenza:** settimanale; frequenza minima accettabile: mensile.

### 5.9 Cosa NON possono fare gli agenti (e deve fare l'umano)

| Attività | Chi | Perché |
|:-----------------------------------------|:---------|:------------------------------------------------------|
| Creare account Supabase/Vercel | Umano | Verifica email, accettazione termini |
| Accettare i termini del Marketplace | Umano | Vercel CLI reindirizza al browser |
| Configurare la service_role key | Umano | Non deve mai finire nel frontend o in repo pubblici |
| Revisionare le policy RLS | Umano | Gli agenti possono sbagliare; RLS errata = dati esposti |
| Testare il ripristino da backup | Umano | Un backup non testato non è un backup |
| Decidere la strategia di parallelismo | Umano | Gli agenti non coordinano la propria concorrenza |

**Gestione dei secret — vincolo non negoziabile.** La `SERVICE_ROLE_KEY` (o `SECRET_KEY`):

- mai nel codice frontend;
- mai in un repository Git (nemmeno privato, per abitudine);
- mai in un file `.env` committato;
- solo in variabili d'ambiente lato server (Vercel Environment Variables, CI/CD secrets, o `.env.local` non tracciato).

La `ANON_KEY` (o `PUBLISHABLE_KEY`) è l'unica chiave che può stare nel frontend e nel cron di keepalive del Raspberry Pi. Gli agenti vanno istruiti esplicitamente a non committare chiavi e a usare `.gitignore` per `.env*`.

## 6. Modello dati (bozza)

**Bozza di lavoro, da raffinare in fase di testing.** Le scelte su stati, flag `urgent`, quantità e categorie sono rimandate al testing dell'MVP.

```
families (id, name, created_at)
members (id, family_id, email, display_name, role, created_at)
items (
  id, family_id, name, category,
  status ('to_buy' | 'bought' | 'finished'),
  note, quantity,
  created_by, created_at, updated_at, bought_at
)
push_subscriptions (id, member_id, endpoint, keys, created_at)
keepalive (id, last_ping)
```

- `status = 'finished'` è la segnalazione "è finito": genera notifica e l'articolo compare in lista come urgente.
- `status = 'bought'` archivia l'articolo, che però resta nello storico.
- `keepalive` contiene una sola riga e serve esclusivamente al ping giornaliero.

## 7. Sicurezza (punti chiave)

- HTTPS obbligatorio, gestito da Vercel e Supabase.
- **Auth:** email + password tramite Supabase (magic link come estensione post-MVP); registrazione pubblica con famiglia personale, conferma email obbligatoria e inviti con codice. La creazione della famiglia passa da una RPC `security definer`, non da insert diretti.
- **Autorizzazione:** Row Level Security attiva su ogni tabella; ogni query filtrata per il `family_id` dell'utente. La revisione delle policy è umana.
- **Push:** endpoint e chiavi salvati per membro; revoca alla rimozione del membro; nessun fallback esterno, badge in-app alla riapertura.
- **Rate limiting** sulle API di aggiunta (evita spam e abusi).
- **Secret:** `SERVICE_ROLE_KEY` solo lato server, `ANON_KEY` l'unica chiave pubblica (vedi §5.9).
- Nessun dato sensibile oltre alla lista; backup del provider da verificare, più export periodico indipendente (§5.8).
- La tabella `keepalive` espone solo un timestamp, nessun dato della lista.

## 8. Stack applicativo (concreto)

| Componente | Scelta | Motivo |
|:-------------------|:------------------------------------------|:--------------------------------------------|
| Frontend | SvelteKit o Preact + Vite (PWA) | Mobile-first, installabile |
| Accesso dati | Supabase JS client + RLS | Niente API custom per il CRUD base |
| Logica server | Supabase Edge Functions (Deno) | Solo per i casi che richiedono `service_role` |
| Push | Web Push (service worker, VAPID) | Standard, gratuito |
| Keepalive | Raspberry Pi + cron | Ping giornaliero al database |
| Backup | Export JSON settimanale su Cloudflare R2 / Backblaze B2 | Copia fuori da Supabase |
| Codebase | GitHub | Sorgente e trigger dei deploy Vercel |
| Monitoraggio | Sentry free tier (opzionale) | Errori in produzione |

## 9. Costi

- **Costo mensile: 0 €** (Vercel Hobby + Supabase Free + GitHub + R2/B2 free tier).
- Nessuna carta di credito richiesta per i piani gratuiti.
- **Limiti da monitorare:** pausa di Supabase dopo 7 giorni di inattività (coperta dal keepalive), banda e storage del free tier, Vercel Hobby per progetti non commerciali.
- Il Raspberry Pi è hardware già disponibile: costo marginale nullo, traffico di pochi KB al giorno.
- Eventuali upgrade ai piani a pagamento restano fuori scope.

## 10. Fasi di sviluppo

| Fase | Durata | Contenuto |
|:-----------------------------|:-----------------|:--------------------------------------------------|
| Setup | 1 gg | Repo GitHub, progetto Supabase (auth, schema, RLS), integrazione Vercel Marketplace, deploy preview/produzione, tabella keepalive e cron sul Raspberry Pi, export settimanale su R2/B2 |
| MVP lista | 2–3 gg | CRUD articoli, realtime, UI mobile-first |
| Segnalazione "finito" + push | 1–2 gg | Service worker, notifiche, permessi |
| Storico e categorie | 1 gg | Suggerimenti, raggruppamento |
| Test con famiglia reale | 1 settimana | Uso quotidiano, correzioni |
| PWA / installabilità + rifiniture | 1 gg | Manifest, icone, ritocchi |

**Totale realistico:** circa 1–1,5 settimane di lavoro effettivo per un MVP usabile.

## 11. Rischi e mitigazioni

| Rischio | Mitigazione |
|:----------------------------------------------------------|:--------------------------------------------------------------|
| Pausa del progetto Supabase dopo 7 giorni di inattività | Keepalive giornaliero dal Raspberry Pi, con ping reale al database |
| Raspberry Pi spento, offline o SD corrotta | Il Pi non contiene dati, solo lo script: si ricrea; prevedere un avviso quando il ping fallisce |
| Limiti del free tier Supabase (storage, banda, dimensione DB) | Lista familiare di pochi KB: ampiamente sotto i limiti |
| Lock-in su Supabase | Schema Postgres standard + export JSON periodico |
| Fuga di secret (`service_role`) | `SERVICE_ROLE_KEY` solo in variabili d'ambiente, `.gitignore` per `.env*`, revisione umana delle PR |
| Agenti in parallelo che si contaminano | Worktree isolati con Supabase locale per agente, oppure lavoro sequenziale |
| Web Push su iOS: supporto migliorato ma con limiti | Badge in-app alla riapertura; nessun fallback esterno |
| Conflitti realtime | Last-write-wins accettabile per una lista familiare |
| Abbandono dello strumento | Keep it simple, notifiche utili, zero attrito nell'aggiunta |

## 12. Criteri di successo

- Aggiungere un articolo in ≤ 2 tap da mobile.
- Notifica ricevuta in < 2 s dall'aggiunta.
- Nessun articolo perso in una settimana di uso reale.
- Progetto Supabase mai in pausa per 30 giorni consecutivi (keepalive funzionante).
- Export settimanale verificato, con almeno un ripristino di prova riuscito.
- Costo mensile effettivo: 0 €.

## 13. Punti aperti

- **Schema dati:** bozza da raffinare in fase di testing (stati degli articoli, flag `urgent`, formato della quantità, normalizzazione delle categorie).
- **Magic link:** estensione post-MVP; richiede SMTP configurato e ha limiti di invio.

## Note di revisione

Punti emersi dalla rilettura, da chiarire prima di partire:

- **Keepalive come dipendenza domestica:** un progetto gestito che si appoggia a un Raspberry Pi per restare attivo sposta il rischio sulla propria rete. Il secondo ping su GitHub Actions (A2) copre il caso in cui il Pi sia spento.
- **Export con la anon key:** una policy che consente la lettura solo ai membri autenticati non basta al cron, che si presenta come `anon`. Il meccanismo definitivo (Edge Function con token dedicato o `pg_dump`) resta da definire in implementazione (A1).
- **Backup di Supabase Free:** da verificare prima di contarci; in assenza di backup automatici il paracadute è solo l'export.
- **Stati degli articoli:** `to_buy`, `bought` e `finished` non sono del tutto coerenti. La decisione è rinviata al testing dell'MVP (A3).
- **Schema:** chiavi, vincoli di unicità e normalizzazione delle categorie vengono aggiunti in implementazione, non nel documento di studio (A3).
- **Magic link:** post-MVP (A4); richiede SMTP configurato e ha limiti di invio. Per l'MVP resta email + password.
- **iOS e push:** nessun fallback esterno (A5): l'app mostra un badge in-app alla riapertura.
- **Dati personali:** email dei membri e storico degli acquisti sono dati personali; conviene prevedere cancellazione dell'account/famiglia ed export, anche in un progetto domestico.

## 14. Addendum — Decisioni aggiornate

In caso di conflitto con il corpo del documento, prevale questo addendum.

### A1. Export e backup

L'export settimanale è **automatico, eseguito dal Raspberry Pi**. Il Pi scarica i dati da Supabase e li carica su Cloudflare R2 / Backblaze B2 in pipe, senza scrittura locale sulla SD.

- Il meccanismo di autenticazione dell'export (Edge Function con token dedicato, oppure `pg_dump`) è **da discutere in fase di implementazione**: nel documento va indicato come "da definire", con la nota che la `anon key` da sola non basta se la RLS limita la lettura ai membri autenticati.
- La `service_role` resta solo lato server, mai nel Pi, mai nel frontend, mai in Git.
- Frequenza: settimanale. Frequenza minima accettabile: mensile.

### A2. Keepalive

Si adottano **due ping indipendenti**:

1. Raspberry Pi, cron giornaliero (come già descritto in §5.7).
2. GitHub Actions, workflow schedulato giornaliero con lo stesso `curl` alla tabella `keepalive`.

Se uno fallisce, l'altro copre. Costo aggiuntivo: 0 €. GitHub Actions consuma pochi secondi al giorno, ampiamente nei limiti del piano gratuito.

### A3. Modello dati

Lo schema della sezione 6 resta **una bozza di lavoro**, non una specifica definitiva. Le scelte su stati degli articoli, flag "urgente", formato della quantità e normalizzazione delle categorie sono **rimandate alla fase di testing dell'MVP**, quando ci sarà chiaro cosa serve davvero.

- Per l'MVP si parte da uno schema minimale: `families`, `members`, `items`, `push_subscriptions`, `keepalive`.
- Le chiavi primarie/esterne e i vincoli di unicità vanno aggiunti in implementazione, non nel documento di studio.
- La sezione 6 va marcata come "bozza, da raffinare in testing".

### A4. Autenticazione

Per l'MVP: **email + password** tramite Supabase Auth (la base).

Il **magic link** è un'aggiunta **desiderabile ma non bloccante**: si valuta dopo l'MVP, perché richiede SMTP configurato e ha limiti di invio.

Nel documento va scritto: "email + password per l'MVP; magic link come estensione post-MVP".

### A5. Fallback notifiche

**Nessun fallback** (né email né Telegram). Se le push non arrivano (tipico su iOS), l'app mostra un badge/contatore alla successiva apertura. Il fallback è stato valutato e scartato perché aggiunge fastidio e complessità senza beneficio per una lista familiare.

### A6. Definition of done (MVP)

L'MVP è "pronto" quando:

- un membro aggiunge un articolo in ≤ 2 tap da mobile;
- un altro membro riceve la notifica in < 2 s;
- la segnalazione "è finito" funziona e genera notifica;
- lo storico permette di riaggiungere un articolo in un tap;
- il progetto Supabase non è mai andato in pausa per 30 giorni consecutivi;
- l'export settimanale è stato eseguito almeno una volta e un ripristino di prova è riuscito;
- il costo mensile effettivo è 0 €.

### A7. Cosa resta fuori dall'MVP (confermato)

- Quantità strutturate, più liste, offline completo, faccende, widget, integrazione supermercati, multi-famiglia.
- Magic link, fallback notifiche, normalizzazione categorie: post-MVP.
