import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ProfilePostCard } from '../components/social/ProfilePostCard';
import { useTheme } from '../hooks/useTheme';
import { getProfilePosts, type ProfilePost } from '../services/profilePostService';
import '../styles/community.css';

export const ProfilePostPage = () => {
  const { id = '', postId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const state = location.state as { profilePost?: ProfilePost; profileReturn?: string } | null;
  const [post, setPost] = useState<ProfilePost | null>(state?.profilePost?.id === Number(postId) ? state.profilePost : null);
  const [loading, setLoading] = useState(!post);
  const [error, setError] = useState('');
  const back = state?.profileReturn?.startsWith('/') ? state.profileReturn : `/usuarios/${id}`;

  useEffect(() => {
    if (post?.id === Number(postId)) return;
    let live = true;
    void getProfilePosts(id).then((posts) => {
      if (!live) return;
      const found = posts.find((entry) => entry.id === Number(postId)) || null;
      setPost(found);
      if (!found) setError('Esta publicación no está disponible.');
    }).catch((caught) => { if (live) setError(caught instanceof Error ? caught.message : 'No se pudo cargar la publicación.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [id, postId, post?.id]);

  return <main className="community-page is-thread profile-post-detail-page">
    <div className="community-shell profile-post-detail-shell">
      <div className="community-main">
        <section className="community-thread">
          <button type="button" className="community-back" onClick={() => navigate(back)}><ArrowLeft size={21} />Regresar</button>
          {post ? <ProfilePostCard initialPost={post} isLight={theme === 'light'} variant="community" detail /> : loading ? <p className="community-empty">Cargando publicación…</p> : <div className="community-empty"><p>{error}</p><Link to={back}>Volver al perfil</Link></div>}
        </section>
      </div>
    </div>
  </main>;
};
