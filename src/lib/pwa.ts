/**
 * Registra il service worker solo nella build di produzione.
 *
 * In sviluppo un service worker può servire asset vecchi e confondere Vite;
 * negli e2e la build è di produzione, quindi la registrazione viene coperta.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  function register() {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // Senza service worker l'app resta utilizzabile online.
    })
  }

  if (document.readyState === 'complete') {
    register()
    return
  }
  window.addEventListener('load', register, { once: true })
}
