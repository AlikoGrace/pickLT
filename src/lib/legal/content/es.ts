import type { LegalContent } from '../types'

const content: LegalContent = {
  updatedLabel: 'Última actualización: {{date}}',
  languageNotice:
    'Este texto es una traducción facilitada para su comodidad. Si las versiones lingüísticas difieren, se aplica la versión alemana.',
  contentsLabel: 'Índice',
  nav: {
    terms: 'Términos y condiciones',
    privacy: 'Política de privacidad',
    help: 'Ayuda',
    imprint: 'Aviso legal',
  },

  // ── Terms ────────────────────────────────────────────────────────────────
  terms: {
    title: 'Términos y condiciones',
    intro: [
      'Estos términos regulan el uso del sitio web de PickLte y de las aplicaciones PickLte y PickLte Mover. Se aplican a los clientes que buscan un transportista y a los transportistas que ofrecen sus servicios de transporte a través de la plataforma.',
      'La plataforma está gestionada por la empresa indicada en el aviso legal («PickLte», «nosotros»).',
    ],
    sections: [
      {
        id: 'role',
        heading: '1. Qué es PickLte y qué no es',
        paragraphs: [
          'PickLte es una plataforma en línea que pone en contacto a clientes con transportistas independientes. Nosotros aportamos la tecnología: el proceso de reserva, el cálculo del precio, la mensajería, el seguimiento en tiempo real y la gestión de los pagos.',
          'No realizamos mudanzas. No somos una empresa de transporte ni una empresa de mudanzas, no poseemos vehículos, y los transportistas no son empleados ni agentes nuestros.',
          'El contrato de mudanza se celebra directamente entre el cliente y el transportista que acepta la solicitud. Solo el transportista debe el transporte y es responsable de él. Nuestro propio servicio se limita a facilitar el contacto y a gestionar la plataforma.',
        ],
      },
      {
        id: 'scope',
        heading: '2. Qué se puede reservar',
        bullets: [
          'Mudanzas dentro de Alemania. Tanto la recogida como la entrega deben estar en Alemania.',
          'Transporte con vehículos de hasta 3,5 toneladas de masa máxima autorizada, remolque incluido.',
          'Carga, transporte y descarga de enseres domésticos, muebles y otras pertenencias, con embalaje por parte del transportista si el cliente lo elige.',
        ],
        after: [
          'La eliminación de residuos, el montaje de muebles, los trabajos de instalación, la conexión de electrodomésticos, la limpieza y el almacenamiento no se ofrecen a través de la plataforma.',
        ],
      },
      {
        id: 'account',
        heading: '3. Su cuenta',
        bullets: [
          'Necesita una cuenta para reservar o para aceptar una mudanza. Debe tener al menos 18 años.',
          'Cada cuenta es una cuenta de cliente o una cuenta de transportista. Una misma cuenta no puede utilizarse en ambas funciones.',
          'Los datos que facilite deben ser veraces y mantenerse actualizados. Verificamos su dirección de correo electrónico y, cuando se solicita, su número de teléfono.',
          'Mantenga en secreto sus datos de acceso. Usted es responsable de lo que ocurra a través de su cuenta, salvo que no tenga culpa de ello.',
        ],
      },
      {
        id: 'movers',
        heading: '4. Transportistas',
        paragraphs: [
          'Los transportistas utilizan la plataforma como empresas independientes, en su propio nombre y por cuenta propia. Deciden libremente cuándo están disponibles y qué solicitudes aceptan. Pueden trabajar para otros clientes y a través de otras plataformas.',
          'Antes de que un transportista pueda recibir solicitudes, comprobamos los datos facilitados en el registro: una foto de la persona, el permiso de conducir, los datos fiscales y el vehículo con su masa máxima autorizada. En el caso de un vehículo alquilado, pedimos el periodo de alquiler.',
          'Cada transportista es responsable de:',
        ],
        bullets: [
          'el registro de su actividad empresarial y todas las autorizaciones que su trabajo requiera,',
          'sus impuestos y cotizaciones a la seguridad social,',
          'el seguro de su vehículo y de su actividad,',
          'el buen estado del vehículo para circular y el cumplimiento de la normativa de tráfico y de transporte, incluido el límite de 3,5 toneladas,',
          'las personas que le ayudan en una mudanza.',
        ],
        after: [
          'Nuestra comprobación es un control de verosimilitud de los documentos presentados. No constituye una garantía de la calidad de un transportista ni de una mudanza concreta.',
        ],
      },
      {
        id: 'booking',
        heading: '5. Cómo se formaliza una reserva',
        paragraphs: [
          'El cliente describe la mudanza: direcciones, fecha, objetos, acceso en ambas direcciones, ayudantes y embalaje, con fotos cuando resulte útil. Hay dos formas de reservar.',
        ],
        bullets: [
          'Mudanza inmediata: la solicitud se envía a un transportista cercano que está disponible en ese momento. El transportista dispone de un tiempo limitado para aceptarla. Si no lo hace, la solicitud puede ofrecerse a otros transportistas.',
          'Mudanza programada: la solicitud para una fecha posterior se hace visible para los transportistas, y uno de ellos la acepta.',
        ],
        after: [
          'La solicitud es la oferta del cliente de celebrar un contrato de mudanza al precio mostrado. El contrato entre el cliente y el transportista se celebra cuando un transportista acepta la solicitud en la aplicación. Ambas partes son informadas en la aplicación.',
          'No existe ningún derecho a que se encuentre un transportista para una solicitud.',
        ],
      },
      {
        id: 'price',
        heading: '6. Precio',
        paragraphs: [
          'Antes de que el cliente envíe una solicitud, la plataforma muestra el precio de la mudanza. Se calcula a partir de los datos facilitados por el cliente: distancia, tamaño del vehículo, volumen y peso de los objetos, número de ayudantes, plantas y acceso, embalaje, y si la mudanza es inmediata o programada. El precio incluye el IVA legal cuando corresponde, e incluye la comisión de la plataforma.',
          'El precio se basa en la información del cliente. Si los objetos o las condiciones en el lugar difieren sustancialmente de lo indicado, el transportista puede negarse a realizar la mudanza tal como se reservó.',
        ],
      },
      {
        id: 'payment',
        heading: '7. Pago y comisión de la plataforma',
        bullets: [
          'El cliente paga al transportista una vez finalizada la mudanza, ya sea con tarjeta en la aplicación o en efectivo al transportista.',
          'Los pagos con tarjeta son procesados por nuestro proveedor de pagos Stripe. No almacenamos números de tarjeta.',
          'Por facilitar la mudanza recibimos del transportista una comisión de la plataforma. Es una parte del precio y se muestra al transportista antes de que acepte.',
          'En el pago con tarjeta, la comisión se deduce antes de abonar el importe al transportista. En el pago en efectivo, el transportista nos debe la comisión y debe pagarla en un plazo de 24 horas tras la mudanza. Mientras una comisión esté vencida, el transportista no recibe nuevas solicitudes.',
        ],
      },
      {
        id: 'cancellation',
        heading: '8. Cambios y cancelación',
        paragraphs: [
          'Un cliente puede cancelar una solicitud en la aplicación mientras la mudanza no haya comenzado. Un transportista puede renunciar a una mudanza que ha aceptado. En ese caso, la solicitud puede ofrecerse a otros transportistas.',
          'No cobramos ninguna tarifa por cancelar. Las reclamaciones que el cliente y el transportista puedan tener entre sí a causa de una cancelación tardía se rigen por su contrato y por la ley.',
          'Los derechos legales de desistimiento de los consumidores no se ven afectados.',
        ],
      },
      {
        id: 'performance',
        heading: '9. Realización de la mudanza, daños y reclamaciones',
        paragraphs: [
          'El transportista realiza la mudanza bajo su propia responsabilidad. Las reclamaciones derivadas de la mudanza, en particular por daños o pérdida de bienes, por retraso o por una mudanza que no se llevó a cabo, son reclamaciones contra el transportista en virtud del contrato y de la normativa de transporte.',
          'Documente los daños de inmediato, con fotos, y comuníqueselos al transportista en el chat. Ayudamos en la comunicación entre ambas partes y podemos transmitir los datos necesarios para hacer valer una reclamación, pero no resolvemos litigios ni pagamos indemnizaciones en nombre de un transportista.',
        ],
      },
      {
        id: 'conduct',
        heading: '10. Normas de uso',
        bullets: [
          'Facilite información completa y veraz sobre la mudanza y sobre usted.',
          'No reserve el transporte de mercancías peligrosas, de objetos cuyo transporte no esté permitido por la ley ni de residuos para su eliminación.',
          'Trátense con respeto. Las amenazas, la discriminación y el acoso conllevan la exclusión.',
          'Las valoraciones deben reflejar su propia experiencia de una mudanza que haya tenido lugar.',
          'No interfiera en el funcionamiento de la plataforma, no extraiga sus datos por medios automatizados y no utilice la cuenta de otra persona.',
        ],
      },
      {
        id: 'ranking',
        heading: '11. Cómo se muestran los transportistas a los clientes',
        paragraphs: [
          'Cuando un cliente busca un transportista, la plataforma tiene en cuenta a los transportistas verificados, conectados y que no están en otro trabajo, cuyo vehículo es adecuado para la carga. Entre ellos, el factor principal es la distancia a la dirección de recogida: el transportista más cercano se muestra en primer lugar.',
          'Los transportistas no pueden pagar por una mejor posición.',
        ],
      },
      {
        id: 'liability',
        heading: '12. Nuestra responsabilidad',
        paragraphs: [
          'Respondemos sin limitación por dolo y negligencia grave, por daños a la vida, la integridad física o la salud, y cuando la ley establece una responsabilidad que no puede excluirse.',
          'En casos de negligencia leve respondemos únicamente por el incumplimiento de una obligación esencial del contrato con nosotros, y en tal caso solo por el daño previsible y típico de un contrato de este tipo.',
          'No respondemos de la ejecución de la mudanza ni de la conducta de clientes y transportistas entre sí, porque no somos parte de su contrato. No prometemos que la plataforma esté disponible sin interrupciones.',
        ],
      },
      {
        id: 'termination',
        heading: '13. Fin del uso, suspensión',
        paragraphs: [
          'Puede eliminar su cuenta en cualquier momento en la aplicación o en el sitio web. Esto es posible cuando no hay ninguna mudanza en curso o reservada y, en el caso de los transportistas, cuando no hay ninguna comisión de la plataforma pendiente de pago ni ningún abono pendiente.',
          'Podemos restringir o suspender una cuenta si existe un motivo grave, en particular datos o documentos falsos, un incumplimiento de estos términos, una comisión de la plataforma impagada o un riesgo para otros usuarios. Comunicamos los motivos al usuario. Los transportistas pueden presentar una objeción a través de los datos de contacto del aviso legal. Examinamos cada reclamación y le damos respuesta.',
          'Podemos poner fin al contrato con un transportista con un preaviso de 30 días. El derecho a ponerle fin sin preaviso por causa justificada no se ve afectado.',
        ],
      },
      {
        id: 'changes',
        heading: '14. Cambios en estos términos',
        paragraphs: [
          'Podemos modificar estos términos con efectos para el futuro si existe un motivo válido, como un cambio en la ley o en la plataforma. Anunciamos los cambios por correo electrónico o en la aplicación al menos 30 días antes de que entren en vigor. Si no está de acuerdo, puede eliminar su cuenta antes de esa fecha.',
        ],
      },
      {
        id: 'law',
        heading: '15. Ley aplicable y litigios',
        paragraphs: [
          'Se aplica el derecho alemán. Los consumidores conservan además la protección de las normas imperativas del país en el que tienen su residencia habitual.',
          'No estamos obligados ni dispuestos a participar en procedimientos de resolución de litigios ante una entidad de resolución de litigios en materia de consumo.',
          'Si alguna disposición de estos términos fuera inválida, las demás disposiciones seguirán en vigor.',
        ],
      },
    ],
  },

  // ── Privacy ──────────────────────────────────────────────────────────────
  privacy: {
    title: 'Política de privacidad',
    intro: [
      'Esta política explica qué datos personales se tratan cuando utiliza el sitio web de PickLte y las aplicaciones PickLte y PickLte Mover, con qué finalidad y qué derechos tiene usted.',
    ],
    sections: [
      {
        id: 'controller',
        heading: '1. Quién es el responsable',
        paragraphs: [
          'El responsable del tratamiento en el sentido del Reglamento General de Protección de Datos (RGPD) es la empresa indicada en el aviso legal. Puede dirigirse a nosotros para cualquier cuestión de privacidad a través de los datos de contacto que allí figuran.',
        ],
      },
      {
        id: 'data',
        heading: '2. Qué datos tratamos',
        bullets: [
          'Cuenta: nombre, dirección de correo electrónico, número de teléfono, foto de perfil, idioma, y si usted es cliente o transportista. Si inicia sesión con Google, recibimos de Google su nombre, su dirección de correo electrónico y su imagen de perfil.',
          'Mudanzas: direcciones de recogida y de entrega, fecha y hora, la lista de objetos, datos sobre el acceso y las plantas, notas, fotos de los objetos, el nombre de una empresa en una mudanza profesional, el precio y el estado de la mudanza.',
          'Además, en el caso de los transportistas: una foto suya, una foto de su permiso de conducir, su dirección y sus datos fiscales, sus vehículos con matrícula, masa máxima autorizada y fotos, los periodos de alquiler, las personas de su equipo, sus ingresos y las comisiones de la plataforma.',
          'Ubicación: véase el apartado 4.',
          'Comunicación: los mensajes de chat entre cliente y transportista relativos a una mudanza y, en las llamadas dentro de la aplicación, quién llamó a quién, cuándo y durante cuánto tiempo. Las llamadas no se graban.',
          'Pago: importe, momento, método y estado de un pago. Los datos de la tarjeta van directamente al proveedor de pagos y nosotros no los almacenamos.',
          'Dispositivo y uso: el token de notificaciones push de su dispositivo, la versión de la aplicación, el sistema operativo y los registros técnicos con la dirección IP y la hora de una solicitud.',
          'Las valoraciones que usted da o recibe.',
        ],
      },
      {
        id: 'purposes',
        heading: '3. Por qué los tratamos y con qué base jurídica',
        bullets: [
          'Para gestionar su cuenta y para facilitar y tramitar mudanzas entre clientes y transportistas: ejecución de un contrato, art. 6, apartado 1, letra b), del RGPD.',
          'Para comprobar los documentos de los transportistas antes de su admisión, para prevenir el uso indebido y el fraude, para mantener la seguridad de la plataforma y para detectar y corregir errores: nuestro interés legítimo en una plataforma segura y que funcione, art. 6, apartado 1, letra f), del RGPD.',
          'Para cumplir obligaciones de la legislación fiscal y mercantil, incluida la comunicación de los ingresos de los transportistas a la autoridad tributaria conforme a la Ley de transparencia fiscal de las plataformas (DAC7): obligación legal, art. 6, apartado 1, letra c), del RGPD.',
          'Para utilizar la ubicación, la cámara, la galería de fotos y las notificaciones de su dispositivo: su consentimiento, art. 6, apartado 1, letra a), del RGPD, que usted otorga o retira en los ajustes de su dispositivo.',
        ],
      },
      {
        id: 'location',
        heading: '4. Ubicación',
        paragraphs: [
          'La posición de un transportista se registra únicamente mientras el transportista está conectado o en un trabajo. Un cliente ve la posición de un transportista solo para su propia mudanza y mientras esa mudanza está en curso. Antes de eso, los clientes que buscan un transportista solo ven posiciones aproximadas.',
          'Cuando un transportista se desconecta y no está en un trabajo, la posición almacenada se elimina. No se conserva un historial de rutas.',
          'Los clientes pueden permitir que la aplicación utilice su ubicación para rellenar la dirección de recogida. Esto es opcional.',
        ],
      },
      {
        id: 'photos',
        heading: '5. Fotos y documentos',
        paragraphs: [
          'Las fotos de una mudanza solo pueden verlas el cliente, el transportista que aceptó la mudanza y los transportistas a los que se muestra la solicitud abierta. Se entregan mediante enlaces que caducan al cabo de poco tiempo.',
          'Los permisos de conducir y otros documentos de los transportistas solo pueden verlos el propio transportista y el personal que los revisa.',
        ],
      },
      {
        id: 'recipients',
        heading: '6. Quién recibe los datos',
        paragraphs: [
          'La otra parte de una mudanza recibe lo necesario para llevarla a cabo. El cliente ve el nombre, la foto, el vehículo y las valoraciones del transportista y, durante la mudanza, la posición del transportista. El transportista ve el nombre del cliente, las direcciones, los objetos y las fotos. Los números de teléfono solo se transmiten cuando es necesario para una mudanza aceptada. Las llamadas pueden realizarse en la aplicación sin revelar ningún número.',
          'Recurrimos a proveedores de servicios que tratan datos por encargo nuestro y con arreglo a un contrato:',
        ],
        bullets: [
          'Appwrite: base de datos, almacenamiento de archivos, inicio de sesión y envío de notificaciones, alojado en Fráncfort, Alemania.',
          'Vercel: alojamiento del sitio web.',
          'Stripe: procesamiento de pagos y abonos. Stripe es a su vez responsable del tratamiento para una parte de estas operaciones.',
          'Mapbox: mapas, búsqueda de direcciones y cálculo de rutas.',
          'Google: inicio de sesión con Google y envío de notificaciones push (Firebase Cloud Messaging).',
          'LiveKit: transmisión de las llamadas dentro de la aplicación.',
          'Sentry: informes de errores, almacenados en la UE, de los que se eliminan los datos personales antes de enviarlos.',
        ],
        after: [
          'Transmitimos datos a las autoridades cuando la ley lo exige, en particular los datos de ingresos de los transportistas a la Oficina Federal Central de Impuestos.',
          'Algunos de estos proveedores tienen su sede en Estados Unidos o pueden tratar datos allí. En ese caso, la transferencia se basa en el Marco de Privacidad de Datos UE-EE. UU. o en las cláusulas contractuales tipo de la Comisión Europea.',
          'No vendemos datos personales ni los utilizamos para publicidad de terceros.',
        ],
      },
      {
        id: 'cookies',
        heading: '7. Cookies y almacenamiento local en el sitio web',
        bullets: [
          'Una cookie de sesión mantiene su sesión iniciada.',
          'Una cookie de idioma recuerda el idioma que ha elegido.',
          'El almacenamiento local del navegador conserva una reserva que usted ha iniciado para que no se pierda al recargar la página.',
        ],
        after: [
          'Estos elementos son necesarios para que el sitio web funcione. El sitio web no utiliza cookies publicitarias ni herramientas de análisis que rastreen a los visitantes entre sitios web. La supervisión de errores de Sentry registra errores técnicos.',
        ],
      },
      {
        id: 'retention',
        heading: '8. Cuánto tiempo conservamos los datos',
        bullets: [
          'Datos de la cuenta: mientras exista la cuenta.',
          'Después de que elimine su cuenta: su perfil, sus fotos, documentos, direcciones, mensajes y datos del dispositivo se eliminan o se anonimizan. Las mudanzas finalizadas permanecen como registros anónimos sin su nombre.',
          'Datos que la legislación fiscal y mercantil nos obliga a conservar, como facturas, justificantes de pago y los datos de identidad y fiscales de los transportistas: hasta diez años, almacenados por separado con acceso restringido, y después eliminados.',
          'Registros técnicos: durante un periodo breve, según sea necesario para la seguridad y la resolución de incidencias.',
        ],
      },
      {
        id: 'rights',
        heading: '9. Sus derechos',
        paragraphs: ['Conforme al RGPD, usted tiene derecho a:'],
        bullets: [
          'obtener información sobre sus datos y una copia de ellos,',
          'que se rectifiquen los datos inexactos,',
          'que se supriman los datos o se limite su tratamiento,',
          'recibir en un formato portable los datos que haya facilitado,',
          'oponerse al tratamiento que se base en nuestros intereses legítimos,',
          'retirar un consentimiento en cualquier momento con efectos para el futuro.',
        ],
        after: [
          'Para ejercer un derecho, escriba a los datos de contacto del aviso legal. También tiene derecho a presentar una reclamación ante una autoridad de control en materia de protección de datos, en particular la de su lugar de residencia.',
        ],
      },
      {
        id: 'deletion',
        heading: '10. Eliminación de su cuenta',
        paragraphs: [
          'Puede eliminar su cuenta usted mismo: en las aplicaciones, en Perfil, y en el sitio web, en los ajustes de su cuenta. Por seguridad, se le pide que vuelva a iniciar sesión poco antes. La eliminación es posible cuando no hay ninguna mudanza en curso o reservada y, en el caso de los transportistas, cuando no hay ninguna comisión de la plataforma pendiente de pago ni ningún abono pendiente.',
        ],
      },
      {
        id: 'security',
        heading: '11. Seguridad',
        paragraphs: [
          'Los datos se transmiten cifrados. El acceso a los datos está limitado por función: cada usuario accede únicamente a sus propios datos y a las mudanzas en las que participa. El acceso del personal se limita a lo que la tarea requiere y queda registrado.',
        ],
      },
      {
        id: 'automated',
        heading: '12. Tratamiento automatizado',
        paragraphs: [
          'El precio de una mudanza y la selección de transportistas que se muestran para una solicitud se calculan automáticamente a partir de los datos de la mudanza. No se adopta ninguna decisión con efectos jurídicos para usted únicamente por medios automatizados. La admisión de un transportista la decide una persona.',
          'La plataforma no está destinada a menores de 18 años.',
        ],
      },
      {
        id: 'changes',
        heading: '13. Cambios en esta política',
        paragraphs: [
          'Actualizamos esta política cuando cambian la plataforma o la ley. La versión vigente está siempre disponible en esta página.',
        ],
      },
    ],
  },

  // ── Help ─────────────────────────────────────────────────────────────────
  help: {
    title: 'Ayuda',
    intro: [
      'Respuestas a las preguntas más frecuentes sobre la reserva de una mudanza y sobre el trabajo como transportista en PickLte.',
    ],
    groups: [
      {
        id: 'about',
        heading: 'Acerca de PickLte',
        topics: [
          {
            id: 'what',
            question: '¿Qué es PickLte?',
            answer: [
              'PickLte es una plataforma que pone en contacto a personas que necesitan una mudanza con transportistas independientes. Usted describe la mudanza, ve el precio y un transportista la acepta.',
            ],
          },
          {
            id: 'who',
            question: '¿Quién realiza mi mudanza?',
            answer: [
              'Un transportista independiente, no PickLte. Su contrato de mudanza es con el transportista que acepta su solicitud. PickLte facilita el contacto y proporciona la reserva, el seguimiento y el pago.',
            ],
          },
          {
            id: 'where',
            question: '¿Dónde está disponible PickLte?',
            answer: [
              'En Alemania, para mudanzas que empiezan y terminan en Alemania. Los transportistas utilizan furgonetas y camiones pequeños de hasta 3,5 toneladas.',
            ],
          },
        ],
      },
      {
        id: 'booking',
        heading: 'Reserva',
        topics: [
          {
            id: 'types',
            question: '¿Qué diferencia hay entre una mudanza inmediata y una programada?',
            answer: [
              'Una mudanza inmediata es para ahora mismo: la solicitud se envía a un transportista disponible cerca de la dirección de recogida. Una mudanza programada es para la fecha y la hora que usted elija: los transportistas ven la solicitud y uno de ellos la acepta.',
            ],
          },
          {
            id: 'price',
            question: '¿Cómo se calcula el precio?',
            answer: [
              'A partir de los datos que usted introduce: distancia, tamaño del vehículo necesario, volumen y peso de sus objetos, número de ayudantes, plantas y ascensor, y embalaje. Usted ve el precio completo, IVA incluido, antes de enviar la solicitud.',
            ],
          },
          {
            id: 'items',
            question: '¿Qué puedo trasladar?',
            answer: [
              'Enseres domésticos, muebles, cajas y otras pertenencias. No es posible: mercancías peligrosas, objetos cuyo transporte no esté permitido por la ley y residuos para su eliminación.',
            ],
          },
          {
            id: 'extras',
            question: '¿Puedo reservar embalaje o ayudantes adicionales?',
            answer: [
              'Sí. En una mudanza programada puede elegir un nivel de embalaje y añadir ayudantes. Otros trabajos, como el montaje de muebles, la instalación, la conexión de electrodomésticos, la limpieza o el almacenamiento, no pueden reservarse a través de PickLte.',
            ],
          },
          {
            id: 'photos',
            question: '¿Por qué debería añadir fotos?',
            answer: [
              'Las fotos ayudan al transportista a valorar la carga y a traer el vehículo adecuado. Solo pueden verlas usted, el transportista de su mudanza y los transportistas a los que se muestra su solicitud abierta.',
            ],
          },
        ],
      },
      {
        id: 'payment',
        heading: 'Pago',
        topics: [
          {
            id: 'how',
            question: '¿Cómo y cuándo pago?',
            answer: [
              'Una vez finalizada la mudanza, con tarjeta en la aplicación o en efectivo al transportista. Usted elige el método al reservar.',
            ],
          },
          {
            id: 'fees',
            question: '¿Hay cargos adicionales?',
            answer: [
              'No. El precio que se muestra antes de reservar ya incluye el IVA y la comisión de la plataforma. Cancelar a través de la aplicación no cuesta nada.',
            ],
          },
        ],
      },
      {
        id: 'during',
        heading: 'Durante la mudanza',
        topics: [
          {
            id: 'track',
            question: '¿Puedo ver dónde está el transportista?',
            answer: [
              'Sí. Una vez que el transportista está de camino hacia usted, puede seguirlo en el mapa hasta que termine la mudanza.',
            ],
          },
          {
            id: 'contact',
            question: '¿Cómo me pongo en contacto con el transportista?',
            answer: [
              'A través del chat o de una llamada dentro de la aplicación, en la página de su mudanza. No es necesario intercambiar números de teléfono.',
            ],
          },
          {
            id: 'cancel',
            question: '¿Cómo cancelo?',
            answer: [
              'Abra la mudanza y elija Cancelar. Esto es posible hasta que la mudanza haya comenzado. Por favor, cancele lo antes posible, por consideración hacia el transportista.',
            ],
          },
          {
            id: 'damage',
            question: 'Algo ha resultado dañado. ¿Qué hago?',
            answer: [
              'Haga fotos de inmediato y comuníqueselo al transportista en el chat. El transportista es responsable del transporte, por lo que su reclamación se dirige contra el transportista. Si no logran llegar a un acuerdo, escríbanos a través de los datos de contacto del aviso legal y le ayudaremos con la comunicación.',
            ],
          },
        ],
      },
      {
        id: 'account',
        heading: 'Cuenta',
        topics: [
          {
            id: 'password',
            question: 'He olvidado mi contraseña.',
            answer: [
              'Elija «He olvidado mi contraseña» en la página de inicio de sesión. Recibirá un código por correo electrónico para establecer una nueva contraseña.',
            ],
          },
          {
            id: 'language',
            question: '¿Cómo cambio el idioma?',
            answer: [
              'En el sitio web, con el menú de idiomas de la parte superior de la página, y en las aplicaciones, en Perfil. Hay ocho idiomas disponibles.',
            ],
          },
          {
            id: 'delete',
            question: '¿Cómo elimino mi cuenta?',
            answer: [
              'En las aplicaciones, en Perfil, y en el sitio web, en los ajustes de su cuenta. Antes se le pedirá que vuelva a iniciar sesión. La eliminación es posible cuando no tiene ninguna mudanza en curso o reservada. Sus datos personales se eliminan o se anonimizan entonces. Los detalles figuran en la política de privacidad.',
            ],
          },
        ],
      },
      {
        id: 'movers',
        heading: 'Para transportistas',
        topics: [
          {
            id: 'register',
            question: '¿Cómo me convierto en transportista en PickLte?',
            answer: [
              'Regístrese en la aplicación PickLte Mover o en el sitio web, complete su perfil y añada su vehículo. Necesita una foto suya, su permiso de conducir, sus datos fiscales y los datos de matriculación de su vehículo. Una vez comprobados sus datos, puede conectarse.',
            ],
          },
          {
            id: 'independent',
            question: '¿Soy empleado de PickLte?',
            answer: [
              'No. Usted trabaja como empresa independiente. Usted decide cuándo está conectado y qué solicitudes acepta, y es responsable del registro de su actividad empresarial, de sus impuestos y de sus seguros.',
            ],
          },
          {
            id: 'vehicle',
            question: '¿Qué vehículos están permitidos?',
            answer: [
              'Vehículos de hasta 3,5 toneladas de masa máxima autorizada, remolque incluido. Son posibles tanto los vehículos propios como los alquilados. En el caso de un vehículo alquilado, usted introduce el periodo de alquiler.',
            ],
          },
          {
            id: 'location',
            question: '¿Cuándo se comparte mi ubicación?',
            answer: [
              'Solo mientras está conectado o en un trabajo. El cliente de una mudanza ve su posición durante esa mudanza. Cuando usted se desconecta y no tiene ningún trabajo, su posición se elimina.',
            ],
          },
          {
            id: 'earnings',
            question: '¿Cuánto gano y qué es la comisión de la plataforma?',
            answer: [
              'Cada solicitud muestra, antes de que la acepte, lo que usted gana una vez descontados el IVA y la comisión de la plataforma. En el pago con tarjeta, la comisión se deduce de su abono. En el pago en efectivo, usted cobra el importe íntegro y paga la comisión a PickLte en un plazo de 24 horas. Hasta que esté pagada, no recibe nuevas solicitudes.',
            ],
          },
          {
            id: 'tax',
            question: '¿Comunica PickLte mis ingresos?',
            answer: [
              'Sí, cuando la ley lo exige. Los operadores de plataformas deben comunicar los ingresos de los vendedores a la autoridad tributaria (DAC7). Puede descargar sus certificados fiscales en la aplicación.',
            ],
          },
        ],
      },
    ],
  },

  // ── Imprint ──────────────────────────────────────────────────────────────
  imprint: {
    title: 'Aviso legal',
    intro: ['Información conforme al § 5 de la Ley alemana de Servicios Digitales (DDG).'],
    labels: {
      provider: 'Prestador',
      address: 'Dirección',
      representedBy: 'Representado por',
      contact: 'Contacto',
      email: 'Correo electrónico',
      phone: 'Teléfono',
      register: 'Registro mercantil',
      vatId: 'Número de identificación a efectos del IVA',
      responsibleForContent: 'Responsable del contenido',
    },
    sections: [
      {
        id: 'role',
        heading: 'Función de la plataforma',
        paragraphs: [
          'PickLte es una plataforma de intermediación. Las mudanzas son realizadas por transportistas independientes, en su propio nombre y bajo su propia responsabilidad. El prestador aquí indicado no es una empresa de transporte ni es parte del contrato de mudanza.',
        ],
      },
      {
        id: 'disputes',
        heading: 'Resolución de litigios en materia de consumo',
        paragraphs: [
          'No estamos obligados ni dispuestos a participar en procedimientos de resolución de litigios ante una entidad de resolución de litigios en materia de consumo.',
        ],
      },
      {
        id: 'content',
        heading: 'Responsabilidad por los contenidos',
        paragraphs: [
          'Somos responsables de nuestros propios contenidos en estas páginas conforme a las leyes generales. No estamos obligados a supervisar la información que los usuarios transmiten o almacenan, ni a buscar circunstancias que indiquen una actividad ilícita. En cuanto tenemos conocimiento de una infracción concreta, retiramos el contenido sin demora.',
        ],
      },
      {
        id: 'links',
        heading: 'Responsabilidad por los enlaces',
        paragraphs: [
          'Estas páginas pueden contener enlaces a sitios web de terceros. Solo sus operadores son responsables del contenido de esos sitios web. Si tenemos conocimiento de una infracción, retiramos el enlace.',
        ],
      },
      {
        id: 'copyright',
        heading: 'Derechos de autor',
        paragraphs: [
          'Los contenidos y las obras de estas páginas están protegidos por derechos de autor. Copiarlos, modificarlos o distribuirlos más allá de lo que permite la legislación sobre derechos de autor requiere nuestro consentimiento por escrito.',
        ],
      },
    ],
  },
}

export default content
