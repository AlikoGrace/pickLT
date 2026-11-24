import type { LegalContent } from '../types'

const content: LegalContent = {
  updatedLabel: 'Last updated: {{date}}',
  languageNotice:
    'This text is a translation for your convenience. If the language versions differ, the German version applies.',
  contentsLabel: 'Contents',
  nav: {
    terms: 'Terms and Conditions',
    privacy: 'Privacy Policy',
    help: 'Help',
    imprint: 'Imprint',
  },

  // ── Terms ────────────────────────────────────────────────────────────────
  terms: {
    title: 'Terms and Conditions',
    intro: [
      'These terms govern the use of the PickLte website and the PickLte and PickLte Mover apps. They apply to clients who look for a mover and to movers who offer their transport services through the platform.',
      'The platform is operated by the company named in the imprint ("PickLte", "we").',
    ],
    sections: [
      {
        id: 'role',
        heading: '1. What PickLte is, and what it is not',
        paragraphs: [
          'PickLte is an online platform that brings clients together with independent movers. We provide the technology: the booking process, the price calculation, messaging, live tracking and payment processing.',
          'We do not carry out moves. We are not a carrier or a removal company, we do not own vehicles, and the movers are not our employees or agents.',
          'The contract for a move is concluded directly between the client and the mover who accepts the request. The mover alone owes the transport and is responsible for it. Our own service is limited to arranging the contact and running the platform.',
        ],
      },
      {
        id: 'scope',
        heading: '2. What can be booked',
        bullets: [
          'Moves within Germany. Pickup and drop-off must both be in Germany.',
          'Transport with vehicles of up to 3.5 tonnes permissible gross weight, trailer included.',
          'Loading, transport and unloading of household goods, furniture and other belongings, with packing by the mover if the client chooses it.',
        ],
        after: [
          'Waste disposal, furniture assembly, mounting work, appliance connection, cleaning and storage are not offered through the platform.',
        ],
      },
      {
        id: 'account',
        heading: '3. Your account',
        bullets: [
          'You need an account to book or to accept a move. You must be at least 18 years old.',
          'Each account is either a client account or a mover account. One account cannot be used in both roles.',
          'The details you give must be true and kept up to date. We verify your email address and, where requested, your phone number.',
          'Keep your sign-in details secret. You are responsible for what happens through your account unless you are not at fault.',
        ],
      },
      {
        id: 'movers',
        heading: '4. Movers',
        paragraphs: [
          'Movers use the platform as independent businesses, in their own name and on their own account. They decide freely when they are available and which requests they accept. They may work for other clients and through other platforms.',
          'Before a mover can receive requests we check the details given at registration: a photo of the person, the driving licence, the tax details and the vehicle with its permissible gross weight. For a rented vehicle we ask for the rental period.',
          'Each mover is responsible for:',
        ],
        bullets: [
          'their trade registration and every permit their work requires,',
          'their taxes and social security contributions,',
          'the insurance of their vehicle and of their work,',
          'the roadworthiness of the vehicle and compliance with road and transport law, including the 3.5 tonne limit,',
          'the people who help them with a move.',
        ],
        after: [
          'Our check is a plausibility check of the documents submitted. It is not a guarantee of the quality of a mover or of a particular move.',
        ],
      },
      {
        id: 'booking',
        heading: '5. How a booking comes about',
        paragraphs: [
          'The client describes the move: addresses, date, items, access at both addresses, helpers and packing, with photos where useful. There are two ways to book.',
        ],
        bullets: [
          'Instant move: the request goes to a mover nearby who is available now. The mover has a limited time to accept. If they do not, the request can be offered to other movers.',
          'Scheduled move: the request for a later date is made visible to movers, and one of them accepts it.',
        ],
        after: [
          'The request is the client\'s offer to conclude a contract for the move at the price shown. The contract between client and mover is concluded when a mover accepts the request in the app. Both sides are informed in the app.',
          'There is no entitlement to a mover being found for a request.',
        ],
      },
      {
        id: 'price',
        heading: '6. Price',
        paragraphs: [
          'Before the client sends a request, the platform shows the price of the move. It is calculated from the details the client gave: distance, vehicle size, volume and weight of the items, number of helpers, floors and access, packing, and whether the move is instant or scheduled. The price includes statutory VAT where it applies, and it includes the platform fee.',
          'The price rests on the client\'s information. If the items or the conditions on site differ substantially from what was stated, the mover may refuse to carry out the move as booked.',
        ],
      },
      {
        id: 'payment',
        heading: '7. Payment and platform fee',
        bullets: [
          'The client pays the mover after the move has been completed, either by card in the app or in cash to the mover.',
          'Card payments are processed by our payment provider Stripe. We do not store card numbers.',
          'For arranging the move we receive a platform fee from the mover. It is a share of the price and is shown to the mover before they accept.',
          'With card payment the fee is deducted before the amount is paid out to the mover. With cash payment the mover owes us the fee and must pay it within 24 hours after the move. While a fee is overdue the mover receives no new requests.',
        ],
      },
      {
        id: 'cancellation',
        heading: '8. Changes and cancellation',
        paragraphs: [
          'A client can cancel a request in the app as long as the move has not started. A mover can hand back a move they have accepted; the request can then be offered to other movers.',
          'We do not charge a fee for cancelling. Claims that the client and the mover may have against each other because of a late cancellation are governed by their contract and by the law.',
          'Statutory rights of withdrawal for consumers remain unaffected.',
        ],
      },
      {
        id: 'performance',
        heading: '9. Carrying out the move, damage and complaints',
        paragraphs: [
          'The mover carries out the move under their own responsibility. Claims arising from the move, in particular for damage to or loss of goods, delay or a move that did not take place, are claims against the mover under the contract and under transport law.',
          'Please record damage straight away, with photos, and report it to the mover in the chat. We help with communication between the two sides and can pass on the details needed to pursue a claim, but we do not decide disputes and do not pay compensation on a mover\'s behalf.',
        ],
      },
      {
        id: 'conduct',
        heading: '10. Rules of use',
        bullets: [
          'Give complete and honest information about the move and about yourself.',
          'Do not book the transport of dangerous goods, of items that may not lawfully be transported, or of waste for disposal.',
          'Treat each other with respect. Threats, discrimination and harassment lead to exclusion.',
          'Reviews must reflect your own experience of a move that took place.',
          'Do not interfere with the platform, do not read out its data by automated means, and do not use another person\'s account.',
        ],
      },
      {
        id: 'ranking',
        heading: '11. How movers are shown to clients',
        paragraphs: [
          'When a client looks for a mover, the platform considers movers who are verified, online and not on another job, whose vehicle is suitable for the load. Among these, the main factor is the distance to the pickup address: the nearest mover is shown first.',
          'Movers cannot pay for a better position.',
        ],
      },
      {
        id: 'liability',
        heading: '12. Our liability',
        paragraphs: [
          'We are liable without limit for intent and gross negligence, for injury to life, body or health, and where the law prescribes liability that cannot be excluded.',
          'In cases of slight negligence we are liable only for the breach of an obligation that is essential to the contract with us, and then only for the foreseeable damage typical of such a contract.',
          'We are not liable for the performance of the move or for the conduct of clients and movers towards each other, because we are not a party to their contract. We do not promise that the platform is available without interruption.',
        ],
      },
      {
        id: 'termination',
        heading: '13. Ending the use, suspension',
        paragraphs: [
          'You can delete your account at any time in the app or on the website. This is possible once no move is under way or booked and, for movers, no platform fee is outstanding and no payout is pending.',
          'We may restrict or suspend an account if there is a serious reason, in particular false details or documents, a breach of these terms, an unpaid platform fee or a risk to other users. We tell the user the reasons. Movers may object through the contact details in the imprint; we review every complaint and answer it.',
          'We may end the contract with a mover with 30 days\' notice. The right to end it without notice for good cause is unaffected.',
        ],
      },
      {
        id: 'changes',
        heading: '14. Changes to these terms',
        paragraphs: [
          'We may change these terms for the future if there is a valid reason, such as a change in the law or in the platform. We announce changes by email or in the app at least 30 days before they take effect. If you do not agree you can delete your account before that date.',
        ],
      },
      {
        id: 'law',
        heading: '15. Applicable law and disputes',
        paragraphs: [
          'German law applies. Consumers also keep the protection of the mandatory rules of the country in which they habitually live.',
          'We are neither obliged nor willing to take part in dispute resolution proceedings before a consumer arbitration board.',
          'Should a provision of these terms be invalid, the remaining provisions stay in force.',
        ],
      },
    ],
  },

  // ── Privacy ──────────────────────────────────────────────────────────────
  privacy: {
    title: 'Privacy Policy',
    intro: [
      'This policy explains which personal data is processed when you use the PickLte website and the PickLte and PickLte Mover apps, for what purpose, and what rights you have.',
    ],
    sections: [
      {
        id: 'controller',
        heading: '1. Who is responsible',
        paragraphs: [
          'The controller within the meaning of the General Data Protection Regulation (GDPR) is the company named in the imprint. You can reach us on any privacy matter through the contact details given there.',
        ],
      },
      {
        id: 'data',
        heading: '2. What data we process',
        bullets: [
          'Account: name, email address, phone number, profile photo, language, and whether you are a client or a mover. If you sign in with Google we receive your name, email address and profile picture from Google.',
          'Moves: pickup and drop-off addresses, date and time, the list of items, details of access and floors, notes, photos of the items, a company name for a business move, the price and the status of the move.',
          'Movers in addition: a photo of yourself, a photo of your driving licence, your address and tax details, your vehicles with registration, permissible gross weight and photos, rental periods, the people in your crew, your earnings and the platform fees.',
          'Location: see section 4.',
          'Communication: the chat messages between client and mover for a move, and for in-app calls who called whom, when and for how long. Calls are not recorded.',
          'Payment: amount, time, method and status of a payment. Card details go directly to the payment provider and are not stored by us.',
          'Device and usage: the push notification token of your device, the app version, the operating system, and technical logs with the IP address and the time of a request.',
          'Reviews you give or receive.',
        ],
      },
      {
        id: 'purposes',
        heading: '3. Why we process it, and on what legal basis',
        bullets: [
          'To run your account and to arrange and handle moves between clients and movers: performance of a contract, Art. 6 (1) (b) GDPR.',
          'To check the documents of movers before they are admitted, to prevent misuse and fraud, to keep the platform secure and to find and fix errors: our legitimate interest in a safe and working platform, Art. 6 (1) (f) GDPR.',
          'To meet obligations under tax and commercial law, including the reporting of the income of movers to the tax authority under the Platform Tax Transparency Act (DAC7): legal obligation, Art. 6 (1) (c) GDPR.',
          'To use the location, the camera, the photo library and notifications of your device: your consent, Art. 6 (1) (a) GDPR, which you give or withdraw in the settings of your device.',
        ],
      },
      {
        id: 'location',
        heading: '4. Location',
        paragraphs: [
          'A mover\'s position is recorded only while the mover is online or on a job. A client sees the position of a mover only for their own move while that move is under way. Before that, clients looking for a mover see approximate positions only.',
          'When a mover goes offline and is not on a job, the stored position is deleted. A history of routes is not kept.',
          'Clients can allow the app to use their location to fill in the pickup address. This is optional.',
        ],
      },
      {
        id: 'photos',
        heading: '5. Photos and documents',
        paragraphs: [
          'Photos of a move can be viewed only by the client, by the mover who accepted the move, and by movers to whom the open request is shown. They are delivered through links that expire after a short time.',
          'Driving licences and other documents of movers can be viewed only by the mover and by the staff who review them.',
        ],
      },
      {
        id: 'recipients',
        heading: '6. Who receives data',
        paragraphs: [
          'The other party to a move receives what is needed to carry it out. The client sees the name, photo, vehicle and reviews of the mover and, during the move, the mover\'s position. The mover sees the name of the client, the addresses, the items and the photos. Phone numbers are passed on only where this is needed for an accepted move; calls can be made in the app without revealing a number.',
          'We use service providers who process data on our behalf and under contract:',
        ],
        bullets: [
          'Appwrite: database, file storage, sign-in and delivery of notifications, hosted in Frankfurt, Germany.',
          'Vercel: hosting of the website.',
          'Stripe: payment processing and payouts. Stripe is itself a controller for part of this processing.',
          'Mapbox: maps, address search and route calculation.',
          'Google: sign-in with Google and delivery of push notifications (Firebase Cloud Messaging).',
          'LiveKit: transmission of in-app calls.',
          'Sentry: error reports, stored in the EU, with personal details removed before they are sent.',
        ],
        after: [
          'We pass data to authorities where the law requires it, in particular income data of movers to the Federal Central Tax Office.',
          'Some of these providers are based in the United States or may process data there. In that case the transfer rests on the EU-US Data Privacy Framework or on the standard contractual clauses of the European Commission.',
          'We do not sell personal data and do not use it for advertising by third parties.',
        ],
      },
      {
        id: 'cookies',
        heading: '7. Cookies and local storage on the website',
        bullets: [
          'A session cookie keeps you signed in.',
          'A language cookie remembers the language you chose.',
          'The browser\'s local storage keeps a booking you have started so that it is not lost when you reload the page.',
        ],
        after: [
          'These are necessary for the website to work. The website uses no advertising cookies and no analytics that track visitors across websites. Error monitoring by Sentry records technical errors.',
        ],
      },
      {
        id: 'retention',
        heading: '8. How long we keep data',
        bullets: [
          'Account data: for as long as the account exists.',
          'After you delete your account: your profile, photos, documents, addresses, messages and device data are deleted or made anonymous. Completed moves remain as anonymous records without your name.',
          'Data that tax and commercial law require us to keep, such as invoices, payment records and the identity and tax details of movers: up to ten years, stored separately with restricted access, then deleted.',
          'Technical logs: for a short period, as needed for security and troubleshooting.',
        ],
      },
      {
        id: 'rights',
        heading: '9. Your rights',
        paragraphs: ['Under the GDPR you have the right to:'],
        bullets: [
          'obtain information about your data and a copy of it,',
          'have incorrect data corrected,',
          'have data deleted or its processing restricted,',
          'receive data you provided in a portable format,',
          'object to processing that rests on our legitimate interests,',
          'withdraw a consent at any time with effect for the future.',
        ],
        after: [
          'To exercise a right, write to the contact details in the imprint. You also have the right to complain to a data protection supervisory authority, in particular the one at your place of residence.',
        ],
      },
      {
        id: 'deletion',
        heading: '10. Deleting your account',
        paragraphs: [
          'You can delete your account yourself: in the apps under Profile, on the website in your account settings. For security you are asked to sign in again shortly beforehand. Deletion is possible once no move is under way or booked and, for movers, no platform fee is outstanding and no payout is pending.',
        ],
      },
      {
        id: 'security',
        heading: '11. Security',
        paragraphs: [
          'Data is transmitted in encrypted form. Access to data is limited by role: each user reaches only their own data and the moves they take part in. Staff access is restricted to what the task requires and is logged.',
        ],
      },
      {
        id: 'automated',
        heading: '12. Automated processing',
        paragraphs: [
          'The price of a move and the selection of movers shown for a request are calculated automatically from the details of the move. No decision with legal effect on you is taken solely by automated means. The admission of a mover is decided by a person.',
          'The platform is not intended for persons under 18.',
        ],
      },
      {
        id: 'changes',
        heading: '13. Changes to this policy',
        paragraphs: [
          'We update this policy when the platform or the law changes. The current version is always available on this page.',
        ],
      },
    ],
  },

  // ── Help ─────────────────────────────────────────────────────────────────
  help: {
    title: 'Help',
    intro: ['Answers to the most common questions about booking a move and about working as a mover on PickLte.'],
    groups: [
      {
        id: 'about',
        heading: 'About PickLte',
        topics: [
          {
            id: 'what',
            question: 'What is PickLte?',
            answer: [
              'PickLte is a platform that connects people who need a move with independent movers. You describe the move, see the price, and a mover accepts it.',
            ],
          },
          {
            id: 'who',
            question: 'Who carries out my move?',
            answer: [
              'An independent mover, not PickLte. Your contract for the move is with the mover who accepts your request. PickLte arranges the contact and provides booking, tracking and payment.',
            ],
          },
          {
            id: 'where',
            question: 'Where is PickLte available?',
            answer: [
              'In Germany, for moves that start and end in Germany. Movers use vans and small trucks of up to 3.5 tonnes.',
            ],
          },
        ],
      },
      {
        id: 'booking',
        heading: 'Booking',
        topics: [
          {
            id: 'types',
            question: 'What is the difference between an instant and a scheduled move?',
            answer: [
              'An instant move is for right now: the request goes to an available mover near the pickup address. A scheduled move is for a date and time you choose; movers see the request and one of them accepts it.',
            ],
          },
          {
            id: 'price',
            question: 'How is the price calculated?',
            answer: [
              'From the details you enter: distance, the size of vehicle needed, the volume and weight of your items, the number of helpers, floors and lift, and packing. You see the full price, including VAT, before you send the request.',
            ],
          },
          {
            id: 'items',
            question: 'What can I have moved?',
            answer: [
              'Household goods, furniture, boxes and other belongings. Not possible: dangerous goods, items that may not lawfully be transported, and waste for disposal.',
            ],
          },
          {
            id: 'extras',
            question: 'Can I book packing or extra helpers?',
            answer: [
              'Yes. For a scheduled move you can choose a packing level and add helpers. Other work, such as furniture assembly, mounting, appliance connection, cleaning or storage, cannot be booked through PickLte.',
            ],
          },
          {
            id: 'photos',
            question: 'Why should I add photos?',
            answer: [
              'Photos help the mover judge the load and bring the right vehicle. Only you, the mover of your move and movers who are shown your open request can see them.',
            ],
          },
        ],
      },
      {
        id: 'payment',
        heading: 'Payment',
        topics: [
          {
            id: 'how',
            question: 'How and when do I pay?',
            answer: [
              'After the move is completed, by card in the app or in cash to the mover. You choose the method when you book.',
            ],
          },
          {
            id: 'fees',
            question: 'Are there extra fees?',
            answer: [
              'No. The price shown before you book already includes VAT and the platform fee. Cancelling through the app costs nothing.',
            ],
          },
        ],
      },
      {
        id: 'during',
        heading: 'During the move',
        topics: [
          {
            id: 'track',
            question: 'Can I see where the mover is?',
            answer: [
              'Yes. Once the mover is on the way to you, you can follow them on the map until the move is finished.',
            ],
          },
          {
            id: 'contact',
            question: 'How do I reach the mover?',
            answer: [
              'Through the chat or an in-app call on the page of your move. You do not need to exchange phone numbers.',
            ],
          },
          {
            id: 'cancel',
            question: 'How do I cancel?',
            answer: [
              'Open the move and choose Cancel. This is possible until the move has started. Please cancel as early as you can, out of fairness to the mover.',
            ],
          },
          {
            id: 'damage',
            question: 'Something was damaged. What do I do?',
            answer: [
              'Take photos straight away and tell the mover in the chat. The mover is responsible for the transport, so your claim is against the mover. If you cannot reach an agreement, write to us through the contact details in the imprint and we will help with the communication.',
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
            question: 'I forgot my password.',
            answer: ['Choose "Forgot password" on the sign-in page. You receive a code by email to set a new password.'],
          },
          {
            id: 'language',
            question: 'How do I change the language?',
            answer: [
              'On the website with the language menu at the top of the page, in the apps under Profile. Eight languages are available.',
            ],
          },
          {
            id: 'delete',
            question: 'How do I delete my account?',
            answer: [
              'In the apps under Profile, on the website in your account settings. You will be asked to sign in again first. Deletion is possible when you have no move under way or booked. Your personal data is then deleted or made anonymous; details are in the privacy policy.',
            ],
          },
        ],
      },
      {
        id: 'movers',
        heading: 'For movers',
        topics: [
          {
            id: 'register',
            question: 'How do I become a mover on PickLte?',
            answer: [
              'Register in the PickLte Mover app or on the website, complete your profile and add your vehicle. You need a photo of yourself, your driving licence, your tax details and the registration data of your vehicle. Once your details have been checked you can go online.',
            ],
          },
          {
            id: 'independent',
            question: 'Am I employed by PickLte?',
            answer: [
              'No. You work as an independent business. You decide when you are online and which requests you accept, and you are responsible for your trade registration, taxes and insurance.',
            ],
          },
          {
            id: 'vehicle',
            question: 'Which vehicles are allowed?',
            answer: [
              'Vehicles of up to 3.5 tonnes permissible gross weight, trailer included. Owned and rented vehicles are both possible; for a rented vehicle you enter the rental period.',
            ],
          },
          {
            id: 'location',
            question: 'When is my location shared?',
            answer: [
              'Only while you are online or on a job. The client of a move sees your position during that move. When you go offline and have no job, your position is deleted.',
            ],
          },
          {
            id: 'earnings',
            question: 'What do I earn, and what is the platform fee?',
            answer: [
              'Every request shows what you earn after VAT and the platform fee, before you accept. With card payment the fee is deducted from your payout. With cash payment you collect the full amount and pay the fee to PickLte within 24 hours; until it is paid you receive no new requests.',
            ],
          },
          {
            id: 'tax',
            question: 'Does PickLte report my income?',
            answer: [
              'Yes, where the law requires it. Platform operators must report the income of sellers to the tax authority (DAC7). You can download your tax statements in the app.',
            ],
          },
        ],
      },
    ],
  },

  // ── Imprint ──────────────────────────────────────────────────────────────
  imprint: {
    title: 'Imprint',
    intro: ['Information in accordance with section 5 of the German Digital Services Act (DDG).'],
    labels: {
      provider: 'Provider',
      address: 'Address',
      representedBy: 'Represented by',
      contact: 'Contact',
      email: 'Email',
      phone: 'Phone',
      register: 'Commercial register',
      vatId: 'VAT identification number',
      responsibleForContent: 'Responsible for the content',
    },
    sections: [
      {
        id: 'role',
        heading: 'Role of the platform',
        paragraphs: [
          'PickLte is an intermediary platform. Moves are carried out by independent movers in their own name and under their own responsibility. The provider named here is not a carrier and not a party to the contract for a move.',
        ],
      },
      {
        id: 'disputes',
        heading: 'Consumer dispute resolution',
        paragraphs: [
          'We are neither obliged nor willing to take part in dispute resolution proceedings before a consumer arbitration board.',
        ],
      },
      {
        id: 'content',
        heading: 'Liability for content',
        paragraphs: [
          'We are responsible for our own content on these pages under the general laws. We are not obliged to monitor information that users transmit or store, or to look for circumstances that point to unlawful activity. Once we learn of a specific infringement we remove the content without delay.',
        ],
      },
      {
        id: 'links',
        heading: 'Liability for links',
        paragraphs: [
          'These pages may link to websites of third parties. Their operators alone are responsible for the content of those websites. If we learn of an infringement we remove the link.',
        ],
      },
      {
        id: 'copyright',
        heading: 'Copyright',
        paragraphs: [
          'The content and works on these pages are protected by copyright. Copying, editing or distributing them beyond what copyright law permits requires our written consent.',
        ],
      },
    ],
  },
}

export default content
