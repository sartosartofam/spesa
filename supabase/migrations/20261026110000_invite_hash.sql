-- Hardening degli inviti famiglia.
--
-- Il codice invito è un token bearer: chi lo possiede può entrare nella
-- famiglia. Prima era salvato in chiaro e aveva 48 bit (12 hex), quindi un
-- dump del database esponeva inviti attivi e rendeva il brute force offline
-- relativamente economico.
--
-- Da qui in avanti:
-- - i nuovi codici hanno 32 hex (128 bit, generati da UUID v4);
-- - nel database resta solo lo SHA-256 del codice;
-- - la RPC di riscatto calcola l'hash e cerca quello, senza mai leggere il
--   codice in chiaro;
-- - al massimo 10 inviti attivi per famiglia.
--
-- Gli inviti già presenti vengono migrati calcolando l'hash del vecchio
-- codice: restano validi fino alla scadenza, ma non vengono più salvati in
-- chiaro.

alter table public.family_invites
  add column code_hash text;

update public.family_invites
set code_hash = encode(sha256(convert_to(code, 'UTF8')), 'hex')
where code_hash is null;

alter table public.family_invites
  alter column code_hash set not null;

alter table public.family_invites
  add constraint family_invites_code_hash_format
  check (code_hash ~ '^[a-f0-9]{64}$');

create unique index family_invites_code_hash_key
  on public.family_invites (code_hash);

comment on column public.family_invites.code_hash is
  'SHA-256 del codice invito; il codice in chiaro non viene salvato.';

-- Genera un invito per la famiglia dell'utente autenticato.
create or replace function public.create_family_invite()
returns table (invite_code text, invite_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_family_id uuid;
  v_code text;
  v_code_hash text;
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

  -- Serializza la creazione nella stessa famiglia, così il limite di inviti
  -- attivi non può essere aggirato con due richieste concorrenti.
  perform pg_advisory_xact_lock(hashtextextended(v_family_id::text, 0));

  -- Gli inviti scaduti non servono più: li togliamo per non far crescere la
  -- tabella e per contare solo quelli realmente utilizzabili.
  delete from public.family_invites
  where family_id = v_family_id
    and used_at is null
    and expires_at <= now();

  if (
    select count(*)
    from public.family_invites
    where family_id = v_family_id
      and used_at is null
      and expires_at > now()
  ) >= 10 then
    raise exception 'Troppi inviti attivi. Usa o attendi la scadenza di uno di quelli esistenti.'
      using errcode = 'P0001';
  end if;

  for v_attempt in 1..5 loop
    -- 32 hex = 128 bit. `gen_random_uuid()` usa un generatore crittografico.
    v_code := upper(replace(gen_random_uuid()::text, '-', ''));
    v_code_hash := encode(sha256(convert_to(v_code, 'UTF8')), 'hex');

    begin
      insert into public.family_invites (family_id, created_by, code_hash)
      values (v_family_id, v_user_id, v_code_hash)
      returning expires_at into v_expires_at;

      return query select v_code, v_expires_at;
      return;
    exception when unique_violation then
      -- Collisione sull'hash: riprova con un nuovo UUID.
    end;
  end loop;

  raise exception 'Impossibile generare un invito. Riprova.' using errcode = 'P0001';
end;
$$;

comment on function public.create_family_invite() is
  'Crea un invito monouso di 7 giorni per la famiglia dell''utente autenticato.';

revoke all on function public.create_family_invite() from public, anon;
grant execute on function public.create_family_invite() to authenticated, service_role;

-- Riscatta un invito: sposta la membership nella famiglia di destinazione.
-- Se l'utente era l'unico membro della famiglia di partenza, la elimina.
create or replace function public.redeem_family_invite(p_code text)
returns table (target_family_id uuid, target_family_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_code_hash text;
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

  -- Accettiamo ancora i vecchi codici da 12 hex già migrati, ma i nuovi
  -- inviti usano 32 hex.
  if v_code !~ '^[A-F0-9]{12}$' and v_code !~ '^[A-F0-9]{32}$' then
    raise exception 'Invito non valido o scaduto.' using errcode = 'P0002';
  end if;

  v_code_hash := encode(sha256(convert_to(v_code, 'UTF8')), 'hex');

  select *
  into v_invite
  from public.family_invites
  where code_hash = v_code_hash
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
  'Riscatta un invito monouso e sposta l''utente nella famiglia di destinazione.';

revoke all on function public.redeem_family_invite(text) from public, anon;
grant execute on function public.redeem_family_invite(text) to authenticated, service_role;

-- Rimuove il vecchio codice in chiaro: la RPC usa solo code_hash.
drop index public.family_invites_code_key;
alter table public.family_invites drop constraint family_invites_code_format;
alter table public.family_invites drop column code;
