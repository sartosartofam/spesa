-- Identità unica degli articoli per famiglia e stato.
--
-- Il client unisce già i duplicati (src/lib/data/item-merge.ts), ma due
-- dispositivi possono inserire la stessa identità nello stesso momento: il
-- controllo applicativo non è atomico. Questo indice unico chiude la finestra
-- di gara e diventa l'invariante del database.
--
-- L'identità ricalca `identityKey()` del client:
--   famiglia + stato + nome normalizzato + categoria normalizzata.
-- Nota, urgenza e quantità non contano: vengono unite nella riga esistente.
-- `null`, stringa vuota e "Altro" sono la stessa categoria.
--
-- La migrazione non elimina né unisce dati esistenti: se trova duplicati si
-- ferma con un errore e lascia la deduplica a una decisione umana (AGENTS.md).

do $$
declare
  v_duplicates bigint;
begin
  select count(*)
  into v_duplicates
  from (
    select 1
    from public.items
    group by
      family_id,
      status,
      lower(btrim(name)),
      lower(coalesce(nullif(btrim(category), ''), 'Altro'))
    having count(*) > 1
  ) duplicate_groups;

  if v_duplicates > 0 then
    raise exception
      'items: % gruppi di articoli duplicati. Unire i dati prima di applicare l''indice unico.',
      v_duplicates
      using hint = $hint$Query: select family_id, status, lower(btrim(name)), lower(coalesce(nullif(btrim(category), ''), 'Altro')), count(*) from public.items group by 1, 2, 3, 4 having count(*) > 1;$hint$;
  end if;
end;
$$;

create unique index items_family_identity_key
  on public.items (
    family_id,
    status,
    lower(btrim(name)),
    lower(coalesce(nullif(btrim(category), ''), 'Altro'))
  );

comment on index public.items_family_identity_key is
  'Impedisce duplicati per famiglia, stato, nome e categoria normalizzati (identityKey del client).';
