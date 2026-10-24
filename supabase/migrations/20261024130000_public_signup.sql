-- Registrazione pubblica: ogni utente autenticato senza membership riceve una
-- famiglia personale con ruolo owner.
--
-- La creazione non passa da grant diretti su families/members: la funzione è
-- `security definer`, idempotente e usa i metadati del signup. In questo modo
-- il client non può scegliere una famiglia esistente né inserirsi in una
-- famiglia altrui.
--
-- L'invito e il cambio famiglia restano in una migrazione dedicata.

-- Normalizza email e display name per tutti i futuri inserimenti/aggiornamenti.
create function public.normalize_member_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.email := lower(btrim(new.email));
  new.display_name := btrim(new.display_name);
  return new;
end;
$$;

create trigger members_normalize_identity
before insert or update of email, display_name on public.members
for each row
execute function public.normalize_member_identity();

revoke all on function public.normalize_member_identity() from public, anon, authenticated;

-- Crea la famiglia personale al primo accesso autenticato. Se l'utente ha già
-- una membership restituisce la famiglia esistente senza modificare nulla.
create function public.ensure_current_family()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_family_id uuid;
  v_email text;
  v_display_name text;
  v_family_name text;
begin
  if v_user_id is null then
    raise exception 'Utente non autenticato.' using errcode = '42501';
  end if;

  select family_id
  into v_family_id
  from public.members
  where id = v_user_id;

  if v_family_id is not null then
    return v_family_id;
  end if;

  -- Evita due creazioni concorrenti per lo stesso utente (doppio tab, retry).
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select family_id
  into v_family_id
  from public.members
  where id = v_user_id;

  if v_family_id is not null then
    return v_family_id;
  end if;

  select
    lower(btrim(u.email)),
    coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
      split_part(coalesce(u.email, ''), '@', 1)
    ),
    coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'family_name'), ''),
      'La mia famiglia'
    )
  into v_email, v_display_name, v_family_name
  from auth.users u
  where u.id = v_user_id;

  if v_email is null or position('@' in v_email) <= 1 then
    raise exception 'Email non valida per la creazione della famiglia.' using errcode = '23514';
  end if;

  insert into public.families (name)
  values (left(v_family_name, 80))
  returning id into v_family_id;

  insert into public.members (id, family_id, email, display_name, role)
  values (v_user_id, v_family_id, v_email, left(v_display_name, 80), 'owner');

  return v_family_id;
end;
$$;

comment on function public.ensure_current_family() is
  'Crea la famiglia personale dell''utente autenticato se non ha ancora una membership (ADR-0002).';

revoke all on function public.ensure_current_family() from public, anon;
grant execute on function public.ensure_current_family() to authenticated, service_role;
