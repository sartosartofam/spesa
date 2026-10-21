-- Schema iniziale della fase 1: famiglie, membri, articoli e subscription push.
--
-- Decisioni collegate:
-- - ADR-0001: `item_status` ha solo `to_buy` e `bought`; l'urgenza è il flag
--   booleano `urgent`, non uno stato.
-- - AGENTS.md §Schema dati.
--
-- La RLS viene abilitata qui su tutte le tabelle. Le policy e i grant per
-- `authenticated` arrivano nella migrazione dedicata (issue #3): fino ad allora
-- nessun ruolo API può leggere o scrivere queste tabelle.

create type public.item_status as enum ('to_buy', 'bought');

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  constraint families_name_length check (char_length(name) between 1 and 80)
);

create table public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  constraint members_email_format check (position('@' in email) > 1),
  constraint members_display_name_length check (char_length(display_name) between 1 and 80),
  constraint members_role_valid check (role in ('owner', 'member')),
  constraint members_family_email_key unique (family_id, email)
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  category text,
  status public.item_status not null default 'to_buy',
  urgent boolean not null default false,
  note text,
  quantity text,
  created_by uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  bought_at timestamptz,
  constraint items_name_length check (char_length(name) between 1 and 120),
  constraint items_urgent_only_active check (not (status = 'bought' and urgent)),
  constraint items_bought_at_matches_status check (
    (status = 'bought' and bought_at is not null)
    or (status = 'to_buy' and bought_at is null)
  )
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  endpoint text not null,
  keys jsonb not null,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_key unique (endpoint),
  constraint push_subscriptions_keys_object check (jsonb_typeof(keys) = 'object')
);

create index items_family_status_idx
  on public.items (family_id, status);

create index items_family_bought_at_idx
  on public.items (family_id, bought_at desc nulls last)
  where status = 'bought';

create index items_family_name_lower_idx
  on public.items (family_id, lower(name));

create index members_family_id_idx
  on public.members (family_id);

create index push_subscriptions_member_id_idx
  on public.push_subscriptions (member_id);

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger items_set_updated_at
before update on public.items
for each row
execute function public.set_updated_at();

create function public.set_bought_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'bought' then
    if tg_op = 'INSERT' then
      new.bought_at := coalesce(new.bought_at, now());
    elsif old.status is distinct from 'bought' then
      new.bought_at := now();
    else
      new.bought_at := coalesce(new.bought_at, old.bought_at);
    end if;
    new.urgent := false;
  else
    new.bought_at := null;
  end if;

  return new;
end;
$$;

create trigger items_set_bought_at
before insert or update of status on public.items
for each row
execute function public.set_bought_at();

alter table public.families enable row level security;
alter table public.members enable row level security;
alter table public.items enable row level security;
alter table public.push_subscriptions enable row level security;

comment on type public.item_status is 'Stati del ciclo di vita di un articolo (ADR-0001).';
comment on column public.items.urgent is 'Segnalazione "è finito"; vale solo per articoli in lista.';
