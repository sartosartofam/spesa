import type { RefObject } from 'preact'
import { useEffect } from 'preact/hooks'

/**
 * Fa seguire il bagliore della landing al puntatore con un inseguimento
 * esponenziale. A riposo resta al centro; quando il puntatore esce torna al
 * centro con una costante di tempo più lenta, così il movimento resta calmo.
 */
const HOVER_TIME_CONSTANT = 500
const RETURN_TIME_CONSTANT = 1000
const SNAP_EPSILON = 0.2

interface GlowPoint {
  x: number
  y: number
}

function centerOf(element: HTMLElement): GlowPoint {
  return { x: element.clientWidth / 2, y: element.clientHeight / 2 }
}

function writeGlow(element: HTMLElement, point: GlowPoint): void {
  element.style.setProperty('--glow-x', `${point.x.toFixed(2)}px`)
  element.style.setProperty('--glow-y', `${point.y.toFixed(2)}px`)
}

export function useLandingGlow(heroRef: RefObject<HTMLElement>, enabled: boolean): void {
  useEffect(() => {
    const element = heroRef.current
    if (!element) return
    const hero: HTMLElement = element

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let lastFrame = 0
    let hovering = false
    let current = centerOf(hero)
    let target = { ...current }

    writeGlow(hero, current)
    if (!enabled) return

    function animate(now: number): void {
      const elapsed = lastFrame === 0 ? 16 : Math.min(now - lastFrame, 64)
      lastFrame = now
      const timeConstant = hovering ? HOVER_TIME_CONSTANT : RETURN_TIME_CONSTANT
      const amount = reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / timeConstant)
      const dx = target.x - current.x
      const dy = target.y - current.y

      current = { x: current.x + dx * amount, y: current.y + dy * amount }

      if (Math.abs(dx) < SNAP_EPSILON && Math.abs(dy) < SNAP_EPSILON) {
        current = { ...target }
        writeGlow(hero, current)
        frame = 0
        lastFrame = 0
        return
      }

      writeGlow(hero, current)
      frame = requestAnimationFrame(animate)
    }

    function start(): void {
      if (frame) return
      lastFrame = 0
      frame = requestAnimationFrame(animate)
    }

    function handlePointerMove(event: PointerEvent): void {
      const rect = hero.getBoundingClientRect()
      hovering = true
      target = {
        x: Math.min(Math.max(event.clientX - rect.left, 0), rect.width),
        y: Math.min(Math.max(event.clientY - rect.top, 0), rect.height),
      }
      start()
    }

    function handlePointerLeave(): void {
      hovering = false
      target = centerOf(hero)
      start()
    }

    function handleResize(): void {
      if (hovering) return
      current = centerOf(hero)
      target = { ...current }
      writeGlow(hero, current)
    }

    hero.addEventListener('pointermove', handlePointerMove)
    hero.addEventListener('pointerleave', handlePointerLeave)
    hero.addEventListener('pointercancel', handlePointerLeave)
    window.addEventListener('resize', handleResize)

    return () => {
      hero.removeEventListener('pointermove', handlePointerMove)
      hero.removeEventListener('pointerleave', handlePointerLeave)
      hero.removeEventListener('pointercancel', handlePointerLeave)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(frame)
    }
  }, [heroRef, enabled])
}
