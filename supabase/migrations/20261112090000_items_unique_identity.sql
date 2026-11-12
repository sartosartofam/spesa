-- Vincolo anti-duplicati sugli articoli (ADR-0001, fase 1).
--
-- Due articoli sono lo stesso prodotto se, nella stessa famiglia, hanno lo
-- stesso status (attiva o storico), lo stesso nome e la stessa categoria,
-- confrontati in modo insensibile a maiuscole e spazi esterni. Note e
-- urgenza non creano righe separate.
--
-- Il client applica il merge amichevole prima di ogni scrittura (vedi
-- `src/lib/data/item-merge.ts`): l'indice qui sotto è la rete di sicurezza
-- del database, per esempio in caso di due membri che aggiungono lo stesso
-- articolo nello stesso momento. Il PostgREST risponde `23505`, che il
-- repository traduce in "Esiste già un articolo con questi dati.".
--
-- Niente trigger di merge lato database: replicare in SQL le regole client
-- (somma delle quantità testuali, scelta della nota) introdurrebbe una
-- seconda implementazione da mantenere allineata senza benefici reali.

create unique index items_family_status_identity_key
  on public.items (
    family_id,
    status,
    lower(btrim(name)),
    lower(btrim(category))
  );

comment on index items_family_status_identity_key is
  'Un solo articolo per identità: famiglia, status, nome e categoria in minuscolo.';
