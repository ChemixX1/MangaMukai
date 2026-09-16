import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Heart, MessageCircle, Repeat2, UserRound } from 'lucide-react';
import { useExperienceUser, useLocalExperience } from '../../hooks/useLocalExperience';
import '../../styles/experiences.css';

export type LocalPost = { id: string; userId: string; name: string; avatar: string; content: string; image?: string; likes: number; liked?: boolean; saved?: boolean; reposted?: boolean; comments: { name: string; text: string }[]; demo?: boolean };
export const communitySeeds: LocalPost[] = [
  { id: 'sample-1', userId: 'sample-hana', name: 'Hana', avatar: '/images/collection/57841.webp', content: 'Hay historias que terminas de leer y se quedan contigo todo el día. ¿Cuál fue la última que les hizo sentir así? 🌸\n\n#MangaDelDía #Romance', image: '/images/collection/57841.webp', likes: 128, comments: [], demo: true },
  { id: 'sample-2', userId: 'sample-ren', name: 'Ren', avatar: '/images/collection/57266.webp', content: 'Mi ritual favorito: lluvia, café y un capítulo más de El Fragmento del Dragón. Solo uno… eso dije hace tres horas. ☕\n\n#LeyendoAhora', likes: 86, comments: [], demo: true },
  { id: 'sample-3', userId: 'sample-yuki', name: 'Yuki', avatar: '/images/collection/57821.webp', content: 'El arte de La rebelión de la tirana Nero merece su propio post. Cada viñeta parece una ilustración de colección. ✨\n\n#FanArt #Recomendaciones', likes: 43, comments: [], demo: true },
];
export function Avatar({ src, name }: { src?: string; name: string }) {
  return <span className="exp-avatar">{src ? <img src={src} alt={name} /> : <UserRound size={21} />}</span>;
}
export function LocalPostCard({ post, update }: { post: LocalPost; update: (post: LocalPost) => boolean }) {
  const user = useExperienceUser();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const profileUrl = post.userId === user.id && user.signedIn ? '/perfil' : `/comunidad?autor=${encodeURIComponent(post.userId)}`;
  return <article className="community-post">
    <Link to={profileUrl} aria-label={`Perfil de ${post.name}`}><Avatar src={post.userId === user.id ? user.avatar : post.avatar} name={post.name} /></Link>
    <div className="post-body">
      <div className="post-author"><Link to={profileUrl}><strong>{post.userId === user.id ? user.name : post.name}</strong></Link><span>@{post.name.toLowerCase().replace(/\s/g, '')}</span><small>{post.demo ? 'Ejemplo' : 'Local'}</small></div>
      <p className="post-copy">{post.content}</p>
      {post.image && <img className="post-image" src={post.image} alt="Imagen de la publicación" loading="lazy" />}
      <div className="post-actions">
        <button aria-label="Comentar" aria-expanded={open} onClick={() => setOpen(!open)}><MessageCircle size={18} />{post.comments.length}</button>
        <button aria-label="Republicar" aria-pressed={!!post.reposted} onClick={() => update({ ...post, reposted: !post.reposted })}><Repeat2 size={19} />{post.reposted ? 1 : 0}</button>
        <button aria-label="Me gusta" aria-pressed={!!post.liked} onClick={() => update({ ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) })}><Heart size={18} fill={post.liked ? 'currentColor' : 'none'} />{post.likes}</button>
        <button aria-label="Guardar publicación" aria-pressed={!!post.saved} onClick={() => update({ ...post, saved: !post.saved })}><Bookmark size={18} fill={post.saved ? 'currentColor' : 'none'} /></button>
      </div>
      {open && <div className="post-comments">{post.comments.map((reply, index) => <p key={index}><strong>{reply.name}</strong> {reply.text}</p>)}<form onSubmit={event => { event.preventDefault(); if (!comment.trim()) return; if (update({ ...post, comments: [...post.comments, { name: user.name, text: comment.trim() }] })) setComment(''); }}><input aria-label="Tu comentario" maxLength={500} value={comment} onChange={event => setComment(event.target.value)} placeholder="Escribe una respuesta…" required /><button className="exp-button" disabled={!comment.trim()}>Responder</button></form></div>}
    </div>
  </article>;
}
export function LocalProfilePosts() {
  const user = useExperienceUser();
  const [posts, save] = useLocalExperience<LocalPost[]>(`mm-community-${user.id}`, communitySeeds);
  const [error, setError] = useState('');
  const own = posts.filter(post => post.userId === user.id || post.reposted);
  return <section className="experience local-profile-posts"><div className="section-line"><h3>Tu comunidad</h3><Link to="/comunidad">Ir a Comunidad</Link></div><p className="exp-muted">Publicaciones guardadas en este navegador</p>{error && <p role="alert">{error}</p>}{own.map(post => <LocalPostCard key={post.id} post={post} update={next => { try { save(posts.map(item => item.id === next.id ? next : item)); return true; } catch (caught) { setError((caught as Error).message); return false; } }} />)}{!own.length && <p className="exp-empty">Tus publicaciones y republicaciones de Comunidad aparecerán aquí</p>}</section>;
}
