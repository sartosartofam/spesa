-- Pannello admin, fetta 1: monitoraggio in sola lettura.
--
-- L'admin non è un ruolo della famiglia: `members.role` resta owner/member e la
-- RLS continua a isolare le famiglie. Qui c'è un elenco separato di utenti che
-- possono leggere qualche numero aggregato in più.
--
-- La tabella `admins` non ha policy e non concede nulla ai ruoli API: la riga
-- la inserisce solo chi ha accesso al database (SQL editor o CLI Supabase),
-- anche in produzione. Un admin non può nominare altri admin dall'app, e le
-- righe non passano dal backup: dopo un restore vanno reinserite a mano.
--
-- Issue di riferimento: #109.

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

revoke all on table public.admins from anon, authenticated;

comment on table public.admins is
  'Utenti abilitati al pannello admin (fetta 1, sola lettura). Righe inserite a mano con SQL/CLI, mai dal client.';

-- True se l'utente autenticato è in `admins`.
--
-- `security definer` perché la tabella non è leggibile dai ruoli API: la
-- funzione espone solo un booleano sul chiamante, mai l'elenco.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

-- Aggregati per il pannello.
--
-- Solo numeri e timestamp: nessun nome, nota, email o chiave push. Il
-- `security definer` serve a contare righe di tutte le famiglie, che la RLS
-- del chiamante nasconderebbe. Chi non è admin riceve `42501` e nessun dato.
create function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_last_migration text;
begin
  if not public.is_admin() then
    raise exception 'Accesso riservato all''admin.' using errcode = '42501';
  end if;

  -- `supabase_migrations` esiste nello stack Supabase, non in un Postgres
  -- qualsiasi: la lettura è condizionata per non rompere la funzione.
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    execute 'select max(version)::text from supabase_migrations.schema_migrations'
      into v_last_migration;
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'lastMigration', v_last_migration,
    'keepaliveLastPing', (select k.last_ping from public.keepalive k where k.id = 1),
    'counts', jsonb_build_object(
      'families', (select count(*)::int from public.families),
      'members', (select count(*)::int from public.members),
      'itemsToBuy', (select count(*)::int from public.items where status = 'to_buy'),
      'itemsBought', (select count(*)::int from public.items where status = 'bought'),
      'pushSubscriptions', (select count(*)::int from public.push_subscriptions),
      'invitesActive', (
        select count(*)::int
        from public.family_invites
        where used_at is null and expires_at > now()
      ),
      'invitesUsed', (
        select count(*)::int
        from public.family_invites
        where used_at is not null
      ),
      'invitesExpired', (
        select count(*)::int
        from public.family_invites
        where used_at is null and expires_at <= now()
      ),
      'rateLimits', (select count(*)::int from public.rate_limits)
    )
  );
end;
$$;

revoke all on function public.admin_overview() from public, anon, authenticated;
grant execute on function public.admin_overview() to authenticated;
