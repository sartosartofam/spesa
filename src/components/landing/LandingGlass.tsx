import { useEffect, useRef } from 'preact/hooks'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Bicchiere decorativo che si riempie mentre la sezione attraversa la
 * viewport. La percentuale è una variabile CSS, così l'animazione resta
 * fluida e non dipende da librerie esterne.
 */
export function LandingGlass() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0

    function update() {
      if (!element) return
      if (reducedMotion.matches) {
        element.style.setProperty('--fill', '100%')
        return
      }

      const rect = element.getBoundingClientRect()
      const viewport = window.innerHeight || 1
      const progress = clamp((viewport - rect.top) / (viewport + rect.height), 0, 1)
      element.style.setProperty('--fill', `${Math.round(progress * 100)}%`)
    }

    function schedule() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    reducedMotion.addEventListener('change', schedule)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      reducedMotion.removeEventListener('change', schedule)
    }
  }, [])

  return (
    <div class="landing-glass" ref={ref} aria-hidden="true">
      <div class="landing-glass__scene">
        <div class="landing-glass__halo" />
        <div class="landing-glass__glass">
          <div class="landing-glass__water">
            <span class="landing-glass__bubble landing-glass__bubble--one" />
            <span class="landing-glass__bubble landing-glass__bubble--two" />
            <span class="landing-glass__bubble landing-glass__bubble--three" />
          </div>
          <span class="landing-glass__shine" />
        </div>
      </div>
      <p class="landing-glass__caption">Scorri. Il bicchiere si riempie.</p>
    </div>
  )
}
