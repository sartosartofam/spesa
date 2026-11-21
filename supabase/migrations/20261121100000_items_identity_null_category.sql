-- Allinea l'indice di identità degli articoli al client.
--
-- `items.category` è nullable (lo schema nasce prima delle categorie condivise)
-- e il client normalizza sempre il vuoto in `Altro`
-- (`normalizeCategory()` in `src/lib/categories.ts`), quindi per l'app un
-- articolo senza categoria è già un articolo di "Altro".
--
-- L'indice originale usava `lower(btrim(category))` senza `coalesce`: su NULL
-- l'espressione vale NULL e in un indice unique NULL non collide mai con NULL
-- né con `Altro`. Ne seguiva un'incoerenza: due righe che l'app considera lo
-- stesso articolo potevano convivere, per esempio inserito uno via REST con
-- `category` assente e l'altro dall'interfaccia in "Altro".
--
-- Il vincolo `items_category_length` rifiuta già la stringa vuota
-- (`char_length` tra 1 e 30), quindi l'unico caso da coprire è NULL.
--
-- L'indice viene ricreato nello stesso statement transaction della migrazione,
-- quindi non esiste una finestra in cui l'unicità non è applicata. Se nella
-- base esistessero già due righe che solo il `coalesce` rende uguali, la
-- creazione dell'indice fallirebbe e la migrazione si annullerebbe: nessuna
-- riga viene cancellata in automatico, la deduplica resta una scelta umana.

create unique index items_family_status_identity_key_v2
  on public.items (
    family_id,
    status,
    lower(btrim(name)),
    lower(btrim(coalesce(category, 'Altro')))
  );

drop index public.items_family_status_identity_key;

alter index public.items_family_status_identity_key_v2
  rename to items_family_status_identity_key;

comment on index items_family_status_identity_key is
  'Un solo articolo per identità: famiglia, status, nome e categoria in minuscolo, con la categoria assente trattata come Altro.';
