import { useEffect, useState } from 'preact/hooks'

function currentOnlineStatus(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

/** Segue lo stato rete del browser, utile per il banner offline della PWA. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(currentOnlineStatus)

  useEffect(() => {
    function handleOnline() {
      setOnline(true)
    }
    function handleOffline() {
      setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setOnline(currentOnlineStatus())

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return online
}
