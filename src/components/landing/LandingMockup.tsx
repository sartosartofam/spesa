import { CheckIcon } from '../Icons'

type MockupKind = 'quick-add' | 'urgent' | 'family' | 'history'

interface LandingMockupProps {
  kind: MockupKind
}

/**
 * Finte schermate dell'app per la landing. Sono decorative: il testo accanto
 * spiega già il contenuto, quindi restano fuori dall'albero accessibile.
 */
export function LandingMockup({ kind }: LandingMockupProps) {
  return (
    <div class={`landing-mockup landing-mockup--${kind}`} aria-hidden="true">
      <div class="landing-mockup__window">
        <div class="landing-mockup__bar">
          <span class="landing-mockup__dot" />
          <span class="landing-mockup__dot" />
          <span class="landing-mockup__dot" />
          <span class="landing-mockup__title">Spesa</span>
        </div>

        {kind === 'quick-add' && (
          <div class="landing-mockup__body">
            <div class="landing-mockup__input">
              <span>Aggiungi un articolo</span>
              <kbd>Invio</kbd>
            </div>
            <div class="landing-mockup__chips">
              <span class="is-active">Dispensa</span>
              <span>Freschi</span>
              <span>Casa</span>
            </div>
            <ul class="landing-mockup__list">
              <li>
                <span class="landing-mockup__check" />
                <span>Latte intero</span>
                <em>2 l</em>
              </li>
              <li>
                <span class="landing-mockup__check" />
                <span>Mele</span>
                <em>1 kg</em>
              </li>
              <li>
                <span class="landing-mockup__check" />
                <span>Pasta</span>
                <em>3 pacchi</em>
              </li>
            </ul>
          </div>
        )}

        {kind === 'urgent' && (
          <div class="landing-mockup__body">
            <div class="landing-mockup__alert">
              <span class="landing-mockup__alert-dot" />
              <span>
                <strong>Latte intero</strong>
                <small>Segnalato urgente</small>
              </span>
            </div>
            <ul class="landing-mockup__list">
              <li class="is-urgent">
                <span class="landing-mockup__check" />
                <span>Latte intero</span>
                <em>Urgente</em>
              </li>
              <li>
                <span class="landing-mockup__check" />
                <span>Pane integrale</span>
                <em>1</em>
              </li>
              <li>
                <span class="landing-mockup__check" />
                <span>Caffè</span>
                <em>2 conf.</em>
              </li>
            </ul>
          </div>
        )}

        {kind === 'family' && (
          <div class="landing-mockup__body">
            <div class="landing-mockup__people">
              <span class="landing-mockup__avatar">G</span>
              <span class="landing-mockup__avatar">M</span>
              <span class="landing-mockup__people-label">2 membri · stessa lista</span>
            </div>
            <ul class="landing-mockup__list">
              <li>
                <span class="landing-mockup__check is-done">
                  <CheckIcon />
                </span>
                <span>Mele</span>
                <em>Giulia</em>
              </li>
              <li>
                <span class="landing-mockup__check" />
                <span>Pane</span>
                <em>Marco</em>
              </li>
              <li>
                <span class="landing-mockup__check" />
                <span>Detersivo</span>
                <em>Giulia</em>
              </li>
            </ul>
            <p class="landing-mockup__live">
              <span class="landing-mockup__live-dot" />
              Aggiornata ora
            </p>
          </div>
        )}

        {kind === 'history' && (
          <div class="landing-mockup__body">
            <div class="landing-mockup__history-head">
              <span>Storico</span>
              <span>Ultimi acquisti</span>
            </div>
            <ul class="landing-mockup__list landing-mockup__list--history">
              <li>
                <span>Pane integrale</span>
                <em>ieri</em>
              </li>
              <li>
                <span>Caffè</span>
                <em>3 giorni</em>
              </li>
              <li>
                <span>Pasta</span>
                <em>5 giorni</em>
              </li>
            </ul>
            <span class="landing-mockup__reorder">Rimetti in lista</span>
          </div>
        )}
      </div>
    </div>
  )
}
