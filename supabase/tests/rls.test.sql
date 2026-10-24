begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

-- Dati di partenza. Il test gira come `postgres`, che è owner delle tabelle e
-- quindi bypassa la RLS: questi insert servono solo a predisporre lo scenario.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.test'),
  ('33333333-3333-3333-3333-333333333333', 'c@example.test');

insert into public.families (id, name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Famiglia A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Famiglia B');

insert into public.members (id, family_id, email, display_name) values
  (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'a@example.test',
    'Membro A'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'b@example.test',
    'Membro B'
  );

insert into public.items (id, family_id, name, created_by) values
  (
    'a1111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Latte A',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'b2222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Pane B',
    '22222222-2222-2222-2222-222222222222'
  );

insert into public.push_subscriptions (id, member_id, endpoint, keys) values
  (
    'a3333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'https://push.example/a',
    '{"p256dh":"a","auth":"a"}'
  ),
  (
    'b4444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    'https://push.example/b',
    '{"p256dh":"b","auth":"b"}'
  );

-- Famiglia dell'utente -------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.current_family_id(),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'current_family_id restituisce la famiglia di A'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  public.current_family_id(),
  null::uuid,
  'un utente senza membro non ha famiglia'
);

reset role;

-- Famiglia A ----------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.items),
  1,
  'A vede un solo articolo'
);
select is(
  (select name from public.items),
  'Latte A',
  'A vede il proprio articolo'
);
select is(
  (select count(*)::int from public.families),
  1,
  'A vede solo la propria famiglia'
);
select is(
  (select count(*)::int from public.members),
  1,
  'A vede solo i membri della propria famiglia'
);
select is(
  (select count(*)::int from public.push_subscriptions),
  1,
  'A vede solo la propria subscription'
);

with changed as (
  update public.items
  set name = 'HACK'
  where id = 'b2222222-2222-2222-2222-222222222222'
  returning 1
)
select is(
  (select count(*)::int from changed),
  0,
  'A non può modificare un articolo di B'
);

select lives_ok(
  $$ update public.items
     set quantity = '2 litri', note = 'Aggiornato'
     where id = 'a1111111-1111-1111-1111-111111111111' $$,
  'A può aggiornare le colonne consentite del proprio articolo'
);

select is(
  (
    select quantity
    from public.items
    where id = 'a1111111-1111-1111-1111-111111111111'
  ),
  '2 litri',
  'la quantità aggiornata è visibile ad A'
);

select throws_ok(
  $$ update public.items
     set created_by = '22222222-2222-2222-2222-222222222222'
     where id = 'a1111111-1111-1111-1111-111111111111' $$,
  '42501',
  'permission denied for table items',
  'A non può modificare created_by'
);

select throws_ok(
  $$ select public.set_updated_at() $$,
  '42501',
  'permission denied for function set_updated_at',
  'le funzioni trigger non sono richiamabili via API'
);

with deleted as (
  delete from public.items
  where id = 'b2222222-2222-2222-2222-222222222222'
  returning 1
)
select is(
  (select count(*)::int from deleted),
  0,
  'A non può cancellare un articolo di B'
);

with changed as (
  update public.families
  set name = 'HACK'
  where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  returning 1
)
select is(
  (select count(*)::int from changed),
  0,
  'A non può modificare la famiglia B'
);

select throws_ok(
  $$ insert into public.items (family_id, name)
     values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Intruso') $$,
  '42501',
  'new row violates row-level security policy for table "items"',
  'A non può inserire un articolo nella famiglia B'
);

select lives_ok(
  $$ insert into public.items (family_id, name)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nuovo articolo A') $$,
  'A può inserire un articolo nella propria famiglia'
);

select throws_ok(
  $$ insert into public.push_subscriptions (member_id, endpoint, keys)
     values (
       '22222222-2222-2222-2222-222222222222',
       'https://push.example/intruso',
       '{"p256dh":"x","auth":"x"}'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "push_subscriptions"',
  'A non può registrare una subscription per B'
);

select lives_ok(
  $$ insert into public.push_subscriptions (member_id, endpoint, keys)
     values (
       '11111111-1111-1111-1111-111111111111',
       'https://push.example/a2',
       '{"p256dh":"x","auth":"x"}'
     ) $$,
  'A può registrare una propria subscription'
);

with changed as (
  update public.push_subscriptions
  set endpoint = 'https://push.example/hack'
  where id = 'b4444444-4444-4444-4444-444444444444'
  returning 1
)
select is(
  (select count(*)::int from changed),
  0,
  'A non può modificare la subscription di B'
);

reset role;

-- Utente autenticato senza famiglia -----------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.items),
  0,
  'un utente senza famiglia non vede articoli'
);
select is(
  (select count(*)::int from public.families),
  0,
  'un utente senza famiglia non vede famiglie'
);
select is(
  (select count(*)::int from public.members),
  0,
  'un utente senza famiglia non vede membri'
);
select is(
  (select count(*)::int from public.push_subscriptions),
  0,
  'un utente senza famiglia non vede subscription'
);

reset role;

-- Anon ----------------------------------------------------------------------

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select throws_ok(
  $$ select * from public.items $$,
  '42501',
  'permission denied for table items',
  'anon non può leggere items'
);
select throws_ok(
  $$ select * from public.members $$,
  '42501',
  'permission denied for table members',
  'anon non può leggere members'
);
select throws_ok(
  $$ select * from public.push_subscriptions $$,
  '42501',
  'permission denied for table push_subscriptions',
  'anon non può leggere push_subscriptions'
);
select throws_ok(
  $$ select * from public.families $$,
  '42501',
  'permission denied for table families',
  'anon non può leggere families'
);
select is(
  (select count(*)::int from public.keepalive),
  1,
  'anon può leggere solo keepalive'
);

reset role;

select * from finish();
rollback;
