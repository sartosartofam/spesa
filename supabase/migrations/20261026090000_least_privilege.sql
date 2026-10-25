-- Minimo privilegio sui dati esposti ai ruoli API.
--
-- Audit di pulizia e sicurezza (branch chore/cleanup):
--
-- 1. `items`: l'INSERT era concesso su tutte le colonne. Il client poteva
--    inviare `created_at`, `updated_at`, `bought_at`, `created_by` o `id`
--    forzando timestamp e ownership. Il repository invia solo i campi
--    dell'articolo: il resto resta gestito da default e trigger.
-- 2. `push_subscriptions`: INSERT e UPDATE erano concessi su tutte le colonne.
--    La RLS impedisce già di puntare a un altro membro, ma endpoint e chiavi
--    sono le uniche colonne che il client deve poter cambiare.
-- 3. `members.email`: era leggibile da tutti i membri della famiglia. La UI
--    mostra `display_name`, che è obbligatorio: l'email non serve al client e
--    va nascosta per ridurre i dati personali esposti.
--
-- Le policy RLS restano invariate: cambiano solo i grant per colonna.

-- 1. Articoli ---------------------------------------------------------------

revoke insert on public.items from authenticated;

grant insert (family_id, name, category, status, urgent, note, quantity)
  on public.items
  to authenticated;

-- 2. Subscription push ------------------------------------------------------

revoke insert, update on public.push_subscriptions from authenticated;

grant insert (member_id, endpoint, keys)
  on public.push_subscriptions
  to authenticated;

grant update (endpoint, keys)
  on public.push_subscriptions
  to authenticated;

-- 3. Membri -----------------------------------------------------------------

revoke select on public.members from authenticated;

grant select (id, display_name, role)
  on public.members
  to authenticated;

comment on column public.members.email is
  'Email normalizzata del membro. Non esposta ai ruoli API: serve solo a RPC e job lato server.';
