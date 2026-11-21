-- Rate limit sulle aggiunte di articoli.
--
-- La registrazione è pubblica (ADR-0002): senza un limite, un account qualsiasi
-- può inserire righe in `items` senza fine e consumare quota e spazio del piano
-- free. Auth ha già i suoi rate limit e l'invio push ha il suo; questa è la
-- terza e ultima porta di scrittura "a volontà" rimasta aperta.
--
-- Il contatore riusa `rate_limits` e `consume_rate_limit()`, quindi la tabella
-- resta invisibile ai ruoli API: nessun percorso REST nuovo, nessun contatore
-- esposto al client. Chiave per utente, finestra di 60 secondi, 30 aggiunte.
--
-- Perché un trigger e non un controllo nel client: il client si può bypassare,
-- il trigger vale per ogni percorso di inserimento, compresi REST diretto e
-- realtime. Il merge dei duplicati fa `update`, non `insert`, quindi il flusso
-- normale dell'app non consuma budget quando unisce un articolo esistente.
--
-- Chi non ha un utente nel JWT non viene limitato: `supabase/seed.sql`,
-- `scripts/backup/restore-local.mjs` e il `service_role` inseriscono come
-- `postgres`/`service_role` senza `sub`, quindi restano esenti. Devono restare
-- esenti: un restore non può essere bloccato da un contatore runtime.

create function public.enforce_items_add_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return new;
  end if;

  if not public.consume_rate_limit('items-add:' || v_user_id::text, 30, 60) then
    raise exception 'Troppe aggiunte in poco tempo. Riprova tra poco.'
      using errcode = 'PT429';
  end if;

  return new;
end;
$$;

-- Le funzioni trigger non sono richiamabili direttamente, ma restano fuori dai
-- grant come `set_updated_at()`: il test di sicurezza controlla che nessuna
-- funzione di `public` sia eseguibile dai ruoli API.
revoke all on function public.enforce_items_add_rate_limit()
from public, anon, authenticated;

create trigger items_add_rate_limit
before insert on public.items
for each row
execute function public.enforce_items_add_rate_limit();

comment on function public.enforce_items_add_rate_limit() is
  'Limita le aggiunte di articoli a 30 al minuto per utente; oltre la soglia risponde PT429.';
