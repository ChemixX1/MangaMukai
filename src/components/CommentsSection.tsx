import { useState, useEffect, useMemo } from "react"; 
import { supabase } from "../supabaseClient";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { 
    MessageSquare, Send, ThumbsUp, 
    MessageCircle, Smile, X, 
    ChevronUp, ChevronDown, CornerDownRight,
    CornerDownLeft, User as UserIcon, Crown // IMPORTAR CROWN
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { AuthModal } from "./AuthModal"; 

// --- TYPES CORREGIDOS ---
interface ProfileData {
    username: string;
    avatar_url: string | null;
    banner_color: string | null;
    is_pro?: boolean; // Añadido is_pro opcional
}

interface Comment {
    id: number;
    content: string;
    created_at: string;
    likes: number; 
    parent_id: number | null;
    user_id: string;
    is_liked_by_user?: boolean;
    profiles: ProfileData; // Usamos la interfaz ProfileData
    replies?: Comment[];
}

// Tipo crudo de la DB (Manejo seguro de datos nulos y arrays)
interface RawComment {
    id: number;
    content: string;
    created_at: string;
    likes_count: number;
    parent_id: number | null;
    user_id: string;
    // Supabase puede devolver objeto, array o null
    profiles: ProfileData | ProfileData[] | null; 
}

// --- VARIANTS ---
const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    visible: { 
        opacity: 1, y: 0, scale: 1,
        transition: { type: "spring", stiffness: 100, damping: 15 }
    },
    exit: { opacity: 0, scale: 0.95 }
};

// --- SUB-COMPONENTS ---

const EmojiDock = ({ onEmojiSelect }: { onEmojiSelect: (emoji: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const emojis = ["🔥", "😱", "🧠", "👀", "😭", "🛐", "🚀"];

    return (
        <motion.div 
            className="absolute bottom-4 left-4 z-20 flex items-center"
            initial={false}
            animate={isOpen ? "open" : "closed"}
        >
            <motion.div 
                className="flex items-center bg-black/40 backdrop-blur-md border border-white/10 rounded-full overflow-hidden h-10"
                variants={{
                    closed: { width: 40, paddingRight: 0 },
                    open: { width: "auto", paddingRight: 12 }
                }}
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
            >
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-[#FF4D88] transition-colors shrink-0"
                >
                    <motion.div animate={{ rotate: isOpen ? 45 : 0 }}>
                        {isOpen ? <X size={16} /> : <Smile size={16} />}
                    </motion.div>
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <div className="flex gap-2 pl-1 pr-2">
                            {emojis.map((emoji, i) => (
                                <motion.button
                                    key={emoji}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    transition={{ delay: i * 0.03, type: "spring" }}
                                    whileHover={{ scale: 1.4, y: -2 }}
                                    whileTap={{ scale: 0.8 }}
                                    onClick={() => onEmojiSelect(emoji)}
                                    className="text-lg hover:grayscale-0 grayscale transition-all"
                                >
                                    {emoji}
                                </motion.button>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
};

const CommentNode = ({ 
    comment, 
    onReply, 
    onLike,
    isReply = false 
}: { 
    comment: Comment, 
    onReply: (comment: Comment) => void,
    onLike: (id: number, isLiked: boolean) => void,
    isReply?: boolean
}) => {
    const [showReplies, setShowReplies] = useState(false);
    const hasReplies = comment.replies && comment.replies.length > 0;

    const userName = comment.profiles?.username || "Usuario";
    const userAvatar = comment.profiles?.avatar_url;
    // Si no tiene color, usamos zinc-800. Si lo tiene, se usa tal cual.
    const cardColorClass = comment.profiles?.banner_color || "bg-zinc-800";
    const isPro = comment.profiles?.is_pro || false; // DETECTAR PRO

    return (
        <motion.div 
            layout
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`relative group ${isReply ? 'mt-4 ml-8 md:ml-12' : 'pl-0 md:pl-8 pb-8'}`}
        >
            {!isReply && (
                <div className="absolute left-[19px] top-10 bottom-0 w-[1px] bg-white/5 group-last:hidden hidden md:block" />
            )}
            
            {isReply && (
                <div className="absolute -left-4 md:-left-6 top-5 text-white/10">
                    <CornerDownRight size={20} />
                </div>
            )}

            <div className="flex items-start gap-3 md:gap-4">
                <div className="relative z-10 shrink-0">
                    {/* Borde Dorado si es PRO */}
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full bg-zinc-800 ring-2 md:ring-4 ${isPro ? 'ring-yellow-500/50' : 'ring-[#050505]'} overflow-hidden`}>
                        {userAvatar ? (
                            <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/50">
                                <UserIcon size={16} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    {/* TARJETA DE COMENTARIO */}
                    <div className={`${cardColorClass} relative border ${isPro ? 'border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'border-white/5'} rounded-2xl ${!isReply && 'rounded-tl-none'} p-4 md:p-5 transition-all duration-300 group-hover:translate-x-1 shadow-lg`}>
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-black text-white tracking-wide flex flex-wrap items-center gap-2 uppercase">
                                    {userName}
                                    
                                    {/* CORONA SI ES PRO */}
                                    {isPro && (
                                        <span className="bg-yellow-400 text-black p-[2px] rounded-full shadow-lg" title="Mukai PRO">
                                            <Crown size={10} fill="currentColor" strokeWidth={3} />
                                        </span>
                                    )}

                                    <span className="w-1 h-1 rounded-full bg-white/40" />
                                    <span className="font-medium font-mono text-[10px] text-white/60 normal-case">
                                        {new Date(comment.created_at).toLocaleDateString()}
                                    </span>
                                </span>
                            </div>
                            
                            <p className="text-xs md:text-sm text-white/90 leading-relaxed font-medium break-words">
                                {comment.content}
                            </p>

                            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/10">
                                <button 
                                    onClick={() => onReply(comment)}
                                    className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors font-bold uppercase tracking-wider"
                                >
                                    <MessageCircle size={14} /> 
                                    <span>Responder</span>
                                </button>

                                <button 
                                    onClick={() => onLike(comment.id, !!comment.is_liked_by_user)}
                                    className={`flex items-center gap-1.5 text-xs transition-all font-bold uppercase tracking-wider ${comment.is_liked_by_user ? 'text-white scale-105' : 'text-white/50 hover:text-white'}`}
                                >
                                    <ThumbsUp size={14} className={comment.is_liked_by_user ? "fill-current" : ""} /> 
                                    <span>{comment.likes}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {hasReplies && !showReplies && (
                        <button 
                            onClick={() => setShowReplies(true)}
                            className="mt-3 ml-2 flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-white transition-colors"
                        >
                            <div className="w-6 h-[1px] bg-zinc-700"></div>
                            Ver {comment.replies!.length} respuestas
                        </button>
                    )}

                    <AnimatePresence>
                        {hasReplies && showReplies && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 overflow-hidden"
                            >
                                {comment.replies!.map(reply => (
                                    <CommentNode 
                                        key={reply.id} 
                                        comment={reply} 
                                        onReply={onReply}
                                        onLike={onLike}
                                        isReply={true} 
                                    />
                                ))}
                                <button 
                                    onClick={() => setShowReplies(false)}
                                    className="mt-2 ml-12 flex items-center gap-2 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                                >
                                    <CornerDownLeft size={12} /> Ocultar respuestas
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};

// --- MAIN COMPONENT ---

export const CommentsSection = ({ mangaId }: { mangaId: string }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filter, setFilter] = useState<'recientes' | 'populares'>('recientes');
    const [replyingTo, setReplyingTo] = useState<{id: number, name: string} | null>(null);
    
    // AUTH STATES
    const [user, setUser] = useState<User | null>(null); 
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authInitialView, setAuthInitialView] = useState<'login' | 'register'>('login');
    const [refreshKey, setRefreshKey] = useState(0); 

    const INITIAL_VISIBLE_COUNT = 3;
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

    // 1. DETECTAR SESIÓN
    useEffect(() => {
        supabase.auth.getSession().then((result: { data: { session: Session | null } }) => {
            setUser(result.data.session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
            setUser(session?.user ?? null);
            if(session?.user) setRefreshKey(prev => prev + 1);
        });

        return () => subscription.unsubscribe();
    }, []);

    const requireAuth = (action: 'login' | 'register' = 'login') => {
        if (!user) {
            setAuthInitialView(action);
            setIsAuthModalOpen(true);
            return false;
        }
        return true;
    };

    // 2. FETCH COMENTARIOS
    useEffect(() => {
        if (!mangaId) return;

        let isMounted = true; 

        const fetchComments = async () => {
            const { data: commentsData, error } = await supabase
                .from('comments')
                .select(`
                    *,
                    profiles (
                        username,
                        avatar_url,
                        banner_color,
                        is_pro 
                    )
                `)
                .eq('manga_id', mangaId)
                .order('created_at', { ascending: filter === 'recientes' ? false : true });
            
            if (error) {
                console.error("Error fetching comments:", error);
                return;
            }

            let userLikes: { comment_id: number }[] = [];
            
            if (user) {
                const { data } = await supabase
                    .from('comment_likes')
                    .select('comment_id')
                    .eq('user_id', user.id);
                    
                if (data) userLikes = data as { comment_id: number }[];
            }

            if (commentsData && isMounted) {
                const likedCommentIds = new Set(userLikes.map((l) => l.comment_id));

                // Casting seguro
                const rawData = commentsData as unknown as RawComment[];

                const enrichedComments: Comment[] = rawData.map((c) => {
                    // Valor por defecto
                    let userProfile: ProfileData = { 
                        username: "Usuario Desconocido", 
                        avatar_url: null, 
                        banner_color: "bg-zinc-800",
                        is_pro: false
                    };

                    if (c.profiles) {
                        if (Array.isArray(c.profiles)) {
                            if (c.profiles.length > 0) userProfile = c.profiles[0];
                        } else {
                            userProfile = c.profiles;
                        }
                    }

                    return {
                        id: c.id,
                        content: c.content,
                        created_at: c.created_at,
                        likes: c.likes_count || 0,
                        parent_id: c.parent_id,
                        user_id: c.user_id,
                        is_liked_by_user: likedCommentIds.has(c.id),
                        profiles: userProfile
                    };
                });

                let sortedData = enrichedComments;
                if (filter === 'populares') {
                    sortedData = enrichedComments.sort((a, b) => (b.likes || 0) - (a.likes || 0));
                }
                setComments(sortedData);
            }
        };

        fetchComments();

        return () => { isMounted = false; };
    }, [mangaId, user, filter, refreshKey]);

    // ARBOL
    const threadedComments = useMemo(() => {
        const map = new Map();
        const roots: Comment[] = [];
        comments.forEach(c => map.set(c.id, { ...c, replies: [] }));
        comments.forEach(c => {
            if (c.parent_id) {
                const parent = map.get(c.parent_id);
                if (parent) parent.replies.push(map.get(c.id));
                else roots.push(map.get(c.id)); 
            } else {
                roots.push(map.get(c.id));
            }
        });
        return roots;
    }, [comments]);

    const handlePostComment = async () => {
        if (!requireAuth('login')) return;
        if (!newComment.trim() || !mangaId) return;
        setIsSubmitting(true);
        
        let currentProfile: ProfileData = { 
            username: 'Tú', 
            avatar_url: null, 
            banner_color: 'bg-zinc-800',
            is_pro: false
        };
        
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('username, avatar_url, banner_color, is_pro')
                .eq('id', user.id)
                .single();
            if (data) currentProfile = data;
        }

        const payload = {
            manga_id: mangaId,
            content: newComment,
            user_id: user?.id,
            parent_id: replyingTo ? replyingTo.id : null
        };
        
        const { data, error } = await supabase
            .from('comments')
            .insert({ ...payload })
            .select()
            .single();

        if (!error && data) {
            const newCommentObj: Comment = {
                id: data.id,
                content: data.content,
                created_at: data.created_at,
                likes: 0,
                parent_id: data.parent_id,
                user_id: data.user_id,
                is_liked_by_user: false,
                profiles: currentProfile,
                replies: []
            };

            setComments(prev => [newCommentObj, ...prev]); 
            setNewComment("");
            setReplyingTo(null);
            if (!replyingTo) setVisibleCount(INITIAL_VISIBLE_COUNT);
        } else {
            console.error("Error posting:", error?.message);
            alert("No se pudo publicar. Intenta nuevamente.");
        }
        setIsSubmitting(false);
    };

    const handleLike = async (commentId: number, currentlyLiked: boolean) => {
        if (!requireAuth('login') || !user) return;

        const previousComments = [...comments];
        setComments(prev => prev.map(c => {
            if (c.id === commentId) {
                return {
                    ...c,
                    likes: currentlyLiked ? (c.likes - 1) : (c.likes + 1),
                    is_liked_by_user: !currentlyLiked
                };
            }
            return c;
        }));

        if (currentlyLiked) {
            const { error } = await supabase
                .from('comment_likes')
                .delete()
                .match({ user_id: user.id, comment_id: commentId });
            
            if (error) setComments(previousComments);
        } else {
            const { error } = await supabase
                .from('comment_likes')
                .insert({ user_id: user.id, comment_id: commentId });
            
            if (error) setComments(previousComments);
        }
    };

    const initiateReply = (comment: Comment) => {
        if (!requireAuth('login')) return;
        const replyName = comment.profiles?.username || "Usuario";
        setReplyingTo({ id: comment.id, name: replyName });
        
        setTimeout(() => {
            const input = document.getElementById('comment-input');
            const container = document.getElementById('composer-area');
            if (input && container) {
                input.focus();
                container.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    };

    const visibleThreads = threadedComments.slice(0, visibleCount);
    const showToggleButton = threadedComments.length > INITIAL_VISIBLE_COUNT;
    const isExpanded = visibleCount >= threadedComments.length;

    const toggleVisibility = () => {
        if (isExpanded) {
            setVisibleCount(INITIAL_VISIBLE_COUNT);
        } else {
            setVisibleCount(threadedComments.length);
        }
    };

    return (
        <section className="relative w-full max-w-[1400px] mx-auto px-4 md:px-6 mt-20 mb-32 z-10">
            
            <AuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
                initialView={authInitialView}
            />

            {/* --- CABECERA --- */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-4 border-b border-white/5 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto justify-start">
                    <div className="flex items-center gap-3">
                        <MessageSquare size={20} className="text-[#FF4D88]" />
                        <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
                            COMENTARIOS
                        </h3>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full text-xs font-medium text-zinc-400">
                        <span>{comments.length} comentarios</span>
                    </div>
                </div>
                
                <div className="w-full flex justify-center md:justify-end md:w-auto">
                    <div className="bg-zinc-800 p-1 rounded-lg flex relative">
                        {(['recientes', 'populares'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`relative px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors z-10 ${filter === f ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
                            >
                                {f === filter && (
                                    <motion.div
                                        layoutId="tab-bg"
                                        className="absolute inset-0 bg-zinc-600 rounded-[4px]"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-20">
                                    {f}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-[350px_1fr] gap-12 items-start">
                
                {/* FORMULARIO DE COMENTARIO */}
                <div className="lg:sticky lg:top-24 order-1 lg:order-none z-20" id="composer-area">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-zinc-900 border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-2xl"
                    >
                        <div className="relative">
                            <label className="text-xs font-black text-zinc-500 uppercase mb-4 block tracking-widest">
                                Tu Opinión
                            </label>
                            
                            <AnimatePresence>
                                {replyingTo && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="mb-2 bg-[#FF4D88]/10 border border-[#FF4D88]/20 rounded-lg px-3 py-2 flex items-center justify-between overflow-hidden"
                                    >
                                        <div className="flex items-center gap-2 text-xs text-[#FF4D88]">
                                            <CornerDownRight size={12} />
                                            <span>Respondiendo a <strong>{replyingTo.name}</strong></span>
                                        </div>
                                        <button onClick={() => setReplyingTo(null)} className="text-[#FF4D88]/60 hover:text-[#FF4D88]">
                                            <X size={12} />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                            <div className="relative group">
                                <textarea
                                    id="comment-input"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onFocus={() => {
                                        if (!user) {
                                            document.getElementById('comment-input')?.blur();
                                            requireAuth('register');
                                        }
                                    }}
                                    placeholder={!user ? "Inicia sesión para comentar..." : (replyingTo ? "Escribe tu respuesta..." : "¿Qué te pareció el capítulo?")}
                                    className="w-full h-40 bg-black/20 text-white text-sm p-4 pb-14 rounded-xl border border-white/10 focus:border-[#FF4D88] focus:bg-black/40 focus:outline-none transition-all resize-none placeholder:text-zinc-600 font-medium"
                                />
                                
                                <EmojiDock onEmojiSelect={(e) => {
                                    if(requireAuth('login')) setNewComment(prev => prev + e)
                                }} />

                                <motion.button
                                    onClick={handlePostComment}
                                    disabled={isSubmitting || !newComment.trim()}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`absolute bottom-4 right-4 h-9 px-5 bg-[#FF4D88] text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-transform shadow-lg shadow-[#FF4D88]/20 ${isSubmitting ? 'opacity-50 grayscale' : ''}`}
                                >
                                    {isSubmitting ? '...' : (replyingTo ? 'Responder' : 'Publicar')} <Send size={12} strokeWidth={3} />
                                </motion.button>
                            </div>

                            <div className="mt-4 flex items-center justify-between text-[10px] font-mono">
                                <span className="text-zinc-500 font-bold uppercase tracking-wide">Respeta a la comunidad</span>
                                <span className="text-zinc-600">{newComment.length}/500</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* LISTA DE COMENTARIOS */}
                <div className="order-2 w-full min-h-[500px]">
                    <AnimatePresence mode="popLayout">
                        {threadedComments.length > 0 ? (
                            <div className="flex flex-col">
                                {visibleThreads.map((comment) => (
                                    <CommentNode 
                                        key={comment.id} 
                                        comment={comment} 
                                        onReply={initiateReply}
                                        onLike={handleLike}
                                    />
                                ))}
                                
                                {showToggleButton && (
                                    <div className="flex justify-center mt-6">
                                        <motion.button
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={toggleVisibility}
                                            className="flex items-center gap-2 px-8 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-full transition-all"
                                        >
                                            {isExpanded ? (
                                                <>Ocultar <ChevronUp size={14} /></>
                                            ) : (
                                                <>Mostrar todos <ChevronDown size={14} /></>
                                            )}
                                        </motion.button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center text-center p-12 border border-dashed border-zinc-800 rounded-3xl"
                            >
                                <MessageSquare size={48} className="text-zinc-800 mb-4" />
                                <h4 className="text-white text-lg font-bold">Sé el primero en comentar</h4>
                                <p className="text-zinc-500 text-sm mt-2 max-w-xs mx-auto">
                                    {!user ? "Inicia sesión para compartir tu teoría." : "Este espacio está vacío. ¡Llénalo con tus ideas!"}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </div>
        </section>
    );
};