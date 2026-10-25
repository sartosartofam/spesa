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
 * Bozza di informativa privacy.
 *
 * Il testo descrive i dati effettivamente trattati dall'app, ma prima della
 * pubblicazione va riletto e validato (titolare, tempi di conservazione,
 * fornitori e trasferimenti extra UE).
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
              <li>
                <strong>Dati tecnici:</strong> log di accesso ed errori conservati dai fornitori di
                hosting e database per sicurezza e diagnostica.
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
              Spesa non usa cookie pubblicitari, analytics di terze parti o tracker. Usa la memoria
              locale del browser per la sessione, le preferenze dell’interfaccia e la cache delle
              impostazioni dell’account. Questi dati restano sul dispositivo e servono solo a far
              funzionare l’app.
            </p>
          </section>

          <section>
            <h2>5. Per quanto tempo conserviamo i dati</h2>
            <p>
              I dati dell’account e della lista restano finché l’account esiste, salvo cancellazione
              anticipata. Le notifiche push restano attive finché non le revochi. I log tecnici sono
              conservati per il tempo necessario alla sicurezza e agli obblighi dei fornitori. I
              backup tecnici possono contenere copie temporanee dei dati e vengono sostituiti
              periodicamente.
            </p>
          </section>

          <section>
            <h2>6. Destinatari e trasferimenti</h2>
            <p>
              I dati sono trattati dai fornitori necessari al servizio: Supabase per database e
              autenticazione e Vercel per l’hosting del frontend. Non vendiamo dati e non li
              condividiamo per finalità di marketing. Se un fornitore tratta dati fuori dallo Spazio
              economico europeo, il trasferimento avviene sulla base delle clausole contrattuali
              standard o di altre garanzie previste dal GDPR.
            </p>
          </section>

          <section>
            <h2>7. Sicurezza</h2>
            <p>
              L’accesso alla lista è limitato ai membri della famiglia tramite RLS e autenticazione.
              Le comunicazioni avvengono in HTTPS. L’accesso ai sistemi è riservato e protetto da
              credenziali dedicate. Nessun sistema è sicuro al 100%, ma adottiamo misure ragionevoli
              per proteggere i dati e limitare l’accesso.
            </p>
          </section>

          <section>
            <h2>8. I tuoi diritti</h2>
            <p>
              Puoi chiedere accesso, rettifica, cancellazione, limitazione del trattamento,
              opposizione e portabilità dei dati. Puoi revocare il consenso alle notifiche push e
              cancellare l’account in qualsiasi momento. Per esercitare i diritti scrivi a{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Puoi anche proporre reclamo
              all’Autorità Garante per la protezione dei dati personali.
            </p>
          </section>

          <section>
            <h2>9. Modifiche</h2>
            <p>
              Se questa informativa cambia in modo sostanziale, aggiorneremo la data in alto e, se
              necessario, ti avviseremo nell’app. La versione pubblicata qui è quella applicabile.
            </p>
          </section>

          <section>
            <h2>10. Crediti</h2>
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
