import { useRef, useState } from 'preact/hooks'
import { CheckIcon, ChevronDownIcon } from '../components/Icons'
import { LandingGlass } from '../components/landing/LandingGlass'
import { LandingMockup } from '../components/landing/LandingMockup'
import { PublicFooter } from '../components/PublicFooter'
import { PublicHeader } from '../components/PublicHeader'
import { useCursorGlow } from '../hooks/useCursorGlow'
import { readLandingGlow, writeLandingGlow } from '../lib/landing-glow'
import { navigate } from '../lib/routes'

function goToLogin(event: MouseEvent) {
  event.preventDefault()
  navigate('/login')
}

function goToRegister(event: MouseEvent) {
  event.preventDefault()
  navigate('/register')
}

export function LandingPage() {
  const heroRef = useRef<HTMLElement>(null)
  const [glowEnabled, setGlowEnabled] = useState(() => readLandingGlow())

  useCursorGlow(heroRef, glowEnabled)

  function toggleGlow() {
    const next = !glowEnabled
    setGlowEnabled(next)
    writeLandingGlow(next)
  }

  return (
    <div class="public-shell landing-shell">
      <PublicHeader overlay />

      <main class="landing">
        <section
          class="landing__hero landing-hero"
          aria-labelledby="landing-title"
          ref={heroRef}
          data-glow={glowEnabled ? 'on' : 'off'}
        >
          <div class="landing-hero__grid" aria-hidden="true" />
          <div class="landing-hero__inner">
            <p class="landing__eyebrow">Lista della spesa condivisa</p>
            <h1 id="landing-title">
              La lista della spesa di tutta la famiglia,{' '}
              <span class="landing-hero__accent">sempre aggiornata.</span>
            </h1>
            <p class="landing__lead">
              Spesa è la webapp gratuita e senza pubblicità per organizzare la spesa di famiglia.
              Aggiungi ciò che manca, segna le urgenze e ritrova lo storico in un unico posto.
            </p>
            <div class="landing__actions">
              <a class="button button--primary" href="/register" onClick={goToRegister}>
                Crea la tua famiglia
              </a>
              <a class="button button--ghost" href="/login" onClick={goToLogin}>
                Accedi
              </a>
            </div>

            <div class="landing-hero__meta">
              <span>
                <CheckIcon /> Gratis
              </span>
              <span>
                <CheckIcon /> Senza pubblicità
              </span>
              <span>
                <CheckIcon /> Anche da telefono
              </span>
            </div>

            <div class="landing-hero__bottom">
              <a class="landing-scroll" href="#come-funziona">
                Scopri come funziona
                <ChevronDownIcon />
              </a>
              <button
                class="landing-glow-toggle"
                type="button"
                aria-pressed={glowEnabled}
                onClick={toggleGlow}
              >
                <span class="landing-glow-toggle__dot" aria-hidden="true" />
                Effetto cursore
              </button>
            </div>
          </div>
        </section>

        <div class="landing-content">
          <section class="landing-section" id="come-funziona" aria-labelledby="come-funziona-title">
            <header class="landing-section__head">
              <p class="landing__eyebrow">Come funziona</p>
              <h2 id="come-funziona-title">Una lista sola, per tutta la famiglia.</h2>
              <p>
                Chi è al supermercato e chi è a casa lavorano sulla stessa lista. Senza chat, senza
                screenshot, senza dimenticanze.
              </p>
            </header>

            <div class="landing-rows">
              <article class="landing-row">
                <div class="landing-row__copy">
                  <span class="landing-row__number">01</span>
                  <h3>Aggiungi in pochi secondi</h3>
                  <p>
                    Scrivi il nome dell’articolo e, se serve, categoria, quantità e una nota. La
                    lista resta ordinata e facile da leggere anche al supermercato.
                  </p>
                </div>
                <div class="landing-row__visual">
                  <LandingMockup kind="quick-add" />
                </div>
              </article>

              <article class="landing-row landing-row--reverse">
                <div class="landing-row__copy">
                  <span class="landing-row__number">02</span>
                  <h3>Segnala quello che è finito</h3>
                  <p>
                    Con un tocco un articolo diventa urgente e sale in evidenza. Così nessuno
                    dimentica il latte o i pannolini.
                  </p>
                </div>
                <div class="landing-row__visual">
                  <LandingMockup kind="urgent" />
                </div>
              </article>

              <article class="landing-row">
                <div class="landing-row__copy">
                  <span class="landing-row__number">03</span>
                  <h3>Tutti vedono le stesse cose</h3>
                  <p>
                    La lista è condivisa tra i membri della famiglia: chi è al supermercato e chi è
                    a casa lavorano sulla stessa lista.
                  </p>
                </div>
                <div class="landing-row__visual">
                  <LandingMockup kind="family" />
                </div>
              </article>

              <article class="landing-row landing-row--reverse">
                <div class="landing-row__copy">
                  <span class="landing-row__number">04</span>
                  <h3>Lo storico non si perde</h3>
                  <p>
                    Gli articoli presi finiscono nello storico e si possono rimettere in lista
                    quando servono di nuovo.
                  </p>
                </div>
                <div class="landing-row__visual">
                  <LandingMockup kind="history" />
                </div>
              </article>
            </div>
          </section>

          <section
            class="landing-section landing-section--glass"
            aria-labelledby="landing-glass-title"
          >
            <div class="landing-row landing-row--glass">
              <div class="landing-row__copy">
                <p class="landing__eyebrow">La routine, senza attrito</p>
                <h2 id="landing-glass-title">Semplice come bere un bicchiere d’acqua.</h2>
                <p>
                  Non serve un manuale, non serve configurare niente. Apri Spesa, scrivi cosa manca
                  e la famiglia vede la lista aggiornata.
                </p>
                <ul class="landing-checks">
                  <li>
                    <CheckIcon /> Apri
                  </li>
                  <li>
                    <CheckIcon /> Scrivi
                  </li>
                  <li>
                    <CheckIcon /> Fatto
                  </li>
                </ul>
              </div>
              <div class="landing-row__visual landing-row__visual--glass">
                <LandingGlass />
              </div>
            </div>
          </section>

          <section class="landing-section landing-section--cta" aria-labelledby="gratis-title">
            <div class="landing-cta">
              <p class="landing__eyebrow">Pronto quando vuoi</p>
              <h2 id="gratis-title">Gratis, senza pubblicità, senza sorprese.</h2>
              <p>
                Ogni famiglia ha il suo spazio riservato. Crea il tuo account e inizia subito: la
                lista è pronta, il resto viene da sé.
              </p>
              <div class="landing__actions">
                <a class="button button--primary" href="/register" onClick={goToRegister}>
                  Crea la tua famiglia
                </a>
                <a class="button button--ghost" href="/login" onClick={goToLogin}>
                  Accedi
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
