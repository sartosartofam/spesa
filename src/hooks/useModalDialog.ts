import { useEffect, useRef } from 'preact/hooks'

export interface ModalDialogOptions {
  /**
   * Elemento su cui spostare il focus quando il trigger che ha aperto il dialog
   * non è più utilizzabile (per esempio un pulsante diventato disabilitato).
   */
  fallbackFocus?: () => HTMLElement | null
}

/**
 * Gestisce un <dialog> nativo: apre in modale e chiude al click sul backdrop.
 * Escape resta gestito dall'evento `cancel` del dialog stesso.
 *
 * Il dialog viene smontato dal componente padre appena si chiude, quindi il
 * ripristino nativo del focus non scatta: lo riportiamo noi sull'elemento che
 * aveva aperto il dialog. Il ripristino avviene al frame successivo, perché
 * finché il nodo del dialog è nel DOM il focus è ancora al suo interno e la
 * rimozione lo sposterebbe su <body> sovrascrivendo il nostro `focus()`.
 */
export function useModalDialog(onClose: () => void, options: ModalDialogOptions = {}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const fallbackFocusRef = useRef(options.fallbackFocus)
  fallbackFocusRef.current = options.fallbackFocus

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const active = document.activeElement
    const previouslyFocused =
      active instanceof HTMLElement && active !== document.body ? active : null
    if (!dialog.open) dialog.showModal()

    function handleClick(event: MouseEvent) {
      if (event.target === dialog) onCloseRef.current()
    }

    dialog.addEventListener('click', handleClick)
    return () => {
      dialog.removeEventListener('click', handleClick)
      requestAnimationFrame(() => {
        const target =
          previouslyFocused?.isConnected && isFocusable(previouslyFocused)
            ? previouslyFocused
            : fallbackFocusRef.current?.()
        target?.focus()
      })
    }
  }, [])

  return dialogRef
}

function isFocusable(element: HTMLElement): boolean {
  if (element.hasAttribute('disabled')) return false
  return element.getClientRects().length > 0
}
