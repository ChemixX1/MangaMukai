import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import { chatCharacters, type CharacterMessage } from '../../../data/chatCharacters';
import { useExperienceUser } from '../../../hooks/useLocalExperience';
import { AUTH_CHANGED_EVENT, getStoredToken, getStoredUser } from '../../../services/authService';
import { FREE_MESSAGE_LIMIT, getCharacterQuota } from '../../../services/characterChatService';
import { Footer } from '../../layout/Footer';
import { CHARACTER_CARDS } from './cards';
import { ChatBubbleIcon, CoinStackIcon, FlameIcon } from './icons';
import { OutlinedName } from './OutlinedName';

const useFreeMessages = (userId: string) => {
  const [remaining, setRemaining] = useState(FREE_MESSAGE_LIMIT);
  useEffect(() => {
    let active = true;
    void getCharacterQuota().then((quota) => { if (active && quota) setRemaining(quota.remaining); });
    return () => { active = false; };
  }, [userId]);
  return remaining;
};

const useCoins = () => {
  const read = () => (getStoredToken() ? getStoredUser()?.coins ?? 0 : 0);
  const [coins, setCoins] = useState(read);
  useEffect(() => {
    const sync = () => setCoins(read());
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(AUTH_CHANGED_EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  return coins;
};

interface RecentChat {
  id: string;
  name: string;
  image: string;
  preview: string;
}

const readRecentChats = (userId: string): RecentChat[] =>
  chatCharacters.flatMap((character) => {
    try {
      const messages = JSON.parse(localStorage.getItem(`mm-character-${userId}-${character.id}`) || 'null') as CharacterMessage[] | null;
      const last = Array.isArray(messages) ? messages[messages.length - 1] : undefined;
      if (!last) return [];
      const text = last.content.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
      return [{ id: character.id, name: character.name, image: character.image, preview: last.role === 'user' ? `Tú: ${text}` : text }];
    } catch {
      return [];
    }
  });

const characterDescriptions = new Map(chatCharacters.map((item) => [item.id, item.description]));

export const MobileCharacterHome = () => {
  const user = useExperienceUser();
  const coins = useCoins();
  const freeMessages = useFreeMessages(user.id);
  const recentChats = useMemo(() => readRecentChats(user.id), [user.id]);
  const hasRecent = recentChats.length > 0;

  const newChat = (
    <section aria-labelledby="character-new-chat" className={hasRecent ? 'mt-7 lg:mt-10' : 'mt-10'}>
      <h2 id="character-new-chat" className="flex items-center gap-1.5 pl-[15px] font-koho text-xl font-semibold leading-5 lg:pl-0 lg:text-2xl">

        <span className="inline-flex shrink-0 origin-bottom animate-flame-sway motion-reduce:animate-none [&>svg]:origin-bottom [&>svg]:animate-flame-lick motion-reduce:[&>svg]:animate-none"><FlameIcon size={24} /></span>
        Inicia un Nuevo Chat
      </h2>
      <div className="mt-7 grid grid-cols-2 gap-x-[15px] gap-y-[17px] lg:grid-cols-4 lg:gap-6">
        {CHARACTER_CARDS.map((card, index) => {
          const description = characterDescriptions.get(card.id);
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.44, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                to={`/chat/${card.id}`}
                aria-label={`Ver la ficha de ${card.label}`}
                className="group relative block aspect-[171/246] overflow-hidden rounded-xl shadow-[0_10px_24px_-6px_rgba(0,0,0,0.32)] ring-1 ring-black/10 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_18px_36px_-6px_rgba(0,0,0,0.45)] active:scale-[0.97] dark:ring-white/15 dark:shadow-[0_14px_30px_-6px_rgba(0,0,0,0.75)] lg:rounded-2xl"
              >
                <img
                  src={card.backdrop}
                  alt=""
                  loading={index < 2 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110 group-active:scale-105"
                />

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-35"
                  style={{ background: `radial-gradient(circle at 50% 80%, ${card.nameColor}, transparent 70%)` }}
                />

                <img
                  src={card.portrait}
                  alt=""
                  loading={index < 2 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="absolute inset-x-0 bottom-0 w-full object-cover object-top drop-shadow-[0_8px_16px_rgba(0,0,0,0.42)] transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-[1.06] group-active:scale-[1.03]"
                  style={{ height: card.portraitHeight }}
                />
                <OutlinedName
                  id={card.id}
                  text={card.label}
                  color={card.nameColor}
                  opacity={card.nameOpacity}
                  className="absolute inset-x-0 top-[10px] drop-shadow-[0_3px_8px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out group-hover:scale-105"
                />
                {description && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-2 flex-col justify-end bg-gradient-to-t from-black/85 via-black/50 to-transparent p-3.5 pt-10 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:flex"
                  >
                    <span className="line-clamp-2 font-raleway text-xs font-medium leading-4 text-white/95 drop-shadow">
                      {description}
                    </span>
                  </span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );

  const recent = (
    <section aria-labelledby="character-recent" className={hasRecent ? 'mt-10' : 'mt-7 lg:mt-12'}>
      <h2 id="character-recent" className="flex items-center gap-[5px] pl-[17px] font-koho text-xl font-semibold leading-5 lg:pl-0 lg:text-2xl">
        <ChatBubbleIcon size={24} className="shrink-0" />
        Chats Recientes
      </h2>
      {hasRecent ? (
        <ul className="mt-8 flex flex-col gap-3 lg:mt-6 lg:grid lg:grid-cols-3 lg:gap-5">
          {recentChats.map((chat, index) => (
            <motion.li
              key={chat.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
            >
              <Link
                to={`/chat/${chat.id}/conversacion`}
                className="group -mx-2 flex items-start gap-2.5 rounded-xl px-2 py-1.5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-black/[0.04] hover:shadow-[0_6px_16px_-4px_rgba(0,0,0,0.1)] active:scale-[0.99] dark:hover:bg-white/[0.04] lg:mx-0 lg:items-center lg:rounded-2xl lg:bg-[#f0f0f0] lg:p-4 lg:shadow-[0_8px_22px_-6px_rgba(0,0,0,0.14)] lg:ring-1 lg:ring-black/5 lg:hover:bg-[#ebebeb] lg:hover:shadow-[0_14px_28px_-6px_rgba(0,0,0,0.2)] lg:dark:bg-zinc-900 lg:dark:ring-white/10 lg:dark:shadow-[0_10px_26px_-6px_rgba(0,0,0,0.55)] lg:dark:hover:bg-zinc-800/90"
              >

                <span className="relative h-14 w-14 shrink-0">
                  <span className="block h-full w-full overflow-hidden rounded-full bg-zinc-200 shadow-md ring-1 ring-black/10 dark:bg-zinc-300 dark:ring-white/15">
                    <img src={chat.image} alt="" className="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-110" />
                  </span>
                  <span aria-hidden="true" className="absolute bottom-[3px] right-[9px] h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-surface" />
                </span>
                <span className="flex h-[50px] min-w-0 flex-1 flex-col border-b border-black/15 pt-1.5 dark:border-zinc-600/60 lg:h-auto lg:border-b-0 lg:pt-0">
                  <span className="truncate font-raleway text-sm font-bold leading-4 tracking-tight transition-colors group-hover:text-mukai-magenta lg:text-base">{chat.name}</span>
                  <span className="mt-1.5 truncate font-raleway text-[10px] leading-3 tracking-tight text-black/70 dark:text-white/70 lg:text-xs lg:leading-4">{chat.preview}</span>
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-center font-raleway text-xs leading-4 text-black/55 dark:text-white/55 lg:mt-6 lg:rounded-2xl lg:bg-[#f0f0f0] lg:py-8 lg:text-sm lg:shadow-[0_8px_22px_-6px_rgba(0,0,0,0.1)] lg:ring-1 lg:ring-black/5 lg:dark:bg-zinc-900 lg:dark:ring-white/10 lg:dark:shadow-[0_10px_26px_-6px_rgba(0,0,0,0.45)]">
          Vive las historias de tu personaje favorito
        </p>
      )}
    </section>
  );

  return (
    <div className="focus-scope tap-transparent overflow-x-hidden bg-surface text-ink">
      <main className="pb-8 pt-[22px] lg:pb-16 lg:pt-28" aria-label="Character Chat">
        <div className="mx-auto w-full max-w-[441px] px-[clamp(22px,9.5vw,42px)] lg:max-w-[1220px] lg:px-8">
          <div className="lg:flex lg:items-center lg:justify-between lg:gap-8 lg:border-b lg:border-black/10 lg:pb-7 lg:dark:border-white/10">
            <div>
              <h1 className="text-center font-russo text-3xl font-normal leading-10 lg:text-left lg:text-4xl">Character Chat</h1>
              <p className="mt-1 hidden font-raleway text-sm text-black dark:text-white/60 lg:block">
                Adéntrate en un mundo que es completamente tuyo con tus personajes favoritos
              </p>
            </div>

            <div className="lg:flex lg:items-center lg:gap-3.5">

              <motion.section
                aria-label="Monedas"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="mt-[22px] flex h-11 items-center rounded-lg bg-[#f0f0f0] pl-[15px] pr-4 shadow-[0_6px_18px_-4px_rgba(0,0,0,0.12)] ring-1 ring-black/5 transition-all duration-300 hover:shadow-[0_10px_24px_-4px_rgba(0,0,0,0.18)] dark:bg-zinc-900 dark:ring-white/10 dark:shadow-[0_8px_22px_-4px_rgba(0,0,0,0.5)] lg:mt-0 lg:h-12 lg:min-w-[240px] lg:gap-2 lg:rounded-xl"
              >
                <CoinStackIcon size={32} className="shrink-0 drop-shadow-sm" />
                <span className="ml-[5px] truncate font-montserrat text-lg font-medium leading-none">
                  {coins.toLocaleString('es-ES')}<span className="sr-only"> monedas</span>
                </span>
                <Link
                  to="/recargar"
                  state={{ returnTo: '/chat' }}
                  className="ml-auto grid h-7 w-[84px] shrink-0 place-items-center rounded-2xl border border-black/50 font-montserrat text-xs font-bold leading-none shadow-sm transition-all duration-200 hover:scale-105 hover:bg-black hover:text-white active:scale-95 dark:border-white/50 dark:hover:bg-white dark:hover:text-black"
                >
                  Recargar
                </Link>
              </motion.section>


              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
                className="mt-2 flex h-9 items-center rounded-lg bg-[#f0f0f0] pl-[17px] pr-4 font-montserrat text-xs leading-none shadow-[0_4px_14px_-4px_rgba(0,0,0,0.1)] ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10 dark:shadow-[0_6px_18px_-4px_rgba(0,0,0,0.45)] lg:mt-0 lg:h-12 lg:rounded-xl lg:px-5 lg:text-[13px]"
              >
                Te quedan&nbsp;<strong className="font-bold">{freeMessages}</strong>&nbsp;mensajes&nbsp;<span className="font-semibold">gratuitos</span>
              </motion.p>
            </div>
          </div>

          {hasRecent ? recent : newChat}
          {hasRecent ? newChat : recent}
        </div>
      </main>

      <Footer homeDesign className="mt-[94px] lg:mt-[125px]" />
    </div>
  );
};
