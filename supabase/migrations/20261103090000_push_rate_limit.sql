-- Rate limit interno per l'invio push.
--
-- La Edge Function `send-push` chiama questa RPC prima di ogni invio: se la
-- chiave supera il massimo consentito nella finestra corrente, la function
-- risponde 429 senza interrogare articoli né subscription.
--
-- La tabella ha RLS attiva e nessuna policy: i ruoli API non la vedono mai.
-- Solo `service_role` esegue la RPC. Il contatore è affidabile anche con
-- richieste concorrenti: update e lettura avvengono nella stessa funzione
-- chiamata in modo seriale dal client.
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0,
  constraint rate_limits_key_length check (char_length(key) between 1 and 120),
  constraint rate_limits_count_positive check (count >= 0)
);

alter table public.rate_limits enable row level security;

revoke all on table public.rate_limits from anon, authenticated;
grant all on table public.rate_limits to service_role;

-- Consuma un'unità di budget per `p_key`.
--
-- Il contatore segue il numero di consumi della finestra corrente: parte da
-- `0`, l'insert iniziale è un placeholder e l'incremento porta la riga a 1
-- al primo consumo. Se la finestra è scaduta si azzera e ricomincia.
create function public.consume_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_start timestamptz;
  v_count integer;
  v_reset boolean;
begin
  if p_key is null or p_key = '' or p_max < 1 or p_window_seconds < 1 then
    raise exception 'Parametri del rate limit non validi.'
      using errcode = '22023';
  end if;

  if char_length(p_key) > 120 then
    raise exception 'Chiave del rate limit troppo lunga.'
      using errcode = '22023';
  end if;

  insert into public.rate_limits (key)
  values (p_key)
  on conflict (key) do nothing;

  select l.window_start, l.count
    into v_start, v_count
  from public.rate_limits l
  where l.key = p_key;

  v_reset := v_start <= v_now - make_interval(secs => p_window_seconds);

  if v_reset then
    update public.rate_limits
       set count = 1,
           window_start = v_now
     where key = p_key;
    return true;
  end if;

  update public.rate_limits
     set count = count + 1
   where key = p_key;

  return (v_count + 1) <= p_max;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer)
from public, anon, authenticated;

grant execute on function public.consume_rate_limit(text, integer, integer)
to service_role;

comment on table public.rate_limits is
  'Contatori per il rate limit interno; nessun percorso REST esposto.';

comment on function public.consume_rate_limit(text, integer, integer) is
  'Incrementa il contatore della chiave e dice se il budget è finito.';
