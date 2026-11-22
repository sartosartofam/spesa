-- Ping del keepalive che registra il battito.
--
-- Il keepalive nasce per tenere sveglio il progetto Supabase free (che sospende
-- dopo ~7 giorni di inattività). Fino a ora il ping era una `select` su
-- `keepalive`: bastava a generare attività, ma `last_ping` non veniva mai
-- aggiornato. Il pannello admin espone `keepaliveLastPing` e quindi mostrava
-- per sempre la data della migrazione, anche con i ping perfettamente
-- funzionanti: un falso allarme, esattamente il contrario di ciò che serve.
--
-- Questa RPC fa la stessa cosa che serve al piano gratuito (una query reale
-- sul database) e in più registra il momento. È pensata per `anon`: il ping
-- gira sul Raspberry Pi e su GitHub Actions, dove può stare solo la chiave
-- pubblica. `anon` non riceve update sulla tabella: scrivere `last_ping` è
-- possibile solo attraverso questa funzione, che tocca una sola colonna di una
-- sola riga.
--
-- Limite: il battito si registra al massimo una volta al minuto. Il cron gira
-- una volta al giorno, quindi il limite non si vede; serve solo a evitare che
-- una raffica di chiamate (la chiave anon è pubblica) generi un `update` per
-- ogni richiesta e riempia il database di tuple morte.

create function public.ping_keepalive()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_ping timestamptz;
begin
  update public.keepalive
     set last_ping = v_now
   where id = 1
     and (last_ping is null or last_ping < v_now - interval '1 minute')
  returning last_ping into v_ping;

  if v_ping is null then
    select k.last_ping into v_ping
    from public.keepalive k
    where k.id = 1;
  end if;

  return v_ping;
end;
$$;

-- Come per le altre funzioni di `public`: i grant espliciti ai ruoli API
-- arrivano dai default privileges di Supabase, quindi vanno revocati prima di
-- concedere solo ciò che serve.
revoke all on function public.ping_keepalive() from public, anon, authenticated;

grant execute on function public.ping_keepalive() to anon;

comment on function public.ping_keepalive() is
  'Registra il battito del keepalive (max una volta al minuto) e restituisce last_ping. Chiamabile da anon: è il ping del cron.';
