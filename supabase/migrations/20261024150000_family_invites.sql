-- Inviti famiglia: codice monouso per entrare in un'altra famiglia.
--
-- La tabella non è accessibile direttamente dai ruoli API: creazione e
-- riscatto passano solo dalle RPC `create_family_invite` e
-- `redeem_family_invite`, entrambe `security definer`. Il cambio famiglia
-- resta a una sola membership per utente (ADR-0002).

create table public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  created_by uuid not null references public.members (id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  used_by uuid references public.members (id) on delete set null,
  constraint family_invites_code_format check (code ~ '^[A-F0-9]{12}$'),
  constraint family_invites_dates check (expires_at > created_at)
);

create unique index family_invites_code_key on public.family_invites (code);
create index family_invites_family_id_idx on public.family_invites (family_id);
create index family_invites_active_idx
  on public.family_invites (family_id, expires_at)
  where used_at is null;

alter table public.family_invites enable row level security;

revoke all on table public.family_invites from anon, authenticated;
grant all on table public.family_invites to service_role;

-- Genera un invito per la famiglia dell'utente autenticato.
create function public.create_family_invite()
returns table (invite_code text, invite_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_family_id uuid;
  v_code text;
  v_expires_at timestamptz;
  v_attempt integer;
begin
  if v_user_id is null then
    raise exception 'Non autenticato.' using errcode = '42501';
  end if;

  select m.family_id
  into v_family_id
  from public.members m
  where m.id = v_user_id;

  if v_family_id is null then
    raise exception 'Famiglia non trovata. Ricarica l’app.' using errcode = 'P0002';
  end if;

  for v_attempt in 1..5 loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

    begin
      insert into public.family_invites (family_id, created_by, code)
      values (v_family_id, v_user_id, v_code)
      returning expires_at into v_expires_at;

      return query select v_code, v_expires_at;
      return;
    exception when unique_violation then
      -- Collisione sul codice: riprova con un nuovo UUID.
    end;
  end loop;

  raise exception 'Impossibile generare un invito. Riprova.' using errcode = 'P0001';
end;
$$;

comment on function public.create_family_invite() is
  'Crea un invito monouso di 7 giorni per la famiglia dell''utente autenticato.';

revoke all on function public.create_family_invite() from public, anon;
grant execute on function public.create_family_invite() to authenticated, service_role;

-- Nomina un altro membro della famiglia come owner. Serve all'owner che vuole
-- cambiare famiglia: prima di uscire deve lasciare la famiglia con un owner.
create function public.promote_family_owner(p_member_id uuid)
returns table (promoted_member_id uuid, promoted_role text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_family_id uuid;
  v_role text;
  v_target_family_id uuid;
begin
  if v_user_id is null then
    raise exception 'Non autenticato.' using errcode = '42501';
  end if;

  if p_member_id is null then
    raise exception 'Membro non valido.' using errcode = '22023';
  end if;

  select m.family_id, m.role
  into v_family_id, v_role
  from public.members m
  where m.id = v_user_id;

  if v_family_id is null then
    raise exception 'Famiglia non trovata. Ricarica l’app.' using errcode = 'P0002';
  end if;

  if v_role <> 'owner' then
    raise exception 'Solo un owner può nominare un altro owner.' using errcode = '42501';
  end if;

  if p_member_id = v_user_id then
    raise exception 'Sei già owner.' using errcode = 'P0002';
  end if;

  select m.family_id
  into v_target_family_id
  from public.members m
  where m.id = p_member_id;

  if v_target_family_id is null or v_target_family_id <> v_family_id then
    raise exception 'Membro non trovato nella tua famiglia.' using errcode = 'P0002';
  end if;

  update public.members
  set role = 'owner'
  where id = p_member_id;

  return query select p_member_id, 'owner'::text;
end;
$$;

comment on function public.promote_family_owner(uuid) is
  'Nomina owner un membro della stessa famiglia; richiede il ruolo owner (ADR-0002).';

revoke all on function public.promote_family_owner(uuid) from public, anon;
grant execute on function public.promote_family_owner(uuid) to authenticated, service_role;

-- Riscatta un invito: sposta la membership nella famiglia di destinazione.
-- Se l'utente era l'unico membro della famiglia di partenza, la elimina.
create function public.redeem_family_invite(p_code text)
returns table (target_family_id uuid, target_family_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_invite public.family_invites%rowtype;
  v_current_family_id uuid;
  v_current_role text;
  v_target_family_id uuid;
  v_target_family_name text;
  v_other_members integer;
  v_other_owners integer;
  v_email text;
  v_display_name text;
  v_has_membership boolean := false;
begin
  if v_user_id is null then
    raise exception 'Non autenticato.' using errcode = '42501';
  end if;

  if v_code = '' then
    raise exception 'Inserisci un codice invito.' using errcode = '22023';
  end if;

  select *
  into v_invite
  from public.family_invites
  where code = v_code
  for update;

  if not found then
    raise exception 'Invito non valido o scaduto.' using errcode = 'P0002';
  end if;

  if v_invite.used_at is not null then
    raise exception 'Questo invito è già stato usato.' using errcode = 'P0002';
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'Invito non valido o scaduto.' using errcode = 'P0002';
  end if;

  v_target_family_id := v_invite.family_id;

  select f.name
  into v_target_family_name
  from public.families f
  where f.id = v_target_family_id;

  if v_target_family_name is null then
    raise exception 'Famiglia di destinazione non trovata.' using errcode = 'P0002';
  end if;

  select m.family_id, m.role, m.email, m.display_name
  into v_current_family_id, v_current_role, v_email, v_display_name
  from public.members m
  where m.id = v_user_id
  for update;

  v_has_membership := found;

  if not v_has_membership then
    select
      lower(btrim(u.email)),
      coalesce(
        nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
        split_part(coalesce(u.email, ''), '@', 1)
      )
    into v_email, v_display_name
    from auth.users u
    where u.id = v_user_id;

    if v_email is null or position('@' in v_email) <= 1 then
      raise exception 'Email non valida.' using errcode = '23514';
    end if;
  end if;

  if exists (
    select 1
    from public.members m
    where m.family_id = v_target_family_id
      and m.id <> v_user_id
      and lower(btrim(m.email)) = lower(btrim(v_email))
  ) then
    raise exception 'Esiste già un membro con questa email nella famiglia di destinazione.'
      using errcode = '23505';
  end if;

  if not v_has_membership then
    insert into public.members (id, family_id, email, display_name, role)
    values (v_user_id, v_target_family_id, v_email, left(v_display_name, 80), 'member');
  else
    if v_current_family_id = v_target_family_id then
      raise exception 'Fai già parte di questa famiglia.' using errcode = 'P0002';
    end if;

    select count(*)
    into v_other_members
    from public.members m
    where m.family_id = v_current_family_id
      and m.id <> v_user_id;

    if v_other_members > 0 and v_current_role = 'owner' then
      select count(*)
      into v_other_owners
      from public.members m
      where m.family_id = v_current_family_id
        and m.role = 'owner'
        and m.id <> v_user_id;

      if v_other_owners = 0 then
        raise exception 'Sei l’unico owner della famiglia attuale. Nomina un altro owner prima di cambiare famiglia.'
          using errcode = 'P0001';
      end if;
    end if;

    update public.members
    set family_id = v_target_family_id,
        role = 'member'
    where id = v_user_id;

    delete from public.family_invites
    where created_by = v_user_id
      and family_id = v_current_family_id
      and used_at is null;

    if v_other_members = 0 then
      delete from public.families where id = v_current_family_id;
    end if;
  end if;

  update public.family_invites
  set used_at = now(),
      used_by = v_user_id
  where id = v_invite.id;

  return query select v_target_family_id, v_target_family_name;
end;
$$;

comment on function public.redeem_family_invite(text) is
  'Riscatta un invito monouso e sposta l''utente nella famiglia di destinazione (ADR-0002).';

revoke all on function public.redeem_family_invite(text) from public, anon;
grant execute on function public.redeem_family_invite(text) to authenticated, service_role;
