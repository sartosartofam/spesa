import type { Item, ListView } from '../lib/types'
import { CheckIcon, UndoIcon } from './Icons'

interface ItemRowProps {
  item: Item
  variant: ListView
  showCategory?: boolean
  onMarkBought: (item: Item) => void | Promise<void>
  onRestore: (item: Item) => void | Promise<void>
  onEdit: (item: Item) => void
}

export function ItemRow({
  item,
  variant,
  showCategory = false,
  onMarkBought,
  onRestore,
  onEdit,
}: ItemRowProps) {
  const isHistory = variant === 'history'
  const quantity = item.quantity?.trim()
  const showQuantity = Boolean(quantity && quantity !== '1')
  const showMeta = (showCategory && Boolean(item.category)) || Boolean(item.note)

  return (
    <li class={`item ${item.urgent ? 'item--urgent' : ''}`}>
      <button
        class={`item__check ${isHistory ? 'item__check--restore' : ''}`}
        type="button"
        aria-label={isHistory ? `Rimetti ${item.name} in lista` : `Segna ${item.name} come preso`}
        title={isHistory ? 'Rimetti in lista' : 'Segna come preso'}
        onClick={() => void (isHistory ? onRestore(item) : onMarkBought(item))}
      >
        <span class="item__check-box" aria-hidden="true">
          {isHistory ? <UndoIcon /> : <CheckIcon />}
        </span>
      </button>

      <button
        class="item__open"
        type="button"
        aria-label={`Modifica ${item.name}`}
        onClick={() => onEdit(item)}
      >
        <span class="item__title">
          <span class="item__name">{item.name}</span>
          {item.urgent && <span class="chip chip--urgent item__tag">Urgente</span>}
        </span>
        {showMeta && (
          <span class="item__meta">
            {showCategory && <span class="item__category">{item.category ?? 'Altro'}</span>}
            {item.note && <span class="item__note">{item.note}</span>}
          </span>
        )}
      </button>

      <div class="item__aside">
        {showQuantity && <span class="item__qty">{quantity}</span>}
        <div class="item__actions">
          <button
            class="button button--ghost button--compact"
            type="button"
            onClick={() => onEdit(item)}
          >
            Modifica
          </button>
        </div>
      </div>
    </li>
  )
}
