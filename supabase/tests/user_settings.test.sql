begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

-- Dati di partenza. Il test gira come `postgres`, che bypassa la RLS: qui
-- prepariamo la riga di B e lasciamo A e C senza impostazioni.
insert into auth.users (id, email) values
  ('55555555-5555-5555-5555-555555555555', 'settings-a@example.test'),
  ('66666666-6666-6666-6666-666666666666', 'settings-b@example.test'),
  ('77777777-7777-7777-7777-777777777777', 'settings-c@example.test');

insert into public.user_settings (user_id, settings)
values (
  '66666666-6666-6666-6666-666666666666',
  '{"version":1,"quickAdd":true,"defaultCategory":"Dispensa"}'
);

-- Utente A -------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.user_settings),
  0,
  'A non vede le impostazioni di B'
);

select lives_ok(
  $$ insert into public.user_settings (user_id, settings)
     values (
       '55555555-5555-5555-5555-555555555555',
       '{"version":1,"quickAdd":true,"defaultCategory":"Dispensa"}'
     ) $$,
  'A può creare le proprie impostazioni'
);

select is(
  (select count(*)::int from public.user_settings),
  1,
  'A vede solo la propria riga'
);

select is(
  (select settings->>'quickAdd' from public.user_settings),
  'true',
  'A legge il proprio payload'
);

select throws_ok(
  $$ insert into public.user_settings (user_id, settings)
     values (
       '77777777-7777-7777-7777-777777777777',
       '{"version":1,"quickAdd":false}'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "user_settings"',
  'A non può creare impostazioni per C'
);

select throws_ok(
  $$ insert into public.user_settings (user_id, settings)
     values ('55555555-5555-5555-5555-555555555555', '[]'::jsonb) $$,
  '23514',
  null,
  'il payload deve essere un oggetto JSON'
);

select throws_ok(
  $$ update public.user_settings
     set user_id = '77777777-7777-7777-7777-777777777777'
     where user_id = '55555555-5555-5555-5555-555555555555' $$,
  '42501',
  'permission denied for table user_settings',
  'A non può cambiare il proprietario delle impostazioni'
);

select lives_ok(
  $$ update public.user_settings
     set settings = '{"version":1,"quickAdd":false,"defaultCategory":"Freschi"}'
     where user_id = '55555555-5555-5555-5555-555555555555' $$,
  'A può aggiornare il proprio payload'
);

select is(
  (select settings->>'quickAdd' from public.user_settings),
  'false',
  'A vede il payload aggiornato'
);

with changed as (
  update public.user_settings
  set settings = '{"version":1,"quickAdd":false}'
  where user_id = '66666666-6666-6666-6666-666666666666'
  returning 1
)
select is(
  (select count(*)::int from changed),
  0,
  'A non può aggiornare le impostazioni di B'
);

with deleted as (
  delete from public.user_settings
  where user_id = '66666666-6666-6666-6666-666666666666'
  returning 1
)
select is(
  (select count(*)::int from deleted),
  0,
  'A non può cancellare le impostazioni di B'
);

reset role;

-- Trigger updated_at ---------------------------------------------------------

update public.user_settings
set updated_at = '2000-01-01T00:00:00Z'
where user_id = '55555555-5555-5555-5555-555555555555';

select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $$ update public.user_settings
     set settings = '{"version":1,"quickAdd":true}'
     where user_id = '55555555-5555-5555-5555-555555555555' $$,
  'A può aggiornare di nuovo le proprie impostazioni'
);

reset role;

select ok(
  (
    select updated_at > '2000-01-01T00:00:00Z'::timestamptz
    from public.user_settings
    where user_id = '55555555-5555-5555-5555-555555555555'
  ),
  'il trigger aggiorna updated_at'
);

select is(
  (
    select settings->>'quickAdd'
    from public.user_settings
    where user_id = '66666666-6666-6666-6666-666666666666'
  ),
  'true',
  'le impostazioni di B non sono state modificate da A'
);

-- Utente B -------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.user_settings),
  1,
  'B vede una sola riga'
);

select is(
  (select user_id from public.user_settings),
  '66666666-6666-6666-6666-666666666666'::uuid,
  'B vede solo le proprie impostazioni'
);

select is(
  (select settings->>'quickAdd' from public.user_settings),
  'true',
  'B legge il proprio payload'
);

with changed as (
  update public.user_settings
  set settings = '{"version":1,"quickAdd":false}'
  where user_id = '55555555-5555-5555-5555-555555555555'
  returning 1
)
select is(
  (select count(*)::int from changed),
  0,
  'B non può aggiornare le impostazioni di A'
);

reset role;

-- Cancellazione della propria riga -------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}',
  true
);
set local role authenticated;

with deleted as (
  delete from public.user_settings
  where user_id = '55555555-5555-5555-5555-555555555555'
  returning 1
)
select is(
  (select count(*)::int from deleted),
  1,
  'A può cancellare le proprie impostazioni'
);

select is(
  (select count(*)::int from public.user_settings),
  0,
  'dopo la cancellazione A non vede più righe'
);

reset role;

-- Anon ----------------------------------------------------------------------

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select throws_ok(
  $$ select * from public.user_settings $$,
  '42501',
  'permission denied for table user_settings',
  'anon non può leggere user_settings'
);

select throws_ok(
  $$ insert into public.user_settings (user_id, settings)
     values ('77777777-7777-7777-7777-777777777777', '{}'::jsonb) $$,
  '42501',
  'permission denied for table user_settings',
  'anon non può scrivere user_settings'
);

reset role;

select * from finish();
rollback;
