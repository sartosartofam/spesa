import { PublicFooter } from '../components/PublicFooter'
import { PublicHeader } from '../components/PublicHeader'
import {
  CONTACT_EMAIL,
  DATA_CONTROLLER,
  PRIVACY_LAST_UPDATED,
  STREAMLINE_LABEL,
  STREAMLINE_URL,
} from '../lib/landing-content'

/**
 * Informativa privacy pubblica.
 *
 * Titolare ed email di contatto sono in `landing-content.ts`. L'IBAN delle
 * donazioni è ancora un segnaposto e va sostituito prima della produzione.
 */
export function PrivacyPage({ authenticated = false }: { authenticated?: boolean }) {
  return (
    <div class="public-shell">
      <PublicHeader authenticated={authenticated} />

      <main class="privacy">
        <header class="privacy__head">
          <p class="landing__eyebrow">Privacy</p>
          <h1>Informativa privacy</h1>
          <p class="privacy__updated">Ultimo aggiornamento: {PRIVACY_LAST_UPDATED}</p>
          <p class="privacy__intro">
            Spesa è una lista della spesa condivisa per famiglie. Questa pagina spiega quali dati
            trattiamo, perché, per quanto tempo e come esercitare i tuoi diritti. Non usiamo i dati
            per pubblicità o profilazione.
          </p>
        </header>

        <div class="privacy__body">
          <section>
            <h2>1. Titolare del trattamento</h2>
            <p>
              Il titolare del trattamento è <strong>{DATA_CONTROLLER}</strong>. Per qualsiasi
              richiesta puoi scrivere a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          </section>

          <section>
            <h2>2. Quali dati trattiamo</h2>
            <ul>
              <li>
                <strong>Dati dell’account:</strong> indirizzo email, nome visualizzato e credenziali
                gestite da Supabase Auth. La password non è leggibile da Spesa.
              </li>
              <li>
                <strong>Dati tecnici di sessione:</strong> log necessari per autenticazione,
                sicurezza e diagnostica, conservati dai fornitori del servizio.
              </li>
              <li>
                <strong>Dati della famiglia:</strong> nome della famiglia, ruolo e appartenenza dei
                membri.
              </li>
              <li>
                <strong>Lista della spesa:</strong> articoli, categorie, quantità, note, stato (da
                comprare o preso), urgenza e date di creazione/acquisto.
              </li>
              <li>
                <strong>Notifiche push:</strong> endpoint e chiavi del dispositivo, solo se scegli
                di attivare le notifiche. Puoi revocarle in qualsiasi momento.
              </li>
              <li>
                <strong>Preferenze:</strong> impostazioni dell’interfaccia e scelte salvate nel
                browser, come l’effetto luminoso della landing.
              </li>
            </ul>
          </section>

          <section>
            <h2>3. Finalità e basi giuridiche</h2>
            <ul>
              <li>
                <strong>Erogare il servizio:</strong> creare l’account, gestire la famiglia e
                sincronizzare la lista. Base giuridica: esecuzione del contratto.
              </li>
              <li>
                <strong>Sicurezza e prevenzione degli abusi:</strong> proteggere l’accesso e
                diagnosticare errori. Base giuridica: legittimo interesse.
              </li>
              <li>
                <strong>Notifiche push:</strong> avvisarti quando un articolo è urgente o viene
                aggiunto. Base giuridica: consenso, revocabile in ogni momento.
              </li>
              <li>
                <strong>Risposta ai messaggi:</strong> rispondere a segnalazioni e richieste. Base
                giuridica: legittimo interesse.
              </li>
            </ul>
          </section>

          <section>
            <h2>4. Cookie e memoria locale</h2>
            <p>
              Usiamo esclusivamente cookie tecnici necessari al funzionamento (sessione di login).
              Non utilizziamo cookie di profilazione o tracciamento di terze parti.
            </p>
            <p>
              Per la sessione, le preferenze dell’interfaccia e la cache delle impostazioni usiamo
              anche la memoria locale del browser. Questi dati restano sul dispositivo e servono
              solo a far funzionare l’app. Non è quindi necessario un banner cookie.
            </p>
          </section>

          <section>
            <h2>5. Per quanto tempo conserviamo i dati</h2>
            <p>
              Conserviamo i dati dell’account e della lista fino alla cancellazione dell’account,
              salvo cancellazione anticipata dei singoli contenuti. Le notifiche push restano attive
              finché non le revochi. I log tecnici sono conservati per il tempo necessario alla
              sicurezza e agli obblighi dei fornitori. I backup tecnici possono contenere copie
              temporanee dei dati e vengono sostituiti periodicamente.
            </p>
          </section>

          <section>
            <h2>6. Destinatari e trasferimenti</h2>
            <p>
              I dati sono trattati da Supabase per database e autenticazione e da Vercel per
              l’hosting del frontend, in qualità di responsabili del trattamento. Non vendiamo dati
              e non li condividiamo per finalità di marketing. Se un fornitore tratta dati fuori
              dallo Spazio economico europeo, il trasferimento avviene sulla base delle clausole
              contrattuali standard o di altre garanzie previste dal GDPR.
            </p>
          </section>

          <section>
            <h2>7. Donazioni</h2>
            <p>
              Le donazioni tramite link esterni o bonifico non comportano la raccolta di dati
              personali da parte di questo sito. I dati eventualmente forniti alla piattaforma
              esterna sono gestiti secondo la sua informativa.
            </p>
            <p>
              Le donazioni sono puramente volontarie e non danno diritto ad alcun servizio. Il
              progetto resta gratuito e senza pubblicità anche senza donazioni.
            </p>
          </section>

          <section>
            <h2>8. Sicurezza</h2>
            <p>
              L’accesso alla lista è limitato ai membri della famiglia tramite RLS e autenticazione.
              Le comunicazioni avvengono in HTTPS. L’accesso ai sistemi è riservato e protetto da
              credenziali dedicate. Nessun sistema è sicuro al 100%, ma adottiamo misure ragionevoli
              per proteggere i dati e limitare l’accesso.
            </p>
          </section>

          <section>
            <h2>9. I tuoi diritti</h2>
            <p>
              Puoi chiedere accesso, rettifica, cancellazione, limitazione del trattamento,
              opposizione e portabilità dei dati. Puoi revocare il consenso alle notifiche push e
              cancellare l’account e i dati associati in qualsiasi momento da{' '}
              <strong>Impostazioni → Account e privacy → Elimina account e dati</strong>. Per
              esercitare gli altri diritti scrivi a{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Puoi anche proporre reclamo
              all’Autorità Garante per la protezione dei dati personali.
            </p>
          </section>

          <section>
            <h2>10. Modifiche</h2>
            <p>
              Se questa informativa cambia in modo sostanziale, aggiorneremo la data in alto e, se
              necessario, ti avviseremo nell’app. La versione pubblicata qui è quella applicabile.
            </p>
          </section>

          <section>
            <h2>11. Crediti</h2>
            <p>
              Le icone pixel usate nell’interfaccia sono di{' '}
              <a href={STREAMLINE_URL} target="_blank" rel="noreferrer noopener">
                {STREAMLINE_LABEL}
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
