import { useEffect, useRef, useState } from 'react';
import { Link, useMatch, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUp, Check, Info, UserRound, Volume2, X } from 'lucide-react';
import { chatCharacters, demoReply, type CharacterMessage, type ChatCharacter } from '../data/chatCharacters';
import { MobileCharacterHome } from '../components/character/mobile/MobileCharacterHome';
import { MobileCharacterIntro } from '../components/character/mobile/MobileCharacterIntro';
import { useIsMobileViewport } from '../hooks/useIsMobileViewport';
import { useExperienceUser, useLocalExperience } from '../hooks/useLocalExperience';
import { registerCharacterMessage } from '../services/characterChatService';
import '../styles/experiences.css';

function Avatar({ src, name }: { src?: string; name: string }) {
  return <span className="exp-avatar">{src ? <img src={src} alt={name} /> : <UserRound size={21} />}</span>;
}

/**
 * /chat: en móvil (< lg) la portada de Character del diseño de Figma; en
 * escritorio sigue vacía a propósito (se rehará más adelante), sin footer.
 * /chat/:id es la ficha previa del personaje (foto, sinopsis, tu papel) y
 * /chat/:id/conversacion la conversación en sí.
 */
export default function CharacterChatPage() {
  const { characterId } = useParams();
  const inConversation = useMatch('/chat/:characterId/conversacion') !== null;
  const user = useExperienceUser();
  const isMobile = useIsMobileViewport();
  const character = chatCharacters.find(item => item.id === characterId);
  if (character && inConversation) return <Conversation key={`${user.id}-${character.id}`} character={character} />;
  if (character) return <MobileCharacterIntro character={character} />;
  if (isMobile) return <MobileCharacterHome />;
  return <main className="experience character-page min-h-screen" aria-label="Character" />;
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
    const serverMode = mode === 'ai' ? 'ai' : 'demo';
    try {
      // El servidor anota cada mensaje y aplica la cuota de gratuitos: si se agotó, no hay respuesta.
      await registerCharacterMessage(character.id, 'user', input, serverMode);
      if (controller.signal.aborted) return;
      let content: string;
      if (mode === 'demo') content = demoReply(character, input, messages.length / 2);
      else {
        const response = await fetch('/api/character-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ characterId: character.id, messages: next.slice(-20).map(({ role, content }) => ({ role, content })) }), signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !data.reply) throw new Error(data.error || 'No se pudo obtener una respuesta. Intenta de nuevo.');
        content = data.reply;
      }
      if (!controller.signal.aborted) {
        save([...next, { id: crypto.randomUUID(), role: 'assistant', content }]); setText(current => current.trim() === input ? '' : current);
        void registerCharacterMessage(character.id, 'assistant', content, serverMode).catch(() => undefined);
      }
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
