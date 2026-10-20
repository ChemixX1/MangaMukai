import { ArrowLeft, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import type { ChatCharacter } from '../../../data/chatCharacters';
import { characterIntros, type CharacterIntro } from '../../../data/characterIntros';
import { useExperienceUser } from '../../../hooks/useLocalExperience';
import { CHARACTER_CARDS } from './cards';
import { OutlinedName } from './OutlinedName';
import { PreviewChat } from './PreviewChat';
import { RelatedManga } from './RelatedManga';

const resolveIntro = (character: ChatCharacter): CharacterIntro =>
  characterIntros[character.id] ?? {
    tagline: character.description,
    tags: [character.series, character.tag].filter(Boolean),
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

export const MobileCharacterIntro = ({ character }: MobileCharacterIntroProps) => {
  const user = useExperienceUser();
  const card = CHARACTER_CARDS.find((item) => item.id === character.id);
  const intro = resolveIntro(character);

  return (
    <div className="character-intro-page focus-scope tap-transparent min-h-screen overflow-x-hidden bg-surface text-ink">
      <div className="lg:mx-auto lg:grid lg:max-w-[1160px] lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-10 lg:px-8 lg:pb-20 lg:pt-28">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="lg:sticky lg:top-28"
        >
          <div className="mb-4 hidden lg:block">
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 rounded-xl bg-[#f0f0f0] px-3.5 py-2 font-montserrat text-xs font-bold shadow-[0_4px_14px_-3px_rgba(0,0,0,0.12)] ring-1 ring-black/5 transition-all duration-200 hover:-translate-x-0.5 hover:shadow-md dark:bg-zinc-900 dark:ring-white/10"
            >
              <ArrowLeft size={16} strokeWidth={2.4} />
              Volver a Character Chat
            </Link>
          </div>

          <div
            className="group relative w-full overflow-hidden lg:aspect-[171/246] lg:!h-auto lg:rounded-2xl lg:shadow-[0_20px_44px_-10px_rgba(0,0,0,0.42)] lg:ring-1 lg:ring-black/10 lg:dark:ring-white/15 lg:dark:shadow-[0_22px_50px_-10px_rgba(0,0,0,0.78)]"
            style={{ height: 'min(118vw, 520px)' }}
          >
            {card ? (
              <>
                <img
                  src={card.backdrop}
                  alt=""
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <img
                  src={card.portrait}
                  alt={character.name}
                  decoding="async"
                  className="absolute inset-x-0 bottom-0 h-[92%] w-full object-cover object-top lg:drop-shadow-[0_10px_22px_rgba(0,0,0,0.45)] transition-transform duration-700 ease-out group-hover:-translate-y-1 group-hover:scale-[1.04]"
                />
              </>
            ) : (
              <img
                src={character.image}
                alt={character.name}
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                style={{ backgroundColor: character.color }}
              />
            )}
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-surface via-surface/60 via-45% to-transparent lg:from-black/75 lg:via-black/30" />

            <OutlinedName
              id={`intro-${character.id}`}
              text={character.name}
              color={card?.nameColor ?? character.color}
              opacity={card?.nameOpacity ?? 0.8}
              fontSize={34}
              className="absolute inset-x-0 bottom-8 lg:drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)] transition-transform duration-300 group-hover:scale-105"
            />

            <Link
              to="/chat"
              aria-label="Volver a Character Chat"
              className="absolute left-0 z-10 grid h-11 w-11 place-items-center bg-black/45 text-white shadow-md backdrop-blur-sm transition-transform active:scale-95 lg:hidden"
              style={{ top: 'env(safe-area-inset-top, 0px)' }}
            >
              <ArrowLeft size={22} strokeWidth={2.4} />
            </Link>
          </div>

          <Link
            to={`/chat/${character.id}/conversacion`}
            className="mt-5 hidden h-14 w-full place-items-center rounded-xl font-montserrat text-[15px] font-bold text-white shadow-[0_12px_26px_-6px_rgba(0,0,0,0.38)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] lg:grid"
            style={{ backgroundColor: intro.accent }}
          >
            Iniciar conversación
          </Link>
        </motion.div>


        <motion.main
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-[441px] px-[clamp(22px,9.5vw,42px)] pb-28 pt-4 lg:mx-0 lg:max-w-none lg:px-0 lg:pb-0 lg:pt-11"
          aria-label={character.name}
        >
          <h1 className="-mx-3 text-balance text-center font-montserrat text-[20px] font-semibold leading-7 tracking-tight lg:mx-0 lg:text-left lg:text-3xl lg:leading-9">{intro.tagline}</h1>


          <ul className="mt-4 flex flex-wrap justify-center gap-2 leading-normal lg:justify-start" aria-label="Etiquetas">
            {intro.tags.map((tag) => (
              <li
                key={tag}
                className="inline-grid h-6 place-items-center rounded-[5px] border border-black/15 bg-black/[0.02] px-1.5 font-montserrat text-[9px] font-semibold leading-none text-ink/[.68] shadow-sm transition-transform duration-200 hover:scale-105 dark:border-zinc-600/60 dark:bg-white/[0.03] lg:h-7 lg:rounded-md lg:px-3 lg:text-[11px]"
              >
                {tag}
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-3 text-justify font-raleway text-sm leading-6 text-ink/[.82] lg:text-[15px] lg:leading-7">
            {intro.synopsis.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>


          <section
            className="group mt-7 rounded-2xl bg-[#f0f0f0] px-4 py-4 shadow-[0_8px_22px_-6px_rgba(0,0,0,0.12)] ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-6px_rgba(0,0,0,0.18)] dark:bg-zinc-900 dark:ring-white/10 dark:shadow-[0_10px_26px_-6px_rgba(0,0,0,0.55)] lg:flex lg:items-center lg:gap-5 lg:p-5"
            aria-label="Tu papel"
          >
            <span className="mx-auto grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full bg-zinc-200 shadow-md ring-2 ring-black/5 dark:bg-zinc-300 dark:ring-white/15 lg:mx-0 lg:h-20 lg:w-20">
              {user.avatar
                ? <img src={user.avatar} alt="" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110" />
                : <UserRound size={42} strokeWidth={1.6} className="text-black/55 dark:text-white/55" aria-hidden="true" />}
            </span>
            <div className="lg:min-w-0 lg:flex-1">
              <p className="mt-3 flex flex-wrap items-center justify-center gap-2 lg:mt-0 lg:justify-start">
                <span className="font-montserrat text-base font-bold leading-6">{user.signedIn ? user.name : 'Usuario'}</span>
                <span className="grid h-[22px] place-items-center rounded-md border border-black/15 px-2 font-montserrat text-[10px] font-bold uppercase leading-none shadow-sm dark:border-zinc-600/60">Tu papel</span>
              </p>
              <p className="mt-2 font-raleway text-[13px] leading-5 text-ink/[.82] lg:text-sm lg:leading-6">{intro.role}</p>
            </div>
          </section>

          <section className="mt-7 lg:rounded-2xl lg:bg-[#f0f0f0]/60 lg:p-5 lg:shadow-[0_8px_22px_-6px_rgba(0,0,0,0.1)] lg:ring-1 lg:ring-black/5 lg:dark:bg-zinc-900/60 lg:dark:ring-white/10 lg:dark:shadow-[0_10px_26px_-6px_rgba(0,0,0,0.45)]" aria-labelledby="character-preview">
            <h2 id="character-preview" className="font-koho text-xl font-bold leading-6" style={{ color: intro.accent }}>Vista previa</h2>
            <PreviewChat preview={intro.preview} characterName={character.name} characterImage={character.image} accent={intro.accent} />
          </section>

          {intro.relatedMangaId && (
            <section className="mt-7" aria-labelledby="character-related">
              <h2 id="character-related" className="font-koho text-xl font-bold leading-6" style={{ color: intro.accent }}>Manga Referencial</h2>
              <RelatedManga mangaId={intro.relatedMangaId} />
            </section>
          )}
        </motion.main>
      </div>


      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-surface from-55% to-transparent pt-6 lg:hidden" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto w-full max-w-[441px] px-6">
          <Link
            to={`/chat/${character.id}/conversacion`}
            className="grid h-14 w-full place-items-center rounded-xl font-montserrat text-[15px] font-bold text-white shadow-[0_10px_24px_-4px_rgba(0,0,0,0.38)] transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            style={{ backgroundColor: intro.accent }}
          >
            Iniciar conversación
          </Link>
        </div>
      </div>
    </div>
  );
};
