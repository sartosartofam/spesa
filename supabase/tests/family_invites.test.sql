begin;

create extension if not exists pgtap with schema extensions;

select plan(38);

-- Permessi --------------------------------------------------------------------

select ok(
  has_function_privilege('authenticated', 'public.create_family_invite()', 'execute'),
  'authenticated può creare inviti'
);

select ok(
  not has_function_privilege('anon', 'public.create_family_invite()', 'execute'),
  'anon non può creare inviti'
);

select ok(
  has_function_privilege('authenticated', 'public.redeem_family_invite(text)', 'execute'),
  'authenticated può riscattare inviti'
);

select ok(
  not has_function_privilege('anon', 'public.redeem_family_invite(text)', 'execute'),
  'anon non può riscattare inviti'
);

select ok(
  not has_table_privilege('authenticated', 'public.family_invites', 'select'),
  'authenticated non legge direttamente family_invites'
);

select ok(
  not has_table_privilege('anon', 'public.family_invites', 'select'),
  'anon non legge direttamente family_invites'
);

select ok(
  has_function_privilege('authenticated', 'public.promote_family_owner(uuid)', 'execute'),
  'authenticated può nominare un owner'
);

select ok(
  not has_function_privilege('anon', 'public.promote_family_owner(uuid)', 'execute'),
  'anon non può nominare un owner'
);

-- Scenario ---------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  (
    '11111111-1111-1111-1111-111111111111',
    'a@example.test',
    '{"display_name":"A"}'::jsonb
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'a2@example.test',
    '{"display_name":"A2"}'::jsonb
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'b@example.test',
    '{"display_name":"B"}'::jsonb
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'c@example.test',
    '{"display_name":"C"}'::jsonb
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'd@example.test',
    '{"display_name":"D"}'::jsonb
  );

insert into public.families (id, name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Famiglia A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Famiglia B'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Famiglia C');

insert into public.members (id, family_id, email, display_name, role) values
  (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'a@example.test',
    'A',
    'owner'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'a2@example.test',
    'A2',
    'member'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'b@example.test',
    'B',
    'owner'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'c@example.test',
    'C',
    'owner'
  );

insert into public.items (family_id, name, created_by)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Latte di B',
  '33333333-3333-3333-3333-333333333333'
);

-- Creazione invito -------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select set_config(
    'test.invite_code',
    (select invite_code from public.create_family_invite()),
    true
  )$$,
  'A crea un invito per la propria famiglia'
);

reset role;

select is(
  (
    select count(*)::int
    from public.family_invites
    where family_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and used_at is null
  ),
  1,
  'viene creato un solo invito attivo'
);

select matches(
  current_setting('test.invite_code'),
  '^[A-F0-9]{32}$',
  'il codice restituito ha 32 caratteri esadecimali maiuscoli'
);

select matches(
  (
    select code_hash
    from public.family_invites
    where family_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and used_at is null
  ),
  '^[a-f0-9]{64}$',
  'nel database viene salvato solo lo SHA-256 del codice'
);

select is(
  (
    select count(*)::int
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'family_invites'
      and column_name = 'code'
  ),
  0,
  'la colonna con il codice in chiaro non esiste più'
);

select ok(
  (
    select expires_at > now() + interval '6 days'
    from public.family_invites
    where family_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      and used_at is null
  ),
  'l''invito scade dopo circa 7 giorni'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  'select * from public.create_family_invite()',
  'P0002',
  'Famiglia non trovata. Ricarica l’app.',
  'un utente senza membership non può creare inviti'
);

reset role;

-- Riscatto --------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select * from public.redeem_family_invite('  ' || lower(current_setting('test.invite_code')) || '  ')$$,
  'B riscatta l''invito con spazi e minuscole'
);

reset role;

select results_eq(
  $$
    select family_id, role
    from public.members
    where id = '33333333-3333-3333-3333-333333333333'
  $$,
  $$values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'member'::text)$$,
  'B entra nella famiglia A come member'
);

select is(
  (
    select count(*)::int
    from public.families
    where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  ),
  0,
  'la vecchia famiglia di B viene eliminata perché era da solo'
);

select is(
  (
    select count(*)::int
    from public.items
    where family_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  ),
  0,
  'la lista della vecchia famiglia viene eliminata con la famiglia'
);

select ok(
  (
    select used_at is not null
      and used_by = '33333333-3333-3333-3333-333333333333'
    from public.family_invites
    where code_hash = encode(
      sha256(convert_to(current_setting('test.invite_code'), 'UTF8')),
      'hex'
    )
  ),
  'l''invito viene marcato come usato'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select * from public.redeem_family_invite(current_setting('test.invite_code'))$$,
  'P0002',
  'Questo invito è già stato usato.',
  'lo stesso invito non può essere usato due volte'
);

select throws_ok(
  $$select * from public.redeem_family_invite('ZZZZZZZZZZZZ')$$,
  'P0002',
  'Invito non valido o scaduto.',
  'un codice inesistente viene rifiutato'
);

reset role;

-- Invito scaduto --------------------------------------------------------------

insert into public.family_invites (
  family_id,
  created_by,
  code_hash,
  created_at,
  expires_at
)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '44444444-4444-4444-4444-444444444444',
  encode(sha256(convert_to('AAAAAAAAAAAA', 'UTF8')), 'hex'),
  now() - interval '2 days',
  now() - interval '1 day'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select * from public.redeem_family_invite('AAAAAAAAAAAA')$$,
  'P0002',
  'Invito non valido o scaduto.',
  'un invito scaduto viene rifiutato'
);

reset role;

-- Owner con altri membri ------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select set_config(
    'test.invite_code_c',
    (select invite_code from public.create_family_invite()),
    true
  )$$,
  'C crea un invito per la famiglia C'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select * from public.redeem_family_invite(current_setting('test.invite_code_c'))$$,
  'P0001',
  'Sei l’unico owner della famiglia attuale. Nomina un altro owner prima di cambiare famiglia.',
  'l''owner unico con altri membri non può cambiare famiglia'
);

reset role;

select is(
  (
    select family_id
    from public.members
    where id = '11111111-1111-1111-1111-111111111111'
  ),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'A resta nella famiglia A dopo il blocco'
);

-- Nomina di un altro owner ----------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select * from public.promote_family_owner('22222222-2222-2222-2222-222222222222')$$,
  '42501',
  'Solo un owner può nominare un altro owner.',
  'un member non può nominare un owner'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select * from public.promote_family_owner('44444444-4444-4444-4444-444444444444')$$,
  'P0002',
  'Membro non trovato nella tua famiglia.',
  'non si può nominare un membro di un''altra famiglia'
);

select lives_ok(
  $$select * from public.promote_family_owner('22222222-2222-2222-2222-222222222222')$$,
  'A nomina A2 owner'
);

reset role;

select results_eq(
  $$
    select role
    from public.members
    where id = '22222222-2222-2222-2222-222222222222'
  $$,
  $$values ('owner'::text)$$,
  'A2 è diventato owner'
);

-- Un owner può cambiare famiglia se ne resta un altro -------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select * from public.redeem_family_invite(current_setting('test.invite_code_c'))$$,
  'A2, owner con un altro owner, riscatta l''invito per C'
);

reset role;

select results_eq(
  $$
    select family_id, role
    from public.members
    where id = '22222222-2222-2222-2222-222222222222'
  $$,
  $$values ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'member'::text)$$,
  'A2 entra nella famiglia C'
);

select is(
  (
    select count(*)::int
    from public.families
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  1,
  'la famiglia A resta in vita perché ha altri membri'
);

-- Utente senza membership -----------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select set_config(
    'test.invite_code_d',
    (select invite_code from public.create_family_invite()),
    true
  )$$,
  'C crea un secondo invito per la famiglia C'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select * from public.redeem_family_invite(current_setting('test.invite_code_d'))$$,
  'un utente senza membership può entrare direttamente'
);

reset role;

select results_eq(
  $$
    select family_id, role
    from public.members
    where id = '55555555-5555-5555-5555-555555555555'
  $$,
  $$values ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'member'::text)$$,
  'D entra nella famiglia C'
);

-- Limite inviti attivi --------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  'select public.create_family_invite() from generate_series(1, 10)',
  'C crea dieci inviti attivi'
);

select throws_ok(
  'select * from public.create_family_invite()',
  'P0001',
  'Troppi inviti attivi. Usa o attendi la scadenza di uno di quelli esistenti.',
  'l''undicesimo invito attivo viene rifiutato'
);

reset role;

select * from finish();
rollback;
