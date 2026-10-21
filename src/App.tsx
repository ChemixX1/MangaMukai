import { lazy, Suspense, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter, HashRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { migrateOldDataToWordPress } from './services/migrationService';
import { MaintenanceGate } from './components/common/MaintenanceGate';
import { MobileSectionHeader, MobileTabBar, Navbar } from './components/layout';
import { applyRouteSeo } from './hooks/useDocumentTitle';
import { scheduleSubscriptionBackground } from './utils/subscriptionBackground';
import './styles/pro.css';
import { syncReaderPrefetchAuth, syncReaderPrefetchRoute } from './services/readerPrefetchSession';
import { AUTH_CHANGED_EVENT } from './services/authService';
import { NavigationPreload } from './components/common/NavigationPreload';
import { blockBackgroundTasks } from './utils/backgroundTasks';

const Router = import.meta.env.VITE_GITHUB_PAGES === 'true' ? HashRouter : BrowserRouter;

const EditProfilePage = lazy(() => import('./pages/EditProfilePage'));
const ProPage = lazy(() => import('./pages/ProPage'));
const Home = lazy(() => import('./pages/Home'));
const MangaBlackWhite = lazy(() => import('./pages/MangaBlackWhite'));
const MangaAdult = lazy(() => import('./pages/MangaAdult'));
const MangaDetail = lazy(() => import('./pages/MangaDetail').then(({ MangaDetail: Page }) => ({ default: Page })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(({ AboutPage: Page }) => ({ default: Page })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(({ ContactPage: Page }) => ({ default: Page })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(({ ProfilePage: Page }) => ({ default: Page })));
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage').then(({ PublicProfilePage: Page }) => ({ default: Page })));
const ProfilePostPage = lazy(() => import('./pages/ProfilePostPage').then(({ ProfilePostPage: Page }) => ({ default: Page })));
const TermsAndPrivacy = lazy(() => import('./pages/TermsAndPrivacy').then(({ TermsAndPrivacy: Page }) => ({ default: Page })));
const ReaderPage = lazy(() => import('./pages/ReaderPage').then(({ ReaderPage: Page }) => ({ default: Page })));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess').then(({ PaymentSuccess: Page }) => ({ default: Page })));
const CoinMarketPage = lazy(() => import('./pages/CoinMarketPage').then(({ CoinMarketPage: Page }) => ({ default: Page })));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const CharacterChatPage = lazy(() => import('./pages/CharacterChatPage'));
const ShopPage = lazy(() => import('./pages/ShopPage'));
const LegalDocumentPage = lazy(() => import('./pages/LegalDocumentPage').then(({ LegalDocumentPage: Page }) => ({ default: Page })));

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      let anchor = hash.slice(1);
      try { anchor = decodeURIComponent(anchor); } catch {}
      const scrollToAnchor = () => {
        const target = document.getElementById(anchor);
        if (!target) return false;
        target.scrollIntoView({ block: 'start' });
        return true;
      };
      if (scrollToAnchor()) return;
      const observer = new MutationObserver(() => {
        if (scrollToAnchor()) observer.disconnect();
      });
      observer.observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true });
      const timeout = window.setTimeout(() => observer.disconnect(), 10000);
      return () => { observer.disconnect(); window.clearTimeout(timeout); };
    }
    // The community restores its position once its cached feed is mounted.
    if (pathname !== '/comunidad') window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
};

const RouteSeo = () => {
  const { pathname } = useLocation();
  useLayoutEffect(() => { syncReaderPrefetchRoute(pathname); }, [pathname]);
  useEffect(() => {
    const changed = () => syncReaderPrefetchAuth();
    window.addEventListener(AUTH_CHANGED_EVENT, changed);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, changed);
  }, []);
  useLayoutEffect(() => {
    applyRouteSeo(pathname);
  }, [pathname]);
  return null;
};

const pageColors = 'bg-white text-black dark:bg-black dark:text-white';

function RouteLoadingFallback() {
  const { pathname } = useLocation();
  useEffect(() => blockBackgroundTasks(), []);
  if (pathname === '/pro') return <main className="pro-page" aria-busy="true" />;
  return <div className={`min-h-screen ${pageColors}`} role="status" aria-label="Cargando página" />;
}

function SubscriptionBackgroundPreload() {
  const { pathname } = useLocation();
  useEffect(() => {

    if (pathname === '/' || pathname === '/pro' || /^\/(read|manga)\//.test(pathname)) return;
    return scheduleSubscriptionBackground();
  }, [pathname]);
  return null;
}

function AppInner() {
  useEffect(() => {
    migrateOldDataToWordPress().catch(console.error);
  }, []);

  return (
    <Router>

      <MaintenanceGate />
      <ScrollToTop />
      <SubscriptionBackgroundPreload />
      <RouteSeo />
      <NavigationPreload />
      <Navbar />
      <MobileTabBar />
      <MobileSectionHeader />
      <div className={`mobile-tabbar-space min-h-screen font-sans ${pageColors}`}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/nosotros" element={<AboutPage />} />
            <Route path="/contacto" element={<ContactPage />} />
            <Route path="/usuarios/:id" element={<PublicProfilePage />} />
              <Route path="/usuarios/:id/publicacion/:postId" element={<ProfilePostPage />} />
            <Route path="/comunidad" element={<CommunityPage />} />
            <Route path="/comunidad/guardados" element={<CommunityPage />} />
            <Route path="/comunidad/publicacion/:postId" element={<CommunityPage />} />
            <Route path="/mensajes" element={<MessagesPage />} />
            <Route path="/mensajes/:userId" element={<MessagesPage />} />
            <Route path="/notificaciones" element={<NotificationsPage />} />
            <Route path="/chat" element={<CharacterChatPage />} />
            <Route path="/chat/:characterId" element={<CharacterChatPage />} />
            <Route path="/chat/:characterId/conversacion" element={<CharacterChatPage />} />
            <Route path="/tienda" element={<ShopPage />} />
            <Route path="/tienda/pago" element={<CoinMarketPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/transacciones" element={<TransactionsPage />} />
            <Route path="/mas" element={<Navigate to="/profile" replace />} />
            <Route path="/pro" element={<ProPage />} />
            <Route path="/pro/pago" element={<CoinMarketPage />} />
            <Route path="/perfil/editar" element={<EditProfilePage />} />
            <Route path="/legal" element={<TermsAndPrivacy />} />
            <Route path="/privacidad" element={<LegalDocumentPage slug="privacidad" />} />
            <Route path="/terminos" element={<LegalDocumentPage slug="terminos" />} />
            <Route path="/normas-comunidad" element={<LegalDocumentPage slug="normas-comunidad" />} />
            <Route path="/cookies" element={<LegalDocumentPage slug="cookies" />} />
            <Route path="/auth/:view" element={<AuthPage />} />
            <Route path="/login" element={<Navigate to="/auth/login" replace />} />
            <Route path="/manga/:id" element={<MangaDetail />} />
            <Route path="/read/:chapterId" element={<ReaderPage />} />
            <Route path="/recargar" element={<CoinMarketPage />} />
            <Route path="/recargar/pago" element={<CoinMarketPage />} />
            <Route path="/pago-exitoso" element={<PaymentSuccess />} />
            <Route path="/manga-bn" element={<MangaBlackWhite />} />
            <Route path="/manga-19" element={<MangaAdult />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

function App() {
  return <AppInner />;
}

export default App;
