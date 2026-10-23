import type { Item, ListView } from '../lib/types'

interface ItemRowProps {
  item: Item
  variant: ListView
  showCategory?: boolean
  onMarkBought: (item: Item) => void | Promise<void>
  onRestore: (item: Item) => void | Promise<void>
  onToggleUrgent: (item: Item) => void | Promise<void>
  onEdit: (item: Item) => void
}

export function ItemRow({
  item,
  variant,
  showCategory = false,
  onMarkBought,
  onRestore,
  onToggleUrgent,
  onEdit,
}: ItemRowProps) {
  const isHistory = variant === 'history'
  const quantity = item.quantity?.trim()
  const showQuantity = Boolean(quantity && quantity !== '1')

  return (
    <li class={`item ${item.urgent ? 'item--urgent' : ''}`}>
      {isHistory ? (
        <button
          class="item__check item__check--restore"
          type="button"
          aria-label={`Rimetti ${item.name} in lista`}
          title="Rimetti in lista"
          onClick={() => void onRestore(item)}
        >
          ↺
        </button>
      ) : (
        <button
          class="item__check"
          type="button"
          aria-label={`Segna ${item.name} come preso`}
          title="Segna come preso"
          onClick={() => void onMarkBought(item)}
        >
          ✓
        </button>
      )}

      <button
        class="item__open"
        type="button"
        aria-label={`Modifica ${item.name}`}
        onClick={() => onEdit(item)}
      >
        <span class="item__title">
          <span class="item__name">{item.name}</span>
          {item.urgent && <span class="chip chip--urgent">Urgente</span>}
        </span>
        <span class="item__meta">
          {showQuantity && <span class="item__qty">{quantity}</span>}
          {showCategory && <span class="item__category">{item.category ?? 'Altro'}</span>}
          {item.note && <span class="item__note">{item.note}</span>}
        </span>
      </button>

      <div class="item__actions">
        {isHistory ? (
          <button
            class="button button--ghost"
            type="button"
            onClick={() => void onToggleUrgent(item)}
          >
            È finito
          </button>
        ) : (
          <button
            class="button button--ghost"
            type="button"
            aria-pressed={item.urgent}
            onClick={() => void onToggleUrgent(item)}
          >
            {item.urgent ? 'Non urgente' : 'È finito'}
          </button>
        )}
        {isHistory ? (
          <button class="button button--ghost" type="button" onClick={() => void onRestore(item)}>
            Rimetti
          </button>
        ) : (
          <button
            class="button button--primary"
            type="button"
            onClick={() => void onMarkBought(item)}
          >
            Preso
          </button>
        )}
        <button class="button button--ghost" type="button" onClick={() => onEdit(item)}>
          Modifica
        </button>
      </div>
    </li>
  )
}
