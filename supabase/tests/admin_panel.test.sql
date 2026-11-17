begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

-- Struttura e superficie dei grant ------------------------------------------

select has_table('public', 'admins', 'la tabella admins esiste');
select col_is_pk('public', 'admins', 'user_id', 'admins.user_id è la primary key');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.admins'::regclass),
  'RLS è abilitata su admins'
);

select is(
  has_table_privilege('anon', 'public.admins', 'select'),
  false,
  'anon non legge admins'
);
select is(
  has_table_privilege('authenticated', 'public.admins', 'select'),
  false,
  'authenticated non legge admins'
);
select is(
  has_table_privilege('authenticated', 'public.admins', 'insert'),
  false,
  'authenticated non inserisce admin'
);
select is(
  has_table_privilege('authenticated', 'public.admins', 'delete'),
  false,
  'authenticated non elimina admin'
);

select ok(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_admin'
  ),
  'is_admin è security definer'
);
select ok(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'admin_overview'
  ),
  'admin_overview è security definer'
);

select is(
  has_function_privilege('anon', 'public.is_admin()', 'execute'),
  false,
  'anon non esegue is_admin'
);
select is(
  has_function_privilege('authenticated', 'public.is_admin()', 'execute'),
  true,
  'authenticated esegue is_admin'
);
select is(
  has_function_privilege('anon', 'public.admin_overview()', 'execute'),
  false,
  'anon non esegue admin_overview'
);
select is(
  has_function_privilege('authenticated', 'public.admin_overview()', 'execute'),
  true,
  'authenticated esegue admin_overview'
);

-- Dati di partenza -----------------------------------------------------------

insert into auth.users (id, email) values
  ('88888888-8888-8888-8888-888888888888', 'admin@example.test'),
  ('99999999-9999-9999-9999-999999999999', 'normale@example.test');

-- L'assegnazione dell'admin è manuale: nel test la fa il ruolo che applica le
-- migrazioni, come l'umano con SQL/CLI.
insert into public.admins (user_id)
values ('88888888-8888-8888-8888-888888888888');

insert into public.families (name) values ('Famiglia admin test');

insert into public.members (id, family_id, email, display_name, role)
select
  '88888888-8888-8888-8888-888888888888',
  id,
  'admin@example.test',
  'Admin test',
  'owner'
from public.families
where name = 'Famiglia admin test';

insert into public.members (id, family_id, email, display_name)
select
  '99999999-9999-9999-9999-999999999999',
  id,
  'normale@example.test',
  'Normale test'
from public.families
where name = 'Famiglia admin test';

insert into public.items (family_id, name, status)
select id, 'Pane admin test', 'to_buy'
from public.families
where name = 'Famiglia admin test';

insert into public.items (family_id, name, status)
select id, 'Latte admin test', 'bought'
from public.families
where name = 'Famiglia admin test';

insert into public.push_subscriptions (member_id, endpoint, keys)
values (
  '99999999-9999-9999-9999-999999999999',
  'https://push.example/admin-test',
  '{"p256dh":"a","auth":"b"}'
);

-- Un invito attivo, uno usato e uno scaduto.
insert into public.family_invites (family_id, created_by, code_hash, expires_at)
select
  id,
  '88888888-8888-8888-8888-888888888888',
  repeat('a', 64),
  now() + interval '1 day'
from public.families
where name = 'Famiglia admin test';

insert into public.family_invites (family_id, created_by, code_hash, used_at, used_by)
select
  id,
  '88888888-8888-8888-8888-888888888888',
  repeat('b', 64),
  now(),
  '99999999-9999-9999-9999-999999999999'
from public.families
where name = 'Famiglia admin test';

insert into public.family_invites (family_id, created_by, code_hash, created_at, expires_at)
select
  id,
  '88888888-8888-8888-8888-888888888888',
  repeat('c', 64),
  now() - interval '10 days',
  now() - interval '3 days'
from public.families
where name = 'Famiglia admin test';

insert into public.rate_limits (key) values ('admin-test:key');

-- Atteso, calcolato come postgres prima di passare ai ruoli API. Il confronto
-- usa una GUC di sessione perché la tabella temporanea non sarebbe leggibile
-- dal ruolo authenticated.
select set_config('spesa.test.families', (select count(*)::text from public.families), true);
select set_config('spesa.test.members', (select count(*)::text from public.members), true);
select set_config(
  'spesa.test.items_to_buy',
  (select count(*)::text from public.items where status = 'to_buy'),
  true
);
select set_config(
  'spesa.test.items_bought',
  (select count(*)::text from public.items where status = 'bought'),
  true
);
select set_config(
  'spesa.test.push_subscriptions',
  (select count(*)::text from public.push_subscriptions),
  true
);
select set_config(
  'spesa.test.invites_active',
  (
    select count(*)::text
    from public.family_invites
    where used_at is null and expires_at > now()
  ),
  true
);
select set_config(
  'spesa.test.invites_used',
  (select count(*)::text from public.family_invites where used_at is not null),
  true
);
select set_config(
  'spesa.test.invites_expired',
  (
    select count(*)::text
    from public.family_invites
    where used_at is null and expires_at <= now()
  ),
  true
);
select set_config(
  'spesa.test.rate_limits',
  (select count(*)::text from public.rate_limits),
  true
);

-- Utente normale -------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}',
  true
);
set local role authenticated;

select is(public.is_admin(), false, 'un utente normale non è admin');

select throws_ok(
  $$ select public.admin_overview() $$,
  '42501',
  null,
  'un utente normale non legge gli aggregati'
);

select throws_ok(
  $$ select * from public.admins $$,
  '42501',
  null,
  'nemmeno un utente normale legge la tabella admins'
);

-- Admin ----------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"88888888-8888-8888-8888-888888888888","role":"authenticated"}',
  true
);

select is(public.is_admin(), true, 'l''admin si riconosce');

select is(
  (public.admin_overview()->'counts'->>'families')::int,
  current_setting('spesa.test.families')::int,
  'conta le famiglie'
);
select is(
  (public.admin_overview()->'counts'->>'members')::int,
  current_setting('spesa.test.members')::int,
  'conta i membri'
);
select is(
  (public.admin_overview()->'counts'->>'itemsToBuy')::int,
  current_setting('spesa.test.items_to_buy')::int,
  'conta gli articoli in lista'
);
select is(
  (public.admin_overview()->'counts'->>'itemsBought')::int,
  current_setting('spesa.test.items_bought')::int,
  'conta gli articoli nello storico'
);
select is(
  (public.admin_overview()->'counts'->>'pushSubscriptions')::int,
  current_setting('spesa.test.push_subscriptions')::int,
  'conta le subscription push'
);
select is(
  (public.admin_overview()->'counts'->>'invitesActive')::int,
  current_setting('spesa.test.invites_active')::int,
  'conta gli inviti attivi'
);
select is(
  (public.admin_overview()->'counts'->>'invitesUsed')::int,
  current_setting('spesa.test.invites_used')::int,
  'conta gli inviti usati'
);
select is(
  (public.admin_overview()->'counts'->>'invitesExpired')::int,
  current_setting('spesa.test.invites_expired')::int,
  'conta gli inviti scaduti'
);
select is(
  (public.admin_overview()->'counts'->>'rateLimits')::int,
  current_setting('spesa.test.rate_limits')::int,
  'conta le righe del rate limit'
);

select ok(
  (public.admin_overview()->>'generatedAt') is not null,
  'l''overview dichiara quando è stata generata'
);
select ok(
  (public.admin_overview()->>'keepaliveLastPing') is not null,
  'l''overview riporta l''ultimo ping keepalive'
);
select ok(
  (public.admin_overview()->>'lastMigration') is not null,
  'l''overview riporta l''ultima migrazione applicata'
);

-- Nessun dato personale: nel payload non deve comparire un indirizzo email.
select ok(
  position('@' in public.admin_overview()::text) = 0,
  'l''overview non contiene email'
);

select * from finish();
rollback;
