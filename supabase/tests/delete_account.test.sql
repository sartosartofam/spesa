begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

-- Permessi --------------------------------------------------------------------

select ok(
  has_function_privilege('authenticated', 'public.delete_current_account()', 'execute'),
  'authenticated può cancellare il proprio account'
);

select ok(
  not has_function_privilege('anon', 'public.delete_current_account()', 'execute'),
  'anon non può cancellare account'
);

-- Scenario ---------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  (
    '11111111-1111-1111-1111-111111111111',
    'solo-delete@example.test',
    '{"display_name":"Solo"}'::jsonb
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'owner-delete@example.test',
    '{"display_name":"Owner"}'::jsonb
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'heir-delete@example.test',
    '{"display_name":"Heir"}'::jsonb
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'member-delete@example.test',
    '{"display_name":"Member"}'::jsonb
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'boss-delete@example.test',
    '{"display_name":"Boss"}'::jsonb
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'nofamily-delete@example.test',
    '{"display_name":"No Family"}'::jsonb
  );

insert into public.families (id, name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Famiglia Solo'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Famiglia Owner'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Famiglia Member');

insert into public.members (id, family_id, email, display_name, role, created_at) values
  (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'solo-delete@example.test',
    'Solo',
    'owner',
    '2026-01-01T10:00:00Z'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'owner-delete@example.test',
    'Owner',
    'owner',
    '2026-01-01T10:00:00Z'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'heir-delete@example.test',
    'Heir',
    'member',
    '2026-01-02T10:00:00Z'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'member-delete@example.test',
    'Member',
    'member',
    '2026-01-01T10:00:00Z'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'boss-delete@example.test',
    'Boss',
    'owner',
    '2026-01-01T10:00:00Z'
  );

insert into public.items (id, family_id, name, created_by) values
  (
    'a1111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Latte Solo',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    'b2222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Pane Owner',
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    'b3333333-3333-3333-3333-333333333333',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Uova Heir',
    '33333333-3333-3333-3333-333333333333'
  ),
  (
    'c4444444-4444-4444-4444-444444444444',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Pasta Member',
    '44444444-4444-4444-4444-444444444444'
  );

insert into public.push_subscriptions (member_id, endpoint, keys)
values (
  '11111111-1111-1111-1111-111111111111',
  'https://push.example.test/solo',
  '{"p256dh":"test","auth":"test"}'::jsonb
);

insert into public.user_settings (user_id, settings)
values (
  '11111111-1111-1111-1111-111111111111',
  '{"version":1,"quickAdd":true}'::jsonb
);

insert into public.family_invites (family_id, created_by, code_hash)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  encode(sha256(convert_to('ABCDEF123456', 'UTF8')), 'hex')
);

-- Un membro solo: sparisce account, famiglia, lista e dati personali ----------

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$ select public.delete_current_account() $$,
  'il membro solo cancella il proprio account'
);

reset role;

select is(
  (select count(*)::int from auth.users where id = '11111111-1111-1111-1111-111111111111'),
  0,
  'l''account Auth è stato eliminato'
);

select is(
  (
    select count(*)::int
    from public.families
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  0,
  'la famiglia senza altri membri è stata eliminata'
);

select is(
  (
    select count(*)::int
    from public.items
    where family_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  0,
  'la lista della famiglia eliminata è sparita'
);

select is(
  (select count(*)::int from public.user_settings where user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'le impostazioni personali sono state eliminate'
);

select is(
  (
    select count(*)::int
    from public.push_subscriptions
    where member_id = '11111111-1111-1111-1111-111111111111'
  ),
  0,
  'le subscription push sono state eliminate'
);

select is(
  (
    select count(*)::int
    from public.family_invites
    where created_by = '11111111-1111-1111-1111-111111111111'
  ),
  0,
  'gli inviti creati dall''utente sono stati eliminati'
);

-- Owner con altri membri: la famiglia resta e il ruolo passa ------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$ select public.delete_current_account() $$,
  'l''owner cancella il proprio account lasciando altri membri'
);

reset role;

select is(
  (select count(*)::int from auth.users where id = '22222222-2222-2222-2222-222222222222'),
  0,
  'l''account Auth dell''owner è stato eliminato'
);

select is(
  (
    select count(*)::int
    from public.families
    where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  ),
  1,
  'la famiglia con altri membri resta'
);

select is(
  (
    select role
    from public.members
    where id = '33333333-3333-3333-3333-333333333333'
  ),
  'owner',
  'il membro più vecchio diventa owner'
);

select is(
  (
    select created_by
    from public.items
    where id = 'b2222222-2222-2222-2222-222222222222'
  ),
  null::uuid,
  'l''articolo dell''owner resta senza creatore'
);

select is(
  (
    select created_by
    from public.items
    where id = 'b3333333-3333-3333-3333-333333333333'
  ),
  '33333333-3333-3333-3333-333333333333'::uuid,
  'l''articolo dell''altro membro resta intatto'
);

select is(
  (
    select count(*)::int
    from public.members
    where id = '22222222-2222-2222-2222-222222222222'
  ),
  0,
  'la membership dell''owner è stata eliminata'
);

-- Member con altri membri: la famiglia e l'owner restano ----------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$ select public.delete_current_account() $$,
  'il member cancella il proprio account'
);

reset role;

select is(
  (select count(*)::int from auth.users where id = '44444444-4444-4444-4444-444444444444'),
  0,
  'l''account Auth del member è stato eliminato'
);

select is(
  (
    select count(*)::int
    from public.families
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  ),
  1,
  'la famiglia del member resta'
);

select is(
  (
    select role
    from public.members
    where id = '55555555-5555-5555-5555-555555555555'
  ),
  'owner',
  'l''owner esistente resta owner'
);

select is(
  (
    select count(*)::int
    from public.members
    where id = '44444444-4444-4444-4444-444444444444'
  ),
  0,
  'la membership del member è stata eliminata'
);

-- Utente senza famiglia: cancella solo l'account ------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$ select public.delete_current_account() $$,
  'un utente senza famiglia cancella il proprio account'
);

reset role;

select is(
  (select count(*)::int from auth.users where id = '66666666-6666-6666-6666-666666666666'),
  0,
  'l''account senza famiglia è stato eliminato'
);

select is(
  (
    select count(*)::int
    from public.members
    where id = '66666666-6666-6666-6666-666666666666'
  ),
  0,
  'non resta alcuna membership'
);

select is(
  (select count(*)::int from auth.users where id = '33333333-3333-3333-3333-333333333333'),
  1,
  'gli altri account non vengono toccati'
);

select * from finish();
rollback;
