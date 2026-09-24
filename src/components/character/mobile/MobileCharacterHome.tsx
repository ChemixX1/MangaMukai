import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { chatCharacters, type CharacterMessage } from '../../../data/chatCharacters';
import { useExperienceUser } from '../../../hooks/useLocalExperience';
import { AUTH_CHANGED_EVENT, getStoredToken, getStoredUser } from '../../../services/authService';
import { FREE_MESSAGE_LIMIT, getCharacterQuota } from '../../../services/characterChatService';
import { Footer } from '../../layout/Footer';
import { CHARACTER_CARDS } from './cards';
import { ChatBubbleIcon, CoinStackIcon, FlameIcon } from './icons';
import { OutlinedName } from './OutlinedName';

/** Mensajes gratuitos que quedan según el servidor; mientras responde, el límite completo. */
const useFreeMessages = (userId: string) => {
  const [remaining, setRemaining] = useState(FREE_MESSAGE_LIMIT);
  useEffect(() => {
    let active = true;
    void getCharacterQuota().then((quota) => { if (active && quota) setRemaining(quota.remaining); });
    return () => { active = false; };
  }, [userId]);
  return remaining;
};

/** Saldo de monedas de la sesión (0 como invitado); se actualiza con el refresco del navbar. */
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

/** Conversaciones guardadas en este navegador (misma clave que usa la conversación). */
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

/**
 * /chat en móvil según el diseño de Figma, sin cabecera (ni la de la app ni
 * logo): título, saldo de monedas con "Recargar", las cuatro tarjetas de
 * personajes, los chats recientes y el footer del home móvil.
 */
export const MobileCharacterHome = () => {
  const user = useExperienceUser();
  const coins = useCoins();
  const freeMessages = useFreeMessages(user.id);
  const recentChats = useMemo(() => readRecentChats(user.id), [user.id]);
  const hasRecent = recentChats.length > 0;

  // Con alguna conversación empezada, los chats recientes suben y "Inicia un Nuevo Chat" baja.
  const newChat = (
    <section aria-labelledby="character-new-chat" className={hasRecent ? 'mt-7' : 'mt-10'}>
      <h2 id="character-new-chat" className="flex items-center gap-1.5 pl-[15px] font-koho text-xl font-semibold leading-5">
        {/* Dos ritmos distintos (balanceo lento + lengüeteo rápido): el vaivén nunca se repite igual. */}
        <span className="inline-flex shrink-0 origin-bottom animate-flame-sway motion-reduce:animate-none [&>svg]:origin-bottom [&>svg]:animate-flame-lick motion-reduce:[&>svg]:animate-none"><FlameIcon size={24} /></span>
        Inicia un Nuevo Chat
      </h2>
      <div className="mt-7 grid grid-cols-2 gap-x-[15px] gap-y-[17px]">
        {CHARACTER_CARDS.map((card, index) => (
          <Link key={card.id} to={`/chat/${card.id}`} aria-label={`Ver la ficha de ${card.label}`} className="relative block aspect-[171/246] overflow-hidden">
            <img src={card.backdrop} alt="" loading={index < 2 ? 'eager' : 'lazy'} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            {/* El recorte va pegado al borde inferior; lo que sobra por abajo se oculta. */}
            <img src={card.portrait} alt="" loading={index < 2 ? 'eager' : 'lazy'} decoding="async" className="absolute inset-x-0 bottom-0 w-full object-cover object-top" style={{ height: card.portraitHeight }} />
            <OutlinedName id={card.id} text={card.label} color={card.nameColor} opacity={card.nameOpacity} className="absolute inset-x-0 top-[10px]" />
          </Link>
        ))}
      </div>
    </section>
  );

  const recent = (
    <section aria-labelledby="character-recent" className={hasRecent ? 'mt-10' : 'mt-7'}>
      <h2 id="character-recent" className="flex items-center gap-[5px] pl-[17px] font-koho text-xl font-semibold leading-5">
        <ChatBubbleIcon size={24} className="shrink-0" />
        Chats Recientes
      </h2>
      {hasRecent ? (
        <ul className="mt-8 flex flex-col gap-3">
          {recentChats.map((chat) => (
            <li key={chat.id}>
              <Link to={`/chat/${chat.id}/conversacion`} className="flex items-start gap-2">
                {/* El punto verde sobresale del círculo, por eso no va dentro del recorte. */}
                <span className="relative h-14 w-14 shrink-0">
                  <span className="block h-full w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-300">
                    <img src={chat.image} alt="" className="h-full w-full object-cover object-top" />
                  </span>
                  <span aria-hidden="true" className="absolute bottom-[3px] right-[9px] h-2.5 w-2.5 rounded-full bg-green-500" />
                </span>
                <span className="flex h-[50px] min-w-0 flex-1 flex-col border-b border-black/15 pt-1.5 dark:border-zinc-600/60">
                  <span className="truncate font-raleway text-sm font-bold leading-4 tracking-tight">{chat.name}</span>
                  <span className="mt-1.5 truncate font-raleway text-[10px] leading-3 tracking-tight">{chat.preview}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-center font-raleway text-xs leading-4 text-black/55 dark:text-white/55">
          Vive las historias de tu personaje favorito
        </p>
      )}
    </section>
  );

  return (
    <div className="focus-scope tap-transparent overflow-x-hidden bg-surface text-ink">
      <main className="pb-8 pt-[22px]" aria-label="Character Chat">
        <div className="mx-auto w-full max-w-[441px] px-[clamp(22px,9.5vw,42px)]">
          <h1 className="text-center font-russo text-3xl font-normal leading-10">Character Chat</h1>

          {/* Saldo */}
          <section aria-label="Monedas" className="mt-[22px] flex h-11 items-center rounded-lg bg-[#f0f0f0] pl-[15px] pr-4 dark:bg-zinc-900">
            <CoinStackIcon size={32} className="shrink-0" />
            <span className="ml-[5px] truncate font-montserrat text-lg font-medium leading-none">
              {coins.toLocaleString('es-ES')}<span className="sr-only"> monedas</span>
            </span>
            <Link
              to="/recargar"
              state={{ returnTo: '/chat' }}
              className="ml-auto grid h-7 w-[84px] shrink-0 place-items-center rounded-2xl border border-black/50 font-montserrat text-xs font-bold leading-none dark:border-white/50"
            >
              Recargar
            </Link>
          </section>

          {/* Cuota gratuita (contenedor propio) */}
          <p className="mt-2 flex h-9 items-center rounded-lg bg-[#f0f0f0] pl-[17px] font-montserrat text-xs leading-none dark:bg-zinc-900">
            Te quedan&nbsp;<strong className="font-bold">{freeMessages}</strong>&nbsp;mensajes&nbsp;<span className="font-semibold">gratuitos</span>
          </p>

          {hasRecent ? recent : newChat}
          {hasRecent ? newChat : recent}
        </div>
      </main>

      <Footer className="-mt-6" />
    </div>
  );
};
