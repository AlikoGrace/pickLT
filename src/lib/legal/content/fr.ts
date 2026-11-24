import type { LegalContent } from '../types'

const content: LegalContent = {
  updatedLabel: 'Dernière mise à jour : {{date}}',
  languageNotice:
    "Ce texte est une traduction fournie pour votre commodité. Si les versions linguistiques diffèrent, la version allemande s'applique.",
  contentsLabel: 'Sommaire',
  nav: {
    terms: 'Conditions générales',
    privacy: 'Politique de confidentialité',
    help: 'Aide',
    imprint: 'Mentions légales',
  },

  // ── Terms ────────────────────────────────────────────────────────────────
  terms: {
    title: 'Conditions générales',
    intro: [
      "Les présentes conditions régissent l'utilisation du site web PickLte et des applications PickLte et PickLte Mover. Elles s'appliquent aux clients qui recherchent un déménageur et aux déménageurs qui proposent leurs services de transport par l'intermédiaire de la plateforme.",
      "La plateforme est exploitée par la société indiquée dans les mentions légales (« PickLte », « nous »).",
    ],
    sections: [
      {
        id: 'role',
        heading: "1. Ce qu'est PickLte et ce qu'elle n'est pas",
        paragraphs: [
          'PickLte est une plateforme en ligne qui met en relation des clients avec des déménageurs indépendants. Nous fournissons la technologie : le processus de réservation, le calcul du prix, la messagerie, le suivi en temps réel et le traitement des paiements.',
          "Nous n'effectuons pas de déménagements. Nous ne sommes ni un transporteur ni une entreprise de déménagement, nous ne possédons pas de véhicules, et les déménageurs ne sont ni nos salariés ni nos mandataires.",
          "Le contrat de déménagement est conclu directement entre le client et le déménageur qui accepte la demande. Seul le déménageur doit le transport et en est responsable. Notre propre prestation se limite à la mise en relation et à l'exploitation de la plateforme.",
        ],
      },
      {
        id: 'scope',
        heading: '2. Ce qui peut être réservé',
        bullets: [
          "Les déménagements à l'intérieur de l'Allemagne. Le lieu d'enlèvement et le lieu de livraison doivent tous deux se trouver en Allemagne.",
          "Le transport avec des véhicules d'un poids total autorisé en charge de 3,5 tonnes au maximum, remorque comprise.",
          "Le chargement, le transport et le déchargement de biens ménagers, de meubles et d'autres effets personnels, avec emballage par le déménageur si le client le choisit.",
        ],
        after: [
          "L'élimination de déchets, le montage de meubles, les travaux de fixation, le raccordement d'appareils, le nettoyage et le stockage ne sont pas proposés par l'intermédiaire de la plateforme.",
        ],
      },
      {
        id: 'account',
        heading: '3. Votre compte',
        bullets: [
          "Vous avez besoin d'un compte pour réserver ou pour accepter un déménagement. Vous devez être âgé d'au moins 18 ans.",
          'Chaque compte est soit un compte client, soit un compte déménageur. Un même compte ne peut pas être utilisé dans les deux rôles.',
          'Les informations que vous fournissez doivent être exactes et tenues à jour. Nous vérifions votre adresse e-mail et, lorsque cela est demandé, votre numéro de téléphone.',
          "Gardez vos identifiants de connexion secrets. Vous êtes responsable de ce qui se passe par l'intermédiaire de votre compte, sauf si aucune faute ne vous est imputable.",
        ],
      },
      {
        id: 'movers',
        heading: '4. Déménageurs',
        paragraphs: [
          "Les déménageurs utilisent la plateforme en tant qu'entreprises indépendantes, en leur nom propre et pour leur propre compte. Ils décident librement du moment où ils sont disponibles et des demandes qu'ils acceptent. Ils peuvent travailler pour d'autres clients et par l'intermédiaire d'autres plateformes.",
          "Avant qu'un déménageur puisse recevoir des demandes, nous vérifions les informations fournies lors de l'inscription : une photo de la personne, le permis de conduire, les informations fiscales et le véhicule avec son poids total autorisé en charge. Pour un véhicule loué, nous demandons la période de location.",
          'Chaque déménageur est responsable :',
        ],
        bullets: [
          "de la déclaration de son activité professionnelle et de toutes les autorisations qu'exige son travail,",
          'de ses impôts et de ses cotisations sociales,',
          "de l'assurance de son véhicule et de son activité,",
          "de l'aptitude du véhicule à circuler et du respect du droit de la circulation routière et des transports, y compris la limite de 3,5 tonnes,",
          "des personnes qui l'aident lors d'un déménagement.",
        ],
        after: [
          "Notre vérification est un contrôle de plausibilité des documents transmis. Elle ne constitue pas une garantie de la qualité d'un déménageur ou d'un déménagement donné.",
        ],
      },
      {
        id: 'booking',
        heading: '5. Comment une réservation est conclue',
        paragraphs: [
          "Le client décrit le déménagement : adresses, date, objets, accès aux deux adresses, aides et emballage, avec des photos lorsque c'est utile. Il existe deux façons de réserver.",
        ],
        bullets: [
          "Déménagement immédiat : la demande est envoyée à un déménageur à proximité qui est disponible à ce moment-là. Le déménageur dispose d'un temps limité pour accepter. S'il ne le fait pas, la demande peut être proposée à d'autres déménageurs.",
          "Déménagement planifié : la demande pour une date ultérieure est rendue visible aux déménageurs, et l'un d'eux l'accepte.",
        ],
        after: [
          "La demande constitue l'offre du client de conclure un contrat de déménagement au prix affiché. Le contrat entre le client et le déménageur est conclu lorsqu'un déménageur accepte la demande dans l'application. Les deux parties en sont informées dans l'application.",
          "Il n'existe aucun droit à ce qu'un déménageur soit trouvé pour une demande.",
        ],
      },
      {
        id: 'price',
        heading: '6. Prix',
        paragraphs: [
          "Avant que le client n'envoie une demande, la plateforme affiche le prix du déménagement. Il est calculé à partir des informations fournies par le client : distance, taille du véhicule, volume et poids des objets, nombre d'aides, étages et accès, emballage, et caractère immédiat ou planifié du déménagement. Le prix comprend la TVA légale lorsqu'elle s'applique, et il comprend les frais de plateforme.",
          'Le prix repose sur les informations du client. Si les objets ou les conditions sur place diffèrent sensiblement de ce qui a été indiqué, le déménageur peut refuser de réaliser le déménagement tel que réservé.',
        ],
      },
      {
        id: 'payment',
        heading: '7. Paiement et frais de plateforme',
        bullets: [
          "Le client paie le déménageur une fois le déménagement terminé, soit par carte dans l'application, soit en espèces au déménageur.",
          'Les paiements par carte sont traités par notre prestataire de paiement Stripe. Nous ne conservons pas les numéros de carte.',
          "Pour la mise en relation, nous percevons du déménageur des frais de plateforme. Il s'agit d'une part du prix, affichée au déménageur avant qu'il n'accepte.",
          "En cas de paiement par carte, les frais sont déduits avant le versement du montant au déménageur. En cas de paiement en espèces, le déménageur nous doit les frais et doit les payer dans les 24 heures suivant le déménagement. Tant que des frais sont en retard de paiement, le déménageur ne reçoit pas de nouvelles demandes.",
        ],
      },
      {
        id: 'cancellation',
        heading: '8. Modifications et annulation',
        paragraphs: [
          "Un client peut annuler une demande dans l'application tant que le déménagement n'a pas commencé. Un déménageur peut se retirer d'un déménagement qu'il a accepté. La demande peut alors être proposée à d'autres déménageurs.",
          "Nous ne facturons pas de frais d'annulation. Les droits que le client et le déménageur peuvent avoir l'un envers l'autre en raison d'une annulation tardive sont régis par leur contrat et par la loi.",
          'Les droits légaux de rétractation des consommateurs ne sont pas affectés.',
        ],
      },
      {
        id: 'performance',
        heading: '9. Réalisation du déménagement, dommages et réclamations',
        paragraphs: [
          "Le déménageur réalise le déménagement sous sa propre responsabilité. Les droits découlant du déménagement, en particulier en cas de dommage aux biens ou de perte de biens, de retard ou de déménagement qui n'a pas eu lieu, sont des droits à faire valoir contre le déménageur en vertu du contrat et du droit des transports.",
          "Veuillez constater les dommages immédiatement, avec des photos, et les signaler au déménageur dans le chat. Nous aidons à la communication entre les deux parties et pouvons transmettre les informations nécessaires pour faire valoir une réclamation, mais nous ne tranchons pas les litiges et ne versons pas d'indemnisation à la place d'un déménageur.",
        ],
      },
      {
        id: 'conduct',
        heading: "10. Règles d'utilisation",
        bullets: [
          'Fournissez des informations complètes et sincères sur le déménagement et sur vous-même.',
          "Ne réservez pas le transport de marchandises dangereuses, d'objets dont le transport n'est pas autorisé par la loi ou de déchets à éliminer.",
          "Traitez-vous mutuellement avec respect. Les menaces, la discrimination et le harcèlement entraînent l'exclusion.",
          "Les avis doivent refléter votre propre expérience d'un déménagement qui a eu lieu.",
          "Ne perturbez pas le fonctionnement de la plateforme, n'extrayez pas ses données par des moyens automatisés et n'utilisez pas le compte d'une autre personne.",
        ],
      },
      {
        id: 'ranking',
        heading: '11. Comment les déménageurs sont présentés aux clients',
        paragraphs: [
          "Lorsqu'un client recherche un déménageur, la plateforme prend en compte les déménageurs vérifiés, en ligne et qui ne sont pas sur une autre mission, dont le véhicule est adapté au chargement. Parmi ceux-ci, le critère principal est la distance jusqu'à l'adresse d'enlèvement : le déménageur le plus proche est affiché en premier.",
          'Les déménageurs ne peuvent pas payer pour obtenir une meilleure position.',
        ],
      },
      {
        id: 'liability',
        heading: '12. Notre responsabilité',
        paragraphs: [
          "Nous sommes responsables sans limitation en cas de faute intentionnelle et de négligence grave, en cas d'atteinte à la vie, à l'intégrité physique ou à la santé, et lorsque la loi prévoit une responsabilité qui ne peut être exclue.",
          "En cas de négligence légère, nous ne sommes responsables que du manquement à une obligation essentielle du contrat conclu avec nous, et alors uniquement du dommage prévisible et typique d'un tel contrat.",
          "Nous ne sommes pas responsables de l'exécution du déménagement ni du comportement des clients et des déménageurs les uns envers les autres, car nous ne sommes pas partie à leur contrat. Nous ne promettons pas que la plateforme soit disponible sans interruption.",
        ],
      },
      {
        id: 'termination',
        heading: "13. Fin de l'utilisation, suspension",
        paragraphs: [
          "Vous pouvez supprimer votre compte à tout moment dans l'application ou sur le site web. Cela est possible dès lors qu'aucun déménagement n'est en cours ou réservé et, pour les déménageurs, qu'aucuns frais de plateforme ne restent dus et qu'aucun versement n'est en attente.",
          "Nous pouvons restreindre ou suspendre un compte s'il existe un motif grave, en particulier des informations ou des documents faux, un manquement aux présentes conditions, des frais de plateforme impayés ou un risque pour d'autres utilisateurs. Nous communiquons les motifs à l'utilisateur. Les déménageurs peuvent contester la mesure par l'intermédiaire des coordonnées figurant dans les mentions légales. Nous examinons chaque réclamation et y répondons.",
          "Nous pouvons mettre fin au contrat avec un déménageur moyennant un préavis de 30 jours. Le droit d'y mettre fin sans préavis pour motif grave n'est pas affecté.",
        ],
      },
      {
        id: 'changes',
        heading: '14. Modifications des présentes conditions',
        paragraphs: [
          "Nous pouvons modifier les présentes conditions pour l'avenir s'il existe un motif valable, tel qu'un changement de la loi ou de la plateforme. Nous annonçons les modifications par e-mail ou dans l'application au moins 30 jours avant leur entrée en vigueur. Si vous n'êtes pas d'accord, vous pouvez supprimer votre compte avant cette date.",
        ],
      },
      {
        id: 'law',
        heading: '15. Droit applicable et litiges',
        paragraphs: [
          "Le droit allemand s'applique. Les consommateurs conservent en outre la protection des règles impératives du pays dans lequel ils ont leur résidence habituelle.",
          'Nous ne sommes ni tenus ni disposés à participer à une procédure de règlement des litiges devant un organisme de règlement des litiges de consommation.',
          "Si une disposition des présentes conditions devait être invalide, les autres dispositions restent en vigueur.",
        ],
      },
    ],
  },

  // ── Privacy ──────────────────────────────────────────────────────────────
  privacy: {
    title: 'Politique de confidentialité',
    intro: [
      'La présente politique explique quelles données à caractère personnel sont traitées lorsque vous utilisez le site web PickLte et les applications PickLte et PickLte Mover, à quelle fin, et quels sont vos droits.',
    ],
    sections: [
      {
        id: 'controller',
        heading: '1. Qui est responsable',
        paragraphs: [
          'Le responsable du traitement au sens du règlement général sur la protection des données (RGPD) est la société indiquée dans les mentions légales. Vous pouvez nous joindre pour toute question relative à la protection des données aux coordonnées qui y figurent.',
        ],
      },
      {
        id: 'data',
        heading: '2. Quelles données nous traitons',
        bullets: [
          'Compte : nom, adresse e-mail, numéro de téléphone, photo de profil, langue, et votre qualité de client ou de déménageur. Si vous vous connectez avec Google, nous recevons de Google votre nom, votre adresse e-mail et votre image de profil.',
          "Déménagements : adresses d'enlèvement et de livraison, date et heure, liste des objets, informations sur l'accès et les étages, remarques, photos des objets, nom de la société pour un déménagement professionnel, prix et statut du déménagement.",
          'Pour les déménageurs, en outre : une photo de vous, une photo de votre permis de conduire, votre adresse et vos informations fiscales, vos véhicules avec immatriculation, poids total autorisé en charge et photos, les périodes de location, les personnes de votre équipe, vos revenus et les frais de plateforme.',
          'Localisation : voir la section 4.',
          "Communication : les messages de chat entre le client et le déménageur concernant un déménagement et, pour les appels dans l'application, qui a appelé qui, quand et pendant combien de temps. Les appels ne sont pas enregistrés.",
          "Paiement : montant, moment, moyen et statut d'un paiement. Les données de carte sont transmises directement au prestataire de paiement et ne sont pas conservées par nous.",
          "Appareil et utilisation : le jeton de notification push de votre appareil, la version de l'application, le système d'exploitation, et les journaux techniques avec l'adresse IP et l'heure d'une requête.",
          'Les avis que vous donnez ou recevez.',
        ],
      },
      {
        id: 'purposes',
        heading: '3. Pourquoi nous les traitons et sur quelle base juridique',
        bullets: [
          "Pour gérer votre compte et pour mettre en relation clients et déménageurs et traiter leurs déménagements : exécution d'un contrat, art. 6, paragraphe 1, point b), du RGPD.",
          "Pour vérifier les documents des déménageurs avant leur admission, pour prévenir les abus et la fraude, pour assurer la sécurité de la plateforme et pour détecter et corriger les erreurs : notre intérêt légitime à disposer d'une plateforme sûre et fonctionnelle, art. 6, paragraphe 1, point f), du RGPD.",
          "Pour respecter les obligations du droit fiscal et commercial, y compris la déclaration des revenus des déménageurs à l'administration fiscale en vertu de la loi sur la transparence fiscale des plateformes (DAC7) : obligation légale, art. 6, paragraphe 1, point c), du RGPD.",
          'Pour utiliser la localisation, la caméra, la photothèque et les notifications de votre appareil : votre consentement, art. 6, paragraphe 1, point a), du RGPD, que vous donnez ou retirez dans les réglages de votre appareil.',
        ],
      },
      {
        id: 'location',
        heading: '4. Localisation',
        paragraphs: [
          "La position d'un déménageur n'est enregistrée que lorsque le déménageur est en ligne ou en mission. Un client ne voit la position d'un déménageur que pour son propre déménagement, pendant que ce déménagement est en cours. Avant cela, les clients qui recherchent un déménageur ne voient que des positions approximatives.",
          "Lorsqu'un déménageur passe hors ligne et n'est pas en mission, la position enregistrée est supprimée. Aucun historique des trajets n'est conservé.",
          "Les clients peuvent autoriser l'application à utiliser leur localisation pour renseigner l'adresse d'enlèvement. Cela est facultatif.",
        ],
      },
      {
        id: 'photos',
        heading: '5. Photos et documents',
        paragraphs: [
          "Les photos d'un déménagement ne peuvent être consultées que par le client, par le déménageur qui a accepté le déménagement et par les déménageurs auxquels la demande ouverte est présentée. Elles sont fournies au moyen de liens qui expirent après un court délai.",
          'Les permis de conduire et les autres documents des déménageurs ne peuvent être consultés que par le déménageur et par le personnel chargé de les examiner.',
        ],
      },
      {
        id: 'recipients',
        heading: '6. Qui reçoit des données',
        paragraphs: [
          "L'autre partie à un déménagement reçoit ce qui est nécessaire à sa réalisation. Le client voit le nom, la photo, le véhicule et les avis du déménageur et, pendant le déménagement, la position du déménageur. Le déménageur voit le nom du client, les adresses, les objets et les photos. Les numéros de téléphone ne sont transmis que lorsque cela est nécessaire pour un déménagement accepté. Les appels peuvent être passés dans l'application sans révéler de numéro.",
          'Nous faisons appel à des prestataires de services qui traitent des données pour notre compte et sur la base d\'un contrat :',
        ],
        bullets: [
          'Appwrite : base de données, stockage de fichiers, connexion et envoi de notifications, hébergé à Francfort, en Allemagne.',
          'Vercel : hébergement du site web.',
          "Stripe : traitement des paiements et versements. Stripe est lui-même responsable du traitement pour une partie de ces opérations.",
          "Mapbox : cartes, recherche d'adresses et calcul d'itinéraires.",
          'Google : connexion avec Google et envoi de notifications push (Firebase Cloud Messaging).',
          "LiveKit : transmission des appels dans l'application.",
          "Sentry : rapports d'erreurs, conservés dans l'UE, dont les informations personnelles sont retirées avant l'envoi.",
        ],
        after: [
          "Nous transmettons des données aux autorités lorsque la loi l'exige, en particulier les données de revenus des déménageurs à l'Office fédéral central des impôts.",
          "Certains de ces prestataires sont établis aux États-Unis ou peuvent y traiter des données. Dans ce cas, le transfert repose sur le cadre de protection des données UE-États-Unis ou sur les clauses contractuelles types de la Commission européenne.",
          'Nous ne vendons pas de données à caractère personnel et ne les utilisons pas pour la publicité de tiers.',
        ],
      },
      {
        id: 'cookies',
        heading: '7. Cookies et stockage local sur le site web',
        bullets: [
          'Un cookie de session vous maintient connecté.',
          'Un cookie de langue mémorise la langue que vous avez choisie.',
          "Le stockage local du navigateur conserve une réservation que vous avez commencée afin qu'elle ne soit pas perdue lorsque vous rechargez la page.",
        ],
        after: [
          "Ces éléments sont nécessaires au fonctionnement du site web. Le site web n'utilise ni cookies publicitaires ni outils d'analyse qui suivent les visiteurs d'un site web à l'autre. La surveillance des erreurs par Sentry enregistre les erreurs techniques.",
        ],
      },
      {
        id: 'retention',
        heading: '8. Combien de temps nous conservons les données',
        bullets: [
          'Données du compte : aussi longtemps que le compte existe.',
          "Après la suppression de votre compte : votre profil, vos photos, vos documents, vos adresses, vos messages et les données de votre appareil sont supprimés ou anonymisés. Les déménagements terminés subsistent sous forme d'enregistrements anonymes sans votre nom.",
          "Données que le droit fiscal et commercial nous impose de conserver, telles que les factures, les justificatifs de paiement et les données d'identité et fiscales des déménageurs : jusqu'à dix ans, conservées séparément avec un accès restreint, puis supprimées.",
          'Journaux techniques : pendant une courte durée, selon les besoins de la sécurité et du dépannage.',
        ],
      },
      {
        id: 'rights',
        heading: '9. Vos droits',
        paragraphs: ['En vertu du RGPD, vous avez le droit :'],
        bullets: [
          "d'obtenir des informations sur vos données ainsi qu'une copie de celles-ci,",
          'de faire rectifier les données inexactes,',
          "de faire effacer des données ou d'en faire limiter le traitement,",
          'de recevoir dans un format portable les données que vous avez fournies,',
          'de vous opposer à un traitement qui repose sur nos intérêts légitimes,',
          "de retirer un consentement à tout moment avec effet pour l'avenir.",
        ],
        after: [
          "Pour exercer un droit, écrivez aux coordonnées figurant dans les mentions légales. Vous avez également le droit d'introduire une réclamation auprès d'une autorité de contrôle de la protection des données, en particulier celle de votre lieu de résidence.",
        ],
      },
      {
        id: 'deletion',
        heading: '10. Suppression de votre compte',
        paragraphs: [
          "Vous pouvez supprimer vous-même votre compte : dans les applications sous Profil, sur le site web dans les paramètres de votre compte. Par sécurité, il vous est demandé de vous reconnecter peu avant. La suppression est possible dès lors qu'aucun déménagement n'est en cours ou réservé et, pour les déménageurs, qu'aucuns frais de plateforme ne restent dus et qu'aucun versement n'est en attente.",
        ],
      },
      {
        id: 'security',
        heading: '11. Sécurité',
        paragraphs: [
          "Les données sont transmises sous forme chiffrée. L'accès aux données est limité en fonction du rôle : chaque utilisateur n'accède qu'à ses propres données et aux déménagements auxquels il participe. L'accès du personnel est limité à ce que la tâche exige et il est journalisé.",
        ],
      },
      {
        id: 'automated',
        heading: '12. Traitement automatisé',
        paragraphs: [
          "Le prix d'un déménagement et la sélection des déménageurs présentés pour une demande sont calculés automatiquement à partir des informations relatives au déménagement. Aucune décision produisant des effets juridiques à votre égard n'est prise uniquement par des moyens automatisés. L'admission d'un déménageur est décidée par une personne.",
          "La plateforme n'est pas destinée aux personnes de moins de 18 ans.",
        ],
      },
      {
        id: 'changes',
        heading: '13. Modifications de la présente politique',
        paragraphs: [
          'Nous mettons à jour la présente politique lorsque la plateforme ou la loi change. La version en vigueur est toujours disponible sur cette page.',
        ],
      },
    ],
  },

  // ── Help ─────────────────────────────────────────────────────────────────
  help: {
    title: 'Aide',
    intro: [
      "Réponses aux questions les plus fréquentes sur la réservation d'un déménagement et sur l'activité de déménageur sur PickLte.",
    ],
    groups: [
      {
        id: 'about',
        heading: 'À propos de PickLte',
        topics: [
          {
            id: 'what',
            question: "Qu'est-ce que PickLte ?",
            answer: [
              "PickLte est une plateforme qui met en relation les personnes qui ont besoin d'un déménagement avec des déménageurs indépendants. Vous décrivez le déménagement, vous voyez le prix, et un déménageur l'accepte.",
            ],
          },
          {
            id: 'who',
            question: 'Qui réalise mon déménagement ?',
            answer: [
              'Un déménageur indépendant, et non PickLte. Votre contrat de déménagement est conclu avec le déménageur qui accepte votre demande. PickLte assure la mise en relation et fournit la réservation, le suivi et le paiement.',
            ],
          },
          {
            id: 'where',
            question: 'Où PickLte est-elle disponible ?',
            answer: [
              "En Allemagne, pour les déménagements qui commencent et se terminent en Allemagne. Les déménageurs utilisent des fourgons et des petits camions de 3,5 tonnes au maximum.",
            ],
          },
        ],
      },
      {
        id: 'booking',
        heading: 'Réservation',
        topics: [
          {
            id: 'types',
            question: 'Quelle est la différence entre un déménagement immédiat et un déménagement planifié ?',
            answer: [
              "Un déménagement immédiat a lieu tout de suite : la demande est envoyée à un déménageur disponible à proximité de l'adresse d'enlèvement. Un déménagement planifié a lieu à la date et à l'heure que vous choisissez : les déménageurs voient la demande et l'un d'eux l'accepte.",
            ],
          },
          {
            id: 'price',
            question: 'Comment le prix est-il calculé ?',
            answer: [
              "À partir des informations que vous saisissez : distance, taille du véhicule nécessaire, volume et poids de vos objets, nombre d'aides, étages et ascenseur, et emballage. Vous voyez le prix total, TVA comprise, avant d'envoyer la demande.",
            ],
          },
          {
            id: 'items',
            question: 'Que puis-je faire déménager ?',
            answer: [
              "Des biens ménagers, des meubles, des cartons et d'autres effets personnels. Ne sont pas possibles : les marchandises dangereuses, les objets dont le transport n'est pas autorisé par la loi et les déchets à éliminer.",
            ],
          },
          {
            id: 'extras',
            question: "Puis-je réserver l'emballage ou des aides supplémentaires ?",
            answer: [
              "Oui. Pour un déménagement planifié, vous pouvez choisir un niveau d'emballage et ajouter des aides. Les autres travaux, tels que le montage de meubles, la fixation, le raccordement d'appareils, le nettoyage ou le stockage, ne peuvent pas être réservés par l'intermédiaire de PickLte.",
            ],
          },
          {
            id: 'photos',
            question: 'Pourquoi ajouter des photos ?',
            answer: [
              "Les photos aident le déménageur à évaluer le chargement et à venir avec le véhicule adapté. Seuls vous, le déménageur de votre déménagement et les déménageurs auxquels votre demande ouverte est présentée peuvent les voir.",
            ],
          },
        ],
      },
      {
        id: 'payment',
        heading: 'Paiement',
        topics: [
          {
            id: 'how',
            question: 'Comment et quand dois-je payer ?',
            answer: [
              "Une fois le déménagement terminé, par carte dans l'application ou en espèces au déménageur. Vous choisissez le moyen de paiement lors de la réservation.",
            ],
          },
          {
            id: 'fees',
            question: 'Y a-t-il des frais supplémentaires ?',
            answer: [
              "Non. Le prix affiché avant la réservation comprend déjà la TVA et les frais de plateforme. L'annulation dans l'application ne coûte rien.",
            ],
          },
        ],
      },
      {
        id: 'during',
        heading: 'Pendant le déménagement',
        topics: [
          {
            id: 'track',
            question: 'Puis-je voir où se trouve le déménageur ?',
            answer: [
              "Oui. Dès que le déménageur est en route vers vous, vous pouvez le suivre sur la carte jusqu'à la fin du déménagement.",
            ],
          },
          {
            id: 'contact',
            question: 'Comment joindre le déménageur ?',
            answer: [
              "Par le chat ou par un appel dans l'application, sur la page de votre déménagement. Vous n'avez pas besoin d'échanger vos numéros de téléphone.",
            ],
          },
          {
            id: 'cancel',
            question: 'Comment annuler ?',
            answer: [
              "Ouvrez le déménagement et choisissez Annuler. Cela est possible jusqu'à ce que le déménagement ait commencé. Veuillez annuler le plus tôt possible, par égard pour le déménageur.",
            ],
          },
          {
            id: 'damage',
            question: 'Quelque chose a été endommagé. Que dois-je faire ?',
            answer: [
              "Prenez des photos immédiatement et informez le déménageur dans le chat. Le déménageur est responsable du transport, votre réclamation est donc dirigée contre le déménageur. Si vous ne parvenez pas à un accord, écrivez-nous aux coordonnées figurant dans les mentions légales et nous vous aiderons pour la communication.",
            ],
          },
        ],
      },
      {
        id: 'account',
        heading: 'Compte',
        topics: [
          {
            id: 'password',
            question: "J'ai oublié mon mot de passe.",
            answer: [
              'Choisissez « Mot de passe oublié » sur la page de connexion. Vous recevez un code par e-mail pour définir un nouveau mot de passe.',
            ],
          },
          {
            id: 'language',
            question: 'Comment changer de langue ?',
            answer: [
              'Sur le site web, avec le menu des langues en haut de la page, dans les applications sous Profil. Huit langues sont disponibles.',
            ],
          },
          {
            id: 'delete',
            question: 'Comment supprimer mon compte ?',
            answer: [
              "Dans les applications sous Profil, sur le site web dans les paramètres de votre compte. Il vous sera d'abord demandé de vous reconnecter. La suppression est possible lorsque vous n'avez aucun déménagement en cours ou réservé. Vos données à caractère personnel sont alors supprimées ou anonymisées. Les détails figurent dans la politique de confidentialité.",
            ],
          },
        ],
      },
      {
        id: 'movers',
        heading: 'Pour les déménageurs',
        topics: [
          {
            id: 'register',
            question: 'Comment devenir déménageur sur PickLte ?',
            answer: [
              "Inscrivez-vous dans l'application PickLte Mover ou sur le site web, complétez votre profil et ajoutez votre véhicule. Il vous faut une photo de vous, votre permis de conduire, vos informations fiscales et les données d'immatriculation de votre véhicule. Une fois vos informations vérifiées, vous pouvez passer en ligne.",
            ],
          },
          {
            id: 'independent',
            question: 'Suis-je salarié de PickLte ?',
            answer: [
              "Non. Vous travaillez en tant qu'entreprise indépendante. Vous décidez quand vous êtes en ligne et quelles demandes vous acceptez, et vous êtes responsable de la déclaration de votre activité professionnelle, de vos impôts et de vos assurances.",
            ],
          },
          {
            id: 'vehicle',
            question: 'Quels véhicules sont autorisés ?',
            answer: [
              "Les véhicules d'un poids total autorisé en charge de 3,5 tonnes au maximum, remorque comprise. Les véhicules détenus en propre comme les véhicules loués sont possibles. Pour un véhicule loué, vous saisissez la période de location.",
            ],
          },
          {
            id: 'location',
            question: 'Quand ma localisation est-elle partagée ?',
            answer: [
              "Uniquement lorsque vous êtes en ligne ou en mission. Le client d'un déménagement voit votre position pendant ce déménagement. Lorsque vous passez hors ligne et que vous n'avez aucune mission, votre position est supprimée.",
            ],
          },
          {
            id: 'earnings',
            question: 'Combien est-ce que je gagne, et que sont les frais de plateforme ?',
            answer: [
              "Chaque demande indique, avant que vous ne l'acceptiez, ce que vous gagnez après TVA et frais de plateforme. En cas de paiement par carte, les frais sont déduits de votre versement. En cas de paiement en espèces, vous encaissez le montant total et payez les frais à PickLte dans les 24 heures. Tant qu'ils ne sont pas payés, vous ne recevez pas de nouvelles demandes.",
            ],
          },
          {
            id: 'tax',
            question: 'PickLte déclare-t-elle mes revenus ?',
            answer: [
              "Oui, lorsque la loi l'exige. Les opérateurs de plateformes doivent déclarer les revenus des vendeurs à l'administration fiscale (DAC7). Vous pouvez télécharger vos relevés fiscaux dans l'application.",
            ],
          },
        ],
      },
    ],
  },

  // ── Imprint ──────────────────────────────────────────────────────────────
  imprint: {
    title: 'Mentions légales',
    intro: ['Informations conformément au § 5 de la loi allemande sur les services numériques (DDG).'],
    labels: {
      provider: 'Prestataire',
      address: 'Adresse',
      representedBy: 'Représenté par',
      contact: 'Contact',
      email: 'E-mail',
      phone: 'Téléphone',
      register: 'Registre du commerce',
      vatId: "Numéro d'identification TVA",
      responsibleForContent: 'Responsable du contenu',
    },
    sections: [
      {
        id: 'role',
        heading: 'Rôle de la plateforme',
        paragraphs: [
          "PickLte est une plateforme d'intermédiation. Les déménagements sont réalisés par des déménageurs indépendants, en leur nom propre et sous leur propre responsabilité. Le prestataire indiqué ici n'est pas un transporteur et n'est pas partie au contrat de déménagement.",
        ],
      },
      {
        id: 'disputes',
        heading: 'Règlement des litiges de consommation',
        paragraphs: [
          'Nous ne sommes ni tenus ni disposés à participer à une procédure de règlement des litiges devant un organisme de règlement des litiges de consommation.',
        ],
      },
      {
        id: 'content',
        heading: 'Responsabilité pour les contenus',
        paragraphs: [
          "Nous sommes responsables de nos propres contenus sur ces pages conformément aux lois générales. Nous ne sommes pas tenus de surveiller les informations que les utilisateurs transmettent ou stockent, ni de rechercher des circonstances révélant une activité illicite. Dès que nous avons connaissance d'une violation précise, nous retirons le contenu sans délai.",
        ],
      },
      {
        id: 'links',
        heading: 'Responsabilité pour les liens',
        paragraphs: [
          "Ces pages peuvent contenir des liens vers des sites web de tiers. Seuls leurs exploitants sont responsables du contenu de ces sites web. Si nous avons connaissance d'une violation, nous retirons le lien.",
        ],
      },
      {
        id: 'copyright',
        heading: "Droit d'auteur",
        paragraphs: [
          "Les contenus et les œuvres figurant sur ces pages sont protégés par le droit d'auteur. Leur reproduction, leur modification ou leur diffusion au-delà de ce que permet le droit d'auteur nécessite notre accord écrit.",
        ],
      },
    ],
  },
}

export default content
