import { describe, expect, it, vi } from 'vitest'
import { itemsChannelName, subscribeToItems } from './realtime'
import type { SpesaSupabaseClient } from './supabase'

function fakeClient() {
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  }
  channel.on.mockReturnValue(channel)
  channel.subscribe.mockReturnValue(channel)

  const client = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn().mockResolvedValue('ok'),
  }

  return {
    client: client as unknown as SpesaSupabaseClient,
    channel,
    removeChannel: client.removeChannel,
  }
}

describe('realtime', () => {
  it('crea un canale distinto per famiglia', () => {
    expect(itemsChannelName('famiglia-a')).toBe('items-family-famiglia-a')
    expect(itemsChannelName(null)).toBe('items-family')
  })

  it('sottoscrive items filtrando per famiglia e chiama onChange', () => {
    const { client, channel } = fakeClient()
    const onChange = vi.fn()

    subscribeToItems({ client, familyId: 'famiglia-a', onChange })

    expect(client.channel).toHaveBeenCalledWith('items-family-famiglia-a')
    expect(channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'items',
        filter: 'family_id=eq.famiglia-a',
      },
      expect.any(Function),
    )

    const handler = channel.on.mock.calls[0]?.[2] as () => void
    handler()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('non filtra quando la famiglia non è ancora nota', () => {
    const { client, channel } = fakeClient()

    subscribeToItems({ client, familyId: null, onChange: vi.fn() })

    expect(channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'items',
      },
      expect.any(Function),
    )
  })

  it('propaga lo stato della subscription', () => {
    const { client, channel } = fakeClient()
    const onStatus = vi.fn()

    subscribeToItems({ client, familyId: 'famiglia-a', onChange: vi.fn(), onStatus })

    const handler = channel.subscribe.mock.calls[0]?.[0] as (status: string) => void
    handler('SUBSCRIBED')
    expect(onStatus).toHaveBeenCalledWith('SUBSCRIBED')
  })

  it('rimuove il canale alla cleanup', () => {
    const { client, channel, removeChannel } = fakeClient()
    const cleanup = subscribeToItems({ client, familyId: 'famiglia-a', onChange: vi.fn() })

    cleanup()

    expect(removeChannel).toHaveBeenCalledWith(channel)
  })
})
