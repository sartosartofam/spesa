-- Impostazioni personali per account.
--
-- Le preferenze della UI (quick add, categoria predefinita, preset del percorso
-- negozio e categorie personalizzate) seguono l'utente, non il dispositivo e
-- non la famiglia. Ogni utente può leggere e modificare solo la propria riga.
--
-- Il payload è JSONB versionato dal client: il database garantisce che sia un
-- oggetto e che resti entro un limite ragionevole, senza validare nel dettaglio
-- i campi della UI.

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_settings_payload_object check (jsonb_typeof(settings) = 'object'),
  constraint user_settings_payload_size check (length(settings::text) <= 32768)
);

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row
execute function public.set_updated_at();

alter table public.user_settings enable row level security;

-- Grant espliciti: solo il proprietario della riga, nessun accesso anonimo.
-- In insert il client può valorizzare solo `user_id` e `settings`; `updated_at`
-- resta gestito dal database. In update può cambiare solo il payload.
revoke all on public.user_settings from public, anon, authenticated;

grant select on public.user_settings to authenticated;
grant insert (user_id, settings) on public.user_settings to authenticated;
grant update (settings) on public.user_settings to authenticated;
grant delete on public.user_settings to authenticated;
grant all on public.user_settings to service_role;

create policy "users can read their settings"
on public.user_settings for select
to authenticated
using (user_id = auth.uid());

create policy "users can insert their settings"
on public.user_settings for insert
to authenticated
with check (user_id = auth.uid());

create policy "users can update their settings"
on public.user_settings for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users can delete their settings"
on public.user_settings for delete
to authenticated
using (user_id = auth.uid());

comment on table public.user_settings is
  'Impostazioni personali dell''utente, non condivise con la famiglia.';
comment on column public.user_settings.settings is
  'Payload JSON versionato dal client (quick add, categoria, preset, categorie personalizzate).';
