begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

select is(
  (
    select count(*)::int
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'items'
      and indexname = 'items_family_status_identity_key'
  ),
  1,
  'l''indice di identità esiste'
);

-- La famiglia 00000000-0000-4000-8000-000000000001 arriva dal seed; la seconda
-- serve per il test di isolamento tra famiglie.
insert into public.families (id, name)
values ('00000000-0000-4000-8000-000000000002', 'Famiglia Test Duplicati')
on conflict (id) do nothing;

-- Dati di prova: due famiglie, stesso nome, categorie con maiuscole diverse.
insert into public.items (
  id,
  family_id,
  name,
  category,
  status,
  urgent,
  note,
  quantity,
  created_by
)
values
  (
    '00000000-0000-4000-8000-000000009101',
    '00000000-0000-4000-8000-000000000001',
    'Latte',
    'Frutta e verdura',
    'to_buy',
    false,
    null,
    '1',
    null
  ),
  (
    '00000000-0000-4000-8000-000000009201',
    '00000000-0000-4000-8000-000000000002',
    'Latte',
    'Dispensa',
    'to_buy',
    false,
    null,
    '1',
    null
  );

-- Stessa identità esatta: violazione dell'indice.
select throws_ok(
  $$ insert into public.items (id, family_id, name, category, status, quantity)
     values (
       '00000000-0000-4000-8000-000000009102',
       '00000000-0000-4000-8000-000000000001',
       'Latte',
       'Frutta e verdura',
       'to_buy',
       '2'
     ) $$,
  '23505',
  'duplicate key value violates unique constraint "items_family_status_identity_key"',
  'stesso nome, categoria e status nella stessa famiglia rifiutati'
);

-- Maiuscole e spazi esterni non aggirano il vincolo.
select throws_ok(
  $$ insert into public.items (id, family_id, name, category, status, quantity)
     values (
       '00000000-0000-4000-8000-000000009103',
       '00000000-0000-4000-8000-000000000001',
       ' latte ',
       'frutta e verdura',
       'to_buy',
       '1'
     ) $$,
  '23505',
  'duplicate key value violates unique constraint "items_family_status_identity_key"',
  'casse e spazi non creano un articolo diverso'
);

-- Stesso nome in storico: riga diversa, ammessa.
select lives_ok(
  $$ insert into public.items (id, family_id, name, category, status, quantity, bought_at)
     values (
       '00000000-0000-4000-8000-000000009104',
       '00000000-0000-4000-8000-000000000001',
       'Latte',
       'Frutta e verdura',
       'bought',
       '1',
       now()
     ) $$,
  'stesso nome nello storico è un altro articolo'
);

-- Categoria diversa: ammessa.
select lives_ok(
  $$ insert into public.items (id, family_id, name, category, status, quantity)
     values (
       '00000000-0000-4000-8000-000000009105',
       '00000000-0000-4000-8000-000000000001',
       'Latte',
       'Dispensa',
       'to_buy',
       '1'
     ) $$,
  'categoria diversa è un altro articolo'
);

-- Famiglia diversa: ammessa.
select lives_ok(
  $$ insert into public.items (id, family_id, name, category, status, quantity)
     values (
       '00000000-0000-4000-8000-000000009106',
       '00000000-0000-4000-8000-000000000002',
       'latte',
       'frutta e verdura',
       'to_buy',
       '3'
     ) $$,
  'famiglia diversa è un altro articolo'
);

-- I rifiuti non hanno lasciato righe: quattro insert riusciti in tutto.
select is(
  (select count(*)::int from public.items where name ilike 'latte'),
  5,
  'restano solo gli articoli ammessi'
);

-- Aggiornare un articolo verso un'identità già occupata viola l'indice.
select throws_ok(
  $$ update public.items
     set category = 'frutta e verdura'
     where id = '00000000-0000-4000-8000-000000009105' $$,
  '23505',
  'duplicate key value violates unique constraint "items_family_status_identity_key"',
  'un aggiornamento non può creare un duplicato'
);

select * from finish();
rollback;
