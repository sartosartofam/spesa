begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

-- Permessi --------------------------------------------------------------------

select ok(
  has_function_privilege('authenticated', 'public.rename_family(text)', 'execute'),
  'authenticated può rinominare la famiglia'
);

select ok(
  not has_function_privilege('anon', 'public.rename_family(text)', 'execute'),
  'anon non può rinominare la famiglia'
);

select ok(
  not has_column_privilege('authenticated', 'public.families', 'name', 'UPDATE'),
  'authenticated non può aggiornare direttamente families.name'
);

select ok(
  not has_table_privilege('authenticated', 'public.families', 'UPDATE'),
  'authenticated non può aggiornare direttamente families'
);

-- Scenario ---------------------------------------------------------------------

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'member@example.test'),
  ('33333333-3333-3333-3333-333333333333', 'other@example.test'),
  ('44444444-4444-4444-4444-444444444444', 'nofamily@example.test');

insert into public.families (id, name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Famiglia A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Famiglia B');

insert into public.members (id, family_id, email, display_name, role) values
  (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'owner@example.test',
    'Owner A',
    'owner'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'member@example.test',
    'Member A',
    'member'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'other@example.test',
    'Owner B',
    'owner'
  );

-- Owner -----------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$ select * from public.rename_family('  Famiglia Nuova  ') $$,
  $$ values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Famiglia Nuova'::text) $$,
  'l''owner rinomina la propria famiglia e il nome viene normalizzato'
);

reset role;

select is(
  (select name from public.families where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'Famiglia Nuova',
  'il nuovo nome è salvato'
);

select is(
  (select name from public.families where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'Famiglia B',
  'la famiglia di un altro utente non cambia'
);

-- Member ----------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$ select * from public.rename_family('Famiglia Hack') $$,
  '42501',
  'Solo un owner può rinominare la famiglia.',
  'un member non può rinominare la famiglia'
);

reset role;

select is(
  (select name from public.families where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'Famiglia Nuova',
  'il tentativo del member non modifica il nome'
);

-- Validazione -----------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$ select * from public.rename_family('   ') $$,
  '22023',
  'Il nome della famiglia non può essere vuoto.',
  'un nome vuoto viene rifiutato'
);

select throws_ok(
  $$ select * from public.rename_family(repeat('x', 81)) $$,
  '22023',
  'Il nome della famiglia è troppo lungo (massimo 80 caratteri).',
  'un nome oltre 80 caratteri viene rifiutato'
);

reset role;

-- Utente senza famiglia -------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$ select * from public.rename_family('Famiglia') $$,
  'P0002',
  'Famiglia non trovata. Ricarica l’app.',
  'un utente senza famiglia non può rinominare'
);

-- Update diretto --------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$ update public.families set name = 'Bypass' $$,
  '42501',
  'permission denied for table families',
  'l''update diretto del nome è bloccato anche per l''owner'
);

reset role;

-- Anon ------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select throws_ok(
  $$ select * from public.rename_family('Famiglia Anon') $$,
  '42501',
  'permission denied for function rename_family',
  'anon non può chiamare la RPC'
);

select * from finish();
rollback;
