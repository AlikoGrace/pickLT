import type { LegalContent } from '../types'

const content: LegalContent = {
  updatedLabel: 'Ostatnia aktualizacja: {{date}}',
  languageNotice:
    'Niniejszy tekst jest tłumaczeniem udostępnionym dla Państwa wygody. W razie rozbieżności między wersjami językowymi obowiązuje wersja niemiecka.',
  contentsLabel: 'Spis treści',
  nav: {
    terms: 'Regulamin',
    privacy: 'Polityka prywatności',
    help: 'Pomoc',
    imprint: 'Dane dostawcy',
  },

  // ── Terms ────────────────────────────────────────────────────────────────
  terms: {
    title: 'Regulamin',
    intro: [
      'Niniejszy regulamin określa zasady korzystania ze strony internetowej PickLte oraz z aplikacji PickLte i PickLte Mover. Dotyczy klientów, którzy szukają przewoźnika, oraz przewoźników, którzy oferują swoje usługi transportowe za pośrednictwem platformy.',
      'Platformę prowadzi przedsiębiorstwo wskazane w danych dostawcy („PickLte”, „my”).',
    ],
    sections: [
      {
        id: 'role',
        heading: '1. Czym jest PickLte, a czym nie jest',
        paragraphs: [
          'PickLte to platforma internetowa, która kontaktuje klientów z niezależnymi przewoźnikami. Zapewniamy technologię: proces rezerwacji, wyliczenie ceny, wiadomości, śledzenie na żywo i obsługę płatności.',
          'Nie wykonujemy przeprowadzek. Nie jesteśmy przewoźnikiem ani firmą przeprowadzkową, nie posiadamy pojazdów, a przewoźnicy nie są naszymi pracownikami ani przedstawicielami.',
          'Umowa o przeprowadzkę jest zawierana bezpośrednio między klientem a przewoźnikiem, który przyjmuje zlecenie. Wyłącznie przewoźnik jest zobowiązany do wykonania transportu i ponosi za niego odpowiedzialność. Nasza własna usługa ogranicza się do skontaktowania stron i prowadzenia platformy.',
        ],
      },
      {
        id: 'scope',
        heading: '2. Co można zarezerwować',
        bullets: [
          'Przeprowadzki na terenie Niemiec. Miejsce odbioru i miejsce dostawy muszą znajdować się w Niemczech.',
          'Transport pojazdami o dopuszczalnej masie całkowitej do 3,5 tony, łącznie z przyczepą.',
          'Załadunek, transport i rozładunek mienia domowego, mebli i innych rzeczy, z pakowaniem przez przewoźnika, jeżeli klient je wybierze.',
        ],
        after: [
          'Wywóz odpadów, montaż mebli, prace montażowe, podłączanie urządzeń, sprzątanie i magazynowanie nie są oferowane za pośrednictwem platformy.',
        ],
      },
      {
        id: 'account',
        heading: '3. Państwa konto',
        bullets: [
          'Do zarezerwowania lub przyjęcia przeprowadzki potrzebne jest konto. Trzeba mieć ukończone 18 lat.',
          'Każde konto jest kontem klienta albo kontem przewoźnika. Jednego konta nie można używać w obu rolach.',
          'Podane dane muszą być prawdziwe i aktualizowane. Weryfikujemy Państwa adres e-mail oraz, gdy jest to wymagane, numer telefonu.',
          'Prosimy zachować dane logowania w tajemnicy. Odpowiadają Państwo za to, co dzieje się za pośrednictwem Państwa konta, chyba że nie ponoszą Państwo winy.',
        ],
      },
      {
        id: 'movers',
        heading: '4. Przewoźnicy',
        paragraphs: [
          'Przewoźnicy korzystają z platformy jako niezależni przedsiębiorcy, we własnym imieniu i na własny rachunek. Swobodnie decydują, kiedy są dostępni i które zlecenia przyjmują. Mogą pracować dla innych zleceniodawców i za pośrednictwem innych platform.',
          'Zanim przewoźnik będzie mógł otrzymywać zlecenia, sprawdzamy dane podane przy rejestracji: zdjęcie osoby, prawo jazdy, dane podatkowe oraz pojazd wraz z jego dopuszczalną masą całkowitą. W przypadku pojazdu wynajętego prosimy o podanie okresu najmu.',
          'Każdy przewoźnik odpowiada za:',
        ],
        bullets: [
          'rejestrację swojej działalności gospodarczej i wszelkie zezwolenia wymagane w jego pracy,',
          'swoje podatki i składki na ubezpieczenia społeczne,',
          'ubezpieczenie swojego pojazdu i swojej pracy,',
          'sprawność techniczną pojazdu oraz przestrzeganie prawa drogowego i przewozowego, w tym limitu 3,5 tony,',
          'osoby, które pomagają mu przy przeprowadzce.',
        ],
        after: [
          'Nasza weryfikacja polega na sprawdzeniu wiarygodności przedłożonych dokumentów. Nie stanowi gwarancji jakości przewoźnika ani konkretnej przeprowadzki.',
        ],
      },
      {
        id: 'booking',
        heading: '5. Jak dochodzi do rezerwacji',
        paragraphs: [
          'Klient opisuje przeprowadzkę: adresy, termin, przedmioty, dostęp pod oboma adresami, pomocników i pakowanie, a tam, gdzie to przydatne, dodaje zdjęcia. Rezerwacji można dokonać na dwa sposoby.',
        ],
        bullets: [
          'Przeprowadzka natychmiastowa: zlecenie trafia do przewoźnika w pobliżu, który jest teraz dostępny. Przewoźnik ma ograniczony czas na jego przyjęcie. Jeżeli tego nie zrobi, zlecenie może zostać zaproponowane innym przewoźnikom.',
          'Przeprowadzka zaplanowana: zlecenie na późniejszy termin jest udostępniane przewoźnikom, a jeden z nich je przyjmuje.',
        ],
        after: [
          'Zlecenie jest ofertą klienta zawarcia umowy o przeprowadzkę po wyświetlonej cenie. Umowa między klientem a przewoźnikiem zostaje zawarta w chwili, gdy przewoźnik przyjmie zlecenie w aplikacji. Obie strony są o tym informowane w aplikacji.',
          'Nie przysługuje roszczenie o znalezienie przewoźnika dla zlecenia.',
        ],
      },
      {
        id: 'price',
        heading: '6. Cena',
        paragraphs: [
          'Zanim klient wyśle zlecenie, platforma pokazuje cenę przeprowadzki. Jest ona wyliczana na podstawie danych podanych przez klienta: odległości, wielkości pojazdu, objętości i wagi przedmiotów, liczby pomocników, pięter i dostępu, pakowania oraz tego, czy przeprowadzka jest natychmiastowa, czy zaplanowana. Cena zawiera ustawowy podatek VAT, jeżeli ma on zastosowanie, oraz opłatę platformy.',
          'Cena opiera się na informacjach klienta. Jeżeli przedmioty lub warunki na miejscu istotnie odbiegają od tego, co zostało podane, przewoźnik może odmówić wykonania przeprowadzki w zarezerwowanym kształcie.',
        ],
      },
      {
        id: 'payment',
        heading: '7. Płatność i opłata platformy',
        bullets: [
          'Klient płaci przewoźnikowi po zakończeniu przeprowadzki, kartą w aplikacji albo gotówką do rąk przewoźnika.',
          'Płatności kartą obsługuje nasz dostawca usług płatniczych Stripe. Nie przechowujemy numerów kart.',
          'Za pośredniczenie w przeprowadzce otrzymujemy od przewoźnika opłatę platformy. Stanowi ona część ceny i jest pokazywana przewoźnikowi, zanim przyjmie zlecenie.',
          'Przy płatności kartą opłata jest potrącana przed wypłatą kwoty przewoźnikowi. Przy płatności gotówką przewoźnik jest nam winien opłatę i musi ją uiścić w ciągu 24 godzin po przeprowadzce. Dopóki opłata jest zaległa, przewoźnik nie otrzymuje nowych zleceń.',
        ],
      },
      {
        id: 'cancellation',
        heading: '8. Zmiany i anulowanie',
        paragraphs: [
          'Klient może anulować zlecenie w aplikacji, dopóki przeprowadzka się nie rozpoczęła. Przewoźnik może zwrócić przeprowadzkę, którą przyjął; zlecenie może wtedy zostać zaproponowane innym przewoźnikom.',
          'Nie pobieramy opłaty za anulowanie. Roszczenia, które klient i przewoźnik mogą mieć wobec siebie z powodu późnego anulowania, podlegają ich umowie i przepisom prawa.',
          'Ustawowe prawa konsumentów do odstąpienia od umowy pozostają nienaruszone.',
        ],
      },
      {
        id: 'performance',
        heading: '9. Wykonanie przeprowadzki, szkody i reklamacje',
        paragraphs: [
          'Przewoźnik wykonuje przeprowadzkę na własną odpowiedzialność. Roszczenia wynikające z przeprowadzki, w szczególności z tytułu uszkodzenia lub utraty rzeczy, opóźnienia lub przeprowadzki, która się nie odbyła, są roszczeniami wobec przewoźnika na podstawie umowy i prawa przewozowego.',
          'Prosimy udokumentować szkodę od razu, ze zdjęciami, i zgłosić ją przewoźnikowi na czacie. Pomagamy w komunikacji między obiema stronami i możemy przekazać dane potrzebne do dochodzenia roszczenia, ale nie rozstrzygamy sporów i nie wypłacamy odszkodowań w imieniu przewoźnika.',
        ],
      },
      {
        id: 'conduct',
        heading: '10. Zasady korzystania',
        bullets: [
          'Prosimy podawać pełne i rzetelne informacje o przeprowadzce i o sobie.',
          'Nie wolno rezerwować transportu towarów niebezpiecznych, przedmiotów, których przewóz jest niezgodny z prawem, ani odpadów przeznaczonych do utylizacji.',
          'Prosimy odnosić się do siebie z szacunkiem. Groźby, dyskryminacja i nękanie prowadzą do wykluczenia.',
          'Opinie muszą odzwierciedlać własne doświadczenie z przeprowadzki, która się odbyła.',
          'Nie wolno zakłócać działania platformy, pobierać jej danych w sposób zautomatyzowany ani korzystać z konta innej osoby.',
        ],
      },
      {
        id: 'ranking',
        heading: '11. Jak przewoźnicy są pokazywani klientom',
        paragraphs: [
          'Gdy klient szuka przewoźnika, platforma bierze pod uwagę przewoźników, którzy są zweryfikowani, online i nie wykonują innego zlecenia, a ich pojazd jest odpowiedni dla ładunku. Wśród nich głównym kryterium jest odległość od adresu odbioru: najbliższy przewoźnik jest pokazywany jako pierwszy.',
          'Przewoźnicy nie mogą zapłacić za lepszą pozycję.',
        ],
      },
      {
        id: 'liability',
        heading: '12. Nasza odpowiedzialność',
        paragraphs: [
          'Odpowiadamy bez ograniczeń za winę umyślną i rażące niedbalstwo, za szkody na życiu, ciele lub zdrowiu oraz tam, gdzie prawo przewiduje odpowiedzialność, której nie można wyłączyć.',
          'W przypadku lekkiego niedbalstwa odpowiadamy tylko za naruszenie obowiązku istotnego dla umowy z nami, i wówczas tylko za przewidywalną szkodę typową dla takiej umowy.',
          'Nie odpowiadamy za wykonanie przeprowadzki ani za zachowanie klientów i przewoźników wobec siebie, ponieważ nie jesteśmy stroną ich umowy. Nie obiecujemy, że platforma będzie dostępna bez przerw.',
        ],
      },
      {
        id: 'termination',
        heading: '13. Zakończenie korzystania, zawieszenie',
        paragraphs: [
          'Mogą Państwo usunąć swoje konto w dowolnym momencie w aplikacji lub na stronie internetowej. Jest to możliwe, gdy żadna przeprowadzka nie jest w toku ani zarezerwowana, a w przypadku przewoźników, gdy nie ma zaległej opłaty platformy ani oczekującej wypłaty.',
          'Możemy ograniczyć lub zawiesić konto, jeżeli istnieje ważny powód, w szczególności nieprawdziwe dane lub dokumenty, naruszenie niniejszego regulaminu, niezapłacona opłata platformy lub zagrożenie dla innych użytkowników. Informujemy użytkownika o powodach. Przewoźnicy mogą wnieść sprzeciw, korzystając z danych kontaktowych w danych dostawcy; rozpatrujemy każdą skargę i udzielamy na nią odpowiedzi.',
          'Możemy rozwiązać umowę z przewoźnikiem z zachowaniem 30-dniowego okresu wypowiedzenia. Prawo do jej rozwiązania bez wypowiedzenia z ważnego powodu pozostaje nienaruszone.',
        ],
      },
      {
        id: 'changes',
        heading: '14. Zmiany regulaminu',
        paragraphs: [
          'Możemy zmienić niniejszy regulamin ze skutkiem na przyszłość, jeżeli istnieje uzasadniony powód, taki jak zmiana prawa lub platformy. Zmiany ogłaszamy e-mailem lub w aplikacji co najmniej 30 dni przed ich wejściem w życie. Jeżeli nie wyrażają Państwo zgody, mogą Państwo usunąć swoje konto przed tą datą.',
        ],
      },
      {
        id: 'law',
        heading: '15. Prawo właściwe i spory',
        paragraphs: [
          'Zastosowanie ma prawo niemieckie. Konsumenci zachowują ponadto ochronę wynikającą z bezwzględnie obowiązujących przepisów państwa, w którym mają miejsce zwykłego pobytu.',
          'Nie jesteśmy zobowiązani ani gotowi do udziału w postępowaniu w sprawie rozstrzygania sporów przed konsumenckim organem polubownym.',
          'Jeżeli któreś z postanowień niniejszego regulaminu okaże się nieważne, pozostałe postanowienia zachowują moc.',
        ],
      },
    ],
  },

  // ── Privacy ──────────────────────────────────────────────────────────────
  privacy: {
    title: 'Polityka prywatności',
    intro: [
      'Niniejsza polityka wyjaśnia, jakie dane osobowe są przetwarzane, gdy korzystają Państwo ze strony internetowej PickLte oraz z aplikacji PickLte i PickLte Mover, w jakim celu, oraz jakie prawa Państwu przysługują.',
    ],
    sections: [
      {
        id: 'controller',
        heading: '1. Kto odpowiada za dane',
        paragraphs: [
          'Administratorem danych w rozumieniu ogólnego rozporządzenia o ochronie danych (RODO) jest przedsiębiorstwo wskazane w danych dostawcy. W każdej sprawie dotyczącej prywatności można się z nami skontaktować, korzystając z podanych tam danych kontaktowych.',
        ],
      },
      {
        id: 'data',
        heading: '2. Jakie dane przetwarzamy',
        bullets: [
          'Konto: imię i nazwisko, adres e-mail, numer telefonu, zdjęcie profilowe, język oraz informacja, czy są Państwo klientem, czy przewoźnikiem. Jeżeli logują się Państwo przez Google, otrzymujemy od Google Państwa imię i nazwisko, adres e-mail i zdjęcie profilowe.',
          'Przeprowadzki: adresy odbioru i dostawy, data i godzina, lista przedmiotów, informacje o dostępie i piętrach, uwagi, zdjęcia przedmiotów, nazwa firmy przy przeprowadzce firmowej, cena i status przeprowadzki.',
          'Dodatkowo w przypadku przewoźników: Państwa zdjęcie, zdjęcie Państwa prawa jazdy, Państwa adres i dane podatkowe, Państwa pojazdy z numerem rejestracyjnym, dopuszczalną masą całkowitą i zdjęciami, okresy najmu, osoby w Państwa ekipie, Państwa zarobki i opłaty platformy.',
          'Lokalizacja: zob. punkt 4.',
          'Komunikacja: wiadomości na czacie między klientem a przewoźnikiem dotyczące przeprowadzki, a w przypadku połączeń w aplikacji to, kto do kogo dzwonił, kiedy i jak długo. Połączenia nie są nagrywane.',
          'Płatność: kwota, czas, metoda i status płatności. Dane karty trafiają bezpośrednio do dostawcy usług płatniczych i nie są przez nas przechowywane.',
          'Urządzenie i korzystanie: token powiadomień push Państwa urządzenia, wersja aplikacji, system operacyjny oraz logi techniczne z adresem IP i czasem żądania.',
          'Opinie, które Państwo wystawiają lub otrzymują.',
        ],
      },
      {
        id: 'purposes',
        heading: '3. Dlaczego je przetwarzamy i na jakiej podstawie prawnej',
        bullets: [
          'Aby prowadzić Państwa konto oraz pośredniczyć w przeprowadzkach między klientami a przewoźnikami i je obsługiwać: wykonanie umowy, art. 6 ust. 1 lit. b RODO.',
          'Aby sprawdzać dokumenty przewoźników przed ich dopuszczeniem, zapobiegać nadużyciom i oszustwom, utrzymywać bezpieczeństwo platformy oraz wykrywać i usuwać błędy: nasz prawnie uzasadniony interes polegający na bezpiecznej i działającej platformie, art. 6 ust. 1 lit. f RODO.',
          'Aby wypełniać obowiązki wynikające z prawa podatkowego i handlowego, w tym zgłaszać dochody przewoźników organowi podatkowemu na podstawie ustawy o przejrzystości podatkowej platform (DAC7): obowiązek prawny, art. 6 ust. 1 lit. c RODO.',
          'Aby korzystać z lokalizacji, aparatu, biblioteki zdjęć i powiadomień Państwa urządzenia: Państwa zgoda, art. 6 ust. 1 lit. a RODO, której udzielają Państwo lub którą wycofują w ustawieniach urządzenia.',
        ],
      },
      {
        id: 'location',
        heading: '4. Lokalizacja',
        paragraphs: [
          'Pozycja przewoźnika jest rejestrowana tylko wtedy, gdy przewoźnik jest online lub wykonuje zlecenie. Klient widzi pozycję przewoźnika tylko w odniesieniu do własnej przeprowadzki, gdy ta przeprowadzka jest w toku. Wcześniej klienci szukający przewoźnika widzą wyłącznie pozycje przybliżone.',
          'Gdy przewoźnik przechodzi w tryb offline i nie wykonuje zlecenia, zapisana pozycja jest usuwana. Historia tras nie jest przechowywana.',
          'Klienci mogą zezwolić aplikacji na korzystanie z ich lokalizacji w celu uzupełnienia adresu odbioru. Jest to opcjonalne.',
        ],
      },
      {
        id: 'photos',
        heading: '5. Zdjęcia i dokumenty',
        paragraphs: [
          'Zdjęcia z przeprowadzki mogą oglądać tylko klient, przewoźnik, który przyjął przeprowadzkę, oraz przewoźnicy, którym pokazywane jest otwarte zlecenie. Są one udostępniane za pomocą linków, które wygasają po krótkim czasie.',
          'Prawa jazdy i inne dokumenty przewoźników mogą oglądać tylko sam przewoźnik oraz pracownicy, którzy je weryfikują.',
        ],
      },
      {
        id: 'recipients',
        heading: '6. Kto otrzymuje dane',
        paragraphs: [
          'Druga strona przeprowadzki otrzymuje to, co jest potrzebne do jej wykonania. Klient widzi imię i nazwisko, zdjęcie, pojazd i opinie przewoźnika, a w trakcie przeprowadzki pozycję przewoźnika. Przewoźnik widzi imię i nazwisko klienta, adresy, przedmioty i zdjęcia. Numery telefonów są przekazywane tylko wtedy, gdy jest to potrzebne do przyjętej przeprowadzki; połączenia można wykonywać w aplikacji bez ujawniania numeru.',
          'Korzystamy z usługodawców, którzy przetwarzają dane w naszym imieniu i na podstawie umowy:',
        ],
        bullets: [
          'Appwrite: baza danych, przechowywanie plików, logowanie i dostarczanie powiadomień, hostowane we Frankfurcie w Niemczech.',
          'Vercel: hosting strony internetowej.',
          'Stripe: obsługa płatności i wypłaty. W odniesieniu do części tego przetwarzania Stripe jest samodzielnym administratorem danych.',
          'Mapbox: mapy, wyszukiwanie adresów i wyznaczanie tras.',
          'Google: logowanie przez Google i dostarczanie powiadomień push (Firebase Cloud Messaging).',
          'LiveKit: transmisja połączeń w aplikacji.',
          'Sentry: raporty o błędach, przechowywane w UE, z których dane osobowe są usuwane przed wysłaniem.',
        ],
        after: [
          'Przekazujemy dane organom, gdy wymaga tego prawo, w szczególności dane o dochodach przewoźników Federalnemu Centralnemu Urzędowi Podatkowemu.',
          'Niektórzy z tych dostawców mają siedzibę w Stanach Zjednoczonych lub mogą tam przetwarzać dane. W takim przypadku przekazanie opiera się na Ramach ochrony danych UE-USA (Data Privacy Framework) albo na standardowych klauzulach umownych Komisji Europejskiej.',
          'Nie sprzedajemy danych osobowych i nie wykorzystujemy ich do reklamy podmiotów trzecich.',
        ],
      },
      {
        id: 'cookies',
        heading: '7. Pliki cookie i pamięć lokalna na stronie internetowej',
        bullets: [
          'Plik cookie sesji utrzymuje Państwa zalogowanie.',
          'Plik cookie języka zapamiętuje wybrany przez Państwa język.',
          'Pamięć lokalna przeglądarki przechowuje rozpoczętą rezerwację, aby nie została utracona po ponownym załadowaniu strony.',
        ],
        after: [
          'Są one niezbędne do działania strony internetowej. Strona nie używa reklamowych plików cookie ani narzędzi analitycznych, które śledzą odwiedzających między witrynami. Monitorowanie błędów przez Sentry rejestruje błędy techniczne.',
        ],
      },
      {
        id: 'retention',
        heading: '8. Jak długo przechowujemy dane',
        bullets: [
          'Dane konta: tak długo, jak istnieje konto.',
          'Po usunięciu konta: Państwa profil, zdjęcia, dokumenty, adresy, wiadomości i dane urządzenia są usuwane lub anonimizowane. Zakończone przeprowadzki pozostają jako anonimowe zapisy bez Państwa imienia i nazwiska.',
          'Dane, które musimy przechowywać na mocy prawa podatkowego i handlowego, takie jak faktury, zapisy płatności oraz dane tożsamości i dane podatkowe przewoźników: do dziesięciu lat, przechowywane oddzielnie z ograniczonym dostępem, a następnie usuwane.',
          'Logi techniczne: przez krótki okres, w zakresie potrzebnym do zapewnienia bezpieczeństwa i rozwiązywania problemów.',
        ],
      },
      {
        id: 'rights',
        heading: '9. Państwa prawa',
        paragraphs: ['Na podstawie RODO mają Państwo prawo:'],
        bullets: [
          'uzyskać informacje o swoich danych oraz ich kopię,',
          'żądać sprostowania nieprawidłowych danych,',
          'żądać usunięcia danych lub ograniczenia ich przetwarzania,',
          'otrzymać dostarczone przez siebie dane w formacie umożliwiającym ich przenoszenie,',
          'wnieść sprzeciw wobec przetwarzania opartego na naszych prawnie uzasadnionych interesach,',
          'wycofać zgodę w dowolnym momencie ze skutkiem na przyszłość.',
        ],
        after: [
          'Aby skorzystać z prawa, prosimy napisać na dane kontaktowe podane w danych dostawcy. Mają Państwo również prawo wnieść skargę do organu nadzorczego ds. ochrony danych, w szczególności właściwego dla Państwa miejsca zamieszkania.',
        ],
      },
      {
        id: 'deletion',
        heading: '10. Usuwanie konta',
        paragraphs: [
          'Mogą Państwo samodzielnie usunąć swoje konto: w aplikacjach w zakładce Profil, na stronie internetowej w ustawieniach konta. Ze względów bezpieczeństwa zostaną Państwo poproszeni o ponowne zalogowanie się krótko przedtem. Usunięcie jest możliwe, gdy żadna przeprowadzka nie jest w toku ani zarezerwowana, a w przypadku przewoźników, gdy nie ma zaległej opłaty platformy ani oczekującej wypłaty.',
        ],
      },
      {
        id: 'security',
        heading: '11. Bezpieczeństwo',
        paragraphs: [
          'Dane są przesyłane w formie zaszyfrowanej. Dostęp do danych jest ograniczony według ról: każdy użytkownik ma dostęp tylko do własnych danych i do przeprowadzek, w których uczestniczy. Dostęp pracowników jest ograniczony do tego, czego wymaga zadanie, i jest rejestrowany.',
        ],
      },
      {
        id: 'automated',
        heading: '12. Zautomatyzowane przetwarzanie',
        paragraphs: [
          'Cena przeprowadzki oraz wybór przewoźników pokazywanych dla zlecenia są wyliczane automatycznie na podstawie danych przeprowadzki. Żadna decyzja wywołująca wobec Państwa skutki prawne nie jest podejmowana wyłącznie w sposób zautomatyzowany. O dopuszczeniu przewoźnika decyduje człowiek.',
          'Platforma nie jest przeznaczona dla osób poniżej 18. roku życia.',
        ],
      },
      {
        id: 'changes',
        heading: '13. Zmiany niniejszej polityki',
        paragraphs: [
          'Aktualizujemy niniejszą politykę, gdy zmienia się platforma lub prawo. Aktualna wersja jest zawsze dostępna na tej stronie.',
        ],
      },
    ],
  },

  // ── Help ─────────────────────────────────────────────────────────────────
  help: {
    title: 'Pomoc',
    intro: [
      'Odpowiedzi na najczęstsze pytania dotyczące rezerwowania przeprowadzki oraz pracy jako przewoźnik w PickLte.',
    ],
    groups: [
      {
        id: 'about',
        heading: 'O PickLte',
        topics: [
          {
            id: 'what',
            question: 'Czym jest PickLte?',
            answer: [
              'PickLte to platforma, która łączy osoby potrzebujące przeprowadzki z niezależnymi przewoźnikami. Opisują Państwo przeprowadzkę, widzą cenę, a przewoźnik ją przyjmuje.',
            ],
          },
          {
            id: 'who',
            question: 'Kto wykonuje moją przeprowadzkę?',
            answer: [
              'Niezależny przewoźnik, a nie PickLte. Umowę o przeprowadzkę zawierają Państwo z przewoźnikiem, który przyjmuje Państwa zlecenie. PickLte kontaktuje strony i zapewnia rezerwację, śledzenie i płatność.',
            ],
          },
          {
            id: 'where',
            question: 'Gdzie PickLte jest dostępne?',
            answer: [
              'W Niemczech, dla przeprowadzek, które zaczynają się i kończą w Niemczech. Przewoźnicy korzystają z furgonów i małych ciężarówek do 3,5 tony.',
            ],
          },
        ],
      },
      {
        id: 'booking',
        heading: 'Rezerwacja',
        topics: [
          {
            id: 'types',
            question: 'Czym różni się przeprowadzka natychmiastowa od zaplanowanej?',
            answer: [
              'Przeprowadzka natychmiastowa odbywa się od razu: zlecenie trafia do dostępnego przewoźnika w pobliżu adresu odbioru. Przeprowadzka zaplanowana odbywa się w wybranym przez Państwa dniu i o wybranej godzinie; przewoźnicy widzą zlecenie i jeden z nich je przyjmuje.',
            ],
          },
          {
            id: 'price',
            question: 'Jak wyliczana jest cena?',
            answer: [
              'Na podstawie wprowadzonych przez Państwa danych: odległości, potrzebnej wielkości pojazdu, objętości i wagi przedmiotów, liczby pomocników, pięter i windy oraz pakowania. Pełną cenę, z podatkiem VAT, widzą Państwo przed wysłaniem zlecenia.',
            ],
          },
          {
            id: 'items',
            question: 'Co mogę zlecić do przewiezienia?',
            answer: [
              'Mienie domowe, meble, kartony i inne rzeczy. Nie jest możliwy przewóz towarów niebezpiecznych, przedmiotów, których przewóz jest niezgodny z prawem, oraz odpadów przeznaczonych do utylizacji.',
            ],
          },
          {
            id: 'extras',
            question: 'Czy mogę zarezerwować pakowanie lub dodatkowych pomocników?',
            answer: [
              'Tak. Przy przeprowadzce zaplanowanej można wybrać poziom pakowania i dodać pomocników. Innych prac, takich jak montaż mebli, prace montażowe, podłączanie urządzeń, sprzątanie czy magazynowanie, nie można zarezerwować przez PickLte.',
            ],
          },
          {
            id: 'photos',
            question: 'Dlaczego warto dodać zdjęcia?',
            answer: [
              'Zdjęcia pomagają przewoźnikowi ocenić ładunek i przyjechać odpowiednim pojazdem. Widzą je tylko Państwo, przewoźnik Państwa przeprowadzki oraz przewoźnicy, którym pokazywane jest Państwa otwarte zlecenie.',
            ],
          },
        ],
      },
      {
        id: 'payment',
        heading: 'Płatność',
        topics: [
          {
            id: 'how',
            question: 'Jak i kiedy płacę?',
            answer: [
              'Po zakończeniu przeprowadzki, kartą w aplikacji albo gotówką do rąk przewoźnika. Metodę wybierają Państwo przy rezerwacji.',
            ],
          },
          {
            id: 'fees',
            question: 'Czy są dodatkowe opłaty?',
            answer: [
              'Nie. Cena pokazana przed rezerwacją zawiera już podatek VAT i opłatę platformy. Anulowanie w aplikacji nic nie kosztuje.',
            ],
          },
        ],
      },
      {
        id: 'during',
        heading: 'W trakcie przeprowadzki',
        topics: [
          {
            id: 'track',
            question: 'Czy mogę zobaczyć, gdzie jest przewoźnik?',
            answer: [
              'Tak. Gdy przewoźnik jest już w drodze do Państwa, można śledzić go na mapie aż do zakończenia przeprowadzki.',
            ],
          },
          {
            id: 'contact',
            question: 'Jak skontaktować się z przewoźnikiem?',
            answer: [
              'Przez czat lub połączenie w aplikacji na stronie Państwa przeprowadzki. Nie trzeba wymieniać się numerami telefonów.',
            ],
          },
          {
            id: 'cancel',
            question: 'Jak anulować?',
            answer: [
              'Prosimy otworzyć przeprowadzkę i wybrać Anuluj. Jest to możliwe do chwili rozpoczęcia przeprowadzki. Prosimy anulować możliwie najwcześniej, z uczciwości wobec przewoźnika.',
            ],
          },
          {
            id: 'damage',
            question: 'Coś zostało uszkodzone. Co mam zrobić?',
            answer: [
              'Prosimy od razu zrobić zdjęcia i poinformować przewoźnika na czacie. Za transport odpowiada przewoźnik, więc roszczenie przysługuje Państwu wobec przewoźnika. Jeżeli nie uda się dojść do porozumienia, prosimy napisać do nas na dane kontaktowe podane w danych dostawcy, a pomożemy w komunikacji.',
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
            question: 'Nie pamiętam hasła.',
            answer: [
              'Na stronie logowania prosimy wybrać „Nie pamiętam hasła”. Otrzymają Państwo e-mailem kod do ustawienia nowego hasła.',
            ],
          },
          {
            id: 'language',
            question: 'Jak zmienić język?',
            answer: [
              'Na stronie internetowej w menu języków u góry strony, w aplikacjach w zakładce Profil. Dostępnych jest osiem języków.',
            ],
          },
          {
            id: 'delete',
            question: 'Jak usunąć konto?',
            answer: [
              'W aplikacjach w zakładce Profil, na stronie internetowej w ustawieniach konta. Najpierw zostaną Państwo poproszeni o ponowne zalogowanie się. Usunięcie jest możliwe, gdy nie mają Państwo żadnej przeprowadzki w toku ani zarezerwowanej. Państwa dane osobowe są wtedy usuwane lub anonimizowane; szczegóły znajdują się w polityce prywatności.',
            ],
          },
        ],
      },
      {
        id: 'movers',
        heading: 'Dla przewoźników',
        topics: [
          {
            id: 'register',
            question: 'Jak zostać przewoźnikiem w PickLte?',
            answer: [
              'Prosimy zarejestrować się w aplikacji PickLte Mover lub na stronie internetowej, uzupełnić profil i dodać pojazd. Potrzebne są Państwa zdjęcie, prawo jazdy, dane podatkowe i dane rejestracyjne pojazdu. Po sprawdzeniu danych mogą Państwo przejść w tryb online.',
            ],
          },
          {
            id: 'independent',
            question: 'Czy jestem zatrudniony przez PickLte?',
            answer: [
              'Nie. Pracują Państwo jako niezależny przedsiębiorca. Sami Państwo decydują, kiedy są online i które zlecenia przyjmują, oraz odpowiadają za rejestrację działalności gospodarczej, podatki i ubezpieczenie.',
            ],
          },
          {
            id: 'vehicle',
            question: 'Jakie pojazdy są dozwolone?',
            answer: [
              'Pojazdy o dopuszczalnej masie całkowitej do 3,5 tony, łącznie z przyczepą. Możliwe są zarówno pojazdy własne, jak i wynajęte; w przypadku pojazdu wynajętego podaje się okres najmu.',
            ],
          },
          {
            id: 'location',
            question: 'Kiedy moja lokalizacja jest udostępniana?',
            answer: [
              'Tylko wtedy, gdy są Państwo online lub wykonują zlecenie. Klient danej przeprowadzki widzi Państwa pozycję w trakcie tej przeprowadzki. Gdy przechodzą Państwo w tryb offline i nie mają zlecenia, Państwa pozycja jest usuwana.',
            ],
          },
          {
            id: 'earnings',
            question: 'Ile zarabiam i czym jest opłata platformy?',
            answer: [
              'Każde zlecenie pokazuje, ile Państwo zarabiają po odliczeniu podatku VAT i opłaty platformy, zanim je Państwo przyjmą. Przy płatności kartą opłata jest potrącana z Państwa wypłaty. Przy płatności gotówką pobierają Państwo pełną kwotę i w ciągu 24 godzin płacą opłatę na rzecz PickLte; do czasu jej zapłaty nie otrzymują Państwo nowych zleceń.',
            ],
          },
          {
            id: 'tax',
            question: 'Czy PickLte zgłasza moje dochody?',
            answer: [
              'Tak, gdy wymaga tego prawo. Operatorzy platform muszą zgłaszać dochody sprzedawców organowi podatkowemu (DAC7). Swoje zestawienia podatkowe mogą Państwo pobrać w aplikacji.',
            ],
          },
        ],
      },
    ],
  },

  // ── Imprint ──────────────────────────────────────────────────────────────
  imprint: {
    title: 'Dane dostawcy',
    intro: ['Informacje zgodnie z § 5 niemieckiej ustawy o usługach cyfrowych (DDG).'],
    labels: {
      provider: 'Dostawca',
      address: 'Adres',
      representedBy: 'Reprezentowany przez',
      contact: 'Kontakt',
      email: 'E-mail',
      phone: 'Telefon',
      register: 'Rejestr handlowy',
      vatId: 'Numer identyfikacyjny VAT',
      responsibleForContent: 'Odpowiedzialny za treść',
    },
    sections: [
      {
        id: 'role',
        heading: 'Rola platformy',
        paragraphs: [
          'PickLte jest platformą pośredniczącą. Przeprowadzki wykonują niezależni przewoźnicy we własnym imieniu i na własną odpowiedzialność. Wskazany tutaj dostawca nie jest przewoźnikiem ani stroną umowy o przeprowadzkę.',
        ],
      },
      {
        id: 'disputes',
        heading: 'Rozstrzyganie sporów konsumenckich',
        paragraphs: [
          'Nie jesteśmy zobowiązani ani gotowi do udziału w postępowaniu w sprawie rozstrzygania sporów przed konsumenckim organem polubownym.',
        ],
      },
      {
        id: 'content',
        heading: 'Odpowiedzialność za treści',
        paragraphs: [
          'Za własne treści na tych stronach odpowiadamy zgodnie z przepisami ogólnymi. Nie jesteśmy zobowiązani do monitorowania informacji przekazywanych lub przechowywanych przez użytkowników ani do poszukiwania okoliczności wskazujących na działalność niezgodną z prawem. Gdy dowiemy się o konkretnym naruszeniu, niezwłocznie usuwamy daną treść.',
        ],
      },
      {
        id: 'links',
        heading: 'Odpowiedzialność za linki',
        paragraphs: [
          'Strony te mogą zawierać linki do witryn podmiotów trzecich. Za treść tych witryn odpowiadają wyłącznie ich operatorzy. Jeżeli dowiemy się o naruszeniu, usuwamy link.',
        ],
      },
      {
        id: 'copyright',
        heading: 'Prawa autorskie',
        paragraphs: [
          'Treści i utwory na tych stronach są chronione prawem autorskim. Ich kopiowanie, opracowywanie lub rozpowszechnianie w zakresie wykraczającym poza to, na co zezwala prawo autorskie, wymaga naszej pisemnej zgody.',
        ],
      },
    ],
  },
}

export default content
