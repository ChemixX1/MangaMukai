import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Bookmark, Compass, ImagePlus, Search, Users, X } from 'lucide-react';
import { Footer } from '../components/layout';
import { Avatar, communitySeeds, LocalPostCard, type LocalPost } from '../components/social/LocalCommunityPosts';
import { readLocalImage, useExperienceUser, useLocalExperience } from '../hooks/useLocalExperience';
import banner from '../assets/modals/auth-login.webp';
import '../styles/experiences.css';

export default function CommunityPage() {
  const user = useExperienceUser();
  return <Community key={user.id} />;
}
function Community() {
  const user = useExperienceUser();
  const [params, setParams] = useSearchParams();
  const [posts, save] = useLocalExperience<LocalPost[]>(`mm-community-${user.id}`, communitySeeds);
  const [tab, setTab] = useState('Para ti');
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [readingImage, setReadingImage] = useState(false);
  const composer = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const write = (next: LocalPost[]) => { try { save(next); setError(''); return true; } catch (caught) { setError((caught as Error).message); return false; } };
  const visible = posts.filter(post => (!params.get('autor') || post.userId === params.get('autor')) && (tab !== 'Guardados' || post.saved) && (tab !== 'Mi actividad' || post.userId === user.id || post.reposted) && `${post.content} ${post.name}`.toLowerCase().includes(query.toLowerCase()));
  return <><main className="experience community-layout">
    <aside className="community-left"><Link className="community-brand" to="/comunidad"><span>Comunidad<span>MangaMukai</span></span></Link>
      <nav aria-label="Navegación de comunidad">{[{ label: 'Para ti', icon: Compass }, { label: 'Mi actividad', icon: Users }, { label: 'Guardados', icon: Bookmark }].map(item => <button key={item.label} className={tab === item.label ? 'active' : ''} onClick={() => { setTab(item.label); setParams({}); }}><item.icon size={22} />{item.label}</button>)}</nav>
      <button className="exp-button compose-cta" onClick={() => { composer.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); composer.current?.focus(); }}>Publicar</button>
      <Link className="community-self" to={user.signedIn ? '/perfil' : `/comunidad?autor=${user.id}`}><Avatar src={user.avatar} name={user.name} /><span><strong>{user.name}</strong><small>{user.signedIn ? 'Ver mi perfil' : 'Mi perfil local'}</small></span></Link>
      <p className="local-caption">Vista local con publicaciones de ejemplo</p>
    </aside>
    <section className="community-feed"><header className="community-heading"><h1>Comunidad<span>Lecturas que nos conectan</span></h1></header>
      <div className="community-tabs" role="tablist" aria-label="Publicaciones">{['Para ti', 'Mi actividad', 'Guardados'].map(label => <button role="tab" aria-selected={tab === label} key={label} onClick={() => { setTab(label); setParams({}); }}>{label}</button>)}</div>
      <form className="community-composer" onSubmit={event => { event.preventDefault(); if ((!text.trim() && !image) || readingImage) return; if (write([{ id: crypto.randomUUID(), userId: user.id, name: user.name, avatar: user.avatar, content: text.trim(), image, likes: 0, comments: [] }, ...posts])) { setText(''); setImage(''); setTab('Para ti'); setQuery(''); setParams({}); } }}>
        <Avatar src={user.avatar} name={user.name} /><div><textarea ref={composer} aria-label="Nueva publicación" maxLength={1000} placeholder={`¿Qué estás leyendo, ${user.name.split(' ')[0]}?`} value={text} onChange={event => setText(event.target.value)} />
          {image && <div className="composer-preview"><img src={image} alt="Imagen seleccionada" /><button type="button" aria-label="Quitar imagen" onClick={() => setImage('')}><X size={16} /></button></div>}
          <div className="composer-tools"><button type="button" aria-label="Añadir imagen" disabled={readingImage} onClick={() => file.current?.click()}><ImagePlus size={21} /></button><span>{text.length}/1000</span><button className="exp-button" disabled={(!text.trim() && !image) || readingImage}>{readingImage ? 'Cargando…' : 'Publicar'}</button></div>
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={async event => { const selected = event.target.files?.[0]; if (!selected) return; setReadingImage(true); try { setImage(await readLocalImage(selected)); setError(''); } catch (caught) { setError((caught as Error).message); } finally { setReadingImage(false); event.target.value = ''; } }} />
        </div>
      </form>
      {error && <p className="exp-error" role="alert">{error}</p>}
      <Link to="/tienda" className="community-ad-horizontal" aria-label="Anuncio de la tienda MangaMukai"><span><small>MUKAI STORE</small><strong>Tus historias, fuera de la pantalla</strong><span>Explora la nueva colección <ArrowUpRight size={16} /></span></span><img src="/images/collection/57821.webp" alt="Nueva colección" /></Link>
      {params.get('autor') && <div className="filter-notice">Publicaciones de {posts.find(post => post.userId === params.get('autor'))?.name || user.name}<button onClick={() => setParams({})}>Ver todas <X size={15} /></button></div>}
      <label className="community-mobile-search"><Search size={18} /><input aria-label="Buscar publicaciones" placeholder="Buscar en la comunidad" value={query} onChange={event => setQuery(event.target.value)} /></label>
      {visible.map(post => <LocalPostCard key={post.id} post={post} update={next => write(posts.map(item => item.id === next.id ? next : item))} />)}
      {!visible.length && <div className="exp-empty"><MessageEmpty /><h2>Aún no hay publicaciones aquí</h2><p>Prueba otra búsqueda o comparte tu próxima lectura</p></div>}
    </section>
    <aside className="community-right"><label className="exp-search"><Search size={19} /><input aria-label="Buscar en la comunidad" placeholder="Buscar en la comunidad" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <section className="community-trends"><h2>De qué se habla</h2>{['#MangaDelDía', '#LeyendoAhora', '#FanArt', '#Romance'].map((tag, index) => <button key={tag} onClick={() => { setQuery(query === tag ? '' : tag); setTab('Para ti'); setParams({}); }}><small>{['Entre lectores', 'Tu próxima historia', 'Talento de la comunidad', 'Historias que enamoran'][index]}</small><strong>{tag}</strong><span>Explorar publicaciones</span></button>)}</section>
      <Link to="/chat" className="community-ad-vertical" aria-label="Anuncio de Mukai Chat"><img src={banner} alt="Ilustración de una aventurera" /><small>MUKAI CHAT</small><div><span>Tu próxima<br />conversación</span><p>Una nueva forma de vivir<br />tus historias favoritas</p><b>Explorar personajes <ArrowUpRight size={18} /></b></div></Link>
      <p className="local-caption">Respeta a otros lectores y avisa antes de compartir spoilers</p>
    </aside>
  </main><Footer /></>;
}
function MessageEmpty() { return <Users size={30} />; }
