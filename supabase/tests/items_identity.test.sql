begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

insert into public.families (id, name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Famiglia identità A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Famiglia identità B');

-- Indice ---------------------------------------------------------------------

select has_index(
  'public', 'items', 'items_family_identity_key',
  'l''indice di identità degli articoli esiste'
);

select ok(
  (
    select indisunique
    from pg_index
    where indexrelid = 'public.items_family_identity_key'::regclass
  ),
  'l''indice di identità è unico'
);

-- Duplicati esatti -----------------------------------------------------------

insert into public.items (family_id, name, category)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Latte', 'Freschi');

select throws_ok(
  $$ insert into public.items (family_id, name, category)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Latte', 'Freschi') $$,
  '23505',
  null,
  'lo stesso nome e la stessa categoria non possono comparire due volte'
);

select throws_ok(
  $$ insert into public.items (family_id, name, category)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '  latte  ', '  Freschi  ') $$,
  '23505',
  null,
  'maiuscole e spazi esterni non aggirano l''identità'
);

-- Categoria normalizzata -----------------------------------------------------

insert into public.items (family_id, name, category)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Pile', null);

select throws_ok(
  $$ insert into public.items (family_id, name, category)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Pile', 'Altro') $$,
  '23505',
  null,
  'categoria null e "Altro" sono la stessa identità'
);

insert into public.items (family_id, name, category)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Sapone', '   ');

select throws_ok(
  $$ insert into public.items (family_id, name, category)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Sapone', 'Altro') $$,
  '23505',
  null,
  'una categoria di soli spazi equivale ad "Altro"'
);

-- Status, famiglia e categoria diversi --------------------------------------

insert into public.items (family_id, name, category, status)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Pane', 'Freschi', 'to_buy'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Pane', 'Freschi', 'bought');

select is(
  (
    select count(*)::int
    from public.items
    where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and lower(name) = 'pane'
  ),
  2,
  'lo stesso articolo può stare in lista e nello storico'
);

insert into public.items (family_id, name, category)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Pasta', 'Dispensa'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Pasta', 'Dispensa');

select is(
  (
    select count(*)::int
    from public.items
    where lower(name) = 'pasta'
      and family_id in (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      )
  ),
  2,
  'la stessa identità è permessa in famiglie diverse'
);

insert into public.items (family_id, name, category)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Riso', 'Dispensa'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Riso', 'Casa');

select is(
  (
    select count(*)::int
    from public.items
    where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and lower(name) = 'riso'
  ),
  2,
  'la stessa identità è permessa in categorie diverse'
);

-- Update ---------------------------------------------------------------------

insert into public.items (family_id, name, category)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Biscotti', 'Dispensa'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Crackers', 'Dispensa');

select throws_ok(
  $$ update public.items
     set name = 'biscotti'
     where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
       and name = 'Crackers' $$,
  '23505',
  null,
  'una modifica che crea un duplicato viene rifiutata'
);

insert into public.items (family_id, name, category, status)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Yogurt', 'Freschi', 'to_buy'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Yogurt', 'Freschi', 'bought');

select throws_ok(
  $$ update public.items
     set status = 'bought'
     where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
       and name = 'Yogurt'
       and status = 'to_buy' $$,
  '23505',
  null,
  'spostare un articolo nello storico non crea un duplicato'
);

select * from finish();
rollback;
