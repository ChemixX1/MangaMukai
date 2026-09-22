/**
 * Ficha de presentación de cada personaje (pantalla previa a la conversación):
 * frase gancho (sin punto: coma o &; se muestra con cada inicial en mayúscula),
 * etiquetas, sinopsis, el papel que
 * interpreta el lector, la vista previa de la escena y el manga referencial del
 * catálogo. Textos y series provisionales, a la par de las fichas de chatCharacters.
 */

/** Vista previa en forma de chat: narrador, tu primer turno y la respuesta del personaje. */
export interface CharacterPreview {
  /** Presentación de la escena (bocadillo del narrador), por párrafos. */
  scene: string[];
  /** Tu turno: lo que dices y, en cursiva, lo que haces. */
  user: { line: string; narration?: string };
  /** Su respuesta: en cursiva lo que hace y después lo que dice. */
  character: { narration?: string; line: string };
}

export interface CharacterIntro {
  tagline: string;
  tags: string[];
  synopsis: string[];
  /** Papel del lector (la tarjeta muestra su nombre de usuario o "Usuario"). */
  role: string;
  preview: CharacterPreview;
  /** Id de la serie del catálogo que se muestra como "Manga Referencial" (provisional). */
  relatedMangaId?: number;
  /** Color del contenedor del personaje: fondo del botón "Iniciar conversación" y acentos. */
  accent: string;
}

export const characterIntros: Record<string, CharacterIntro> = {
  alex: {
    tagline: 'Todos miran al heredero, él solo te mira a ti',
    tags: ['Romance', 'Carismático', 'Nobleza', 'Fiesta de gala', 'Secretos', 'Primer encuentro'],
    synopsis: [
      'La fiesta del palacio está en su apogeo y tú preferirías estar en cualquier otro sitio.',
      'Alex, el heredero del que todos hablan, también. Y acaba de encontrar la excusa perfecta para escapar: tú.',
    ],
    role: 'Invitado inesperado, diecinueve años. No perteneces a este mundo de títulos y candelabros. Observas más de lo que hablas, y eso a Alex le intriga más que cualquier reverencia.',
    preview: {
      scene: [
        'En la fiesta más esperada del año, tú eres el invitado que nadie esperaba. No conoces a nadie y no piensas fingir lo contrario.',
        'Esta noche, el heredero del palacio ha decidido escapar de su propia fiesta. Y te ha visto.',
      ],
      user: { line: '…Hola.', narration: 'Te apoyas en una columna del salón, lejos de la música. Un vaso se posa junto al tuyo y no levantas la vista de inmediato.' },
      character: { narration: 'Alex no responde enseguida. Se apoya en la columna, a tu lado, y observa la sala como si le aburriera todo lo que no seas tú.', line: 'Por fin alguien interesante.' },
    },
    relatedMangaId: 30112,
    accent: '#f97316',
  },
  raven: {
    tagline: 'Nadie sube a la torre a medianoche, excepto tú',
    tags: ['Misterio', 'Reservado', 'Castillo', 'Secretos', 'Lealtad', 'Medianoche'],
    synopsis: [
      'En el castillo todos evitan al oficial de la torre: dicen que guarda los secretos del reino y que jamás sonríe.',
      'Esta noche no puedes dormir. Y tus pasos te llevan justo hasta su puerta.',
    ],
    role: 'Aprendiz de la corte, veinte años. Curioso, insistente y con más preguntas de las que deberías hacer. Raven no está acostumbrado a que alguien se quede.',
    preview: {
      scene: [
        'En el castillo nadie sube a la torre a medianoche. Dicen que el oficial que la guarda conoce todos los secretos del reino y no sonríe jamás.',
        'Esta noche no puedes dormir. Y tus pasos te llevan justo hasta su puerta.',
      ],
      user: { line: '…¿Se puede?', narration: 'Subes la escalera de piedra con una vela en la mano. Al final del pasillo, una luz. Te detienes en el umbral.' },
      character: { narration: 'Raven levanta la vista de los documentos y te observa en silencio unos segundos. Luego aparta los papeles, sin prisa.', line: 'No deberías andar por aquí a estas horas.' },
    },
    relatedMangaId: 17220,
    accent: '#c026d3',
  },
  arianel: {
    tagline: 'Una princesa escondida en el jardín & tú, su único cómplice',
    tags: ['Aventura', 'Divertida', 'Princesa', 'Jardín secreto', 'Amistad', 'Amanecer'],
    synopsis: [
      'Arianel se ha escapado otra vez de sus lecciones de protocolo. La guardia la busca por todo el palacio.',
      'Tú la encuentras primero, riéndose junto a la fuente, con los zapatos en la mano.',
    ],
    role: 'Ayudante del jardinero, diecisiete años. Conoces cada rincón del jardín y ninguno de la corte. Arianel decide en un segundo que eres de fiar.',
    preview: {
      scene: [
        'En el palacio, la princesa Arianel se ha escapado otra vez de sus lecciones de protocolo. La guardia la busca por todos los pasillos.',
        'Tú trabajas en el jardín. Y el jardín es el único sitio donde nadie ha mirado.',
      ],
      user: { line: '…¿Hola?', narration: 'Rodeas la fuente con cuidado. Una risa se corta de golpe detrás de los rosales y ves asomar un zapato… en una mano.' },
      character: { narration: 'Arianel se lleva un dedo a los labios y te mira con los ojos muy abiertos, entre el susto y la risa.', line: 'Shh. Si me encuentran, me devuelven a clase. ¿Me ayudas?' },
    },
    relatedMangaId: 7079,
    accent: '#0ea5e9',
  },
  estrella: {
    tagline: 'Todos bailan dentro, ella prefiere el balcón & tu compañía',
    tags: ['Romance', 'Elegante', 'Baile de gala', 'Ciudad de noche', 'Confidencias', 'Ironía'],
    synopsis: [
      'El baile más esperado del año llena el salón de luces y conversaciones vacías.',
      'En el balcón, una dama contempla la ciudad con una copa en la mano. Sabe leer a las personas con una mirada… y acaba de leerte a ti.',
    ],
    role: 'Invitado de la periferia, veintiún años. Sabes que no encajas y no te importa. Estrella nota enseguida que eres el único que no finge.',
    preview: {
      scene: [
        'El baile más esperado del año llena el salón de luces y conversaciones vacías. Tú no encajas, y no te importa.',
        'En el balcón, una dama contempla la ciudad con una copa en la mano. Sabe leer a las personas con una mirada.',
      ],
      user: { line: '…Buenas noches.', narration: 'Sales al balcón buscando aire. Las luces de la ciudad parpadean abajo. No esperabas compañía.' },
      character: { narration: 'Estrella no se gira del todo. Sonríe sin apartar la vista de las luces, como si llevara un rato esperándote.', line: 'La música de dentro es preciosa, pero aquí fuera se piensa mejor.' },
    },
    relatedMangaId: 1898,
    accent: '#9333ea',
  },
};
