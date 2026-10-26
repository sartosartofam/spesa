import type { RealtimeChannel } from '@supabase/supabase-js'
import type { SpesaSupabaseClient } from './supabase'

export interface ItemsRealtimeOptions {
  client: SpesaSupabaseClient
  familyId: string | null
  onChange: () => void
  onStatus?: (status: string) => void
}

/** Nome stabile del canale: cambiare famiglia crea una subscription nuova. */
export function itemsChannelName(familyId: string | null): string {
  return familyId ? `items-family-${familyId}` : 'items-family'
}

/**
 * Ascolta inserimenti, modifiche ed eliminazioni di `items`.
 *
 * Il filtro sulla famiglia è un'ottimizzazione: la garanzia di isolamento
 * resta la RLS applicata da Realtime. La funzione restituisce la cleanup.
 */
export function subscribeToItems({
  client,
  familyId,
  onChange,
  onStatus,
}: ItemsRealtimeOptions): () => void {
  const channel: RealtimeChannel = client
    .channel(itemsChannelName(familyId))
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'items',
        ...(familyId ? { filter: `family_id=eq.${familyId}` } : {}),
      },
      () => onChange(),
    )
    .subscribe((status) => onStatus?.(status))

  return () => {
    void client.removeChannel(channel)
  }
}
