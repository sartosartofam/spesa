interface EmptyStateProps {
  title: string
  hint: string
}

export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div class="empty">
      <p class="empty__title">{title}</p>
      <p class="empty__hint">{hint}</p>
    </div>
  )
}
