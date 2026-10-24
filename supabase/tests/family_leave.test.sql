begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

-- Permessi --------------------------------------------------------------------

select ok(
  has_function_privilege('authenticated', 'public.leave_family(uuid)', 'execute'),
  'authenticated può uscire dalla famiglia'
);

select ok(
  not has_function_privilege('anon', 'public.leave_family(uuid)', 'execute'),
  'anon non può uscire dalla famiglia'
);

-- Scenario ---------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  (
    '11111111-1111-1111-1111-111111111111',
    'owner@example.test',
    '{"display_name":"Owner A","family_name":"Famiglia Personale A"}'::jsonb
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'oldest@example.test',
    '{"display_name":"Membro Vecchio","family_name":"Famiglia Personale B"}'::jsonb
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'younger@example.test',
    '{"display_name":"Membro Giovane","family_name":"Famiglia Personale C"}'::jsonb
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'other@example.test',
    '{"display_name":"Owner B","family_name":"Famiglia Personale D"}'::jsonb
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'solo@example.test',
    '{"display_name":"Membro Solo","family_name":"Nuova Famiglia Solo"}'::jsonb
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'nofamily@example.test',
    '{}'::jsonb
  );

insert into public.families (id, name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Famiglia A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Famiglia B'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Famiglia C');

insert into public.members (id, family_id, email, display_name, role, created_at) values
  (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'owner@example.test',
    'Owner A',
    'owner',
    '2026-01-01T10:00:00Z'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'oldest@example.test',
    'Membro Vecchio',
    'member',
    '2026-01-02T10:00:00Z'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'younger@example.test',
    'Membro Giovane',
    'member',
    '2026-01-03T10:00:00Z'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'other@example.test',
    'Owner B',
    'owner',
    '2026-01-01T10:00:00Z'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'solo@example.test',
    'Membro Solo',
    'owner',
    '2026-01-01T10:00:00Z'
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
    '44444444-4444-4444-4444-444444444444'
  ),
  (
    'c3333333-3333-3333-3333-333333333333',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Uova C',
    '55555555-5555-5555-5555-555555555555'
  );

-- Un owner esce e lascia altri membri: passa al più vecchio -----------------

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$
    select left_family_id, new_owner_id, new_family_name
    from public.leave_family('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  $$,
  $$values (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'Famiglia Personale A'::text
  )$$,
  'l''owner esce e il ruolo passa al membro più vecchio'
);

reset role;

select is(
  (select count(*)::int from public.families where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'la vecchia famiglia resta perché ha altri membri'
);

select is(
  (
    select role
    from public.members
    where id = '22222222-2222-2222-2222-222222222222'
  ),
  'owner',
  'il membro più vecchio diventa owner'
);

select is(
  (
    select role
    from public.members
    where id = '33333333-3333-3333-3333-333333333333'
  ),
  'member',
  'il membro più giovane resta member'
);

select isnt(
  (
    select family_id
    from public.members
    where id = '11111111-1111-1111-1111-111111111111'
  ),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'chi esce non è più nella vecchia famiglia'
);

select is(
  (
    select f.name
    from public.families f
    join public.members m on m.family_id = f.id
    where m.id = '11111111-1111-1111-1111-111111111111'
  ),
  'Famiglia Personale A',
  'chi esce riceve una nuova famiglia personale'
);

select is(
  (
    select role
    from public.members
    where id = '11111111-1111-1111-1111-111111111111'
  ),
  'owner',
  'chi esce è owner della nuova famiglia'
);

select is(
  (
    select count(*)::int
    from public.items
    where family_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  1,
  'la lista della vecchia famiglia resta'
);

select is(
  (
    select count(*)::int
    from public.items
    where family_id = (
      select family_id
      from public.members
      where id = '11111111-1111-1111-1111-111111111111'
    )
  ),
  0,
  'la nuova famiglia parte con una lista vuota'
);

select is(
  (
    select count(*)::int
    from public.members
    where family_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and role = 'owner'
  ),
  1,
  'la vecchia famiglia ha ancora un owner'
);

select is(
  (
    select created_by
    from public.items
    where id = 'a1111111-1111-1111-1111-111111111111'
  ),
  null::uuid,
  'l''articolo resta nella vecchia famiglia senza creatore'
);

-- Un member esce: nessuna successione ----------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$
    select left_family_id, new_owner_id, new_family_name
    from public.leave_family('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  $$,
  $$values (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    null::uuid,
    'Famiglia Personale C'::text
  )$$,
  'un member esce senza cambiare owner'
);

reset role;

select is(
  (
    select role
    from public.members
    where id = '22222222-2222-2222-2222-222222222222'
  ),
  'owner',
  'l''owner esistente resta al suo posto'
);

select is(
  (
    select count(*)::int
    from public.members
    where family_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  1,
  'nella vecchia famiglia resta solo l''owner'
);

select is(
  (
    select f.name
    from public.families f
    join public.members m on m.family_id = f.id
    where m.id = '33333333-3333-3333-3333-333333333333'
  ),
  'Famiglia Personale C',
  'anche il member riceve una nuova famiglia'
);

select is(
  (
    select role
    from public.members
    where id = '33333333-3333-3333-3333-333333333333'
  ),
  'owner',
  'il member è owner della sua nuova famiglia'
);

-- Unico membro: la vecchia famiglia viene eliminata --------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$
    select left_family_id, new_owner_id, new_family_name
    from public.leave_family('cccccccc-cccc-cccc-cccc-cccccccccccc')
  $$,
  $$values (
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
    null::uuid,
    'Nuova Famiglia Solo'::text
  )$$,
  'l''unico membro esce e riceve una nuova famiglia'
);

reset role;

select is(
  (
    select count(*)::int
    from public.families
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  ),
  0,
  'la vecchia famiglia senza membri viene eliminata'
);

select is(
  (
    select count(*)::int
    from public.items
    where family_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  ),
  0,
  'la lista della famiglia eliminata sparisce'
);

select is(
  (
    select f.name
    from public.families f
    join public.members m on m.family_id = f.id
    where m.id = '55555555-5555-5555-5555-555555555555'
  ),
  'Nuova Famiglia Solo',
  'l''utente solo ha una nuova famiglia'
);

select is(
  (
    select role
    from public.members
    where id = '55555555-5555-5555-5555-555555555555'
  ),
  'owner',
  'l''utente solo è owner della nuova famiglia'
);

-- La famiglia di un altro utente non cambia ----------------------------------

select is(
  (select count(*)::int from public.families where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  1,
  'la famiglia di un altro utente resta'
);

select is(
  (
    select role
    from public.members
    where id = '44444444-4444-4444-4444-444444444444'
  ),
  'owner',
  'l''owner di un''altra famiglia resta owner'
);

select is(
  (
    select count(*)::int
    from public.items
    where family_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  ),
  1,
  'la lista di un''altra famiglia resta'
);

-- Errori ---------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$ select * from public.leave_family('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'P0002',
  'Famiglia non trovata. Ricarica l’app.',
  'un utente senza famiglia non può uscire'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$ select * from public.leave_family('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'P0002',
  'La famiglia è cambiata. Ricarica l’app.',
  'una richiesta stale non fa uscire dalla nuova famiglia'
);

select throws_ok(
  $$ select * from public.leave_family(null) $$,
  '22023',
  'Famiglia non valida.',
  'la famiglia è obbligatoria'
);

reset role;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select throws_ok(
  $$ select * from public.leave_family('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') $$,
  '42501',
  'permission denied for function leave_family',
  'anon non può chiamare la RPC'
);

select * from finish();
rollback;
