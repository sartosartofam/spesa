-- Policy RLS della fase 1.
--
-- Regole:
-- - ogni membro vede solo la propria famiglia;
-- - gli articoli sono condivisi dentro la famiglia, mai tra famiglie;
-- - le subscription push sono visibili solo al membro che le ha create;
-- - anon non ha alcun accesso ai dati della lista (solo a `keepalive`);
-- - `service_role` resta l'unico ruolo con accesso completo, lato server.
--
-- Il controllo di appartenenza passa da `current_family_id()`: è `security
-- definer` per evitare la ricorsione tra policy di `members` e `items`, e non
-- accetta parametri, quindi non può essere usato per leggere altre famiglie.

create function public.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select family_id
  from public.members
  where id = auth.uid()
$$;

revoke all on function public.current_family_id() from public, anon;
grant execute on function public.current_family_id() to authenticated, service_role;

-- `created_by` viene valorizzato dal database, non dal client.
alter table public.items
  alter column created_by set default auth.uid();

-- Grant espliciti: si parte da zero, così le tabelle non restano esposte per
-- effetto dell'auto-expose di Supabase.
revoke all on public.families, public.members, public.items, public.push_subscriptions
  from anon, authenticated;

grant select on public.families to authenticated;
grant update (name) on public.families to authenticated;

grant select on public.members to authenticated;

grant select, insert, update, delete on public.items to authenticated;

grant select, insert, update, delete on public.push_subscriptions to authenticated;

grant all on public.families, public.members, public.items, public.push_subscriptions
  to service_role;

-- families -------------------------------------------------------------------

create policy "family members can read their family"
on public.families for select
to authenticated
using (id = (select public.current_family_id()));

create policy "family members can rename their family"
on public.families for update
to authenticated
using (id = (select public.current_family_id()))
with check (id = (select public.current_family_id()));

-- members --------------------------------------------------------------------

create policy "family members can read family members"
on public.members for select
to authenticated
using (family_id = (select public.current_family_id()));

-- items ----------------------------------------------------------------------

create policy "family members can read items"
on public.items for select
to authenticated
using (family_id = (select public.current_family_id()));

create policy "family members can add items"
on public.items for insert
to authenticated
with check (
  family_id = (select public.current_family_id())
  and created_by = auth.uid()
);

create policy "family members can update items"
on public.items for update
to authenticated
using (family_id = (select public.current_family_id()))
with check (family_id = (select public.current_family_id()));

create policy "family members can delete items"
on public.items for delete
to authenticated
using (family_id = (select public.current_family_id()));

-- push_subscriptions ---------------------------------------------------------

create policy "members can read their push subscriptions"
on public.push_subscriptions for select
to authenticated
using (member_id = auth.uid());

create policy "members can add their push subscriptions"
on public.push_subscriptions for insert
to authenticated
with check (member_id = auth.uid());

create policy "members can update their push subscriptions"
on public.push_subscriptions for update
to authenticated
using (member_id = auth.uid())
with check (member_id = auth.uid());

create policy "members can delete their push subscriptions"
on public.push_subscriptions for delete
to authenticated
using (member_id = auth.uid());
