import { ArrowLeft, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { ChatCharacter } from '../../../data/chatCharacters';
import { characterIntros, type CharacterIntro } from '../../../data/characterIntros';
import { useExperienceUser } from '../../../hooks/useLocalExperience';
import { CHARACTER_CARDS } from './cards';
import { OutlinedName } from './OutlinedName';
import { PreviewChat } from './PreviewChat';
import { RelatedManga } from './RelatedManga';

/** Personajes sin ficha propia (los clásicos): se arma una con lo que ya tienen. */
const resolveIntro = (character: ChatCharacter): CharacterIntro =>
  characterIntros[character.id] ?? {
    tagline: character.description,
    tags: [character.series, character.tag],
    synopsis: [character.scene],
    role: `Quien llega a la escena y decide qué pasa después con ${character.name}.`,
    preview: {
      scene: [character.scene],
      user: { line: character.suggestions[0] },
      character: { narration: character.greeting.match(/\*([^*]+)\*/)?.[1], line: character.greeting.replace(/\*[^*]*\*/g, '').trim() },
    },
    accent: character.color,
  };

interface MobileCharacterIntroProps {
  character: ChatCharacter;
}

/**
 * Pantalla previa a la conversación (/chat/:id): la foto del personaje en toda
 * la parte superior (con su nombre abajo y la flecha de volver pegada a la
 * esquina), la frase gancho, las etiquetas, la sinopsis, el papel del lector,
 * la vista previa de la escena como chat, el manga referencial del catálogo y
 * el botón "Iniciar conversación" fijo abajo con el color del personaje. Sin
 * navbar ni barra inferior.
 */
export const MobileCharacterIntro = ({ character }: MobileCharacterIntroProps) => {
  const user = useExperienceUser();
  const card = CHARACTER_CARDS.find((item) => item.id === character.id);
  const intro = resolveIntro(character);

  return (
    <div className="character-intro-page focus-scope tap-transparent min-h-screen overflow-x-hidden bg-surface text-ink">
      {/* Foto: el mismo fondo de rayos y recorte de la tarjeta, a todo el ancho. */}
      <div className="relative w-full overflow-hidden" style={{ height: 'min(118vw, 520px)' }}>
        {card ? (
          <>
            <img src={card.backdrop} alt="" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            <img src={card.portrait} alt={character.name} decoding="async" className="absolute inset-x-0 bottom-0 h-[92%] w-full object-cover object-top" />
          </>
        ) : (
          <img src={character.image} alt={character.name} decoding="async" className="absolute inset-0 h-full w-full object-cover object-top" style={{ backgroundColor: character.color }} />
        )}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-surface via-surface/60 via-45% to-transparent" />
        {/* Nombre en la parte inferior de la portada, con el mismo contorno que en las tarjetas. */}
        <OutlinedName id={`intro-${character.id}`} text={character.name} color={card?.nameColor ?? character.color} opacity={card?.nameOpacity ?? 0.8} fontSize={34} className="absolute inset-x-0 bottom-8" />
        {/* Flecha de volver: cuadrado pegado a la esquina superior izquierda. */}
        <Link
          to="/chat"
          aria-label="Volver a Character Chat"
          className="absolute left-0 z-10 grid h-11 w-11 place-items-center bg-black/45 text-white backdrop-blur-sm"
          style={{ top: 'env(safe-area-inset-top, 0px)' }}
        >
          <ArrowLeft size={22} strokeWidth={2.4} />
        </Link>
      </div>

      <main className="mx-auto w-full max-w-[441px] px-[clamp(22px,9.5vw,42px)] pb-28 pt-4" aria-label={character.name}>
        <h1 className="text-center font-montserrat text-[22px] font-extrabold capitalize leading-7 tracking-tight">{intro.tagline}</h1>

        {/* Etiquetas pequeñas (cuatro por fila) con alineación justificada: la primera fila
            va de borde a borde y la última queda a la izquierda. Todas iguales: solo borde. */}
        <ul className="-mx-[3px] mt-4 text-justify leading-[30px] [text-align-last:left] [&>li]:mx-[3px] [&>li]:align-middle" aria-label="Etiquetas">
          {intro.tags.map((tag) => (
            <li key={tag} className="inline-grid h-6 place-items-center rounded-[5px] border border-black/15 px-1.5 font-montserrat text-[9px] font-semibold leading-none text-ink/[.68] dark:border-zinc-600/60">{tag}</li>
          ))}
        </ul>

        <div className="mt-5 space-y-3 text-justify font-raleway text-sm leading-6 text-ink/[.82]">
          {intro.synopsis.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>

        {/* Tu papel: tarjeta con la foto y el nombre del lector (es quien interpreta el papel; "Usuario" sin sesión) y la descripción del papel. */}
        <section className="mt-7 rounded-2xl bg-[#f0f0f0] px-4 py-4 dark:bg-zinc-900" aria-label="Tu papel">
          <span className="mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-300">
            {user.avatar
              ? <img src={user.avatar} alt="" className="h-full w-full object-cover" />
              : <UserRound size={42} strokeWidth={1.6} className="text-black/55 dark:text-white/55" aria-hidden="true" />}
          </span>
          <p className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="font-montserrat text-base font-bold leading-6">{user.signedIn ? user.name : 'Usuario'}</span>
            <span className="grid h-[22px] place-items-center rounded-md border border-black/15 px-2 font-montserrat text-[10px] font-bold uppercase leading-none dark:border-zinc-600/60">Tu papel</span>
          </p>
          <p className="mt-2 font-raleway text-[13px] leading-5 text-ink/[.82]">{intro.role}</p>
        </section>

        <section className="mt-7" aria-labelledby="character-preview">
          <h2 id="character-preview" className="font-koho text-xl font-bold leading-6" style={{ color: intro.accent }}>Vista previa</h2>
          <PreviewChat preview={intro.preview} characterName={character.name} characterImage={character.image} accent={intro.accent} />
        </section>

        {intro.relatedMangaId && (
          <section className="mt-7" aria-labelledby="character-related">
            <h2 id="character-related" className="font-koho text-xl font-bold leading-6" style={{ color: intro.accent }}>Manga Referencial</h2>
            <RelatedManga mangaId={intro.relatedMangaId} />
          </section>
        )}
      </main>

      {/* Botón fijo abajo, con el color del contenedor del personaje. */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-surface from-55% to-transparent pt-6" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto w-full max-w-[441px] px-6">
          <Link
            to={`/chat/${character.id}/conversacion`}
            className="grid h-14 w-full place-items-center rounded-xl font-montserrat text-[15px] font-bold text-white active:scale-[0.98]"
            style={{ backgroundColor: intro.accent }}
          >
            Iniciar conversación
          </Link>
        </div>
      </div>
    </div>
  );
};
