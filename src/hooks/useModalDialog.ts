import { useEffect, useRef } from 'preact/hooks'

/**
 * Gestisce un <dialog> nativo: apre in modale e chiude al click sul backdrop.
 * Escape resta gestito dall'evento `cancel` del dialog stesso.
 */
export function useModalDialog(onClose: () => void) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()

    function handleClick(event: MouseEvent) {
      if (event.target === dialog) onCloseRef.current()
    }

    dialog.addEventListener('click', handleClick)
    return () => dialog.removeEventListener('click', handleClick)
  }, [])

  return dialogRef
}
