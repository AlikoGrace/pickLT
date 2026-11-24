import type { LegalContent } from '../types'

const content: LegalContent = {
  updatedLabel: 'Laatst bijgewerkt: {{date}}',
  languageNotice:
    'Deze tekst is een vertaling voor uw gemak. Als de taalversies van elkaar afwijken, geldt de Duitse versie.',
  contentsLabel: 'Inhoud',
  nav: {
    terms: 'Algemene voorwaarden',
    privacy: 'Privacybeleid',
    help: 'Hulp',
    imprint: 'Colofon',
  },

  // ── Terms ────────────────────────────────────────────────────────────────
  terms: {
    title: 'Algemene voorwaarden',
    intro: [
      'Deze voorwaarden regelen het gebruik van de website van PickLte en van de apps PickLte en PickLte Mover. Ze gelden voor klanten die een verhuizer zoeken en voor verhuizers die hun transportdiensten via het platform aanbieden.',
      'Het platform wordt geëxploiteerd door de onderneming die in het colofon wordt genoemd ("PickLte", "wij").',
    ],
    sections: [
      {
        id: 'role',
        heading: '1. Wat PickLte is, en wat het niet is',
        paragraphs: [
          'PickLte is een online platform dat klanten in contact brengt met zelfstandige verhuizers. Wij leveren de technologie: het boekingsproces, de prijsberekening, de berichten, het live volgen en de betalingsverwerking.',
          'Wij voeren geen verhuizingen uit. Wij zijn geen vervoerder en geen verhuisbedrijf, wij bezitten geen voertuigen, en de verhuizers zijn niet onze werknemers of vertegenwoordigers.',
          'De overeenkomst voor een verhuizing komt rechtstreeks tot stand tussen de klant en de verhuizer die de aanvraag accepteert. Alleen de verhuizer is het transport verschuldigd en is ervoor verantwoordelijk. Onze eigen dienst beperkt zich tot het tot stand brengen van het contact en het exploiteren van het platform.',
        ],
      },
      {
        id: 'scope',
        heading: '2. Wat er geboekt kan worden',
        bullets: [
          'Verhuizingen binnen Duitsland. Het ophaaladres en het afleveradres moeten beide in Duitsland liggen.',
          'Transport met voertuigen met een toegestane maximummassa van ten hoogste 3,5 ton, inclusief aanhanger.',
          'Laden, vervoeren en lossen van huisraad, meubels en andere bezittingen, met inpakken door de verhuizer als de klant daarvoor kiest.',
        ],
        after: [
          'Afvalverwijdering, meubelmontage, bevestigingswerk, het aansluiten van apparaten, schoonmaak en opslag worden niet via het platform aangeboden.',
        ],
      },
      {
        id: 'account',
        heading: '3. Uw account',
        bullets: [
          'U hebt een account nodig om een verhuizing te boeken of te accepteren. U moet ten minste 18 jaar oud zijn.',
          'Elk account is een klantaccount of een verhuizersaccount. Eén account kan niet in beide rollen worden gebruikt.',
          'De gegevens die u opgeeft moeten juist zijn en actueel worden gehouden. Wij verifiëren uw e-mailadres en, waar daarom wordt gevraagd, uw telefoonnummer.',
          'Houd uw inloggegevens geheim. U bent verantwoordelijk voor wat er via uw account gebeurt, tenzij u geen schuld treft.',
        ],
      },
      {
        id: 'movers',
        heading: '4. Verhuizers',
        paragraphs: [
          'Verhuizers gebruiken het platform als zelfstandige ondernemers, in eigen naam en voor eigen rekening. Zij beslissen vrij wanneer zij beschikbaar zijn en welke aanvragen zij accepteren. Zij mogen voor andere opdrachtgevers en via andere platforms werken.',
          'Voordat een verhuizer aanvragen kan ontvangen, controleren wij de gegevens die bij de registratie zijn opgegeven: een foto van de persoon, het rijbewijs, de belastinggegevens en het voertuig met zijn toegestane maximummassa. Bij een gehuurd voertuig vragen wij naar de huurperiode.',
          'Elke verhuizer is verantwoordelijk voor:',
        ],
        bullets: [
          'de inschrijving van zijn bedrijf en elke vergunning die zijn werk vereist,',
          'zijn belastingen en socialezekerheidsbijdragen,',
          'de verzekering van zijn voertuig en van zijn werk,',
          'de verkeersveiligheid van het voertuig en de naleving van het verkeers- en vervoersrecht, met inbegrip van de grens van 3,5 ton,',
          'de personen die hem bij een verhuizing helpen.',
        ],
        after: [
          'Onze controle is een plausibiliteitscontrole van de ingediende documenten. Zij is geen garantie voor de kwaliteit van een verhuizer of van een bepaalde verhuizing.',
        ],
      },
      {
        id: 'booking',
        heading: '5. Hoe een boeking tot stand komt',
        paragraphs: [
          'De klant beschrijft de verhuizing: adressen, datum, spullen, toegang op beide adressen, helpers en inpakken, met foto\'s waar dat nuttig is. Er zijn twee manieren om te boeken.',
        ],
        bullets: [
          'Directe verhuizing: de aanvraag gaat naar een verhuizer in de buurt die nu beschikbaar is. De verhuizer heeft een beperkte tijd om te accepteren. Doet hij dat niet, dan kan de aanvraag aan andere verhuizers worden aangeboden.',
          'Geplande verhuizing: de aanvraag voor een latere datum wordt zichtbaar gemaakt voor verhuizers, en een van hen accepteert deze.',
        ],
        after: [
          'De aanvraag is het aanbod van de klant om een overeenkomst voor de verhuizing te sluiten tegen de getoonde prijs. De overeenkomst tussen klant en verhuizer komt tot stand wanneer een verhuizer de aanvraag in de app accepteert. Beide partijen worden in de app geïnformeerd.',
          'Er bestaat geen aanspraak op het vinden van een verhuizer voor een aanvraag.',
        ],
      },
      {
        id: 'price',
        heading: '6. Prijs',
        paragraphs: [
          'Voordat de klant een aanvraag verstuurt, toont het platform de prijs van de verhuizing. Deze wordt berekend op basis van de gegevens die de klant heeft opgegeven: afstand, grootte van het voertuig, volume en gewicht van de spullen, aantal helpers, verdiepingen en toegang, inpakken, en of het een directe of een geplande verhuizing is. De prijs is inclusief de wettelijke btw waar die van toepassing is, en inclusief de platformkosten.',
          'De prijs berust op de informatie van de klant. Als de spullen of de omstandigheden ter plaatse wezenlijk afwijken van wat is opgegeven, mag de verhuizer weigeren de verhuizing uit te voeren zoals deze is geboekt.',
        ],
      },
      {
        id: 'payment',
        heading: '7. Betaling en platformkosten',
        bullets: [
          'De klant betaalt de verhuizer nadat de verhuizing is voltooid, met een kaart in de app of contant aan de verhuizer.',
          'Kaartbetalingen worden verwerkt door onze betalingsdienstverlener Stripe. Wij slaan geen kaartnummers op.',
          'Voor het bemiddelen van de verhuizing ontvangen wij platformkosten van de verhuizer. Deze zijn een deel van de prijs en worden aan de verhuizer getoond voordat hij accepteert.',
          'Bij kaartbetaling worden de platformkosten ingehouden voordat het bedrag aan de verhuizer wordt uitbetaald. Bij contante betaling is de verhuizer ons de platformkosten verschuldigd en moet hij deze binnen 24 uur na de verhuizing betalen. Zolang platformkosten te laat zijn, ontvangt de verhuizer geen nieuwe aanvragen.',
        ],
      },
      {
        id: 'cancellation',
        heading: '8. Wijzigingen en annulering',
        paragraphs: [
          'Een klant kan een aanvraag in de app annuleren zolang de verhuizing niet is begonnen. Een verhuizer kan een verhuizing die hij heeft geaccepteerd teruggeven; de aanvraag kan dan aan andere verhuizers worden aangeboden.',
          'Wij brengen geen kosten in rekening voor het annuleren. Vorderingen die de klant en de verhuizer wegens een late annulering op elkaar kunnen hebben, worden beheerst door hun overeenkomst en door de wet.',
          'Wettelijke herroepingsrechten voor consumenten blijven onverlet.',
        ],
      },
      {
        id: 'performance',
        heading: '9. Uitvoering van de verhuizing, schade en klachten',
        paragraphs: [
          'De verhuizer voert de verhuizing onder eigen verantwoordelijkheid uit. Vorderingen die uit de verhuizing voortvloeien, in het bijzonder wegens beschadiging of verlies van goederen, vertraging of een verhuizing die niet heeft plaatsgevonden, zijn vorderingen op de verhuizer op grond van de overeenkomst en het vervoersrecht.',
          'Leg schade direct vast, met foto\'s, en meld deze in de chat aan de verhuizer. Wij helpen bij de communicatie tussen beide partijen en kunnen de gegevens doorgeven die nodig zijn om een vordering geldend te maken, maar wij beslissen geen geschillen en betalen geen schadevergoeding namens een verhuizer.',
        ],
      },
      {
        id: 'conduct',
        heading: '10. Gebruiksregels',
        bullets: [
          'Geef volledige en eerlijke informatie over de verhuizing en over uzelf.',
          'Boek geen transport van gevaarlijke goederen, van zaken die niet rechtmatig mogen worden vervoerd, of van afval dat moet worden afgevoerd.',
          'Behandel elkaar met respect. Bedreigingen, discriminatie en intimidatie leiden tot uitsluiting.',
          'Beoordelingen moeten uw eigen ervaring weergeven met een verhuizing die heeft plaatsgevonden.',
          'Verstoor het platform niet, lees de gegevens ervan niet geautomatiseerd uit en gebruik niet het account van iemand anders.',
        ],
      },
      {
        id: 'ranking',
        heading: '11. Hoe verhuizers aan klanten worden getoond',
        paragraphs: [
          'Wanneer een klant een verhuizer zoekt, neemt het platform verhuizers in aanmerking die geverifieerd en online zijn, niet met een andere opdracht bezig zijn en van wie het voertuig geschikt is voor de lading. Onder hen is de afstand tot het ophaaladres de belangrijkste factor: de dichtstbijzijnde verhuizer wordt als eerste getoond.',
          'Verhuizers kunnen niet betalen voor een betere positie.',
        ],
      },
      {
        id: 'liability',
        heading: '12. Onze aansprakelijkheid',
        paragraphs: [
          'Wij zijn onbeperkt aansprakelijk voor opzet en grove nalatigheid, voor schade aan leven, lichaam of gezondheid, en waar de wet een aansprakelijkheid voorschrijft die niet kan worden uitgesloten.',
          'Bij lichte nalatigheid zijn wij alleen aansprakelijk voor de schending van een verplichting die wezenlijk is voor de overeenkomst met ons, en dan alleen voor de voorzienbare schade die typisch is voor een dergelijke overeenkomst.',
          'Wij zijn niet aansprakelijk voor de uitvoering van de verhuizing of voor het gedrag van klanten en verhuizers tegenover elkaar, omdat wij geen partij zijn bij hun overeenkomst. Wij beloven niet dat het platform zonder onderbreking beschikbaar is.',
        ],
      },
      {
        id: 'termination',
        heading: '13. Beëindiging van het gebruik, blokkering',
        paragraphs: [
          'U kunt uw account op elk moment in de app of op de website verwijderen. Dat is mogelijk zodra er geen verhuizing gaande of geboekt is en, voor verhuizers, er geen platformkosten openstaan en er geen uitbetaling in behandeling is.',
          'Wij mogen een account beperken of blokkeren als daar een zwaarwegende reden voor is, in het bijzonder onjuiste gegevens of documenten, een schending van deze voorwaarden, onbetaalde platformkosten of een risico voor andere gebruikers. Wij delen de gebruiker de redenen mee. Verhuizers kunnen bezwaar maken via de contactgegevens in het colofon; wij beoordelen elke klacht en beantwoorden deze.',
          'Wij mogen de overeenkomst met een verhuizer beëindigen met een opzegtermijn van 30 dagen. Het recht om de overeenkomst zonder opzegtermijn te beëindigen wegens een gewichtige reden blijft onverlet.',
        ],
      },
      {
        id: 'changes',
        heading: '14. Wijzigingen van deze voorwaarden',
        paragraphs: [
          'Wij mogen deze voorwaarden voor de toekomst wijzigen als daar een geldige reden voor is, zoals een wijziging van de wet of van het platform. Wij kondigen wijzigingen ten minste 30 dagen voordat ze ingaan aan per e-mail of in de app. Als u niet akkoord gaat, kunt u uw account vóór die datum verwijderen.',
        ],
      },
      {
        id: 'law',
        heading: '15. Toepasselijk recht en geschillen',
        paragraphs: [
          'Het Duitse recht is van toepassing. Consumenten behouden daarnaast de bescherming van de dwingende bepalingen van het land waar zij hun gewone verblijfplaats hebben.',
          'Wij zijn niet verplicht en niet bereid om deel te nemen aan een geschillenbeslechtingsprocedure voor een geschillencommissie voor consumenten.',
          'Mocht een bepaling van deze voorwaarden ongeldig zijn, dan blijven de overige bepalingen van kracht.',
        ],
      },
    ],
  },

  // ── Privacy ──────────────────────────────────────────────────────────────
  privacy: {
    title: 'Privacybeleid',
    intro: [
      'Dit beleid legt uit welke persoonsgegevens worden verwerkt wanneer u de website van PickLte en de apps PickLte en PickLte Mover gebruikt, voor welk doel, en welke rechten u hebt.',
    ],
    sections: [
      {
        id: 'controller',
        heading: '1. Wie verantwoordelijk is',
        paragraphs: [
          'De verwerkingsverantwoordelijke in de zin van de Algemene Verordening Gegevensbescherming (AVG) is de onderneming die in het colofon wordt genoemd. U kunt ons voor elke privacykwestie bereiken via de daar vermelde contactgegevens.',
        ],
      },
      {
        id: 'data',
        heading: '2. Welke gegevens wij verwerken',
        bullets: [
          'Account: naam, e-mailadres, telefoonnummer, profielfoto, taal, en of u klant of verhuizer bent. Als u inlogt met Google, ontvangen wij van Google uw naam, e-mailadres en profielfoto.',
          'Verhuizingen: ophaal- en afleveradres, datum en tijd, de lijst van spullen, gegevens over toegang en verdiepingen, opmerkingen, foto\'s van de spullen, een bedrijfsnaam bij een zakelijke verhuizing, de prijs en de status van de verhuizing.',
          'Bij verhuizers daarnaast: een foto van uzelf, een foto van uw rijbewijs, uw adres en belastinggegevens, uw voertuigen met kenteken, toegestane maximummassa en foto\'s, huurperiodes, de personen in uw ploeg, uw inkomsten en de platformkosten.',
          'Locatie: zie paragraaf 4.',
          'Communicatie: de chatberichten tussen klant en verhuizer over een verhuizing, en bij gesprekken in de app wie wie heeft gebeld, wanneer en hoe lang. Gesprekken worden niet opgenomen.',
          'Betaling: bedrag, tijdstip, methode en status van een betaling. Kaartgegevens gaan rechtstreeks naar de betalingsdienstverlener en worden niet door ons opgeslagen.',
          'Apparaat en gebruik: het token voor pushmeldingen van uw apparaat, de appversie, het besturingssysteem, en technische logbestanden met het IP-adres en het tijdstip van een verzoek.',
          'Beoordelingen die u geeft of ontvangt.',
        ],
      },
      {
        id: 'purposes',
        heading: '3. Waarom wij ze verwerken, en op welke rechtsgrond',
        bullets: [
          'Om uw account te beheren en om verhuizingen tussen klanten en verhuizers tot stand te brengen en af te handelen: uitvoering van een overeenkomst, art. 6 lid 1 onder b AVG.',
          'Om de documenten van verhuizers te controleren voordat zij worden toegelaten, om misbruik en fraude te voorkomen, om het platform veilig te houden en om fouten op te sporen en te verhelpen: ons gerechtvaardigd belang bij een veilig en werkend platform, art. 6 lid 1 onder f AVG.',
          'Om te voldoen aan verplichtingen uit het belasting- en handelsrecht, met inbegrip van het melden van de inkomsten van verhuizers aan de belastingdienst op grond van de wet inzake fiscale transparantie van platforms (DAC7): wettelijke verplichting, art. 6 lid 1 onder c AVG.',
          'Om de locatie, de camera, de fotobibliotheek en de meldingen van uw apparaat te gebruiken: uw toestemming, art. 6 lid 1 onder a AVG, die u in de instellingen van uw apparaat geeft of intrekt.',
        ],
      },
      {
        id: 'location',
        heading: '4. Locatie',
        paragraphs: [
          'De positie van een verhuizer wordt alleen vastgelegd terwijl de verhuizer online is of met een opdracht bezig is. Een klant ziet de positie van een verhuizer alleen voor zijn eigen verhuizing, terwijl die verhuizing gaande is. Daarvoor zien klanten die een verhuizer zoeken alleen posities bij benadering.',
          'Wanneer een verhuizer offline gaat en niet met een opdracht bezig is, wordt de opgeslagen positie verwijderd. Er wordt geen geschiedenis van routes bijgehouden.',
          'Klanten kunnen de app toestaan hun locatie te gebruiken om het ophaaladres in te vullen. Dit is optioneel.',
        ],
      },
      {
        id: 'photos',
        heading: '5. Foto\'s en documenten',
        paragraphs: [
          'Foto\'s van een verhuizing kunnen alleen worden bekeken door de klant, door de verhuizer die de verhuizing heeft geaccepteerd, en door verhuizers aan wie de openstaande aanvraag wordt getoond. Ze worden geleverd via links die na korte tijd verlopen.',
          'Rijbewijzen en andere documenten van verhuizers kunnen alleen worden bekeken door de verhuizer en door de medewerkers die ze beoordelen.',
        ],
      },
      {
        id: 'recipients',
        heading: '6. Wie gegevens ontvangt',
        paragraphs: [
          'De andere partij bij een verhuizing ontvangt wat nodig is om deze uit te voeren. De klant ziet de naam, de foto, het voertuig en de beoordelingen van de verhuizer en, tijdens de verhuizing, de positie van de verhuizer. De verhuizer ziet de naam van de klant, de adressen, de spullen en de foto\'s. Telefoonnummers worden alleen doorgegeven waar dat nodig is voor een geaccepteerde verhuizing; in de app kan worden gebeld zonder een nummer prijs te geven.',
          'Wij maken gebruik van dienstverleners die gegevens in onze opdracht en op grond van een overeenkomst verwerken:',
        ],
        bullets: [
          'Appwrite: database, bestandsopslag, inloggen en bezorging van meldingen, gehost in Frankfurt, Duitsland.',
          'Vercel: hosting van de website.',
          'Stripe: betalingsverwerking en uitbetalingen. Stripe is voor een deel van deze verwerking zelf verwerkingsverantwoordelijke.',
          'Mapbox: kaarten, adreszoekfunctie en routeberekening.',
          'Google: inloggen met Google en bezorging van pushmeldingen (Firebase Cloud Messaging).',
          'LiveKit: overdracht van gesprekken in de app.',
          'Sentry: foutrapporten, opgeslagen in de EU, waaruit persoonlijke gegevens worden verwijderd voordat ze worden verzonden.',
        ],
        after: [
          'Wij geven gegevens door aan autoriteiten waar de wet dat vereist, in het bijzonder inkomstengegevens van verhuizers aan het Federale Centrale Belastingkantoor.',
          'Sommige van deze dienstverleners zijn gevestigd in de Verenigde Staten of kunnen daar gegevens verwerken. In dat geval berust de doorgifte op het EU-VS-kader voor gegevensbescherming (Data Privacy Framework) of op de standaardcontractbepalingen van de Europese Commissie.',
          'Wij verkopen geen persoonsgegevens en gebruiken ze niet voor reclame door derden.',
        ],
      },
      {
        id: 'cookies',
        heading: '7. Cookies en lokale opslag op de website',
        bullets: [
          'Een sessiecookie houdt u ingelogd.',
          'Een taalcookie onthoudt de taal die u hebt gekozen.',
          'De lokale opslag van de browser bewaart een boeking waaraan u bent begonnen, zodat deze niet verloren gaat wanneer u de pagina opnieuw laadt.',
        ],
        after: [
          'Deze zijn noodzakelijk om de website te laten werken. De website gebruikt geen advertentiecookies en geen analyse die bezoekers over websites heen volgt. De foutbewaking door Sentry legt technische fouten vast.',
        ],
      },
      {
        id: 'retention',
        heading: '8. Hoe lang wij gegevens bewaren',
        bullets: [
          'Accountgegevens: zolang het account bestaat.',
          'Nadat u uw account hebt verwijderd: uw profiel, foto\'s, documenten, adressen, berichten en apparaatgegevens worden verwijderd of geanonimiseerd. Voltooide verhuizingen blijven bestaan als anonieme gegevens zonder uw naam.',
          'Gegevens die wij op grond van het belasting- en handelsrecht moeten bewaren, zoals facturen, betalingsgegevens en de identiteits- en belastinggegevens van verhuizers: tot tien jaar, afzonderlijk opgeslagen met beperkte toegang, daarna verwijderd.',
          'Technische logbestanden: gedurende een korte periode, voor zover nodig voor de beveiliging en het oplossen van problemen.',
        ],
      },
      {
        id: 'rights',
        heading: '9. Uw rechten',
        paragraphs: ['Op grond van de AVG hebt u het recht om:'],
        bullets: [
          'informatie over uw gegevens en een kopie ervan te verkrijgen,',
          'onjuiste gegevens te laten corrigeren,',
          'gegevens te laten verwijderen of de verwerking ervan te laten beperken,',
          'gegevens die u hebt verstrekt in een overdraagbaar formaat te ontvangen,',
          'bezwaar te maken tegen verwerking die op onze gerechtvaardigde belangen berust,',
          'een toestemming op elk moment in te trekken met werking voor de toekomst.',
        ],
        after: [
          'Om een recht uit te oefenen, schrijft u naar de contactgegevens in het colofon. U hebt ook het recht om een klacht in te dienen bij een toezichthoudende autoriteit voor gegevensbescherming, in het bijzonder die van uw woonplaats.',
        ],
      },
      {
        id: 'deletion',
        heading: '10. Uw account verwijderen',
        paragraphs: [
          'U kunt uw account zelf verwijderen: in de apps onder Profiel, op de website in uw accountinstellingen. Om veiligheidsredenen wordt u gevraagd kort daarvoor opnieuw in te loggen. Verwijderen is mogelijk zodra er geen verhuizing gaande of geboekt is en, voor verhuizers, er geen platformkosten openstaan en er geen uitbetaling in behandeling is.',
        ],
      },
      {
        id: 'security',
        heading: '11. Beveiliging',
        paragraphs: [
          'Gegevens worden versleuteld verzonden. De toegang tot gegevens is per rol beperkt: elke gebruiker bereikt alleen zijn eigen gegevens en de verhuizingen waaraan hij deelneemt. De toegang van medewerkers is beperkt tot wat de taak vereist en wordt gelogd.',
        ],
      },
      {
        id: 'automated',
        heading: '12. Geautomatiseerde verwerking',
        paragraphs: [
          'De prijs van een verhuizing en de selectie van verhuizers die voor een aanvraag worden getoond, worden automatisch berekend op basis van de gegevens van de verhuizing. Er wordt geen besluit met rechtsgevolgen voor u uitsluitend langs geautomatiseerde weg genomen. Over de toelating van een verhuizer beslist een persoon.',
          'Het platform is niet bedoeld voor personen jonger dan 18 jaar.',
        ],
      },
      {
        id: 'changes',
        heading: '13. Wijzigingen van dit beleid',
        paragraphs: [
          'Wij werken dit beleid bij wanneer het platform of de wet verandert. De actuele versie is altijd op deze pagina beschikbaar.',
        ],
      },
    ],
  },

  // ── Help ─────────────────────────────────────────────────────────────────
  help: {
    title: 'Hulp',
    intro: [
      'Antwoorden op de meestgestelde vragen over het boeken van een verhuizing en over het werken als verhuizer op PickLte.',
    ],
    groups: [
      {
        id: 'about',
        heading: 'Over PickLte',
        topics: [
          {
            id: 'what',
            question: 'Wat is PickLte?',
            answer: [
              'PickLte is een platform dat mensen die een verhuizing nodig hebben in contact brengt met zelfstandige verhuizers. U beschrijft de verhuizing, ziet de prijs, en een verhuizer accepteert deze.',
            ],
          },
          {
            id: 'who',
            question: 'Wie voert mijn verhuizing uit?',
            answer: [
              'Een zelfstandige verhuizer, niet PickLte. Uw overeenkomst voor de verhuizing sluit u met de verhuizer die uw aanvraag accepteert. PickLte brengt het contact tot stand en biedt het boeken, het volgen en de betaling.',
            ],
          },
          {
            id: 'where',
            question: 'Waar is PickLte beschikbaar?',
            answer: [
              'In Duitsland, voor verhuizingen die in Duitsland beginnen en eindigen. Verhuizers gebruiken bestelwagens en kleine vrachtwagens tot 3,5 ton.',
            ],
          },
        ],
      },
      {
        id: 'booking',
        heading: 'Boeken',
        topics: [
          {
            id: 'types',
            question: 'Wat is het verschil tussen een directe en een geplande verhuizing?',
            answer: [
              'Een directe verhuizing is voor nu meteen: de aanvraag gaat naar een beschikbare verhuizer in de buurt van het ophaaladres. Een geplande verhuizing is voor een datum en tijd die u kiest; verhuizers zien de aanvraag en een van hen accepteert deze.',
            ],
          },
          {
            id: 'price',
            question: 'Hoe wordt de prijs berekend?',
            answer: [
              'Op basis van de gegevens die u invoert: afstand, de benodigde grootte van het voertuig, het volume en gewicht van uw spullen, het aantal helpers, verdiepingen en lift, en inpakken. U ziet de volledige prijs, inclusief btw, voordat u de aanvraag verstuurt.',
            ],
          },
          {
            id: 'items',
            question: 'Wat kan ik laten verhuizen?',
            answer: [
              'Huisraad, meubels, dozen en andere bezittingen. Niet mogelijk: gevaarlijke goederen, zaken die niet rechtmatig mogen worden vervoerd, en afval dat moet worden afgevoerd.',
            ],
          },
          {
            id: 'extras',
            question: 'Kan ik inpakken of extra helpers boeken?',
            answer: [
              'Ja. Bij een geplande verhuizing kunt u een inpakniveau kiezen en helpers toevoegen. Ander werk, zoals meubelmontage, bevestigingswerk, het aansluiten van apparaten, schoonmaak of opslag, kan niet via PickLte worden geboekt.',
            ],
          },
          {
            id: 'photos',
            question: 'Waarom zou ik foto\'s toevoegen?',
            answer: [
              'Foto\'s helpen de verhuizer de lading in te schatten en het juiste voertuig mee te nemen. Alleen u, de verhuizer van uw verhuizing en verhuizers aan wie uw openstaande aanvraag wordt getoond, kunnen ze zien.',
            ],
          },
        ],
      },
      {
        id: 'payment',
        heading: 'Betaling',
        topics: [
          {
            id: 'how',
            question: 'Hoe en wanneer betaal ik?',
            answer: [
              'Nadat de verhuizing is voltooid, met een kaart in de app of contant aan de verhuizer. U kiest de methode bij het boeken.',
            ],
          },
          {
            id: 'fees',
            question: 'Zijn er extra kosten?',
            answer: [
              'Nee. De prijs die vóór het boeken wordt getoond, is al inclusief btw en platformkosten. Annuleren via de app kost niets.',
            ],
          },
        ],
      },
      {
        id: 'during',
        heading: 'Tijdens de verhuizing',
        topics: [
          {
            id: 'track',
            question: 'Kan ik zien waar de verhuizer is?',
            answer: [
              'Ja. Zodra de verhuizer naar u onderweg is, kunt u hem op de kaart volgen totdat de verhuizing is afgerond.',
            ],
          },
          {
            id: 'contact',
            question: 'Hoe bereik ik de verhuizer?',
            answer: [
              'Via de chat of een gesprek in de app op de pagina van uw verhuizing. U hoeft geen telefoonnummers uit te wisselen.',
            ],
          },
          {
            id: 'cancel',
            question: 'Hoe annuleer ik?',
            answer: [
              'Open de verhuizing en kies Annuleren. Dit is mogelijk totdat de verhuizing is begonnen. Annuleer zo vroeg als u kunt, uit billijkheid tegenover de verhuizer.',
            ],
          },
          {
            id: 'damage',
            question: 'Er is iets beschadigd. Wat moet ik doen?',
            answer: [
              'Maak direct foto\'s en meld het in de chat aan de verhuizer. De verhuizer is verantwoordelijk voor het transport, dus uw vordering richt zich tegen de verhuizer. Als u het niet eens kunt worden, schrijf ons dan via de contactgegevens in het colofon en wij helpen bij de communicatie.',
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
            question: 'Ik ben mijn wachtwoord vergeten.',
            answer: [
              'Kies "Wachtwoord vergeten" op de inlogpagina. U ontvangt per e-mail een code om een nieuw wachtwoord in te stellen.',
            ],
          },
          {
            id: 'language',
            question: 'Hoe wijzig ik de taal?',
            answer: [
              'Op de website met het taalmenu bovenaan de pagina, in de apps onder Profiel. Er zijn acht talen beschikbaar.',
            ],
          },
          {
            id: 'delete',
            question: 'Hoe verwijder ik mijn account?',
            answer: [
              'In de apps onder Profiel, op de website in uw accountinstellingen. U wordt eerst gevraagd opnieuw in te loggen. Verwijderen is mogelijk wanneer u geen verhuizing hebt die gaande of geboekt is. Uw persoonsgegevens worden dan verwijderd of geanonimiseerd; de details staan in het privacybeleid.',
            ],
          },
        ],
      },
      {
        id: 'movers',
        heading: 'Voor verhuizers',
        topics: [
          {
            id: 'register',
            question: 'Hoe word ik verhuizer op PickLte?',
            answer: [
              'Registreer u in de app PickLte Mover of op de website, vul uw profiel aan en voeg uw voertuig toe. U hebt een foto van uzelf, uw rijbewijs, uw belastinggegevens en de kentekengegevens van uw voertuig nodig. Zodra uw gegevens zijn gecontroleerd, kunt u online gaan.',
            ],
          },
          {
            id: 'independent',
            question: 'Ben ik in dienst van PickLte?',
            answer: [
              'Nee. U werkt als zelfstandig ondernemer. U beslist wanneer u online bent en welke aanvragen u accepteert, en u bent verantwoordelijk voor de inschrijving van uw bedrijf, uw belastingen en uw verzekering.',
            ],
          },
          {
            id: 'vehicle',
            question: 'Welke voertuigen zijn toegestaan?',
            answer: [
              'Voertuigen met een toegestane maximummassa van ten hoogste 3,5 ton, inclusief aanhanger. Zowel eigen als gehuurde voertuigen zijn mogelijk; bij een gehuurd voertuig voert u de huurperiode in.',
            ],
          },
          {
            id: 'location',
            question: 'Wanneer wordt mijn locatie gedeeld?',
            answer: [
              'Alleen terwijl u online bent of met een opdracht bezig bent. De klant van een verhuizing ziet uw positie tijdens die verhuizing. Wanneer u offline gaat en geen opdracht hebt, wordt uw positie verwijderd.',
            ],
          },
          {
            id: 'earnings',
            question: 'Wat verdien ik, en wat zijn de platformkosten?',
            answer: [
              'Elke aanvraag toont wat u verdient na btw en platformkosten, voordat u accepteert. Bij kaartbetaling worden de platformkosten van uw uitbetaling afgetrokken. Bij contante betaling int u het volledige bedrag en betaalt u de platformkosten binnen 24 uur aan PickLte; totdat ze zijn betaald, ontvangt u geen nieuwe aanvragen.',
            ],
          },
          {
            id: 'tax',
            question: 'Meldt PickLte mijn inkomsten?',
            answer: [
              'Ja, waar de wet dat vereist. Platformexploitanten moeten de inkomsten van verkopers melden aan de belastingdienst (DAC7). U kunt uw belastingoverzichten in de app downloaden.',
            ],
          },
        ],
      },
    ],
  },

  // ── Imprint ──────────────────────────────────────────────────────────────
  imprint: {
    title: 'Colofon',
    intro: ['Informatie overeenkomstig paragraaf 5 van de Duitse wet inzake digitale diensten (DDG).'],
    labels: {
      provider: 'Aanbieder',
      address: 'Adres',
      representedBy: 'Vertegenwoordigd door',
      contact: 'Contact',
      email: 'E-mail',
      phone: 'Telefoon',
      register: 'Handelsregister',
      vatId: 'Btw-identificatienummer',
      responsibleForContent: 'Verantwoordelijk voor de inhoud',
    },
    sections: [
      {
        id: 'role',
        heading: 'Rol van het platform',
        paragraphs: [
          'PickLte is een bemiddelingsplatform. Verhuizingen worden uitgevoerd door zelfstandige verhuizers, in eigen naam en onder eigen verantwoordelijkheid. De hier genoemde aanbieder is geen vervoerder en geen partij bij de overeenkomst voor een verhuizing.',
        ],
      },
      {
        id: 'disputes',
        heading: 'Geschillenbeslechting voor consumenten',
        paragraphs: [
          'Wij zijn niet verplicht en niet bereid om deel te nemen aan een geschillenbeslechtingsprocedure voor een geschillencommissie voor consumenten.',
        ],
      },
      {
        id: 'content',
        heading: 'Aansprakelijkheid voor inhoud',
        paragraphs: [
          'Wij zijn op grond van de algemene wetten verantwoordelijk voor onze eigen inhoud op deze pagina\'s. Wij zijn niet verplicht om informatie die gebruikers doorgeven of opslaan te controleren, of om te zoeken naar omstandigheden die op een onrechtmatige activiteit wijzen. Zodra wij kennis krijgen van een concrete inbreuk, verwijderen wij de inhoud onverwijld.',
        ],
      },
      {
        id: 'links',
        heading: 'Aansprakelijkheid voor links',
        paragraphs: [
          'Deze pagina\'s kunnen links bevatten naar websites van derden. Alleen de exploitanten daarvan zijn verantwoordelijk voor de inhoud van die websites. Als wij kennis krijgen van een inbreuk, verwijderen wij de link.',
        ],
      },
      {
        id: 'copyright',
        heading: 'Auteursrecht',
        paragraphs: [
          'De inhoud en de werken op deze pagina\'s zijn auteursrechtelijk beschermd. Voor het kopiëren, bewerken of verspreiden ervan buiten wat het auteursrecht toestaat, is onze schriftelijke toestemming vereist.',
        ],
      },
    ],
  },
}

export default content
