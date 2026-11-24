import type { LegalContent } from '../types'

const content: LegalContent = {
  updatedLabel: 'Ultimo aggiornamento: {{date}}',
  languageNotice:
    'Questo testo è una traduzione fornita per Sua comodità. Se le versioni linguistiche differiscono, si applica la versione tedesca.',
  contentsLabel: 'Indice',
  nav: {
    terms: 'Termini e condizioni',
    privacy: 'Informativa sulla privacy',
    help: 'Assistenza',
    imprint: 'Note legali',
  },

  // ── Terms ────────────────────────────────────────────────────────────────
  terms: {
    title: 'Termini e condizioni',
    intro: [
      "I presenti termini disciplinano l'uso del sito web PickLte e delle app PickLte e PickLte Mover. Si applicano ai clienti che cercano un traslocatore e ai traslocatori che offrono i propri servizi di trasporto tramite la piattaforma.",
      'La piattaforma è gestita dalla società indicata nelle note legali («PickLte», «noi»).',
    ],
    sections: [
      {
        id: 'role',
        heading: "1. Che cos'è PickLte e che cosa non è",
        paragraphs: [
          'PickLte è una piattaforma online che mette in contatto i clienti con traslocatori indipendenti. Noi forniamo la tecnologia: la procedura di prenotazione, il calcolo del prezzo, la messaggistica, il tracciamento in tempo reale e la gestione dei pagamenti.',
          'Non eseguiamo traslochi. Non siamo un vettore né un\'impresa di traslochi, non possediamo veicoli, e i traslocatori non sono nostri dipendenti né nostri agenti.',
          'Il contratto di trasloco è concluso direttamente tra il cliente e il traslocatore che accetta la richiesta. Solo il traslocatore è tenuto a eseguire il trasporto e ne è responsabile. Il nostro servizio si limita a procurare il contatto e a gestire la piattaforma.',
        ],
      },
      {
        id: 'scope',
        heading: '2. Che cosa si può prenotare',
        bullets: [
          "Traslochi all'interno della Germania. Il ritiro e la consegna devono trovarsi entrambi in Germania.",
          'Trasporto con veicoli fino a 3,5 tonnellate di massa complessiva a pieno carico, rimorchio compreso.',
          'Carico, trasporto e scarico di masserizie, mobili e altri effetti personali, con imballaggio a cura del traslocatore se il cliente lo sceglie.',
        ],
        after: [
          'Lo smaltimento di rifiuti, il montaggio di mobili, i lavori di fissaggio, il collegamento di elettrodomestici, la pulizia e il deposito non sono offerti tramite la piattaforma.',
        ],
      },
      {
        id: 'account',
        heading: '3. Il Suo account',
        bullets: [
          'Per prenotare o per accettare un trasloco è necessario un account. Occorre avere almeno 18 anni.',
          'Ogni account è un account cliente oppure un account traslocatore. Uno stesso account non può essere usato in entrambi i ruoli.',
          'I dati che fornisce devono essere veritieri e tenuti aggiornati. Verifichiamo il Suo indirizzo e-mail e, ove richiesto, il Suo numero di telefono.',
          'Mantenga segrete le Sue credenziali di accesso. Lei è responsabile di ciò che avviene tramite il Suo account, salvo che non Le sia imputabile alcuna colpa.',
        ],
      },
      {
        id: 'movers',
        heading: '4. Traslocatori',
        paragraphs: [
          'I traslocatori usano la piattaforma come imprese indipendenti, in nome proprio e per conto proprio. Decidono liberamente quando sono disponibili e quali richieste accettano. Possono lavorare per altri clienti e tramite altre piattaforme.',
          'Prima che un traslocatore possa ricevere richieste, verifichiamo i dati forniti in fase di registrazione: una foto della persona, la patente di guida, i dati fiscali e il veicolo con la sua massa complessiva a pieno carico. Per un veicolo a noleggio chiediamo il periodo di noleggio.',
          'Ogni traslocatore è responsabile:',
        ],
        bullets: [
          'della registrazione della propria attività e di ogni autorizzazione richiesta dal proprio lavoro,',
          'delle proprie imposte e dei propri contributi previdenziali,',
          "dell'assicurazione del proprio veicolo e della propria attività,",
          "dell'idoneità del veicolo alla circolazione e del rispetto della normativa sulla circolazione stradale e sui trasporti, compreso il limite di 3,5 tonnellate,",
          'delle persone che lo aiutano in un trasloco.',
        ],
        after: [
          'La nostra verifica è un controllo di plausibilità dei documenti presentati. Non costituisce una garanzia della qualità di un traslocatore o di un determinato trasloco.',
        ],
      },
      {
        id: 'booking',
        heading: '5. Come si conclude una prenotazione',
        paragraphs: [
          "Il cliente descrive il trasloco: indirizzi, data, oggetti, accesso a entrambi gli indirizzi, aiutanti e imballaggio, con foto dove è utile. Esistono due modi di prenotare.",
        ],
        bullets: [
          'Trasloco immediato: la richiesta è inviata a un traslocatore nelle vicinanze che è disponibile in quel momento. Il traslocatore ha un tempo limitato per accettare. Se non lo fa, la richiesta può essere proposta ad altri traslocatori.',
          'Trasloco programmato: la richiesta per una data successiva è resa visibile ai traslocatori, e uno di loro la accetta.',
        ],
        after: [
          "La richiesta costituisce la proposta del cliente di concludere un contratto di trasloco al prezzo indicato. Il contratto tra cliente e traslocatore è concluso quando un traslocatore accetta la richiesta nell'app. Entrambe le parti ne sono informate nell'app.",
          'Non sussiste alcun diritto a che venga trovato un traslocatore per una richiesta.',
        ],
      },
      {
        id: 'price',
        heading: '6. Prezzo',
        paragraphs: [
          "Prima che il cliente invii una richiesta, la piattaforma mostra il prezzo del trasloco. È calcolato in base ai dati forniti dal cliente: distanza, dimensioni del veicolo, volume e peso degli oggetti, numero di aiutanti, piani e accesso, imballaggio, e se il trasloco è immediato o programmato. Il prezzo comprende l'IVA di legge ove applicabile, e comprende la commissione della piattaforma.",
          'Il prezzo si basa sulle informazioni del cliente. Se gli oggetti o le condizioni sul posto differiscono in modo sostanziale da quanto dichiarato, il traslocatore può rifiutarsi di eseguire il trasloco così come prenotato.',
        ],
      },
      {
        id: 'payment',
        heading: '7. Pagamento e commissione della piattaforma',
        bullets: [
          "Il cliente paga il traslocatore dopo che il trasloco è stato completato, con carta nell'app oppure in contanti al traslocatore.",
          'I pagamenti con carta sono elaborati dal nostro fornitore di servizi di pagamento Stripe. Non conserviamo i numeri delle carte.',
          'Per aver procurato il trasloco riceviamo dal traslocatore una commissione della piattaforma. È una quota del prezzo ed è mostrata al traslocatore prima che accetti.',
          "Con il pagamento con carta, la commissione è detratta prima che l'importo sia versato al traslocatore. Con il pagamento in contanti, il traslocatore ci deve la commissione e deve pagarla entro 24 ore dal trasloco. Finché una commissione è scaduta e non pagata, il traslocatore non riceve nuove richieste.",
        ],
      },
      {
        id: 'cancellation',
        heading: '8. Modifiche e annullamento',
        paragraphs: [
          "Un cliente può annullare una richiesta nell'app finché il trasloco non è iniziato. Un traslocatore può ritirarsi da un trasloco che ha accettato. La richiesta può allora essere proposta ad altri traslocatori.",
          "Non addebitiamo alcun costo per l'annullamento. Le pretese che il cliente e il traslocatore possono avere l'uno nei confronti dell'altro a causa di un annullamento tardivo sono disciplinate dal loro contratto e dalla legge.",
          'Restano impregiudicati i diritti di recesso previsti dalla legge per i consumatori.',
        ],
      },
      {
        id: 'performance',
        heading: '9. Esecuzione del trasloco, danni e reclami',
        paragraphs: [
          'Il traslocatore esegue il trasloco sotto la propria responsabilità. Le pretese derivanti dal trasloco, in particolare per danni ai beni o perdita di beni, per ritardo o per un trasloco che non ha avuto luogo, sono pretese nei confronti del traslocatore in base al contratto e alla normativa sui trasporti.',
          'La preghiamo di documentare subito i danni, con foto, e di segnalarli al traslocatore nella chat. Aiutiamo nella comunicazione tra le due parti e possiamo trasmettere i dati necessari per far valere una pretesa, ma non decidiamo le controversie e non paghiamo risarcimenti per conto di un traslocatore.',
        ],
      },
      {
        id: 'conduct',
        heading: '10. Regole di utilizzo',
        bullets: [
          'Fornisca informazioni complete e veritiere sul trasloco e su di sé.',
          'Non prenoti il trasporto di merci pericolose, di oggetti il cui trasporto non è consentito dalla legge o di rifiuti da smaltire.',
          "Trattatevi con rispetto. Minacce, discriminazioni e molestie comportano l'esclusione.",
          'Le recensioni devono rispecchiare la Sua esperienza personale di un trasloco che ha avuto luogo.',
          "Non interferisca con il funzionamento della piattaforma, non ne estragga i dati con mezzi automatizzati e non usi l'account di un'altra persona.",
        ],
      },
      {
        id: 'ranking',
        heading: '11. Come i traslocatori sono mostrati ai clienti',
        paragraphs: [
          "Quando un cliente cerca un traslocatore, la piattaforma prende in considerazione i traslocatori verificati, online e non impegnati in un altro incarico, il cui veicolo è adatto al carico. Tra questi, il fattore principale è la distanza dall'indirizzo di ritiro: il traslocatore più vicino è mostrato per primo.",
          'I traslocatori non possono pagare per ottenere una posizione migliore.',
        ],
      },
      {
        id: 'liability',
        heading: '12. La nostra responsabilità',
        paragraphs: [
          "Rispondiamo senza limitazioni per dolo e colpa grave, per lesioni alla vita, all'integrità fisica o alla salute, e nei casi in cui la legge prevede una responsabilità che non può essere esclusa.",
          'In caso di colpa lieve rispondiamo soltanto della violazione di un obbligo essenziale del contratto concluso con noi, e in tal caso solo del danno prevedibile e tipico di un contratto di questo genere.',
          "Non rispondiamo dell'esecuzione del trasloco né del comportamento reciproco di clienti e traslocatori, perché non siamo parte del loro contratto. Non promettiamo che la piattaforma sia disponibile senza interruzioni.",
        ],
      },
      {
        id: 'termination',
        heading: "13. Cessazione dell'uso, sospensione",
        paragraphs: [
          "Può eliminare il Suo account in qualsiasi momento nell'app o sul sito web. Ciò è possibile quando nessun trasloco è in corso o prenotato e, per i traslocatori, quando nessuna commissione della piattaforma è ancora dovuta e nessun versamento è in sospeso.",
          "Possiamo limitare o sospendere un account in presenza di un motivo grave, in particolare dati o documenti falsi, una violazione dei presenti termini, una commissione della piattaforma non pagata o un rischio per altri utenti. Comunichiamo i motivi all'utente. I traslocatori possono presentare opposizione tramite i recapiti indicati nelle note legali. Esaminiamo ogni reclamo e vi rispondiamo.",
          'Possiamo porre fine al contratto con un traslocatore con un preavviso di 30 giorni. Resta impregiudicato il diritto di porvi fine senza preavviso per giusta causa.',
        ],
      },
      {
        id: 'changes',
        heading: '14. Modifiche ai presenti termini',
        paragraphs: [
          "Possiamo modificare i presenti termini per il futuro in presenza di un motivo valido, come un cambiamento della legge o della piattaforma. Comunichiamo le modifiche per e-mail o nell'app almeno 30 giorni prima che abbiano effetto. Se non è d'accordo, può eliminare il Suo account prima di tale data.",
        ],
      },
      {
        id: 'law',
        heading: '15. Legge applicabile e controversie',
        paragraphs: [
          'Si applica il diritto tedesco. I consumatori conservano inoltre la tutela delle norme imperative del paese in cui hanno la residenza abituale.',
          'Non siamo obbligati né disposti a partecipare a procedure di risoluzione delle controversie dinanzi a un organismo di conciliazione per i consumatori.',
          'Qualora una disposizione dei presenti termini fosse invalida, le restanti disposizioni rimangono in vigore.',
        ],
      },
    ],
  },

  // ── Privacy ──────────────────────────────────────────────────────────────
  privacy: {
    title: 'Informativa sulla privacy',
    intro: [
      'La presente informativa spiega quali dati personali sono trattati quando usa il sito web PickLte e le app PickLte e PickLte Mover, per quale finalità e quali diritti Le spettano.',
    ],
    sections: [
      {
        id: 'controller',
        heading: '1. Chi è il titolare',
        paragraphs: [
          'Il titolare del trattamento ai sensi del Regolamento generale sulla protezione dei dati (GDPR) è la società indicata nelle note legali. Può contattarci per qualsiasi questione relativa alla privacy tramite i recapiti ivi indicati.',
        ],
      },
      {
        id: 'data',
        heading: '2. Quali dati trattiamo',
        bullets: [
          'Account: nome, indirizzo e-mail, numero di telefono, foto del profilo, lingua, e se Lei è cliente o traslocatore. Se accede con Google, riceviamo da Google il Suo nome, il Suo indirizzo e-mail e la Sua immagine del profilo.',
          "Traslochi: indirizzi di ritiro e di consegna, data e ora, elenco degli oggetti, dettagli sull'accesso e sui piani, note, foto degli oggetti, il nome di un'azienda per un trasloco aziendale, il prezzo e lo stato del trasloco.",
          'Per i traslocatori, inoltre: una Sua foto, una foto della Sua patente di guida, il Suo indirizzo e i Suoi dati fiscali, i Suoi veicoli con targa, massa complessiva a pieno carico e foto, i periodi di noleggio, le persone della Sua squadra, i Suoi guadagni e le commissioni della piattaforma.',
          'Posizione: si veda la sezione 4.',
          "Comunicazione: i messaggi di chat tra cliente e traslocatore relativi a un trasloco e, per le chiamate nell'app, chi ha chiamato chi, quando e per quanto tempo. Le chiamate non sono registrate.",
          'Pagamento: importo, momento, metodo e stato di un pagamento. I dati della carta vanno direttamente al fornitore di servizi di pagamento e non sono conservati da noi.',
          "Dispositivo e utilizzo: il token per le notifiche push del Suo dispositivo, la versione dell'app, il sistema operativo e i log tecnici con l'indirizzo IP e l'ora di una richiesta.",
          'Le recensioni che Lei lascia o riceve.',
        ],
      },
      {
        id: 'purposes',
        heading: '3. Perché li trattiamo e su quale base giuridica',
        bullets: [
          'Per gestire il Suo account e per procurare e gestire i traslochi tra clienti e traslocatori: esecuzione di un contratto, art. 6, par. 1, lett. b), GDPR.',
          'Per verificare i documenti dei traslocatori prima della loro ammissione, per prevenire abusi e frodi, per mantenere sicura la piattaforma e per individuare e correggere gli errori: il nostro legittimo interesse a una piattaforma sicura e funzionante, art. 6, par. 1, lett. f), GDPR.',
          "Per adempiere agli obblighi previsti dalla normativa fiscale e commerciale, compresa la comunicazione dei redditi dei traslocatori all'autorità fiscale ai sensi della legge sulla trasparenza fiscale delle piattaforme (DAC7): obbligo legale, art. 6, par. 1, lett. c), GDPR.",
          'Per usare la posizione, la fotocamera, la libreria di foto e le notifiche del Suo dispositivo: il Suo consenso, art. 6, par. 1, lett. a), GDPR, che Lei presta o revoca nelle impostazioni del Suo dispositivo.',
        ],
      },
      {
        id: 'location',
        heading: '4. Posizione',
        paragraphs: [
          'La posizione di un traslocatore è rilevata soltanto mentre il traslocatore è online o impegnato in un incarico. Un cliente vede la posizione di un traslocatore solo per il proprio trasloco e mentre tale trasloco è in corso. Prima di allora, i clienti che cercano un traslocatore vedono soltanto posizioni approssimative.',
          'Quando un traslocatore va offline e non è impegnato in un incarico, la posizione memorizzata è cancellata. Non è conservata alcuna cronologia dei percorsi.',
          "I clienti possono consentire all'app di usare la loro posizione per compilare l'indirizzo di ritiro. Ciò è facoltativo.",
        ],
      },
      {
        id: 'photos',
        heading: '5. Foto e documenti',
        paragraphs: [
          'Le foto di un trasloco possono essere visualizzate soltanto dal cliente, dal traslocatore che ha accettato il trasloco e dai traslocatori ai quali è mostrata la richiesta aperta. Sono fornite tramite link che scadono dopo breve tempo.',
          'Le patenti di guida e gli altri documenti dei traslocatori possono essere visualizzati soltanto dal traslocatore e dal personale che li esamina.',
        ],
      },
      {
        id: 'recipients',
        heading: '6. Chi riceve i dati',
        paragraphs: [
          "L'altra parte di un trasloco riceve quanto è necessario per eseguirlo. Il cliente vede il nome, la foto, il veicolo e le recensioni del traslocatore e, durante il trasloco, la posizione del traslocatore. Il traslocatore vede il nome del cliente, gli indirizzi, gli oggetti e le foto. I numeri di telefono sono trasmessi soltanto dove ciò è necessario per un trasloco accettato. Le chiamate possono essere effettuate nell'app senza rivelare alcun numero.",
          'Ci avvaliamo di fornitori di servizi che trattano dati per nostro conto e in base a un contratto:',
        ],
        bullets: [
          'Appwrite: database, archiviazione di file, accesso e invio delle notifiche, con hosting a Francoforte, Germania.',
          'Vercel: hosting del sito web.',
          'Stripe: elaborazione dei pagamenti e versamenti. Stripe è a sua volta titolare del trattamento per una parte di queste operazioni.',
          'Mapbox: mappe, ricerca di indirizzi e calcolo dei percorsi.',
          'Google: accesso con Google e invio delle notifiche push (Firebase Cloud Messaging).',
          "LiveKit: trasmissione delle chiamate nell'app.",
          "Sentry: segnalazioni di errori, conservate nell'UE, dalle quali i dati personali sono rimossi prima dell'invio.",
        ],
        after: [
          "Trasmettiamo dati alle autorità dove la legge lo richiede, in particolare i dati sui redditi dei traslocatori all'Ufficio federale centrale delle imposte.",
          'Alcuni di questi fornitori hanno sede negli Stati Uniti o possono trattare dati in tale paese. In tal caso il trasferimento si basa sul Quadro UE-USA per la protezione dei dati personali o sulle clausole contrattuali tipo della Commissione europea.',
          'Non vendiamo dati personali e non li usiamo per la pubblicità di terzi.',
        ],
      },
      {
        id: 'cookies',
        heading: '7. Cookie e archiviazione locale sul sito web',
        bullets: [
          "Un cookie di sessione mantiene attivo il Suo accesso.",
          'Un cookie della lingua ricorda la lingua che ha scelto.',
          "L'archiviazione locale del browser conserva una prenotazione che ha iniziato, in modo che non vada persa quando ricarica la pagina.",
        ],
        after: [
          'Questi elementi sono necessari al funzionamento del sito web. Il sito web non usa cookie pubblicitari né strumenti di analisi che tracciano i visitatori da un sito web all\'altro. Il monitoraggio degli errori di Sentry registra gli errori tecnici.',
        ],
      },
      {
        id: 'retention',
        heading: '8. Per quanto tempo conserviamo i dati',
        bullets: [
          "Dati dell'account: finché l'account esiste.",
          "Dopo l'eliminazione del Suo account: il Suo profilo, le foto, i documenti, gli indirizzi, i messaggi e i dati del dispositivo sono cancellati o resi anonimi. I traslochi completati restano come registrazioni anonime senza il Suo nome.",
          "Dati che la normativa fiscale e commerciale ci impone di conservare, come fatture, registrazioni dei pagamenti e i dati identificativi e fiscali dei traslocatori: fino a dieci anni, conservati separatamente con accesso limitato, poi cancellati.",
          'Log tecnici: per un breve periodo, secondo quanto necessario per la sicurezza e la risoluzione dei problemi.',
        ],
      },
      {
        id: 'rights',
        heading: '9. I Suoi diritti',
        paragraphs: ['Ai sensi del GDPR Lei ha il diritto di:'],
        bullets: [
          'ottenere informazioni sui Suoi dati e una loro copia,',
          'far rettificare i dati inesatti,',
          'far cancellare i dati o farne limitare il trattamento,',
          'ricevere in un formato portabile i dati che ha fornito,',
          'opporsi al trattamento che si basa sui nostri legittimi interessi,',
          'revocare un consenso in qualsiasi momento con effetto per il futuro.',
        ],
        after: [
          "Per esercitare un diritto, scriva ai recapiti indicati nelle note legali. Ha inoltre il diritto di proporre reclamo a un'autorità di controllo per la protezione dei dati, in particolare a quella del Suo luogo di residenza.",
        ],
      },
      {
        id: 'deletion',
        heading: '10. Eliminazione del Suo account',
        paragraphs: [
          "Può eliminare il Suo account autonomamente: nelle app in Profilo, sul sito web nelle impostazioni del Suo account. Per sicurezza Le viene chiesto di accedere di nuovo poco prima. L'eliminazione è possibile quando nessun trasloco è in corso o prenotato e, per i traslocatori, quando nessuna commissione della piattaforma è ancora dovuta e nessun versamento è in sospeso.",
        ],
      },
      {
        id: 'security',
        heading: '11. Sicurezza',
        paragraphs: [
          "I dati sono trasmessi in forma cifrata. L'accesso ai dati è limitato in base al ruolo: ogni utente raggiunge soltanto i propri dati e i traslochi a cui partecipa. L'accesso del personale è limitato a quanto richiesto dal compito ed è registrato.",
        ],
      },
      {
        id: 'automated',
        heading: '12. Trattamento automatizzato',
        paragraphs: [
          "Il prezzo di un trasloco e la selezione dei traslocatori mostrati per una richiesta sono calcolati automaticamente in base ai dati del trasloco. Nessuna decisione che produca effetti giuridici nei Suoi confronti è presa unicamente con mezzi automatizzati. L'ammissione di un traslocatore è decisa da una persona.",
          'La piattaforma non è destinata a persone di età inferiore a 18 anni.',
        ],
      },
      {
        id: 'changes',
        heading: '13. Modifiche alla presente informativa',
        paragraphs: [
          'Aggiorniamo la presente informativa quando cambiano la piattaforma o la legge. La versione vigente è sempre disponibile in questa pagina.',
        ],
      },
    ],
  },

  // ── Help ─────────────────────────────────────────────────────────────────
  help: {
    title: 'Assistenza',
    intro: [
      "Risposte alle domande più frequenti sulla prenotazione di un trasloco e sull'attività di traslocatore su PickLte.",
    ],
    groups: [
      {
        id: 'about',
        heading: 'Informazioni su PickLte',
        topics: [
          {
            id: 'what',
            question: "Che cos'è PickLte?",
            answer: [
              'PickLte è una piattaforma che mette in contatto chi ha bisogno di un trasloco con traslocatori indipendenti. Lei descrive il trasloco, vede il prezzo, e un traslocatore lo accetta.',
            ],
          },
          {
            id: 'who',
            question: 'Chi esegue il mio trasloco?',
            answer: [
              'Un traslocatore indipendente, non PickLte. Il Suo contratto di trasloco è con il traslocatore che accetta la Sua richiesta. PickLte procura il contatto e mette a disposizione la prenotazione, il tracciamento e il pagamento.',
            ],
          },
          {
            id: 'where',
            question: 'Dove è disponibile PickLte?',
            answer: [
              'In Germania, per traslochi che iniziano e terminano in Germania. I traslocatori usano furgoni e piccoli autocarri fino a 3,5 tonnellate.',
            ],
          },
        ],
      },
      {
        id: 'booking',
        heading: 'Prenotazione',
        topics: [
          {
            id: 'types',
            question: 'Qual è la differenza tra un trasloco immediato e uno programmato?',
            answer: [
              "Un trasloco immediato è per adesso: la richiesta è inviata a un traslocatore disponibile vicino all'indirizzo di ritiro. Un trasloco programmato è per la data e l'ora che Lei sceglie: i traslocatori vedono la richiesta e uno di loro la accetta.",
            ],
          },
          {
            id: 'price',
            question: 'Come viene calcolato il prezzo?',
            answer: [
              'In base ai dati che Lei inserisce: distanza, dimensioni del veicolo necessario, volume e peso dei Suoi oggetti, numero di aiutanti, piani e ascensore, e imballaggio. Vede il prezzo completo, IVA inclusa, prima di inviare la richiesta.',
            ],
          },
          {
            id: 'items',
            question: 'Che cosa posso far traslocare?',
            answer: [
              'Masserizie, mobili, scatoloni e altri effetti personali. Non sono possibili: merci pericolose, oggetti il cui trasporto non è consentito dalla legge e rifiuti da smaltire.',
            ],
          },
          {
            id: 'extras',
            question: "Posso prenotare l'imballaggio o aiutanti aggiuntivi?",
            answer: [
              'Sì. Per un trasloco programmato può scegliere un livello di imballaggio e aggiungere aiutanti. Altri lavori, come il montaggio di mobili, il fissaggio, il collegamento di elettrodomestici, la pulizia o il deposito, non possono essere prenotati tramite PickLte.',
            ],
          },
          {
            id: 'photos',
            question: 'Perché dovrei aggiungere delle foto?',
            answer: [
              'Le foto aiutano il traslocatore a valutare il carico e a portare il veicolo adatto. Possono vederle soltanto Lei, il traslocatore del Suo trasloco e i traslocatori ai quali è mostrata la Sua richiesta aperta.',
            ],
          },
        ],
      },
      {
        id: 'payment',
        heading: 'Pagamento',
        topics: [
          {
            id: 'how',
            question: 'Come e quando pago?',
            answer: [
              "Dopo che il trasloco è stato completato, con carta nell'app o in contanti al traslocatore. Sceglie il metodo al momento della prenotazione.",
            ],
          },
          {
            id: 'fees',
            question: 'Ci sono costi aggiuntivi?',
            answer: [
              "No. Il prezzo mostrato prima della prenotazione comprende già l'IVA e la commissione della piattaforma. Annullare tramite l'app non costa nulla.",
            ],
          },
        ],
      },
      {
        id: 'during',
        heading: 'Durante il trasloco',
        topics: [
          {
            id: 'track',
            question: 'Posso vedere dove si trova il traslocatore?',
            answer: [
              'Sì. Quando il traslocatore è in viaggio verso di Lei, può seguirlo sulla mappa fino al termine del trasloco.',
            ],
          },
          {
            id: 'contact',
            question: 'Come contatto il traslocatore?',
            answer: [
              "Tramite la chat o una chiamata nell'app, nella pagina del Suo trasloco. Non è necessario scambiarsi i numeri di telefono.",
            ],
          },
          {
            id: 'cancel',
            question: 'Come annullo?',
            answer: [
              'Apra il trasloco e scelga Annulla. Ciò è possibile finché il trasloco non è iniziato. La preghiamo di annullare il prima possibile, per correttezza verso il traslocatore.',
            ],
          },
          {
            id: 'damage',
            question: 'Qualcosa è stato danneggiato. Che cosa devo fare?',
            answer: [
              'Scatti subito delle foto e lo comunichi al traslocatore nella chat. Il traslocatore è responsabile del trasporto, quindi la Sua pretesa è nei confronti del traslocatore. Se non riuscite a raggiungere un accordo, ci scriva tramite i recapiti indicati nelle note legali e La aiuteremo nella comunicazione.',
            ],
          },
        ],
      },
      {
        id: 'account',
        heading: 'Account',
        topics: [
          {
            id: 'password',
            question: 'Ho dimenticato la password.',
            answer: [
              'Scelga «Password dimenticata» nella pagina di accesso. Riceverà un codice per e-mail per impostare una nuova password.',
            ],
          },
          {
            id: 'language',
            question: 'Come cambio la lingua?',
            answer: [
              'Sul sito web con il menu delle lingue in alto nella pagina, nelle app in Profilo. Sono disponibili otto lingue.',
            ],
          },
          {
            id: 'delete',
            question: 'Come elimino il mio account?',
            answer: [
              "Nelle app in Profilo, sul sito web nelle impostazioni del Suo account. Prima Le verrà chiesto di accedere di nuovo. L'eliminazione è possibile quando non ha alcun trasloco in corso o prenotato. I Suoi dati personali sono allora cancellati o resi anonimi. I dettagli si trovano nell'informativa sulla privacy.",
            ],
          },
        ],
      },
      {
        id: 'movers',
        heading: 'Per i traslocatori',
        topics: [
          {
            id: 'register',
            question: 'Come divento traslocatore su PickLte?',
            answer: [
              "Si registri nell'app PickLte Mover o sul sito web, completi il Suo profilo e aggiunga il Suo veicolo. Le occorrono una Sua foto, la patente di guida, i dati fiscali e i dati di immatricolazione del veicolo. Una volta verificati i Suoi dati, può andare online.",
            ],
          },
          {
            id: 'independent',
            question: 'Sono un dipendente di PickLte?',
            answer: [
              'No. Lei lavora come impresa indipendente. Decide Lei quando è online e quali richieste accetta, ed è responsabile della registrazione della Sua attività, delle imposte e delle assicurazioni.',
            ],
          },
          {
            id: 'vehicle',
            question: 'Quali veicoli sono ammessi?',
            answer: [
              'Veicoli fino a 3,5 tonnellate di massa complessiva a pieno carico, rimorchio compreso. Sono possibili sia veicoli di proprietà sia veicoli a noleggio. Per un veicolo a noleggio Lei inserisce il periodo di noleggio.',
            ],
          },
          {
            id: 'location',
            question: 'Quando viene condivisa la mia posizione?',
            answer: [
              'Soltanto mentre è online o impegnato in un incarico. Il cliente di un trasloco vede la Sua posizione durante quel trasloco. Quando va offline e non ha alcun incarico, la Sua posizione è cancellata.',
            ],
          },
          {
            id: 'earnings',
            question: "Quanto guadagno, e che cos'è la commissione della piattaforma?",
            answer: [
              "Ogni richiesta mostra, prima che Lei la accetti, quanto guadagna al netto dell'IVA e della commissione della piattaforma. Con il pagamento con carta, la commissione è detratta dal Suo versamento. Con il pagamento in contanti, Lei incassa l'intero importo e paga la commissione a PickLte entro 24 ore. Finché non è pagata, non riceve nuove richieste.",
            ],
          },
          {
            id: 'tax',
            question: 'PickLte comunica i miei redditi?',
            answer: [
              "Sì, dove la legge lo richiede. I gestori di piattaforme devono comunicare i redditi dei venditori all'autorità fiscale (DAC7). Può scaricare i Suoi prospetti fiscali nell'app.",
            ],
          },
        ],
      },
    ],
  },

  // ── Imprint ──────────────────────────────────────────────────────────────
  imprint: {
    title: 'Note legali',
    intro: ['Informazioni ai sensi del § 5 della legge tedesca sui servizi digitali (DDG).'],
    labels: {
      provider: 'Fornitore',
      address: 'Indirizzo',
      representedBy: 'Rappresentato da',
      contact: 'Contatti',
      email: 'E-mail',
      phone: 'Telefono',
      register: 'Registro delle imprese',
      vatId: 'Numero di identificazione IVA',
      responsibleForContent: 'Responsabile dei contenuti',
    },
    sections: [
      {
        id: 'role',
        heading: 'Ruolo della piattaforma',
        paragraphs: [
          'PickLte è una piattaforma di intermediazione. I traslochi sono eseguiti da traslocatori indipendenti, in nome proprio e sotto la propria responsabilità. Il fornitore qui indicato non è un vettore e non è parte del contratto di trasloco.',
        ],
      },
      {
        id: 'disputes',
        heading: 'Risoluzione delle controversie dei consumatori',
        paragraphs: [
          'Non siamo obbligati né disposti a partecipare a procedure di risoluzione delle controversie dinanzi a un organismo di conciliazione per i consumatori.',
        ],
      },
      {
        id: 'content',
        heading: 'Responsabilità per i contenuti',
        paragraphs: [
          "Siamo responsabili dei nostri contenuti su queste pagine secondo le leggi generali. Non siamo tenuti a sorvegliare le informazioni che gli utenti trasmettono o memorizzano, né a ricercare circostanze che indichino un'attività illecita. Non appena veniamo a conoscenza di una specifica violazione, rimuoviamo il contenuto senza indugio.",
        ],
      },
      {
        id: 'links',
        heading: 'Responsabilità per i link',
        paragraphs: [
          'Queste pagine possono contenere link a siti web di terzi. Del contenuto di tali siti web sono responsabili esclusivamente i rispettivi gestori. Se veniamo a conoscenza di una violazione, rimuoviamo il link.',
        ],
      },
      {
        id: 'copyright',
        heading: "Diritto d'autore",
        paragraphs: [
          "I contenuti e le opere presenti su queste pagine sono protetti dal diritto d'autore. La loro copia, modifica o diffusione oltre quanto consentito dalla normativa sul diritto d'autore richiede il nostro consenso scritto.",
        ],
      },
    ],
  },
}

export default content
