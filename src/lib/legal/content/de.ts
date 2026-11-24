import type { LegalContent } from '../types'

const content: LegalContent = {
  updatedLabel: 'Stand: {{date}}',
  languageNotice:
    'Maßgeblich ist die deutsche Fassung dieses Textes. Weichen die Sprachfassungen voneinander ab, gilt die deutsche Fassung.',
  contentsLabel: 'Inhalt',
  nav: {
    terms: 'Allgemeine Geschäftsbedingungen',
    privacy: 'Datenschutzerklärung',
    help: 'Hilfe',
    imprint: 'Impressum',
  },

  // ── Terms ────────────────────────────────────────────────────────────────
  terms: {
    title: 'Allgemeine Geschäftsbedingungen',
    intro: [
      'Diese Bedingungen regeln die Nutzung der Website von PickLte sowie der Apps PickLte und PickLte Mover. Sie gelten für Kunden, die einen Umzugsunternehmer suchen, und für Umzugsunternehmer, die ihre Transportleistungen über die Plattform anbieten.',
      'Betreiber der Plattform ist das im Impressum genannte Unternehmen („PickLte“, „wir“).',
    ],
    sections: [
      {
        id: 'role',
        heading: '1. Was PickLte ist und was nicht',
        paragraphs: [
          'PickLte ist eine Online-Vermittlungsplattform, die Kunden mit selbstständigen Umzugsunternehmern zusammenbringt. Wir stellen die Technik bereit: den Buchungsablauf, die Preisberechnung, den Nachrichtenaustausch, die Live-Verfolgung und die Zahlungsabwicklung.',
          'Wir führen keine Umzüge durch. Wir sind weder Frachtführer noch Umzugsunternehmen, wir besitzen keine Fahrzeuge, und die Umzugsunternehmer sind weder unsere Arbeitnehmer noch unsere Vertreter.',
          'Der Vertrag über einen Umzug kommt unmittelbar zwischen dem Kunden und dem Umzugsunternehmer zustande, der die Anfrage annimmt. Allein der Umzugsunternehmer schuldet den Transport und ist dafür verantwortlich. Unsere eigene Leistung beschränkt sich auf die Vermittlung des Kontakts und den Betrieb der Plattform.',
        ],
      },
      {
        id: 'scope',
        heading: '2. Was gebucht werden kann',
        bullets: [
          'Umzüge innerhalb Deutschlands. Abhol- und Zieladresse müssen beide in Deutschland liegen.',
          'Transporte mit Fahrzeugen bis 3,5 Tonnen zulässigem Gesamtgewicht, einschließlich Anhänger.',
          'Beladen, Transport und Entladen von Hausrat, Möbeln und sonstigen Gegenständen, auf Wunsch des Kunden mit Verpacken durch den Umzugsunternehmer.',
        ],
        after: [
          'Entsorgung von Abfällen, Möbelmontage, Montagearbeiten, der Anschluss von Geräten, Reinigung und Einlagerung werden über die Plattform nicht angeboten.',
        ],
      },
      {
        id: 'account',
        heading: '3. Ihr Konto',
        bullets: [
          'Um einen Umzug zu buchen oder anzunehmen, benötigen Sie ein Konto. Sie müssen mindestens 18 Jahre alt sein.',
          'Jedes Konto ist entweder ein Kundenkonto oder ein Konto für Umzugsunternehmer. Ein Konto kann nicht in beiden Rollen genutzt werden.',
          'Ihre Angaben müssen wahr sein und aktuell gehalten werden. Wir überprüfen Ihre E-Mail-Adresse und, soweit angefordert, Ihre Telefonnummer.',
          'Halten Sie Ihre Zugangsdaten geheim. Sie sind für alles verantwortlich, was über Ihr Konto geschieht, es sei denn, Sie haben dies nicht zu vertreten.',
        ],
      },
      {
        id: 'movers',
        heading: '4. Umzugsunternehmer',
        paragraphs: [
          'Umzugsunternehmer nutzen die Plattform als selbstständige Unternehmer, im eigenen Namen und auf eigene Rechnung. Sie entscheiden frei, wann sie verfügbar sind und welche Anfragen sie annehmen. Sie dürfen für andere Auftraggeber und über andere Plattformen tätig sein.',
          'Bevor ein Umzugsunternehmer Anfragen erhalten kann, prüfen wir die bei der Registrierung gemachten Angaben: ein Foto der Person, den Führerschein, die steuerlichen Angaben und das Fahrzeug mit seinem zulässigen Gesamtgewicht. Bei einem gemieteten Fahrzeug fragen wir den Mietzeitraum ab.',
          'Jeder Umzugsunternehmer ist selbst verantwortlich für:',
        ],
        bullets: [
          'seine Gewerbeanmeldung und alle Erlaubnisse, die seine Tätigkeit erfordert,',
          'seine Steuern und Sozialversicherungsbeiträge,',
          'die Versicherung seines Fahrzeugs und seiner Tätigkeit,',
          'die Verkehrssicherheit des Fahrzeugs und die Einhaltung des Straßenverkehrs- und Transportrechts, einschließlich der Grenze von 3,5 Tonnen,',
          'die Personen, die ihm bei einem Umzug helfen.',
        ],
        after: [
          'Unsere Prüfung ist eine Plausibilitätsprüfung der eingereichten Unterlagen. Sie ist keine Garantie für die Qualität eines Umzugsunternehmers oder eines bestimmten Umzugs.',
        ],
      },
      {
        id: 'booking',
        heading: '5. Wie eine Buchung zustande kommt',
        paragraphs: [
          'Der Kunde beschreibt den Umzug: Adressen, Termin, Gegenstände, Zugang an beiden Adressen, Helfer und Verpackung, soweit sinnvoll mit Fotos. Es gibt zwei Arten der Buchung.',
        ],
        bullets: [
          'Sofortumzug: Die Anfrage geht an einen Umzugsunternehmer in der Nähe, der jetzt verfügbar ist. Der Umzugsunternehmer hat eine begrenzte Zeit, um sie anzunehmen. Nimmt er sie nicht an, kann die Anfrage anderen Umzugsunternehmern angeboten werden.',
          'Geplanter Umzug: Die Anfrage für einen späteren Termin wird für Umzugsunternehmer sichtbar gemacht, und einer von ihnen nimmt sie an.',
        ],
        after: [
          'Die Anfrage ist das Angebot des Kunden, einen Vertrag über den Umzug zum angezeigten Preis zu schließen. Der Vertrag zwischen Kunde und Umzugsunternehmer kommt zustande, wenn ein Umzugsunternehmer die Anfrage in der App annimmt. Beide Seiten werden in der App darüber informiert.',
          'Ein Anspruch darauf, dass sich für eine Anfrage ein Umzugsunternehmer findet, besteht nicht.',
        ],
      },
      {
        id: 'price',
        heading: '6. Preis',
        paragraphs: [
          'Bevor der Kunde eine Anfrage absendet, zeigt die Plattform den Preis des Umzugs an. Er wird aus den Angaben des Kunden berechnet: Entfernung, Fahrzeuggröße, Volumen und Gewicht der Gegenstände, Anzahl der Helfer, Stockwerke und Zugang, Verpackung sowie die Frage, ob es sich um einen Sofortumzug oder einen geplanten Umzug handelt. Der Preis enthält die gesetzliche Umsatzsteuer, soweit sie anfällt, und er enthält die Plattformgebühr.',
          'Der Preis beruht auf den Angaben des Kunden. Weichen die Gegenstände oder die Verhältnisse vor Ort wesentlich von den Angaben ab, kann der Umzugsunternehmer die Durchführung des Umzugs wie gebucht ablehnen.',
        ],
      },
      {
        id: 'payment',
        heading: '7. Zahlung und Plattformgebühr',
        bullets: [
          'Der Kunde bezahlt den Umzugsunternehmer nach Abschluss des Umzugs, entweder per Karte in der App oder in bar an den Umzugsunternehmer.',
          'Kartenzahlungen werden von unserem Zahlungsdienstleister Stripe abgewickelt. Wir speichern keine Kartennummern.',
          'Für die Vermittlung des Umzugs erhalten wir vom Umzugsunternehmer eine Plattformgebühr. Sie ist ein Anteil am Preis und wird dem Umzugsunternehmer angezeigt, bevor er die Anfrage annimmt.',
          'Bei Kartenzahlung wird die Gebühr abgezogen, bevor der Betrag an den Umzugsunternehmer ausgezahlt wird. Bei Barzahlung schuldet der Umzugsunternehmer uns die Gebühr und muss sie innerhalb von 24 Stunden nach dem Umzug bezahlen. Solange eine Gebühr überfällig ist, erhält der Umzugsunternehmer keine neuen Anfragen.',
        ],
      },
      {
        id: 'cancellation',
        heading: '8. Änderungen und Stornierung',
        paragraphs: [
          'Ein Kunde kann eine Anfrage in der App stornieren, solange der Umzug nicht begonnen hat. Ein Umzugsunternehmer kann einen angenommenen Umzug zurückgeben. Die Anfrage kann dann anderen Umzugsunternehmern angeboten werden.',
          'Wir erheben für die Stornierung keine Gebühr. Ansprüche, die Kunde und Umzugsunternehmer wegen einer späten Stornierung gegeneinander haben können, richten sich nach ihrem Vertrag und nach dem Gesetz.',
          'Gesetzliche Widerrufsrechte für Verbraucher bleiben unberührt.',
        ],
      },
      {
        id: 'performance',
        heading: '9. Durchführung des Umzugs, Schäden und Reklamationen',
        paragraphs: [
          'Der Umzugsunternehmer führt den Umzug in eigener Verantwortung durch. Ansprüche aus dem Umzug, insbesondere wegen Beschädigung oder Verlust von Gut, wegen Verspätung oder wegen eines nicht durchgeführten Umzugs, sind Ansprüche gegen den Umzugsunternehmer aus dem Vertrag und nach dem Transportrecht.',
          'Bitte halten Sie Schäden sofort mit Fotos fest und melden Sie sie dem Umzugsunternehmer im Chat. Wir unterstützen die Kommunikation zwischen beiden Seiten und können die Angaben weitergeben, die zur Durchsetzung eines Anspruchs erforderlich sind. Wir entscheiden jedoch keine Streitigkeiten und leisten keinen Schadensersatz anstelle eines Umzugsunternehmers.',
        ],
      },
      {
        id: 'conduct',
        heading: '10. Nutzungsregeln',
        bullets: [
          'Machen Sie vollständige und ehrliche Angaben zum Umzug und zu Ihrer Person.',
          'Buchen Sie keinen Transport von Gefahrgut, von Gegenständen, die nicht rechtmäßig transportiert werden dürfen, oder von Abfällen zur Entsorgung.',
          'Gehen Sie respektvoll miteinander um. Drohungen, Diskriminierung und Belästigung führen zum Ausschluss.',
          'Bewertungen müssen Ihre eigene Erfahrung mit einem tatsächlich durchgeführten Umzug wiedergeben.',
          'Greifen Sie nicht in die Plattform ein, lesen Sie ihre Daten nicht automatisiert aus und nutzen Sie nicht das Konto einer anderen Person.',
        ],
      },
      {
        id: 'ranking',
        heading: '11. Wie Umzugsunternehmer den Kunden angezeigt werden',
        paragraphs: [
          'Sucht ein Kunde einen Umzugsunternehmer, berücksichtigt die Plattform Umzugsunternehmer, die verifiziert und online sind, gerade keinen anderen Auftrag ausführen und deren Fahrzeug für die Ladung geeignet ist. Unter diesen ist das wichtigste Kriterium die Entfernung zur Abholadresse: Der nächstgelegene Umzugsunternehmer wird zuerst angezeigt.',
          'Umzugsunternehmer können sich keine bessere Platzierung erkaufen.',
        ],
      },
      {
        id: 'liability',
        heading: '12. Unsere Haftung',
        paragraphs: [
          'Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei Verletzung des Lebens, des Körpers oder der Gesundheit sowie in den Fällen, in denen das Gesetz eine Haftung vorschreibt, die nicht ausgeschlossen werden kann.',
          'Bei leichter Fahrlässigkeit haften wir nur für die Verletzung einer Pflicht, die für den Vertrag mit uns wesentlich ist, und dann nur für den vorhersehbaren, vertragstypischen Schaden.',
          'Für die Durchführung des Umzugs und für das Verhalten von Kunden und Umzugsunternehmern untereinander haften wir nicht, weil wir nicht Partei ihres Vertrags sind. Wir sichern nicht zu, dass die Plattform ohne Unterbrechung verfügbar ist.',
        ],
      },
      {
        id: 'termination',
        heading: '13. Beendigung der Nutzung, Sperrung',
        paragraphs: [
          'Sie können Ihr Konto jederzeit in der App oder auf der Website löschen. Das ist möglich, sobald kein Umzug läuft oder gebucht ist und, bei Umzugsunternehmern, keine Plattformgebühr offen ist und keine Auszahlung aussteht.',
          'Wir können ein Konto einschränken oder sperren, wenn ein wichtiger Grund vorliegt, insbesondere falsche Angaben oder Unterlagen, ein Verstoß gegen diese Bedingungen, eine unbezahlte Plattformgebühr oder eine Gefahr für andere Nutzer. Wir teilen dem Nutzer die Gründe mit. Umzugsunternehmer können über die Kontaktdaten im Impressum Beschwerde einlegen. Wir prüfen jede Beschwerde und beantworten sie.',
          'Wir können den Vertrag mit einem Umzugsunternehmer mit einer Frist von 30 Tagen kündigen. Das Recht zur fristlosen Kündigung aus wichtigem Grund bleibt unberührt.',
        ],
      },
      {
        id: 'changes',
        heading: '14. Änderungen dieser Bedingungen',
        paragraphs: [
          'Wir können diese Bedingungen mit Wirkung für die Zukunft ändern, wenn ein sachlicher Grund vorliegt, etwa eine Änderung der Rechtslage oder der Plattform. Wir kündigen Änderungen mindestens 30 Tage vor ihrem Inkrafttreten per E-Mail oder in der App an. Wenn Sie nicht einverstanden sind, können Sie Ihr Konto vor diesem Zeitpunkt löschen.',
        ],
      },
      {
        id: 'law',
        heading: '15. Anwendbares Recht und Streitbeilegung',
        paragraphs: [
          'Es gilt deutsches Recht. Verbrauchern bleibt zusätzlich der Schutz der zwingenden Vorschriften des Staates erhalten, in dem sie ihren gewöhnlichen Aufenthalt haben.',
          'Wir sind weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
          'Sollte eine Bestimmung dieser Bedingungen unwirksam sein, bleiben die übrigen Bestimmungen wirksam.',
        ],
      },
    ],
  },

  // ── Privacy ──────────────────────────────────────────────────────────────
  privacy: {
    title: 'Datenschutzerklärung',
    intro: [
      'Diese Erklärung erläutert, welche personenbezogenen Daten verarbeitet werden, wenn Sie die Website von PickLte sowie die Apps PickLte und PickLte Mover nutzen, zu welchem Zweck dies geschieht und welche Rechte Sie haben.',
    ],
    sections: [
      {
        id: 'controller',
        heading: '1. Wer verantwortlich ist',
        paragraphs: [
          'Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist das im Impressum genannte Unternehmen. Sie erreichen uns in allen Fragen des Datenschutzes über die dort angegebenen Kontaktdaten.',
        ],
      },
      {
        id: 'data',
        heading: '2. Welche Daten wir verarbeiten',
        bullets: [
          'Konto: Name, E-Mail-Adresse, Telefonnummer, Profilfoto, Sprache und die Angabe, ob Sie Kunde oder Umzugsunternehmer sind. Wenn Sie sich mit Google anmelden, erhalten wir von Google Ihren Namen, Ihre E-Mail-Adresse und Ihr Profilbild.',
          'Umzüge: Abhol- und Zieladresse, Datum und Uhrzeit, die Liste der Gegenstände, Angaben zu Zugang und Stockwerken, Hinweise, Fotos der Gegenstände, bei einem gewerblichen Umzug der Firmenname, der Preis und der Status des Umzugs.',
          'Bei Umzugsunternehmern zusätzlich: ein Foto von Ihnen, ein Foto Ihres Führerscheins, Ihre Anschrift und Ihre steuerlichen Angaben, Ihre Fahrzeuge mit Kennzeichen, zulässigem Gesamtgewicht und Fotos, Mietzeiträume, die Personen in Ihrem Team, Ihre Einnahmen und die Plattformgebühren.',
          'Standort: siehe Abschnitt 4.',
          'Kommunikation: die Chatnachrichten zwischen Kunde und Umzugsunternehmer zu einem Umzug und bei Anrufen in der App, wer wen wann und wie lange angerufen hat. Anrufe werden nicht aufgezeichnet.',
          'Zahlung: Betrag, Zeitpunkt, Zahlungsart und Status einer Zahlung. Kartendaten gehen unmittelbar an den Zahlungsdienstleister und werden von uns nicht gespeichert.',
          'Gerät und Nutzung: das Push-Benachrichtigungs-Token Ihres Geräts, die App-Version, das Betriebssystem sowie technische Protokolle mit der IP-Adresse und dem Zeitpunkt einer Anfrage.',
          'Bewertungen, die Sie abgeben oder erhalten.',
        ],
      },
      {
        id: 'purposes',
        heading: '3. Warum wir sie verarbeiten und auf welcher Rechtsgrundlage',
        bullets: [
          'Um Ihr Konto zu führen und Umzüge zwischen Kunden und Umzugsunternehmern zu vermitteln und abzuwickeln: Vertragserfüllung, Art. 6 Abs. 1 lit. b DSGVO.',
          'Um die Unterlagen von Umzugsunternehmern vor ihrer Zulassung zu prüfen, Missbrauch und Betrug zu verhindern, die Plattform sicher zu halten und Fehler zu finden und zu beheben: unser berechtigtes Interesse an einer sicheren und funktionierenden Plattform, Art. 6 Abs. 1 lit. f DSGVO.',
          'Um Pflichten aus dem Steuer- und Handelsrecht zu erfüllen, einschließlich der Meldung der Einkünfte von Umzugsunternehmern an die Finanzbehörde nach dem Plattformen-Steuertransparenzgesetz (PStTG, DAC7): rechtliche Verpflichtung, Art. 6 Abs. 1 lit. c DSGVO.',
          'Um den Standort, die Kamera, die Fotomediathek und die Benachrichtigungen Ihres Geräts zu nutzen: Ihre Einwilligung, Art. 6 Abs. 1 lit. a DSGVO, die Sie in den Einstellungen Ihres Geräts erteilen oder widerrufen.',
        ],
      },
      {
        id: 'location',
        heading: '4. Standort',
        paragraphs: [
          'Der Standort eines Umzugsunternehmers wird nur erfasst, solange der Umzugsunternehmer online ist oder einen Auftrag ausführt. Ein Kunde sieht den Standort eines Umzugsunternehmers nur für seinen eigenen Umzug und nur, während dieser Umzug läuft. Davor sehen Kunden, die einen Umzugsunternehmer suchen, nur ungefähre Standorte.',
          'Geht ein Umzugsunternehmer offline und führt er keinen Auftrag aus, wird der gespeicherte Standort gelöscht. Ein Verlauf der gefahrenen Strecken wird nicht gespeichert.',
          'Kunden können der App erlauben, ihren Standort zu verwenden, um die Abholadresse auszufüllen. Das ist freiwillig.',
        ],
      },
      {
        id: 'photos',
        heading: '5. Fotos und Unterlagen',
        paragraphs: [
          'Fotos zu einem Umzug können nur der Kunde, der Umzugsunternehmer, der den Umzug angenommen hat, und die Umzugsunternehmer ansehen, denen die offene Anfrage angezeigt wird. Sie werden über Links bereitgestellt, die nach kurzer Zeit ablaufen.',
          'Führerscheine und andere Unterlagen von Umzugsunternehmern können nur der Umzugsunternehmer selbst und die Mitarbeiter ansehen, die sie prüfen.',
        ],
      },
      {
        id: 'recipients',
        heading: '6. Wer Daten erhält',
        paragraphs: [
          'Die jeweils andere Partei eines Umzugs erhält, was zu seiner Durchführung erforderlich ist. Der Kunde sieht Name, Foto, Fahrzeug und Bewertungen des Umzugsunternehmers und während des Umzugs dessen Standort. Der Umzugsunternehmer sieht den Namen des Kunden, die Adressen, die Gegenstände und die Fotos. Telefonnummern werden nur weitergegeben, soweit dies für einen angenommenen Umzug erforderlich ist. Anrufe sind in der App möglich, ohne eine Nummer offenzulegen.',
          'Wir setzen Dienstleister ein, die Daten in unserem Auftrag und auf vertraglicher Grundlage verarbeiten:',
        ],
        bullets: [
          'Appwrite: Datenbank, Dateispeicher, Anmeldung und Zustellung von Benachrichtigungen, gehostet in Frankfurt, Deutschland.',
          'Vercel: Hosting der Website.',
          'Stripe: Zahlungsabwicklung und Auszahlungen. Für einen Teil dieser Verarbeitung ist Stripe selbst Verantwortlicher.',
          'Mapbox: Karten, Adresssuche und Routenberechnung.',
          'Google: Anmeldung mit Google und Zustellung von Push-Benachrichtigungen (Firebase Cloud Messaging).',
          'LiveKit: Übertragung von Anrufen in der App.',
          'Sentry: Fehlerberichte, gespeichert in der EU. Personenbezogene Angaben werden vor dem Versand entfernt.',
        ],
        after: [
          'Wir geben Daten an Behörden weiter, soweit das Gesetz dies verlangt, insbesondere Daten über die Einkünfte von Umzugsunternehmern an das Bundeszentralamt für Steuern.',
          'Einige dieser Anbieter haben ihren Sitz in den Vereinigten Staaten oder können Daten dort verarbeiten. In diesem Fall beruht die Übermittlung auf dem EU-US Data Privacy Framework oder auf den Standardvertragsklauseln der Europäischen Kommission.',
          'Wir verkaufen keine personenbezogenen Daten und nutzen sie nicht für Werbung Dritter.',
        ],
      },
      {
        id: 'cookies',
        heading: '7. Cookies und lokaler Speicher auf der Website',
        bullets: [
          'Ein Sitzungs-Cookie hält Sie angemeldet.',
          'Ein Sprach-Cookie merkt sich die von Ihnen gewählte Sprache.',
          'Der lokale Speicher des Browsers bewahrt eine begonnene Buchung auf, damit sie beim Neuladen der Seite nicht verloren geht.',
        ],
        after: [
          'Diese sind für den Betrieb der Website erforderlich. Die Website verwendet keine Werbe-Cookies und keine Analysedienste, die Besucher über mehrere Websites hinweg verfolgen. Die Fehlerüberwachung durch Sentry erfasst technische Fehler.',
        ],
      },
      {
        id: 'retention',
        heading: '8. Wie lange wir Daten speichern',
        bullets: [
          'Kontodaten: solange das Konto besteht.',
          'Nach der Löschung Ihres Kontos: Ihr Profil, Ihre Fotos, Unterlagen, Adressen, Nachrichten und Gerätedaten werden gelöscht oder anonymisiert. Abgeschlossene Umzüge bleiben als anonyme Datensätze ohne Ihren Namen erhalten.',
          'Daten, zu deren Aufbewahrung uns das Steuer- und Handelsrecht verpflichtet, etwa Rechnungen, Zahlungsbelege sowie die Identitäts- und Steuerangaben von Umzugsunternehmern: bis zu zehn Jahre, getrennt gespeichert und mit eingeschränktem Zugriff, danach gelöscht.',
          'Technische Protokolle: für kurze Zeit, soweit für Sicherheit und Fehlerbehebung erforderlich.',
        ],
      },
      {
        id: 'rights',
        heading: '9. Ihre Rechte',
        paragraphs: ['Nach der DSGVO haben Sie das Recht,'],
        bullets: [
          'Auskunft über Ihre Daten und eine Kopie davon zu erhalten,',
          'unrichtige Daten berichtigen zu lassen,',
          'Daten löschen oder ihre Verarbeitung einschränken zu lassen,',
          'Daten, die Sie bereitgestellt haben, in einem übertragbaren Format zu erhalten,',
          'einer Verarbeitung zu widersprechen, die auf unseren berechtigten Interessen beruht,',
          'eine Einwilligung jederzeit mit Wirkung für die Zukunft zu widerrufen.',
        ],
        after: [
          'Um ein Recht auszuüben, schreiben Sie an die Kontaktdaten im Impressum. Sie haben außerdem das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren, insbesondere bei der für Ihren Wohnort zuständigen.',
        ],
      },
      {
        id: 'deletion',
        heading: '10. Löschung Ihres Kontos',
        paragraphs: [
          'Sie können Ihr Konto selbst löschen: in den Apps unter „Profil“, auf der Website in Ihren Kontoeinstellungen. Aus Sicherheitsgründen werden Sie gebeten, sich kurz zuvor erneut anzumelden. Die Löschung ist möglich, sobald kein Umzug läuft oder gebucht ist und, bei Umzugsunternehmern, keine Plattformgebühr offen ist und keine Auszahlung aussteht.',
        ],
      },
      {
        id: 'security',
        heading: '11. Sicherheit',
        paragraphs: [
          'Daten werden verschlüsselt übertragen. Der Zugriff auf Daten ist nach Rollen beschränkt: Jeder Nutzer erreicht nur seine eigenen Daten und die Umzüge, an denen er beteiligt ist. Der Zugriff durch Mitarbeiter ist auf das beschränkt, was die jeweilige Aufgabe erfordert, und wird protokolliert.',
        ],
      },
      {
        id: 'automated',
        heading: '12. Automatisierte Verarbeitung',
        paragraphs: [
          'Der Preis eines Umzugs und die Auswahl der Umzugsunternehmer, die für eine Anfrage angezeigt werden, werden automatisch aus den Angaben zum Umzug berechnet. Es wird keine Entscheidung, die Ihnen gegenüber rechtliche Wirkung entfaltet, ausschließlich automatisiert getroffen. Über die Zulassung eines Umzugsunternehmers entscheidet ein Mensch.',
          'Die Plattform ist nicht für Personen unter 18 Jahren bestimmt.',
        ],
      },
      {
        id: 'changes',
        heading: '13. Änderungen dieser Erklärung',
        paragraphs: [
          'Wir aktualisieren diese Erklärung, wenn sich die Plattform oder die Rechtslage ändert. Die aktuelle Fassung ist stets auf dieser Seite abrufbar.',
        ],
      },
    ],
  },

  // ── Help ─────────────────────────────────────────────────────────────────
  help: {
    title: 'Hilfe',
    intro: [
      'Antworten auf die häufigsten Fragen zur Buchung eines Umzugs und zur Tätigkeit als Umzugsunternehmer auf PickLte.',
    ],
    groups: [
      {
        id: 'about',
        heading: 'Über PickLte',
        topics: [
          {
            id: 'what',
            question: 'Was ist PickLte?',
            answer: [
              'PickLte ist eine Plattform, die Menschen, die einen Umzug benötigen, mit selbstständigen Umzugsunternehmern zusammenbringt. Sie beschreiben den Umzug, sehen den Preis, und ein Umzugsunternehmer nimmt ihn an.',
            ],
          },
          {
            id: 'who',
            question: 'Wer führt meinen Umzug durch?',
            answer: [
              'Ein selbstständiger Umzugsunternehmer, nicht PickLte. Ihren Vertrag über den Umzug schließen Sie mit dem Umzugsunternehmer, der Ihre Anfrage annimmt. PickLte vermittelt den Kontakt und stellt Buchung, Live-Verfolgung und Zahlung bereit.',
            ],
          },
          {
            id: 'where',
            question: 'Wo ist PickLte verfügbar?',
            answer: [
              'In Deutschland, für Umzüge, die in Deutschland beginnen und enden. Die Umzugsunternehmer fahren Transporter und kleine Lkw bis 3,5 Tonnen.',
            ],
          },
        ],
      },
      {
        id: 'booking',
        heading: 'Buchung',
        topics: [
          {
            id: 'types',
            question: 'Was ist der Unterschied zwischen einem Sofortumzug und einem geplanten Umzug?',
            answer: [
              'Ein Sofortumzug findet gleich statt: Die Anfrage geht an einen verfügbaren Umzugsunternehmer in der Nähe der Abholadresse. Ein geplanter Umzug findet an einem Datum und zu einer Uhrzeit statt, die Sie wählen. Umzugsunternehmer sehen die Anfrage, und einer von ihnen nimmt sie an.',
            ],
          },
          {
            id: 'price',
            question: 'Wie wird der Preis berechnet?',
            answer: [
              'Aus Ihren Angaben: Entfernung, benötigte Fahrzeuggröße, Volumen und Gewicht Ihrer Gegenstände, Anzahl der Helfer, Stockwerke und Aufzug sowie Verpackung. Sie sehen den Gesamtpreis einschließlich Umsatzsteuer, bevor Sie die Anfrage absenden.',
            ],
          },
          {
            id: 'items',
            question: 'Was kann ich transportieren lassen?',
            answer: [
              'Hausrat, Möbel, Kartons und sonstige Gegenstände. Nicht möglich sind Gefahrgut, Gegenstände, die nicht rechtmäßig transportiert werden dürfen, und Abfälle zur Entsorgung.',
            ],
          },
          {
            id: 'extras',
            question: 'Kann ich Verpackung oder zusätzliche Helfer buchen?',
            answer: [
              'Ja. Bei einem geplanten Umzug können Sie eine Verpackungsstufe wählen und Helfer hinzufügen. Andere Arbeiten wie Möbelmontage, Montagearbeiten, der Anschluss von Geräten, Reinigung oder Einlagerung können über PickLte nicht gebucht werden.',
            ],
          },
          {
            id: 'photos',
            question: 'Warum sollte ich Fotos hinzufügen?',
            answer: [
              'Fotos helfen dem Umzugsunternehmer, die Ladung einzuschätzen und das passende Fahrzeug mitzubringen. Nur Sie, der Umzugsunternehmer Ihres Umzugs und Umzugsunternehmer, denen Ihre offene Anfrage angezeigt wird, können sie sehen.',
            ],
          },
        ],
      },
      {
        id: 'payment',
        heading: 'Zahlung',
        topics: [
          {
            id: 'how',
            question: 'Wie und wann bezahle ich?',
            answer: [
              'Nach Abschluss des Umzugs, per Karte in der App oder in bar an den Umzugsunternehmer. Die Zahlungsart wählen Sie bei der Buchung.',
            ],
          },
          {
            id: 'fees',
            question: 'Gibt es zusätzliche Gebühren?',
            answer: [
              'Nein. Der vor der Buchung angezeigte Preis enthält bereits die Umsatzsteuer und die Plattformgebühr. Die Stornierung über die App kostet nichts.',
            ],
          },
        ],
      },
      {
        id: 'during',
        heading: 'Während des Umzugs',
        topics: [
          {
            id: 'track',
            question: 'Kann ich sehen, wo der Umzugsunternehmer ist?',
            answer: [
              'Ja. Sobald der Umzugsunternehmer auf dem Weg zu Ihnen ist, können Sie ihn auf der Karte verfolgen, bis der Umzug abgeschlossen ist.',
            ],
          },
          {
            id: 'contact',
            question: 'Wie erreiche ich den Umzugsunternehmer?',
            answer: [
              'Über den Chat oder einen Anruf in der App auf der Seite Ihres Umzugs. Sie müssen keine Telefonnummern austauschen.',
            ],
          },
          {
            id: 'cancel',
            question: 'Wie storniere ich?',
            answer: [
              'Öffnen Sie den Umzug und wählen Sie „Stornieren“. Das ist möglich, bis der Umzug begonnen hat. Bitte stornieren Sie so früh wie möglich, aus Fairness gegenüber dem Umzugsunternehmer.',
            ],
          },
          {
            id: 'damage',
            question: 'Etwas wurde beschädigt. Was soll ich tun?',
            answer: [
              'Machen Sie sofort Fotos und informieren Sie den Umzugsunternehmer im Chat. Der Umzugsunternehmer ist für den Transport verantwortlich, Ihr Anspruch richtet sich daher gegen ihn. Wenn Sie sich nicht einigen können, schreiben Sie uns über die Kontaktdaten im Impressum, und wir unterstützen die Kommunikation.',
            ],
          },
        ],
      },
      {
        id: 'account',
        heading: 'Konto',
        topics: [
          {
            id: 'password',
            question: 'Ich habe mein Passwort vergessen.',
            answer: [
              'Wählen Sie auf der Anmeldeseite „Passwort vergessen“. Sie erhalten per E-Mail einen Code, mit dem Sie ein neues Passwort festlegen.',
            ],
          },
          {
            id: 'language',
            question: 'Wie ändere ich die Sprache?',
            answer: [
              'Auf der Website über das Sprachmenü oben auf der Seite, in den Apps unter „Profil“. Es stehen acht Sprachen zur Verfügung.',
            ],
          },
          {
            id: 'delete',
            question: 'Wie lösche ich mein Konto?',
            answer: [
              'In den Apps unter „Profil“, auf der Website in Ihren Kontoeinstellungen. Sie werden zuvor gebeten, sich erneut anzumelden. Die Löschung ist möglich, wenn bei Ihnen kein Umzug läuft oder gebucht ist. Ihre personenbezogenen Daten werden dann gelöscht oder anonymisiert. Einzelheiten stehen in der Datenschutzerklärung.',
            ],
          },
        ],
      },
      {
        id: 'movers',
        heading: 'Für Umzugsunternehmer',
        topics: [
          {
            id: 'register',
            question: 'Wie werde ich Umzugsunternehmer auf PickLte?',
            answer: [
              'Registrieren Sie sich in der App PickLte Mover oder auf der Website, vervollständigen Sie Ihr Profil und fügen Sie Ihr Fahrzeug hinzu. Sie benötigen ein Foto von sich, Ihren Führerschein, Ihre steuerlichen Angaben und die Zulassungsdaten Ihres Fahrzeugs. Sobald Ihre Angaben geprüft sind, können Sie online gehen.',
            ],
          },
          {
            id: 'independent',
            question: 'Bin ich bei PickLte angestellt?',
            answer: [
              'Nein. Sie sind als selbstständiger Unternehmer tätig. Sie entscheiden, wann Sie online sind und welche Anfragen Sie annehmen, und Sie sind für Ihre Gewerbeanmeldung, Ihre Steuern und Ihre Versicherung selbst verantwortlich.',
            ],
          },
          {
            id: 'vehicle',
            question: 'Welche Fahrzeuge sind zugelassen?',
            answer: [
              'Fahrzeuge bis 3,5 Tonnen zulässigem Gesamtgewicht, einschließlich Anhänger. Eigene und gemietete Fahrzeuge sind möglich. Bei einem gemieteten Fahrzeug geben Sie den Mietzeitraum an.',
            ],
          },
          {
            id: 'location',
            question: 'Wann wird mein Standort geteilt?',
            answer: [
              'Nur solange Sie online sind oder einen Auftrag ausführen. Der Kunde eines Umzugs sieht Ihren Standort während dieses Umzugs. Wenn Sie offline gehen und keinen Auftrag haben, wird Ihr Standort gelöscht.',
            ],
          },
          {
            id: 'earnings',
            question: 'Was verdiene ich, und was ist die Plattformgebühr?',
            answer: [
              'Jede Anfrage zeigt Ihnen vor der Annahme, was Sie nach Umsatzsteuer und Plattformgebühr verdienen. Bei Kartenzahlung wird die Gebühr von Ihrer Auszahlung abgezogen. Bei Barzahlung nehmen Sie den vollen Betrag ein und zahlen die Gebühr innerhalb von 24 Stunden an PickLte. Bis sie bezahlt ist, erhalten Sie keine neuen Anfragen.',
            ],
          },
          {
            id: 'tax',
            question: 'Meldet PickLte meine Einkünfte?',
            answer: [
              'Ja, soweit das Gesetz dies verlangt. Plattformbetreiber müssen die Einkünfte von Anbietern an die Finanzbehörde melden (DAC7). Ihre Steuerbescheinigungen können Sie in der App herunterladen.',
            ],
          },
        ],
      },
    ],
  },

  // ── Imprint ──────────────────────────────────────────────────────────────
  imprint: {
    title: 'Impressum',
    intro: ['Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG).'],
    labels: {
      provider: 'Anbieter',
      address: 'Anschrift',
      representedBy: 'Vertreten durch',
      contact: 'Kontakt',
      email: 'E-Mail',
      phone: 'Telefon',
      register: 'Handelsregister',
      vatId: 'Umsatzsteuer-Identifikationsnummer',
      responsibleForContent: 'Inhaltlich verantwortlich',
    },
    sections: [
      {
        id: 'role',
        heading: 'Rolle der Plattform',
        paragraphs: [
          'PickLte ist eine Vermittlungsplattform. Umzüge werden von selbstständigen Umzugsunternehmern im eigenen Namen und in eigener Verantwortung durchgeführt. Der hier genannte Anbieter ist weder Frachtführer noch Partei des Vertrags über einen Umzug.',
        ],
      },
      {
        id: 'disputes',
        heading: 'Verbraucherstreitbeilegung',
        paragraphs: [
          'Wir sind weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
        ],
      },
      {
        id: 'content',
        heading: 'Haftung für Inhalte',
        paragraphs: [
          'Für eigene Inhalte auf diesen Seiten sind wir nach den allgemeinen Gesetzen verantwortlich. Wir sind nicht verpflichtet, von Nutzern übermittelte oder gespeicherte Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Sobald wir von einer konkreten Rechtsverletzung Kenntnis erlangen, entfernen wir den Inhalt unverzüglich.',
        ],
      },
      {
        id: 'links',
        heading: 'Haftung für Links',
        paragraphs: [
          'Diese Seiten können Links zu Websites Dritter enthalten. Für die Inhalte dieser Websites sind allein deren Betreiber verantwortlich. Erlangen wir Kenntnis von einer Rechtsverletzung, entfernen wir den Link.',
        ],
      },
      {
        id: 'copyright',
        heading: 'Urheberrecht',
        paragraphs: [
          'Die Inhalte und Werke auf diesen Seiten sind urheberrechtlich geschützt. Ihre Vervielfältigung, Bearbeitung oder Verbreitung über die Grenzen des Urheberrechts hinaus bedarf unserer schriftlichen Zustimmung.',
        ],
      },
    ],
  },
}

export default content
