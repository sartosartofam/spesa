---

name: rls-review
description: Checklist per revisionare policy RLS Supabase su una famiglia chiusa, con test di isolamento tra famiglie e accesso anonimo.
---

# RLS review

Per ogni tabella in `public`:
- [ ] `relrowsecurity` è `true`.
- [ ] Nessuna policy `using (true)` tranne `keepalive` in sola lettura.
- [ ] `select` filtra per `family_id` dell'utente autenticato.
- [ ] `insert` forza `family_id` alla famiglia dell'utente (non si fida del client).
- [ ] `update`/`delete` usano `using` **e** `with check` corretti.
- [ ] `members` non permette di cambiare `family_id` o `role` senza autorizzazione.
- [ ] `push_subscriptions` è accessibile solo al membro proprietario.
- [ ] Il ruolo `anon` non ha accesso a dati della lista.
- [ ] `service_role` non è usato nel frontend.

## Test minimi

1. Utente della famiglia A vede solo articoli di A.
2. Utente della famiglia A non può inserire un articolo con `family_id` di B.
3. Utente della famiglia A non può aggiornare o cancellare articoli di B.
4. Anonimo non può leggere `items`, `members`, `push_subscriptions`.
5. Anonimo può leggere solo `keepalive`.

Se un test non è scrivibile con pgTAP, documenta il caso in `docs/test-rls.md` e chiedi review umana.
