/*
 * Icone Streamline Pixel (CC BY 4.0): https://streamlinehq.com
 * Le icone non presenti nel set free (close, undo, chevron) sono disegnate
 * sullo stesso grid 32×32.
 */
interface IconProps {
  class?: string
}

const base = {
  viewBox: '0 0 32 32',
  width: '1em',
  height: '1em',
  fill: 'currentColor',
  role: 'presentation',
  'aria-hidden': 'true',
  focusable: 'false',
} as const

export function SettingsIcon({ class: className }: IconProps) {
  return (
    <svg {...base} class={className}>
      <title>Impostazioni</title>
      <path d="m29.715 14.48 0 3.05 -1.52 0 0 1.52 3.04 0 0 -6.1 -3.04 0 0 1.53 1.52 0z" />
      <path d="M26.665 23.62h1.53v1.52h-1.53Z" />
      <path d="M26.665 19.05h1.53v3.05h-1.53Z" />
      <path d="M26.665 9.91h1.53v3.04h-1.53Z" />
      <path d="M26.665 6.86h1.53v1.52h-1.53Z" />
      <path d="M25.145 25.14h1.52v1.53h-1.52Z" />
      <path d="M25.145 22.1h1.52v1.52h-1.52Z" />
      <path d="M25.145 8.38h1.52v1.53h-1.52Z" />
      <path d="M25.145 5.34h1.52v1.52h-1.52Z" />
      <path d="M23.615 26.67h1.53v1.52h-1.53Z" />
      <path d="M23.615 12.95h1.53v6.1h-1.53Z" />
      <path d="M23.615 3.81h1.53v1.53h-1.53Z" />
      <path d="M22.095 25.14h1.52v1.53h-1.52Z" />
      <path d="M22.095 19.05h1.52v3.05h-1.52Z" />
      <path d="M22.095 9.91h1.52v3.04h-1.52Z" />
      <path d="M22.095 5.34h1.52v1.52h-1.52Z" />
      <path d="M19.045 26.67h3.05v1.52h-3.05Z" />
      <path d="M19.045 22.1h3.05v1.52h-3.05Z" />
      <path d="M19.045 8.38h3.05v1.53h-3.05Z" />
      <path d="M19.045 3.81h3.05v1.53h-3.05Z" />
      <path d="m17.525 29.72 -3.05 0 0 -1.53 -1.52 0 0 3.05 6.09 0 0 -3.05 -1.52 0 0 1.53z" />
      <path d="M12.955 23.62h6.09v1.52h-6.09Z" />
      <path d="m14.475 19.05 3.05 0 0 -1.52 1.52 0 0 -3.05 -1.52 0 0 -1.53 -3.05 0 0 1.53 -1.52 0 0 3.05 1.52 0 0 1.52z" />
      <path d="M12.955 6.86h6.09v1.52h-6.09Z" />
      <path d="m14.475 2.29 3.05 0 0 1.52 1.52 0 0 -3.05 -6.09 0 0 3.05 1.52 0 0 -1.52z" />
      <path d="M9.905 26.67h3.05v1.52h-3.05Z" />
      <path d="M9.905 22.1h3.05v1.52h-3.05Z" />
      <path d="M9.905 8.38h3.05v1.53h-3.05Z" />
      <path d="M9.905 3.81h3.05v1.53h-3.05Z" />
      <path d="M8.385 25.14h1.52v1.53h-1.52Z" />
      <path d="M8.385 19.05h1.52v3.05h-1.52Z" />
      <path d="M8.385 9.91h1.52v3.04h-1.52Z" />
      <path d="M8.385 5.34h1.52v1.52h-1.52Z" />
      <path d="M6.855 26.67h1.53v1.52h-1.53Z" />
      <path d="M6.855 12.95h1.53v6.1h-1.53Z" />
      <path d="M6.855 3.81h1.53v1.53h-1.53Z" />
      <path d="M5.335 25.14h1.52v1.53h-1.52Z" />
      <path d="M5.335 22.1h1.52v1.52h-1.52Z" />
      <path d="M5.335 8.38h1.52v1.53h-1.52Z" />
      <path d="M5.335 5.34h1.52v1.52h-1.52Z" />
      <path d="M3.815 23.62h1.52v1.52h-1.52Z" />
      <path d="M3.815 19.05h1.52v3.05h-1.52Z" />
      <path d="M3.815 9.91h1.52v3.04h-1.52Z" />
      <path d="M3.815 6.86h1.52v1.52h-1.52Z" />
      <path d="m3.815 17.53 -1.53 0 0 -3.05 1.53 0 0 -1.53 -3.05 0 0 6.1 3.05 0 0 -1.52z" />
    </svg>
  )
}

export function LogOutIcon({ class: className }: IconProps) {
  return (
    <svg {...base} class={className}>
      <title>Esci</title>
      <path d="m25.145 9.14 0 4.57 -6.1 0 0 3.05 6.1 0 0 4.57 1.52 0 0 -1.52 1.53 0 0 -1.52 1.52 0 0 -1.53 1.52 0 0 -3.05 -1.52 0 0 -1.52 -1.52 0 0 -1.52 -1.53 0 0 -1.53 -1.52 0z" />
      <path d="M20.575 21.33h1.52v6.1h-1.52Z" />
      <path d="M20.575 1.52h1.52v7.62h-1.52Z" />
      <path d="m14.475 30.48 0 -1.53 6.1 0 0 -1.52 -6.1 0 0 -19.81 -1.52 0 0 22.86 1.52 0z" />
      <path d="M8.385 30.48h4.57V32h-4.57Z" />
      <path d="M9.905 16.76h1.52v3.05h-1.52Z" />
      <path d="M9.905 6.1h3.05v1.52h-3.05Z" />
      <path d="M5.335 28.95h3.05v1.53h-3.05Z" />
      <path d="M6.855 4.57h3.05V6.1h-3.05Z" />
      <path d="M2.285 27.43h3.05v1.52h-3.05Z" />
      <path d="M3.815 3.05h3.04v1.52h-3.04Z" />
      <path d="m2.285 0 0 1.52 -1.52 0 0 25.91 1.52 0 0 -24.38 1.53 0 0 -1.53 16.76 0 0 -1.52 -18.29 0z" />
    </svg>
  )
}

export function CheckIcon({ class: className }: IconProps) {
  return (
    <svg {...base} class={className}>
      <title>Conferma</title>
      <path d="M28.955 15.245h1.52v1.52h-1.52Z" />
      <path d="M27.425 16.765h1.53v1.52h-1.53Z" />
      <path d="M27.425 13.715h1.53v1.53h-1.53Z" />
      <path d="M25.905 18.285h1.52v1.53h-1.52Z" />
      <path d="M25.905 12.195h1.52v1.52h-1.52Z" />
      <path d="m24.385 24.385 -4.58 0 0 1.52 6.1 0 0 -6.09 -1.52 0 0 4.57z" />
      <path d="m15.235 16.765 -1.52 0 0 -1.52 -1.53 0 0 -1.53 -1.52 0 0 1.53 -1.52 0 0 1.52 1.52 0 0 1.52 1.52 0 0 1.53 1.53 0 0 1.52 1.52 0 0 -1.52 1.53 0 0 -1.53 1.52 0 0 -1.52 1.52 0 0 -1.52 1.53 0 0 -1.53 1.52 0 0 -1.52 -1.52 0 0 -1.53 -1.53 0 0 1.53 -1.52 0 0 1.52 -1.52 0 0 1.53 -1.53 0 0 1.52z" />
      <path d="m24.385 7.625 0 4.57 1.52 0 0 -6.1 -6.1 0 0 1.53 4.58 0z" />
      <path d="M18.285 25.905h1.52v1.53h-1.52Z" />
      <path d="M18.285 4.575h1.52v1.52h-1.52Z" />
      <path d="M16.765 27.435h1.52v1.52h-1.52Z" />
      <path d="M16.765 3.055h1.52v1.52h-1.52Z" />
      <path d="M15.235 28.955h1.53v1.52h-1.53Z" />
      <path d="M15.235 1.525h1.53v1.53h-1.53Z" />
      <path d="M13.715 27.435h1.52v1.52h-1.52Z" />
      <path d="M13.715 3.055h1.52v1.52h-1.52Z" />
      <path d="M12.185 25.905h1.53v1.53h-1.53Z" />
      <path d="M12.185 4.575h1.53v1.52h-1.53Z" />
      <path d="m7.615 24.385 0 -4.57 -1.52 0 0 6.09 6.09 0 0 -1.52 -4.57 0z" />
      <path d="m7.615 7.625 4.57 0 0 -1.53 -6.09 0 0 6.1 1.52 0 0 -4.57z" />
      <path d="M4.575 18.285h1.52v1.53h-1.52Z" />
      <path d="M4.575 12.195h1.52v1.52h-1.52Z" />
      <path d="M3.045 16.765h1.53v1.52h-1.53Z" />
      <path d="M3.045 13.715h1.53v1.53h-1.53Z" />
      <path d="M1.525 15.245h1.52v1.52h-1.52Z" />
    </svg>
  )
}

export function UndoIcon({ class: className }: IconProps) {
  return (
    <svg {...base} class={className}>
      <title>Indietro</title>
      <path d="M4.57 14.48h3.05v3.04H4.57Z" />
      <path d="M7.62 11.43h3.04v3.05H7.62Z" />
      <path d="M7.62 17.52h3.04v3.05H7.62Z" />
      <path d="M10.67 8.38h3.04v3.05h-3.04Z" />
      <path d="M10.67 14.48h3.04v3.04h-3.04Z" />
      <path d="M10.67 20.57h3.04v3.05h-3.04Z" />
      <path d="M13.71 14.48h12.19v3.04H13.71Z" />
      <path d="M25.9 17.52h3.05v6.1H25.9Z" />
      <path d="M22.85 23.62h3.05v3.05h-3.05Z" />
    </svg>
  )
}

export function CloseIcon({ class: className }: IconProps) {
  return (
    <svg {...base} class={className}>
      <title>Chiudi</title>
      <path d="M7.62 7.62h3.04v3.04H7.62Z" />
      <path d="M10.66 10.66h3.04v3.04h-3.04Z" />
      <path d="M13.7 13.7h3.04v3.04H13.7Z" />
      <path d="M16.74 16.74h3.04v3.04h-3.04Z" />
      <path d="M19.78 19.78h3.04v3.04h-3.04Z" />
      <path d="M22.82 22.82h3.04v3.04h-3.04Z" />
      <path d="M22.82 7.62h3.04v3.04h-3.04Z" />
      <path d="M19.78 10.66h3.04v3.04h-3.04Z" />
      <path d="M16.74 13.7h3.04v3.04h-3.04Z" />
      <path d="M13.7 16.74h3.04v3.04H13.7Z" />
      <path d="M10.66 19.78h3.04v3.04h-3.04Z" />
      <path d="M7.62 22.82h3.04v3.04H7.62Z" />
    </svg>
  )
}

export function FilterIcon({ class: className }: IconProps) {
  return (
    <svg {...base} class={className}>
      <title>Filtra</title>
      <path d="M28.955 4.57h1.52v7.62h-1.52Z" />
      <path d="M27.435 12.19h1.52v1.52h-1.52Z" />
      <path d="M27.435 3.05h1.52v1.52h-1.52Z" />
      <path d="M25.905 13.71h1.53v1.53h-1.53Z" />
      <path d="M24.385 15.24h1.52v1.52h-1.52Z" />
      <path d="m24.385 3.05 -16.76 0 0 1.52 -3.05 0 0 3.05 3.05 0 0 1.52 3.04 0 0 1.53 10.67 0 0 -1.53 3.05 0 0 -1.52 3.05 0 0 -3.05 -3.05 0 0 -1.52z" />
      <path d="M24.385 1.52h3.05v1.53h-3.05Z" />
      <path d="M22.855 16.76h1.53v1.53h-1.53Z" />
      <path d="M21.335 18.29h1.52v1.52h-1.52Z" />
      <path d="M19.815 19.81h1.52v1.52h-1.52Z" />
      <path d="M18.285 21.33h1.53v7.62h-1.53Z" />
      <path d="M16.765 28.95h1.52v1.53h-1.52Z" />
      <path d="M13.715 30.48h3.05V32h-3.05Z" />
      <path d="M12.195 21.33h1.52v9.15h-1.52Z" />
      <path d="M10.665 19.81h1.53v1.52h-1.53Z" />
      <path d="M9.145 18.29h1.52v1.52h-1.52Z" />
      <path d="M7.625 0h16.76v1.52H7.625Z" />
      <path d="M7.625 16.76h1.52v1.53h-1.52Z" />
      <path d="M6.095 15.24h1.53v1.52h-1.53Z" />
      <path d="M4.575 1.52h3.05v1.53h-3.05Z" />
      <path d="M4.575 13.71h1.52v1.53h-1.52Z" />
      <path d="M3.055 12.19h1.52v1.52h-1.52Z" />
      <path d="M3.055 3.05h1.52v1.52h-1.52Z" />
      <path d="M1.525 4.57h1.53v7.62H1.525Z" />
    </svg>
  )
}

export function ChevronUpIcon({ class: className }: IconProps) {
  return (
    <svg {...base} class={className}>
      <title>Su</title>
      <path d="M6.1 19.81h3.04v3.04H6.1Z" />
      <path d="M9.14 16.77h3.04v3.04H9.14Z" />
      <path d="M12.18 13.73h3.05v3.04h-3.05Z" />
      <path d="M15.23 13.73h3.04v3.04h-3.04Z" />
      <path d="M18.27 16.77h3.04v3.04h-3.04Z" />
      <path d="M21.31 19.81h3.05v3.04h-3.05Z" />
    </svg>
  )
}

export function ChevronDownIcon({ class: className }: IconProps) {
  return (
    <svg {...base} class={className}>
      <title>Giù</title>
      <path d="M6.1 9.14h3.04v3.04H6.1Z" />
      <path d="M9.14 12.18h3.04v3.04H9.14Z" />
      <path d="M12.18 15.22h3.05v3.05h-3.05Z" />
      <path d="M15.23 15.22h3.04v3.05h-3.04Z" />
      <path d="M18.27 12.18h3.04v3.04h-3.04Z" />
      <path d="M21.31 9.14h3.05v3.04h-3.05Z" />
    </svg>
  )
}
