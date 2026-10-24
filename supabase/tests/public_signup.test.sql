begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

-- Permessi sulle funzioni ----------------------------------------------------

select ok(
  has_function_privilege('authenticated', 'public.ensure_current_family()', 'execute'),
  'authenticated può creare la propria famiglia'
);

select ok(
  not has_function_privilege('anon', 'public.ensure_current_family()', 'execute'),
  'anon non può creare famiglie'
);

select ok(
  not has_function_privilege('authenticated', 'public.normalize_member_identity()', 'execute'),
  'la funzione trigger non è eseguibile dai ruoli API'
);

-- Scenario: utente nuovo con metadati di signup --------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  (
    '44444444-4444-4444-4444-444444444444',
    'Ada@Example.Test',
    '{"display_name":"  Ada  ","family_name":"  Famiglia Ada  "}'::jsonb
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'solo@example.test',
    '{}'::jsonb
  );

select is(
  (
    select count(*)::int
    from public.members
    where id = '44444444-4444-4444-4444-444444444444'
  ),
  0,
  'prima della chiamata non esiste una membership'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  'select public.ensure_current_family()',
  'ensure_current_family crea famiglia e membership'
);

reset role;

select results_eq(
  $$
    select email, display_name, role
    from public.members
    where id = '44444444-4444-4444-4444-444444444444'
  $$,
  $$values ('ada@example.test'::text, 'Ada'::text, 'owner'::text)$$,
  'email normalizzata, display name in trim e ruolo owner'
);

select results_eq(
  $$
    select f.name
    from public.families f
    join public.members m on m.family_id = f.id
    where m.id = '44444444-4444-4444-4444-444444444444'
  $$,
  $$values ('Famiglia Ada'::text)$$,
  'il nome famiglia arriva dai metadati del signup'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  'select public.ensure_current_family()',
  'la seconda chiamata è idempotente'
);

reset role;

select is(
  (
    select count(*)::int
    from public.families f
    join public.members m on m.family_id = f.id
    where m.id = '44444444-4444-4444-4444-444444444444'
  ),
  1,
  'la seconda chiamata non crea una seconda famiglia'
);

-- Fallback: utente senza metadati ---------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  'select public.ensure_current_family()',
  'ensure_current_family funziona anche senza metadati'
);

reset role;

select results_eq(
  $$
    select email, display_name
    from public.members
    where id = '55555555-5555-5555-5555-555555555555'
  $$,
  $$values ('solo@example.test'::text, 'solo'::text)$$,
  'display name di fallback ricavato dalla email'
);

select results_eq(
  $$
    select f.name
    from public.families f
    join public.members m on m.family_id = f.id
    where m.id = '55555555-5555-5555-5555-555555555555'
  $$,
  $$values ('La mia famiglia'::text)$$,
  'nome famiglia di default'
);

-- Utente con membership già esistente -----------------------------------------

insert into auth.users (id, email)
values ('66666666-6666-6666-6666-666666666666', 'existing@example.test');

insert into public.families (id, name)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Famiglia Esistente');

insert into public.members (id, family_id, email, display_name)
values (
  '66666666-6666-6666-6666-666666666666',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'existing@example.test',
  'Membro Esistente'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  'select public.ensure_current_family()',
  'ensure_current_family non tocca una membership esistente'
);

reset role;

select is(
  (
    select family_id
    from public.members
    where id = '66666666-6666-6666-6666-666666666666'
  ),
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  'la famiglia esistente resta la stessa'
);

select is(
  (
    select count(*)::int
    from public.members
    where id = '66666666-6666-6666-6666-666666666666'
  ),
  1,
  'non viene creata una seconda membership'
);

-- Trigger di normalizzazione ---------------------------------------------------

insert into auth.users (id, email)
values ('77777777-7777-7777-7777-777777777777', 'trigger@example.test');

insert into public.families (id, name)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Famiglia Trigger');

insert into public.members (id, family_id, email, display_name)
values (
  '77777777-7777-7777-7777-777777777777',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '  TRIGGER@Example.Test  ',
  '  Nome  '
);

select results_eq(
  $$
    select email, display_name
    from public.members
    where id = '77777777-7777-7777-7777-777777777777'
  $$,
  $$values ('trigger@example.test'::text, 'Nome'::text)$$,
  'il trigger normalizza email e display name'
);

-- Anon -------------------------------------------------------------------------

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select throws_ok(
  'select public.ensure_current_family()',
  '42501',
  'permission denied for function ensure_current_family',
  'anon non può eseguire ensure_current_family'
);

reset role;

select * from finish();
rollback;
