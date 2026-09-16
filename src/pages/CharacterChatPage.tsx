import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUp, ArrowUpRight, Check, Info, MessageCircle, Search, Volume2, X } from 'lucide-react';
import { Footer } from '../components/layout';
import { Avatar } from '../components/social/LocalCommunityPosts';
import { chatCharacters, demoReply, type CharacterMessage, type ChatCharacter } from '../data/chatCharacters';
import { useExperienceUser, useLocalExperience } from '../hooks/useLocalExperience';
import '../styles/experiences.css';

export default function CharacterChatPage() {
  const { characterId } = useParams();
  const user = useExperienceUser();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Todos');
  const character = chatCharacters.find(item => item.id === characterId);
  if (character) return <Conversation key={`${user.id}-${character.id}`} character={character} />;
  const visible = chatCharacters.filter(item => `${item.name} ${item.series}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'Todos' || item.tag === filter));
  return <><main className="experience character-page"><header className="character-heading"><span className="eyebrow">MUKAI CHAT</span><h1>Al otro lado<br />de la <em>historia</em></h1><p>Elige un personaje y escribe lo que pasa después</p></header>
    {characterId && <p role="status" className="exp-error">Ese personaje no está disponible. Elige uno de la colección</p>}
    <div className="character-toolbar"><div className="shop-filters">{['Todos', 'Carismático', 'Reservado', 'Aventurero', 'Divertida'].map(tag => <button key={tag} aria-pressed={filter === tag} onClick={() => setFilter(tag)}>{tag}</button>)}</div><label className="exp-search"><Search size={18} /><input aria-label="Buscar personaje" placeholder="Busca un personaje o manga" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
    <div className="character-grid">{visible.map(item => <Link to={`/chat/${item.id}`} key={item.id} className={`character-card character-${item.id}`}><div className="character-portrait" style={{ backgroundColor: item.color }}><img src={item.image} alt={item.name} /><span>{item.series}</span><span className="character-start"><ArrowUpRight size={23} /></span></div><div className="character-card-copy"><small>{item.tag}</small><h2>{item.name}</h2><p>{item.description}</p><b>Empezar conversación <MessageCircle size={17} /></b></div></Link>)}</div>
    {!visible.length && <p className="exp-empty">Prueba con otro nombre o categoría</p>}
    <details className="chat-explanation"><summary><Info size={19} /> ¿Cómo funciona el chat de personajes?</summary><p>Cada personaje tiene una ficha de personalidad, una forma de hablar y una escena inicial. La IA utiliza esa ficha y los últimos mensajes para continuar la historia contigo</p><p>Sin una conexión configurada, puedes probar una demo de respuestas predefinidas. Una IA real se activa desde el servidor local; la clave nunca se guarda en el navegador. Primero se define el rol y se prueban las respuestas; después se puede ampliar la información de la obra y la memoria</p><p>Los personajes son ficticios. No representan a sus autores. Evita compartir datos personales; tus conversaciones se guardan en este navegador</p></details>
  </main><Footer /></>;
}

function Conversation({ character }: { character: ChatCharacter }) {
  const user = useExperienceUser();
  const [messages, save] = useLocalExperience<CharacterMessage[]>(`mm-character-${user.id}-${character.id}`, []);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'loading' | 'demo' | 'ai'>('loading');
  const [aiAvailable, setAiAvailable] = useState(false);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const resetDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/character-chat', { signal: controller.signal }).then(response => response.ok ? response.json() : { enabled: false }).then(data => { if (!controller.signal.aborted) { setAiAvailable(!!data.enabled); setMode('demo'); } }).catch(() => { if (!controller.signal.aborted) setMode('demo'); });
    return () => { controller.abort(); request.current?.abort(); window.speechSynthesis?.cancel(); };
  }, []);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, [messages.length, busy]);
  const send = async (value: string) => {
    if (!value.trim() || busy || mode === 'loading') return;
    const input = value.trim().slice(0, 1500);
    setBusy(true); setError('');
    const controller = new AbortController(); request.current = controller;
    const next: CharacterMessage[] = [...messages, { id: crypto.randomUUID(), role: 'user', content: input }];
    try {
      let content: string;
      if (mode === 'demo') content = demoReply(character, input, messages.length / 2);
      else {
        const response = await fetch('/api/character-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ characterId: character.id, messages: next.slice(-20).map(({ role, content }) => ({ role, content })) }), signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !data.reply) throw new Error(data.error || 'No se pudo obtener una respuesta. Intenta de nuevo.');
        content = data.reply;
      }
      if (!controller.signal.aborted) { save([...next, { id: crypto.randomUUID(), role: 'assistant', content }]); setText(current => current.trim() === input ? '' : current); }
    } catch (caught) { if (!controller.signal.aborted) setError((caught as Error).message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  };
  const speak = (content: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (speaking) { setSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(content.replace(/\*/g, '')); utterance.lang = 'es-ES'; utterance.onend = () => setSpeaking(false); utterance.onerror = () => setSpeaking(false); window.speechSynthesis.speak(utterance); setSpeaking(true);
  };
  return <main className={`experience conversation-page conversation-${character.id}`}><section className="conversation-shell"><header className="conversation-header"><Link to="/chat" aria-label="Elegir otro personaje"><ArrowLeft size={21} /></Link><Avatar src={character.image} name={character.name} /><div><h1>{character.name}</h1><span>{character.series}</span></div><button aria-label="Información del personaje" aria-expanded={menu} onClick={() => setMenu(!menu)}><Info size={20} /></button></header>
    {menu && <div className="conversation-info"><strong>{character.name}</strong><label className="chat-mode-label">Modo de conversación<select aria-label="Modo de conversación" disabled={busy} value={mode} onChange={event => { setMode(event.target.value as 'demo' | 'ai'); setError(''); }}><option value="demo">Demo local</option>{aiAvailable && <option value="ai">IA conectada</option>}</select></label><p>{character.description}</p><p>La conversación se guarda en este navegador{user.signedIn ? ` para ${user.name}` : ' como invitado'}</p><button disabled={busy || !messages.length} onClick={() => resetDialog.current?.showModal()}>Reiniciar conversación</button></div>}
    <div className="conversation-scroll" role="log" aria-label={`Conversación con ${character.name}`} aria-live="polite"><p className="chat-disclaimer">Personaje ficticio · {mode === 'ai' ? 'Respuestas generadas por IA' : mode === 'loading' ? 'Preparando conversación…' : 'Demo local con respuestas predefinidas'}</p><p className="chat-respect">Mantén una conversación respetuosa</p><div className="chat-scene"><span>LA ESCENA</span><p>{character.scene}</p></div><div className="chat-message assistant"><Avatar src={character.image} name={character.name} /><div><small>{character.name}</small><div className="chat-bubble"><MessageText content={character.greeting} /></div></div></div>
      {messages.map(message => <div className={`chat-message ${message.role}`} key={message.id}>{message.role === 'assistant' && <Avatar src={character.image} name={character.name} />}<div><small>{message.role === 'assistant' ? character.name : user.name}</small><div className="chat-bubble"><MessageText content={message.content} /></div></div>{message.role === 'user' && <Avatar src={user.avatar} name={user.name} />}</div>)}
      {busy && <p className="chat-typing">{character.name} está escribiendo<span>…</span></p>}<div ref={bottom} /></div>
    <div className="conversation-bottom">{error && <p role="alert" className="exp-error">{error}</p>}<span className="suggestions-label">Ideas para continuar</span><div className="chat-suggestions">{character.suggestions.map(suggestion => <button disabled={busy || mode === 'loading'} key={suggestion} onClick={() => { setText(suggestion); void send(suggestion); }}>{suggestion}</button>)}</div><form className="chat-input" onSubmit={event => { event.preventDefault(); void send(text); }}><Avatar src={user.avatar} name={user.name} /><textarea aria-label={`Mensaje para ${character.name}`} placeholder="Escribe tu mensaje…" rows={1} maxLength={1500} value={text} onChange={event => setText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(text); } }} /><button type="button" disabled={!('speechSynthesis' in window)} aria-label={speaking ? 'Detener lectura' : 'Escuchar última respuesta'} onClick={() => speak([...messages].reverse().find(message => message.role === 'assistant')?.content || character.greeting)}><Volume2 size={18} /></button><button className="chat-send" aria-label="Enviar mensaje" disabled={!text.trim() || busy || mode === 'loading'}><ArrowUp size={21} /></button></form><div className="chat-save-status"><Check size={12} />{mode === 'ai' ? 'IA conectada · al enviar se comparte el diálogo con OpenAI' : 'Demo local · no se envían mensajes a una IA'}<span>{text.length}/1500</span></div></div>
  </section><dialog className="experience exp-dialog" aria-label="Reiniciar conversación" ref={resetDialog}><button className="dialog-close" aria-label="Cerrar" onClick={() => resetDialog.current?.close()}><X size={20} /></button><h2>¿Volver al inicio de la historia?</h2><p>Se borrará esta conversación local con {character.name}</p><div className="dialog-actions"><button className="exp-button outline" onClick={() => resetDialog.current?.close()}>Conservar conversación</button><button className="exp-button" onClick={() => { try { save([]); setError(''); resetDialog.current?.close(); setMenu(false); } catch (caught) { setError((caught as Error).message); resetDialog.current?.close(); } }}>Reiniciar</button></div></dialog></main>;
}
function MessageText({ content }: { content: string }) { return <>{content.split('\n').map((line, index) => <p key={index}>{line.split(/(\*[^*]+\*)/g).map((part, i) => part.startsWith('*') && part.endsWith('*') ? <em key={i}>{part.slice(1, -1)}</em> : part)}</p>)}</>; }
