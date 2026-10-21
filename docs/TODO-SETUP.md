# TODO setup — cose da fare / decidere

Stato al 21 ottobre 2026. Riferimenti: `AGENTS.md`, `docs/SETUP.md`, `docs/DECISIONS.md`.

## Fatto / verificato

- [x] Repo pubblico, default branch `dev`.
- [x] Auto-merge abilitato e delete branch on merge.
- [x] Secret GitHub `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
- [x] Workflow `keepalive` attivo.
- [x] CI verde su PR #12 e #13.
- [x] Schema e RLS mergiati; `npx supabase test db` verde (62 test).
- [x] Vercel: progetto creato, preset Vite.
- [x] Branch protection: regole dichiarate create (da verificare in UI).

## Branch protection

- [ ] Verificare in GitHub → Settings → Branches che esistano due regole: `dev` e `main`.
- [ ] Per entrambe: PR obbligatoria, 0 approvazioni, check obbligatori:
  - `lint, typecheck, unit, build`
  - `migrazioni e RLS (pgTAP)`
  - `Playwright`
- [ ] "Do not allow bypassing" attivo; force push e deletions disattivati.
- [ ] Se i check non sono selezionabili per `main`, aggiungerli dopo la prima PR `dev → main`.
- [ ] Testare con una PR di prova `test/branch-protection` → `dev`: il merge deve essere bloccato finché i check non sono verdi. Chiudere la PR senza merge e cancellare il branch.
- [ ] Verificare che l'auto-merge compaia sulla PR (repo setting già attivo).

### Promemoria: come creare la PR di prova

1. GitHub → branch `test/branch-protection` creato da `dev`.
2. Add file → `docs/test-branch-protection.md` → commit sul branch.
3. Compare & pull request → base `dev` → Create pull request.
4. Controllare i check e il merge bloccato.
5. Chiudere la PR senza merge e cancellare il branch.

## Vercel

- [ ] Risolvere "Git author 5PAC3 must have access to the project on Vercel".
  - Il progetto è nel team `sartofam`; aggiungere un membro richiede Pro.
  - Soluzione gratuita: trasferire il progetto su un account personale Hobby collegato a GitHub `5PAC3`.
  - In alternativa: allineare l'autore dei commit all'account che possiede Vercel.
- [ ] Verificare `Settings → Git`:
  - Connected repo: `sartosartofam/spesa`
  - Production Branch: `main` (non `dev`)
- [ ] Verificare `Settings → General → Node.js Version`: `24.x`.
- [ ] Verificare build: Vite, `npm run build`, output `dist`, root `./`.
- [ ] Verificare env vars Vercel (Production + Preview + Development):
  - `VITE_SUPABASE_URL` = URL progetto Supabase cloud
  - `VITE_SUPABASE_PUBLISHABLE_KEY` = anon/publishable key
  - Nessun `service_role` / `sb_secret_...`
- [ ] Redeploy dopo aver cambiato env vars o impostazioni.
- [ ] Verificare il check Vercel su una PR e aprire il preview URL.

## Keepalive

- [ ] Lanciare manualmente `Actions → keepalive → Run workflow` su `dev`.
- [ ] Se verde: URL, chiave e migrazioni cloud sono ok.
- [ ] Se 401: usare la chiave anon legacy (`eyJ...`) per `SUPABASE_ANON_KEY`; il workflow la manda anche come `Authorization: Bearer`.
- [ ] Se 404: applicare le migrazioni al progetto Supabase cloud.
- [ ] Se errore DNS: correggere `SUPABASE_URL`.

## Decisioni aperte

- [ ] Vercel: tenere il progetto in un account personale Hobby o passare a Pro per il team `sartofam`?
- [ ] Vercel: usare lo stesso progetto Supabase per Preview e Production o separarli?
- [ ] Branch protection: aggiungere anche il check Vercel tra quelli obbligatori dopo che è verde?
- [ ] Keepalive: usare anon JWT legacy o aggiornare il workflow per la publishable key?
- [ ] Quando promuovere `dev → main` per il primo deploy di produzione?

## Prossimo task

- [ ] Issue #4: seed, utenti test e tipi generati (`feat/db-seed-types`).

## Regole da non dimenticare

- Mai push diretto su `main`.
- Mai `service_role` nel frontend, in Git o nei log.
- Solo Supabase locale per gli agenti; niente `supabase link` / `db push` cloud.
- Un task = un branch = una PR piccola.
