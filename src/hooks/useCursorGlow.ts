import type { RefObject } from 'preact'
import { useEffect } from 'preact/hooks'

/**
 * Fa seguire il bagliore al puntatore con un inseguimento esponenziale.
 * L'avvicinamento usa una costante lenta; quando il puntatore è stato
 * raggiunto il bagliore passa a una costante più rapida e resta aderente.
 * A riposo torna al centro con un rientro ancora più lento.
 */
const APPROACH_TIME_CONSTANT = 500
const STICK_TIME_CONSTANT = 90
const RETURN_TIME_CONSTANT = 1000
const CATCH_DISTANCE = 12
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

export function useCursorGlow<T extends HTMLElement>(
  elementRef: RefObject<T>,
  enabled: boolean,
): void {
  useEffect(() => {
    const element = elementRef.current
    if (!element) return
    const container: HTMLElement = element

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let lastFrame = 0
    let hovering = false
    let caught = false
    let current = centerOf(container)
    let target = { ...current }

    writeGlow(container, current)
    if (!enabled) return

    function animate(now: number): void {
      const elapsed = lastFrame === 0 ? 16 : Math.min(now - lastFrame, 64)
      lastFrame = now
      const distance = Math.hypot(target.x - current.x, target.y - current.y)

      if (hovering && !caught && distance <= CATCH_DISTANCE) caught = true

      const timeConstant = hovering
        ? caught
          ? STICK_TIME_CONSTANT
          : APPROACH_TIME_CONSTANT
        : RETURN_TIME_CONSTANT
      const amount = reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / timeConstant)
      const dx = target.x - current.x
      const dy = target.y - current.y

      current = { x: current.x + dx * amount, y: current.y + dy * amount }

      if (Math.abs(dx) < SNAP_EPSILON && Math.abs(dy) < SNAP_EPSILON) {
        current = { ...target }
        writeGlow(container, current)
        frame = 0
        lastFrame = 0
        return
      }

      writeGlow(container, current)
      frame = requestAnimationFrame(animate)
    }

    function start(): void {
      if (frame) return
      lastFrame = 0
      frame = requestAnimationFrame(animate)
    }

    function handlePointerMove(event: PointerEvent): void {
      const rect = container.getBoundingClientRect()
      hovering = true
      target = {
        x: Math.min(Math.max(event.clientX - rect.left, 0), rect.width),
        y: Math.min(Math.max(event.clientY - rect.top, 0), rect.height),
      }
      start()
    }

    function handlePointerLeave(): void {
      hovering = false
      caught = false
      target = centerOf(container)
      start()
    }

    function handleResize(): void {
      if (hovering) return
      caught = false
      current = centerOf(container)
      target = { ...current }
      writeGlow(container, current)
    }

    container.addEventListener('pointermove', handlePointerMove)
    container.addEventListener('pointerleave', handlePointerLeave)
    container.addEventListener('pointercancel', handlePointerLeave)
    window.addEventListener('resize', handleResize)

    return () => {
      container.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointerleave', handlePointerLeave)
      container.removeEventListener('pointercancel', handlePointerLeave)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(frame)
    }
  }, [elementRef, enabled])
}
