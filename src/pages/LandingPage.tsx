import { CheckIcon } from '../components/Icons'
import { navigate } from '../lib/routes'

function goToLogin(event: MouseEvent) {
  event.preventDefault()
  navigate('/login')
}

export function LandingPage() {
  return (
    <div class="public-shell">
      <header class="public-header">
        <a
          class="public-brand"
          href="/"
          onClick={(event) => {
            event.preventDefault()
            navigate('/')
          }}
        >
          Spesa
        </a>
        <a class="button button--ghost" href="/login" onClick={goToLogin}>
          Accedi
        </a>
      </header>

      <main class="landing">
        <section class="landing__hero" aria-labelledby="landing-title">
          <p class="landing__eyebrow">Lista della spesa condivisa</p>
          <h1 id="landing-title">La lista della spesa di tutta la famiglia, sempre aggiornata.</h1>
          <p class="landing__lead">
            Spesa è la webapp gratuita e senza pubblicità per organizzare la spesa di famiglia.
            Aggiungi ciò che manca, segna le urgenze e ritrova lo storico degli acquisti in un unico
            posto, condiviso tra i membri della famiglia.
          </p>
          <div class="landing__actions">
            <a class="button button--primary" href="/login" onClick={goToLogin}>
              Accedi alla lista
            </a>
            <a class="button button--ghost" href="#come-funziona">
              Come funziona
            </a>
          </div>
        </section>

        <section class="landing__section" id="come-funziona" aria-labelledby="come-funziona-title">
          <h2 id="come-funziona-title">Una lista sola, per tutta la famiglia</h2>
          <ul class="landing__features">
            <li class="landing__feature">
              <CheckIcon />
              <div>
                <h3>Aggiungi in pochi secondi</h3>
                <p>
                  Scrivi il nome dell’articolo e, se serve, categoria, quantità e una nota. La lista
                  resta ordinata e facile da leggere anche al supermercato.
                </p>
              </div>
            </li>
            <li class="landing__feature">
              <CheckIcon />
              <div>
                <h3>Segnala quello che è finito</h3>
                <p>
                  Con un tocco un articolo diventa urgente e sale in evidenza. Così nessuno
                  dimentica il latte o i pannolini.
                </p>
              </div>
            </li>
            <li class="landing__feature">
              <CheckIcon />
              <div>
                <h3>Tutti vedono le stesse cose</h3>
                <p>
                  La lista è condivisa tra i membri della famiglia: chi è al supermercato e chi è a
                  casa lavorano sulla stessa lista.
                </p>
              </div>
            </li>
            <li class="landing__feature">
              <CheckIcon />
              <div>
                <h3>Lo storico non si perde</h3>
                <p>
                  Gli articoli presi finiscono nello storico e si possono rimettere in lista quando
                  servono di nuovo.
                </p>
              </div>
            </li>
          </ul>
        </section>

        <section class="landing__section landing__section--note" aria-labelledby="gratis-title">
          <h2 id="gratis-title">Gratis e senza pubblicità</h2>
          <p>
            Spesa è pensata per un gruppo chiuso di 2–6 persone. L’accesso è riservato ai membri
            della famiglia: non c’è registrazione pubblica e non ci sono annunci pubblicitari.
          </p>
          <a class="button button--primary" href="/login" onClick={goToLogin}>
            Accedi alla lista
          </a>
        </section>
      </main>

      <footer class="public-footer">
        <span>Spesa — lista della spesa condivisa per famiglie</span>
        <a href="/login" onClick={goToLogin}>
          Accedi
        </a>
      </footer>
    </div>
  )
}
