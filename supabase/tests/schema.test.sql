begin;

create extension if not exists pgtap with schema extensions;

select plan(39);

-- Enum -----------------------------------------------------------------------

select ok(
  exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'item_status'
  ),
  'il tipo item_status esiste'
);

select is(
  (
    select array_agg(e.enumlabel order by e.enumsortorder)::text[]
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    join pg_enum e on e.enumtypid = t.oid
    where n.nspname = 'public' and t.typname = 'item_status'
  ),
  array['to_buy', 'bought']::text[],
  'item_status contiene solo to_buy e bought'
);

-- Tabelle --------------------------------------------------------------------

select has_table('public', 'families', 'la tabella families esiste');
select has_table('public', 'members', 'la tabella members esiste');
select has_table('public', 'items', 'la tabella items esiste');
select has_table('public', 'push_subscriptions', 'la tabella push_subscriptions esiste');

-- Primary key ----------------------------------------------------------------

select col_is_pk('public', 'families', 'id', 'families.id è la primary key');
select col_is_pk('public', 'members', 'id', 'members.id è la primary key');
select col_is_pk('public', 'items', 'id', 'items.id è la primary key');
select col_is_pk('public', 'push_subscriptions', 'id', 'push_subscriptions.id è la primary key');

-- Colonne e default ----------------------------------------------------------

select has_column('public', 'items', 'urgent', 'items.urgent esiste');
select col_not_null('public', 'items', 'status', 'items.status è not null');
select col_default_is('public', 'items', 'status', 'to_buy', 'items.status parte da to_buy');
select col_default_is('public', 'members', 'role', 'member', 'members.role parte da member');

-- Indici ---------------------------------------------------------------------

select has_index(
  'public', 'items', 'items_family_status_idx',
  'indice per famiglia e stato'
);
select has_index(
  'public', 'items', 'items_family_bought_at_idx',
  'indice per lo storico della famiglia'
);
select has_index(
  'public', 'items', 'items_family_name_lower_idx',
  'indice per la ricerca del nome senza distinzione di maiuscole'
);
select has_index(
  'public', 'members', 'members_family_id_idx',
  'indice per i membri della famiglia'
);
select has_index(
  'public', 'push_subscriptions', 'push_subscriptions_member_id_idx',
  'indice per le subscription del membro'
);

-- Trigger e funzioni ---------------------------------------------------------

select has_trigger(
  'public', 'items', 'items_set_updated_at',
  'trigger updated_at su items'
);
select has_trigger(
  'public', 'items', 'items_set_bought_at',
  'trigger bought_at/urgent su items'
);
select has_function('public', 'set_updated_at', 'la funzione set_updated_at esiste');
select has_function('public', 'set_bought_at', 'la funzione set_bought_at esiste');

-- RLS ------------------------------------------------------------------------

select ok(
  (select relrowsecurity from pg_class where oid = 'public.families'::regclass),
  'RLS abilitata su families'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.members'::regclass),
  'RLS abilitata su members'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.items'::regclass),
  'RLS abilitata su items'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.push_subscriptions'::regclass),
  'RLS abilitata su push_subscriptions'
);

-- Comportamento dei trigger --------------------------------------------------

insert into public.families (name) values ('Famiglia test schema');

insert into public.items (family_id, name, urgent)
select id, 'Latte', true
from public.families
where name = 'Famiglia test schema';

select is(
  (select status::text from public.items where name = 'Latte'),
  'to_buy',
  'un articolo nuovo nasce in lista'
);
select is(
  (select bought_at from public.items where name = 'Latte'),
  null,
  'un articolo in lista non ha bought_at'
);
select is(
  (select updated_at = created_at from public.items where name = 'Latte'),
  true,
  'updated_at parte uguale a created_at'
);

update public.items
set updated_at = '2000-01-01T00:00:00Z'
where name = 'Latte';

select ok(
  (
    select updated_at > '2000-01-01T00:00:00Z'::timestamptz
    from public.items
    where name = 'Latte'
  ),
  'il trigger aggiorna updated_at'
);

update public.items
set status = 'bought'
where name = 'Latte';

select ok(
  (select bought_at is not null from public.items where name = 'Latte'),
  'passando a bought viene impostato bought_at'
);
select is(
  (select urgent from public.items where name = 'Latte'),
  false,
  'passando a bought viene azzerato urgent'
);

update public.items
set status = 'to_buy'
where name = 'Latte';

select is(
  (select bought_at from public.items where name = 'Latte'),
  null,
  'tornando in lista viene azzerato bought_at'
);

-- Limiti sui testi liberi ----------------------------------------------------

select throws_ok(
  $$ insert into public.items (family_id, name, category)
     select id, 'Categoria lunga', repeat('x', 31)
     from public.families
     where name = 'Famiglia test schema' $$,
  '23514',
  null,
  'una categoria oltre 30 caratteri viene rifiutata'
);

select throws_ok(
  $$ insert into public.items (family_id, name, note)
     select id, 'Nota lunga', repeat('x', 121)
     from public.families
     where name = 'Famiglia test schema' $$,
  '23514',
  null,
  'una nota oltre 120 caratteri viene rifiutata'
);

select throws_ok(
  $$ insert into public.items (family_id, name, quantity)
     select id, 'Quantità lunga', repeat('x', 41)
     from public.families
     where name = 'Famiglia test schema' $$,
  '23514',
  null,
  'una quantità oltre 40 caratteri viene rifiutata'
);

insert into auth.users (id, email)
values ('44444444-4444-4444-4444-444444444444', 'schema@example.test');

insert into public.members (id, family_id, email, display_name)
select
  '44444444-4444-4444-4444-444444444444',
  id,
  'schema@example.test',
  'Membro schema'
from public.families
where name = 'Famiglia test schema';

select throws_ok(
  $$ insert into public.push_subscriptions (member_id, endpoint, keys)
     values (
       '44444444-4444-4444-4444-444444444444',
       'https://push.example/' || repeat('x', 2040),
       '{"p256dh":"a","auth":"b"}'
     ) $$,
  '23514',
  null,
  'un endpoint push oltre 2048 caratteri viene rifiutato'
);

select throws_ok(
  $$ insert into public.push_subscriptions (member_id, endpoint, keys)
     values (
       '44444444-4444-4444-4444-444444444444',
       'https://push.example/keys',
       jsonb_build_object('p256dh', repeat('x', 4100))
     ) $$,
  '23514',
  null,
  'chiavi push oltre 4096 caratteri vengono rifiutate'
);

select * from finish();
rollback;
