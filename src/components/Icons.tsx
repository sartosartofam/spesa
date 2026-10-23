interface IconProps {
  class?: string
}

const base = {
  viewBox: '0 0 24 24',
  width: '1em',
  height: '1em',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 1.8,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  role: 'presentation',
  'aria-hidden': 'true',
  focusable: 'false',
} as const

export function SettingsIcon({ class: className }: IconProps) {
  return (
    <svg {...base} class={className}>
      <title>Impostazioni</title>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}

export function CheckIcon({ class: className }: IconProps) {
  return (
    <svg {...base} class={className}>
      <title>Conferma</title>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function UndoIcon({ class: className }: IconProps) {
  return (
    <svg {...base} class={className}>
      <title>Indietro</title>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </svg>
  )
}

export function CloseIcon({ class: className }: IconProps) {
  return (
    <svg {...base} class={className}>
      <title>Chiudi</title>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

export function FilterIcon({ class: className }: IconProps) {
  return (
    <svg {...base} class={className}>
      <title>Filtra</title>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  )
}

export function ChevronUpIcon({ class: className }: IconProps) {
  return (
    <svg {...base} class={className}>
      <title>Su</title>
      <path d="m6 15 6-6 6 6" />
    </svg>
  )
}

export function ChevronDownIcon({ class: className }: IconProps) {
  return (
    <svg {...base} class={className}>
      <title>Giù</title>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
