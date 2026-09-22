import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, User } from 'lucide-react';
import { getFluentEmojiCDN } from '@lobehub/fluent-emoji';
import { getStoredToken } from '../../services/authService';
import { getChapterPreviewImage } from '../../services/mangaService';
import type { SocialNotification } from '../../services/socialService';

const FIRE_ICON = getFluentEmojiCDN('🔥', { cdn: 'unpkg', type: '3d' });

const timeAgo = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Ahora';
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
  return `Hace ${Math.floor(seconds / 86400)} d`;
};

/** Texto de la tarjeta social según el tipo (y la reacción, cuando la hay). */
const socialCopy = (notification: SocialNotification) => {
  const reaction = notification.payload.reaction || '';
  const reactionVerb = ({
    love: 'Le encanta', like: 'Le dio like a', fire: 'Le dio fuego a', haha: 'Le divierte', sad: 'Le entristece', wow: 'Le sorprende',
  } as Record<string, string>)[reaction] || 'Reaccionó a';
  switch (notification.type) {
    case 'comment_like': return { text: 'Le dio like a tu comentario', button: 'Ver comentario' };
    case 'comment_reaction': return { text: `${reactionVerb} tu comentario`, button: 'Ver comentario' };
    case 'comment_reply': return { text: 'Respondió a tu comentario', button: 'Ver comentario' };
    case 'post_reaction': return { text: `${reactionVerb} tu publicación`, button: 'Ver publicación' };
    case 'post_comment': return { text: 'Comentó tu publicación', button: 'Ver publicación' };
    case 'post_share': return { text: 'Compartió tu publicación', button: 'Ver publicación' };
    case 'follow': return { text: 'Empezó a seguirte', button: 'Ver perfil' };
    case 'friend_request': return { text: 'Te envió una solicitud de amistad', button: 'Ver perfil' };
    case 'friend_accepted': return { text: 'Aceptó tu solicitud de amistad', button: 'Ver perfil' };
    default: return { text: 'Tienes una novedad', button: 'Ver' };
  }
};

/** Ruta a la que lleva cada notificación. */
export const notificationRoute = (notification: SocialNotification): string => {
  const { type, payload, actor } = notification;
  if (type === 'chapter_new' || type === 'manga_new' || type === 'manga_update') return payload.manga_id ? `/manga/${payload.manga_id}` : '/';
  if ((type === 'comment_like' || type === 'comment_reaction' || type === 'comment_reply') && payload.manga_id) return `/manga/${payload.manga_id}#comentarios`;
  if (type === 'post_reaction' || type === 'post_comment' || type === 'post_share') return '/perfil';
  return actor ? `/usuarios/${actor.id}` : '/';
};

/** Flecha ↗ que va dentro de los botones de acción. */
const ArrowIcon = () => <ArrowUpRight size={10} strokeWidth={3} className="shrink-0" aria-hidden="true" />;

/** Estrella "NEW" del manga nuevo. */
const NewBadge = () => (
  <svg viewBox="0 0 44 44" className="h-11 w-11 shrink-0" aria-hidden="true">
    <path
      fill="#fff"
      d="M22 2l3.6 4.9 5.6-2.3.9 6 6 .9-2.3 5.6L40.7 21 36.2 25l2.3 5.6-6 .9-.9 6-5.6-2.3L22 40l-3.6-4.9-5.6 2.3-.9-6-6-.9 2.3-5.6L3.3 21l4.5-4-2.3-5.6 6-.9.9-6 5.6 2.3z"
    />
    <text x="22" y="26" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="900" fontSize="11" fill="#000" transform="rotate(-30 22 22)">NEW</text>
  </svg>
);

interface CardProps {
  notification: SocialNotification;
  onOpen: (notification: SocialNotification) => void;
}

/** Tarjeta "Nuevo capítulo publicado": imagen del capítulo de fondo, título de la serie y "Leer ahora". */
const ChapterCard = ({ notification, onOpen }: CardProps) => {
  const { payload } = notification;
  const [image, setImage] = useState(payload.image || payload.cover || '');

  // La misma escena que enseña el listado de capítulos de la ficha; si el capítulo es de pago
  // y no está comprado, el servidor no la da y se queda la portada.
  useEffect(() => {
    let active = true;
    if (!payload.chapter_id) return;
    void getChapterPreviewImage(payload.chapter_id, Number(payload.chapter_number || 0), getStoredToken())
      .then((preview) => { if (active && preview) setImage(preview); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [payload.chapter_id, payload.chapter_number]);

  return (
    <article className={`relative h-24 w-full overflow-hidden rounded-3xl bg-zinc-800 ${notification.read ? 'opacity-70' : ''}`}>
      {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
      <div className="absolute inset-0 rounded-3xl bg-black/80" />
      <div className="relative flex h-full items-center gap-3 pl-5 pr-4 min-[420px]:pl-[30px]">
        <div className="min-w-0 flex-1">
          {/* En pantallas estrechas baja un punto para que la frase entre completa junto al botón. */}
          <p className="flex items-center gap-2 font-[Montserrat] text-[13px] font-normal leading-6 text-white min-[420px]:text-base">
            <span className="truncate">Nuevo capítulo publicado</span>
            <img src={FIRE_ICON} alt="" className="h-6 w-6 shrink-0" />
          </p>
          <p className="mt-2 truncate font-['New_Amsterdam'] text-base font-normal leading-4 text-white">{payload.title || 'Título del manga'}</p>
        </div>
        <Link to={notificationRoute(notification)} onClick={(event) => { event.stopPropagation(); onOpen(notification); }} className="flex h-5 shrink-0 items-center justify-center gap-1 rounded-sm bg-fuchsia-600 px-2 font-[Montserrat] text-[7px] font-bold text-white">
          Leer ahora <ArrowIcon />
        </Link>
      </div>
      {!notification.read && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-fuchsia-500" />}
      <span className="absolute bottom-1.5 right-4 font-[Montserrat] text-[8px] text-white/50">{timeAgo(notification.created_at)}</span>
    </article>
  );
};

/** Tarjeta "manga nuevo": estrella NEW, título en negrita, lema en Michroma y "Ver manga". */
const NewMangaCard = ({ notification, onOpen }: CardProps) => {
  const { payload } = notification;
  return (
    <article className={`relative h-24 w-full overflow-hidden rounded-3xl bg-zinc-800 ${notification.read ? 'opacity-70' : ''}`}>
      {/* La portada de fondo se ve un poco más arriba del centro (la cabeza del personaje suele estar ahí). */}
      {payload.cover && <img src={payload.cover} alt="" className="absolute inset-0 h-full w-full object-cover object-[center_28%]" loading="lazy" />}
      <div className="absolute inset-0 rounded-3xl bg-black/80" />
      <div className="relative flex h-full items-center gap-2 pl-0.5 pr-4">
        <NewBadge />
        <div className="min-w-0 flex-1 -translate-y-0.5">
          <p className="truncate font-[Montserrat] text-[15px] font-bold leading-5 text-white min-[420px]:text-base">{payload.title || 'Título del manga'}</p>
          <p className="mt-1.5 truncate font-[Michroma] text-[6.5px] font-normal leading-4 text-white min-[420px]:text-[7.5px]">Descubre, disfruta y vive una nueva aventura</p>
        </div>
        {/* Botón alto, centrado en la tarjeta y un pelín a la derecha; "Ver" y "manga" en dos filas. */}
        <Link to={notificationRoute(notification)} onClick={(event) => { event.stopPropagation(); onOpen(notification); }} className="flex h-12 shrink-0 translate-x-1.5 flex-col items-center justify-center rounded-md bg-purple-600 px-2.5 text-center font-[Montserrat] text-[9px] font-bold leading-[13px] text-white">
          <span>Ver</span>
          <span className="flex items-center gap-0.5">manga <ArrowIcon /></span>
        </Link>
      </div>
      {!notification.read && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-fuchsia-500" />}
      <span className="absolute bottom-1.5 right-4 font-[Montserrat] text-[8px] text-white/50">{timeAgo(notification.created_at)}</span>
    </article>
  );
};

/** Tarjeta social (reacciones, comentarios, publicaciones, seguidores): avatar, usuario y acción. */
const SocialCard = ({ notification, onOpen }: CardProps) => {
  const copy = socialCopy(notification);
  const actor = notification.actor;
  return (
    <article className={`relative h-20 w-full overflow-hidden rounded-3xl bg-zinc-300 ${notification.read ? 'opacity-70' : ''}`}>
      <div className="absolute inset-0 rounded-3xl bg-black/80" />
      <div className="relative flex h-full items-center gap-2 pl-[19px] pr-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-fuchsia-600 bg-zinc-300">
          {actor?.avatar_url
            ? <img src={actor.avatar_url} alt="" className="h-full w-full object-cover" />
            : actor ? <span className="font-[Montserrat] text-sm font-black text-black">{actor.username.charAt(0).toUpperCase()}</span> : <User size={18} className="text-black/60" />}
        </span>
        <div className="ml-2 min-w-0 flex-1">
          <p className="truncate font-[Montserrat] text-[11px] font-medium leading-[15px] text-white">{actor?.username || 'Usuario'}</p>
          <p className="mt-0.5 truncate font-['Poiret_One'] text-xs font-normal leading-4 text-white">{copy.text}</p>
        </div>
        <Link to={notificationRoute(notification)} onClick={(event) => { event.stopPropagation(); onOpen(notification); }} className="flex h-5 shrink-0 -translate-y-3 items-center justify-center gap-1 rounded-sm bg-black px-2 font-[Montserrat] text-[6px] font-bold text-white">
          {copy.button} <ArrowIcon />
        </Link>
      </div>
      {!notification.read && <span className="absolute right-3 top-2.5 h-2 w-2 rounded-full bg-fuchsia-500" />}
      <span className="absolute bottom-1.5 right-4 font-[Montserrat] text-[8px] text-white/50">{timeAgo(notification.created_at)}</span>
    </article>
  );
};

export const NotificationCard = ({ notification, onOpen }: CardProps) => {
  if (notification.type === 'chapter_new' || notification.type === 'manga_update') return <ChapterCard notification={notification} onOpen={onOpen} />;
  if (notification.type === 'manga_new') return <NewMangaCard notification={notification} onOpen={onOpen} />;
  return <SocialCard notification={notification} onOpen={onOpen} />;
};
