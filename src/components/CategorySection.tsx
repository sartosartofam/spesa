import type { Item, ItemStatus } from '../lib/types'
import { ItemRow } from './ItemRow'

interface CategorySectionProps {
  title: string
  items: Item[]
  variant: 'active' | 'history'
  urgent?: boolean
  onStatus: (id: string, status: ItemStatus) => void | Promise<void>
}

export function CategorySection({
  title,
  items,
  variant,
  urgent = false,
  onStatus,
}: CategorySectionProps) {
  if (items.length === 0) return null

  return (
    <section class="section" aria-labelledby={`section-${slug(title)}`}>
      <h2
        class={`section__title ${urgent ? 'section__title--urgent' : ''}`}
        id={`section-${slug(title)}`}
      >
        {title}
        <span class="section__count">{items.length}</span>
      </h2>
      <ul class="list">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} variant={variant} onStatus={onStatus} />
        ))}
      </ul>
    </section>
  )
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
