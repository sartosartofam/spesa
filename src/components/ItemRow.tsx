import type { Item, ItemStatus } from '../lib/types'

interface ItemRowProps {
  item: Item
  variant: 'active' | 'history'
  onStatus: (id: string, status: ItemStatus) => void | Promise<void>
}

export function ItemRow({ item, variant, onStatus }: ItemRowProps) {
  const isFinished = item.status === 'finished'

  return (
    <li class={`item ${isFinished ? 'item--urgent' : ''}`}>
      <div class="item__body">
        <span class="item__name">{item.name}</span>
        {item.quantity && <span class="item__quantity">{item.quantity}</span>}
        {item.note && <span class="item__note">{item.note}</span>}
      </div>

      {variant === 'active' ? (
        <div class="item__actions">
          <button
            class="button button--ghost"
            type="button"
            aria-label={`Segna ${item.name} come finito`}
            onClick={() => void onStatus(item.id, 'finished')}
          >
            È finito
          </button>
          <button
            class="button button--primary"
            type="button"
            aria-label={`Segna ${item.name} come preso`}
            onClick={() => void onStatus(item.id, 'bought')}
          >
            Preso
          </button>
        </div>
      ) : (
        <div class="item__actions">
          <button
            class="button button--ghost"
            type="button"
            aria-label={`Rimetti ${item.name} in lista`}
            onClick={() => void onStatus(item.id, 'to_buy')}
          >
            Rimetti in lista
          </button>
        </div>
      )}
    </li>
  )
}
