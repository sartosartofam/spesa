import { useState } from 'preact/hooks'
import {
  CONTACT_EMAIL,
  CONTACT_LABEL,
  DONATION_HOLDER,
  DONATION_IBAN,
  DONATION_LABEL,
  GITHUB_URL,
  STREAMLINE_LABEL,
  STREAMLINE_URL,
} from '../lib/landing-content'
import { navigate } from '../lib/routes'

function goTo(path: string, event: MouseEvent) {
  event.preventDefault()
  navigate(path)
}

export function PublicFooter() {
  const [copyMessage, setCopyMessage] = useState<string | null>(null)

  async function copyIban() {
    try {
      await navigator.clipboard.writeText(DONATION_IBAN)
      setCopyMessage('IBAN copiato.')
    } catch {
      setCopyMessage('Copia manuale non disponibile: seleziona l’IBAN qui sopra.')
    }
  }

  return (
    <footer class="public-footer public-footer--rich">
      <div class="public-footer__inner">
        <div class="public-footer__brand">
          <a class="public-brand" href="/" onClick={(event) => goTo('/', event)}>
            Spesa
          </a>
          <p>
            La lista della spesa condivisa per famiglie. Gratis, senza pubblicità e senza
            tracciamento.
          </p>
          <p class="public-footer__note">Costruita per essere semplice, anche al supermercato.</p>
        </div>

        <nav class="public-footer__col" aria-labelledby="footer-progetto">
          <h2 id="footer-progetto">Progetto</h2>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener">
            Repository GitHub
            <span class="sr-only"> (si apre in una nuova scheda)</span>
          </a>
          <a href="/privacy" onClick={(event) => goTo('/privacy', event)}>
            Privacy
          </a>
          <a href="/login" onClick={(event) => goTo('/login', event)}>
            Accedi
          </a>
          <a href="/register" onClick={(event) => goTo('/register', event)}>
            Registrati
          </a>
        </nav>

        <div class="public-footer__col">
          <h2>Contatti</h2>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          <p>{CONTACT_LABEL} per segnalazioni, idee o problemi.</p>
        </div>

        <div class="public-footer__col public-footer__support">
          <h2>{DONATION_LABEL}</h2>
          <p>Se Spesa ti è utile, puoi offrirmi un caffè con un bonifico.</p>
          <p class="public-footer__iban">
            <span>IBAN</span>
            <code>{DONATION_IBAN}</code>
          </p>
          <p class="public-footer__holder">{DONATION_HOLDER}</p>
          <button class="button button--ghost" type="button" onClick={() => void copyIban()}>
            Copia IBAN
          </button>
          {copyMessage && (
            <p class="hint" role="status">
              {copyMessage}
            </p>
          )}
        </div>
      </div>

      <div class="public-footer__bottom">
        <p>Spesa — lista della spesa condivisa per famiglie.</p>
        <p>
          Icone pixel:{' '}
          <a href={STREAMLINE_URL} target="_blank" rel="noreferrer noopener">
            {STREAMLINE_LABEL}
            <span class="sr-only"> (si apre in una nuova scheda)</span>
          </a>
          .
        </p>
      </div>
    </footer>
  )
}
