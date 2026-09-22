/**
 * Documentos legales del sitio (privacidad, términos, normas de la comunidad y
 * cookies). Cada uno se sirve en su propia ruta con LegalDocumentPage.
 */
export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  slug: string;
  path: string;
  title: string;
  /** Resumen para el <meta name="description">. */
  description: string;
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
}

const UPDATED_AT = '19 de septiembre de 2026';

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: 'privacidad',
    path: '/privacidad',
    title: 'Política de Privacidad',
    description: 'Qué datos recoge MangaMukai, para qué los usa, con quién los comparte y cómo puedes ejercer tus derechos.',
    updatedAt: UPDATED_AT,
    intro: 'Esta política explica qué información recogemos cuando usas MangaMukai, con qué fin la tratamos y qué control tienes sobre ella. Al usar el sitio aceptas lo aquí descrito.',
    sections: [
      {
        heading: 'Responsable y alcance',
        paragraphs: [
          'MangaMukai (mangamukai.com) es el responsable del tratamiento de los datos que se recogen a través de la web y de sus funciones de cuenta, lectura, comunidad y mensajería. Esta política aplica a todos los visitantes y usuarios registrados.',
        ],
      },
      {
        heading: 'Datos que recopilamos',
        paragraphs: [
          'Datos de cuenta: correo electrónico, nombre de usuario, contraseña cifrada, avatar y fecha de nacimiento cuando la facilitas para acceder a contenido para mayores de edad.',
          'Datos de actividad: mangas guardados, progreso de lectura, capítulos desbloqueados, saldo y movimientos de Mukai Coins, publicaciones, comentarios, mensajes privados y notificaciones.',
          'Datos técnicos: dirección IP, tipo de navegador y dispositivo, páginas visitadas y fecha y hora de acceso, recogidos de forma automática para el funcionamiento y la seguridad del servicio.',
        ],
      },
      {
        heading: 'Para qué usamos tus datos',
        paragraphs: [
          'Para crear y mantener tu cuenta, recordar tu progreso y tus guardados, procesar compras de capítulos, mostrarte notificaciones y permitir la comunicación con otros lectores.',
          'Para mantener el sitio seguro, detectar usos abusivos, medir de forma agregada qué contenidos se leen más y mejorar el servicio. No usamos tus datos para publicidad personalizada de terceros.',
        ],
      },
      {
        heading: 'Cookies y almacenamiento local',
        paragraphs: [
          'Usamos cookies y el almacenamiento del navegador para mantener tu sesión iniciada y recordar preferencias como el tema, el zoom o el modo de lectura. El detalle está en la Política de Cookies.',
        ],
      },
      {
        heading: 'Pagos',
        paragraphs: [
          'Los pagos y donaciones se procesan íntegramente en PayPal. MangaMukai recibe únicamente la confirmación de la operación y nunca almacena números de tarjeta ni credenciales bancarias.',
        ],
      },
      {
        heading: 'Con quién compartimos la información',
        paragraphs: [
          'Solo con los proveedores necesarios para operar el servicio: alojamiento web, procesador de pagos y envío de correos. Estos proveedores tratan los datos por cuenta de MangaMukai y con el único fin de prestar su servicio.',
          'No vendemos ni cedemos tus datos a terceros con fines comerciales. Podríamos facilitarlos a una autoridad competente si una obligación legal así lo exige.',
        ],
      },
      {
        heading: 'Conservación y seguridad',
        paragraphs: [
          'Conservamos tus datos mientras tu cuenta esté activa. Si la eliminas, borramos la información asociada en un plazo razonable, salvo la que debamos conservar por motivos legales o de seguridad.',
          'Aplicamos medidas técnicas y organizativas razonables (cifrado de contraseñas, conexiones seguras, control de accesos) para proteger la información frente a accesos no autorizados.',
        ],
      },
      {
        heading: 'Tus derechos',
        paragraphs: [
          'Puedes acceder a tus datos, corregirlos, descargar tu información o solicitar la eliminación de tu cuenta desde tu perfil o escribiéndonos a contacto@mangamukai.com. Atenderemos la solicitud en un plazo máximo de treinta días.',
        ],
      },
      {
        heading: 'Menores de edad',
        paragraphs: [
          'La colección +19 está reservada a mayores de dieciocho años. Si detectamos una cuenta de un menor con acceso a ese contenido, la restringiremos y eliminaremos los datos asociados.',
        ],
      },
      {
        heading: 'Cambios en esta política',
        paragraphs: [
          'Podemos actualizar esta política para reflejar cambios en el servicio o en la normativa. La fecha de la última revisión figura al inicio del documento; los cambios relevantes se anunciarán en el sitio.',
        ],
      },
    ],
  },
  {
    slug: 'terminos',
    path: '/terminos',
    title: 'Términos de Servicio',
    description: 'Condiciones de uso de MangaMukai: cuentas, Mukai Coins, contenido +19, conducta permitida y responsabilidad.',
    updatedAt: UPDATED_AT,
    intro: 'Estos términos regulan el uso de MangaMukai. Al acceder al sitio, crear una cuenta o leer cualquier capítulo aceptas cumplirlos en su totalidad.',
    sections: [
      {
        heading: 'Aceptación',
        paragraphs: [
          'El uso de MangaMukai supone la aceptación de estos Términos de Servicio, de la Política de Privacidad, de la Política de Cookies y de las Normas de la Comunidad. Si no estás de acuerdo con alguno de ellos, no utilices el servicio.',
        ],
      },
      {
        heading: 'La plataforma',
        paragraphs: [
          'MangaMukai ofrece una plataforma de lectura digital de manga, manhwa y manhua en español, con funciones de comunidad y mensajería. El servicio se presta para uso personal y no comercial.',
          'Los contenidos publicados son adaptaciones y traducciones que pueden contener errores; para la versión original, adquiere la obra oficial cuando esté disponible en tu país.',
        ],
      },
      {
        heading: 'Cuenta de usuario',
        paragraphs: [
          'Para guardar mangas, comprar capítulos o participar en la comunidad necesitas una cuenta. Eres responsable de la veracidad de tus datos y de la confidencialidad de tu contraseña, así como de toda actividad realizada desde tu cuenta.',
          'Podemos suspender o cerrar cuentas que incumplan estos términos, que muestren actividad fraudulenta o que permanezcan inactivas durante un periodo prolongado.',
        ],
      },
      {
        heading: 'Mukai Coins y compras',
        paragraphs: [
          'Las Mukai Coins son bienes virtuales que solo sirven para desbloquear capítulos dentro de MangaMukai. No tienen valor monetario fuera de la plataforma, no son reembolsables ni transferibles entre cuentas y pueden caducar si la cuenta se cierra.',
          'Un capítulo desbloqueado queda vinculado a la cuenta que lo compró. Los precios pueden cambiar en cualquier momento sin afectar a los desbloqueos ya realizados.',
        ],
      },
      {
        heading: 'Contenido para mayores de edad',
        paragraphs: [
          'La colección +19 solo puede consultarse por personas mayores de dieciocho años. Al entrar en ella declaras cumplir ese requisito y aceptas que el contenido puede incluir escenas de carácter adulto.',
        ],
      },
      {
        heading: 'Conducta prohibida',
        paragraphs: [
          'No está permitido extraer contenido de forma automatizada, redistribuir capítulos, compartir cuentas premium, manipular el sistema de monedas, suplantar a otras personas, publicar spam o mensajes ofensivos, ni intentar vulnerar la seguridad del sitio.',
        ],
      },
      {
        heading: 'Propiedad intelectual',
        paragraphs: [
          'El diseño, el nombre, los logotipos y el software de MangaMukai son propiedad de sus titulares. Las obras publicadas pertenecen a sus autores y editoriales; si eres titular de derechos y consideras que un contenido debe retirarse, escríbenos a legal@mangamukai.com indicando la obra y la dirección exacta.',
        ],
      },
      {
        heading: 'Disponibilidad del servicio',
        paragraphs: [
          'Trabajamos para que el sitio esté disponible de forma continua, pero puede haber interrupciones por mantenimiento, fallos técnicos o causas ajenas. Podemos modificar, limitar o retirar funciones y contenidos en cualquier momento.',
        ],
      },
      {
        heading: 'Limitación de responsabilidad',
        paragraphs: [
          'MangaMukai se ofrece tal cual. No garantizamos que el servicio esté libre de errores ni respondemos de daños indirectos derivados de su uso, de la pérdida de datos o de la imposibilidad de acceder al contenido, en la medida que la ley lo permita.',
        ],
      },
      {
        heading: 'Modificaciones y contacto',
        paragraphs: [
          'Podemos actualizar estos términos; la versión vigente es siempre la publicada en esta página con su fecha de revisión. Para cualquier consulta escríbenos a contacto@mangamukai.com.',
        ],
      },
    ],
  },
  {
    slug: 'normas-comunidad',
    path: '/normas-comunidad',
    title: 'Normas de la Comunidad',
    description: 'Reglas de convivencia de la comunidad y la mensajería de MangaMukai, y cómo se modera.',
    updatedAt: UPDATED_AT,
    intro: 'La comunidad de MangaMukai existe para compartir lecturas, recomendaciones y arte. Estas normas aplican a publicaciones, comentarios, mensajes privados, perfiles y cualquier otro espacio donde participes.',
    sections: [
      {
        heading: 'Respeto ante todo',
        paragraphs: [
          'Trata a los demás como quieres que te traten. No se toleran el acoso, las amenazas, los insultos, la discriminación por origen, género, orientación, religión o discapacidad, ni la publicación de datos personales de otras personas.',
        ],
      },
      {
        heading: 'Contenido permitido',
        paragraphs: [
          'Reseñas, recomendaciones, teorías, fan art propio o con crédito a su autor, dudas sobre capítulos y conversación sobre manga, manhwa y manhua. Marca los spoilers de forma clara antes de contarlos.',
        ],
      },
      {
        heading: 'Contenido prohibido',
        paragraphs: [
          'Material sexual explícito fuera de la colección +19, violencia gráfica gratuita, contenido que sexualice a menores, publicidad o promoción no autorizada, enlaces a descargas ilegales o a sitios que redistribuyan las obras, y cualquier mensaje repetitivo o automatizado.',
        ],
      },
      {
        heading: 'Mensajes privados',
        paragraphs: [
          'La mensajería es para conversar con otros lectores. Respeta a quien no quiera seguir una conversación, no envíes mensajes masivos ni no solicitados y no uses el chat para acosar, vender o estafar.',
        ],
      },
      {
        heading: 'Perfiles y avatares',
        paragraphs: [
          'El nombre de usuario, la biografía y el avatar no pueden suplantar a otras personas, incluir insultos, símbolos de odio ni imágenes explícitas. Los perfiles que incumplan esta norma se editarán o suspenderán.',
        ],
      },
      {
        heading: 'Reportes y moderación',
        paragraphs: [
          'Puedes reportar cualquier publicación, comentario o mensaje desde la propia comunidad o escribiendo a contacto@mangamukai.com. El equipo revisa los avisos y puede retirar contenido, avisar al autor, silenciarlo temporalmente o cerrar su cuenta según la gravedad y la reincidencia.',
        ],
      },
      {
        heading: 'Apelaciones',
        paragraphs: [
          'Si crees que una medida fue un error, escríbenos indicando tu usuario y el motivo. Revisaremos el caso y te responderemos en un plazo razonable. Las decisiones sobre contenido ilegal o que ponga en riesgo a otras personas son definitivas.',
        ],
      },
    ],
  },
  {
    slug: 'cookies',
    path: '/cookies',
    title: 'Política de Cookies',
    description: 'Qué cookies y almacenamiento local usa MangaMukai, para qué sirven y cómo puedes gestionarlos.',
    updatedAt: UPDATED_AT,
    intro: 'MangaMukai utiliza cookies y el almacenamiento del navegador para que el sitio funcione, recuerde tus preferencias y podamos entender de forma agregada cómo se usa. Aquí explicamos cuáles son y cómo controlarlas.',
    sections: [
      {
        heading: 'Qué son las cookies',
        paragraphs: [
          'Son pequeños archivos que el navegador guarda al visitar una web. Junto a ellas usamos el almacenamiento local (localStorage y sessionStorage), que cumple una función parecida pero solo vive en tu dispositivo.',
        ],
      },
      {
        heading: 'Cookies y datos que utilizamos',
        paragraphs: [
          'Sesión: un token que mantiene tu cuenta iniciada entre visitas y permite guardar mangas, comprar capítulos y usar la comunidad. Caduca al cerrar sesión o al expirar.',
          'Preferencias: el tema claro u oscuro, el zoom y el modo de lectura del lector, el último filtro de búsqueda y otros ajustes que solo afectan a cómo ves el sitio.',
          'Rendimiento: una copia temporal del catálogo y de las portadas recientes para que la portada y la biblioteca carguen más rápido. Se renueva sola y se elimina al cerrar el navegador.',
          'Medición: estadísticas agregadas y anónimas de las páginas y capítulos más visitados. No permiten identificarte.',
        ],
      },
      {
        heading: 'Cookies de terceros',
        paragraphs: [
          'Al pagar o donar, PayPal puede instalar sus propias cookies en su dominio según su política. Las fuentes tipográficas se cargan desde Google Fonts, que puede registrar la petición de forma anónima. MangaMukai no incluye rastreadores publicitarios.',
        ],
      },
      {
        heading: 'Cómo gestionarlas',
        paragraphs: [
          'Puedes borrar o bloquear las cookies y el almacenamiento local desde la configuración de tu navegador. Ten en cuenta que, sin la cookie de sesión, no podrás mantener tu cuenta iniciada, y sin las de preferencias el sitio olvidará tus ajustes en cada visita.',
        ],
      },
      {
        heading: 'Cambios en esta política',
        paragraphs: [
          'Si incorporamos nuevas cookies o cambia su finalidad, actualizaremos este documento y la fecha de revisión que figura al inicio.',
        ],
      },
    ],
  },
];

export const findLegalDocument = (slug: string) => LEGAL_DOCUMENTS.find((document) => document.slug === slug) ?? null;
