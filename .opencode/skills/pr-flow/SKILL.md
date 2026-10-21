---

name: pr-flow
description: Flusso standard per portare un task di spesa da branch a PR su dev, con verify, commit e auto-merge condizionato alla CI.
---

# PR flow

1. **Branch**: parti da `dev`, mai da `main`.

   ```bash
   git switch dev && git pull --ff-only
   git switch -c feat/<area>-<nome>
   ```
2. **Sviluppo**: un solo task, file del proprio ruolo.
3. **Verifica**:

   ```bash
   npm run verify
   # se tocchi schema/RLS:
   npx supabase test db
   # se tocchi il flusso UI:
   npm run test:e2e
   ```
4. **Commit**: messaggio chiaro, imperativo, con prefisso (`feat:`, `fix:`, `test:`, `chore:`).
5. **Push**:

   ```bash
   git push -u origin HEAD
   ```
6. **PR verso `dev`**:

   ```bash
   gh pr create --base dev --fill
   ```

   Compila cosa cambia, come testare, cosa resta fuori.
7. **Auto-merge** solo con CI verde:

   ```bash
   gh pr merge --auto --squash
   ```
8. **Mai** merge o push su `main`. La promozione è umana.

Se `gh` non è autenticato, fermati e chiedi `gh auth login`.
