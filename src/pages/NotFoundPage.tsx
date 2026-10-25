import { useRef } from 'preact/hooks'
import { useCursorGlow } from '../hooks/useCursorGlow'
import { readLandingGlow } from '../lib/landing-glow'
import { navigate } from '../lib/routes'

export function NotFoundPage() {
  const pageRef = useRef<HTMLDivElement>(null)
  const glowEnabled = readLandingGlow()

  useCursorGlow(pageRef, glowEnabled)

  return (
    <div class="public-shell not-found-shell" ref={pageRef} data-glow={glowEnabled ? 'on' : 'off'}>
      <div class="not-found__glow" aria-hidden="true" />
      <main class="not-found" aria-labelledby="not-found-title">
        <p class="not-found__code" aria-hidden="true">
          404
        </p>
        <p class="landing__eyebrow">Pagina non trovata</p>
        <h1 id="not-found-title">Questa pagina non esiste.</h1>
        <p class="landing__lead">
          Il collegamento potrebbe essere vecchio o scritto male. Torna alla pagina iniziale per
          accedere alla lista della spesa.
        </p>
        <a
          class="button button--primary"
          href="/"
          onClick={(event) => {
            event.preventDefault()
            navigate('/')
          }}
        >
          Torna alla pagina iniziale
        </a>
      </main>
    </div>
  )
}
