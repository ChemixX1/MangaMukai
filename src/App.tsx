import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { migrateOldDataToWordPress } from './services/migrationService';
import { GlobalLoader } from './components/common';
import { Navbar } from './components/layout';

const Home = lazy(() => import('./pages/Home'));
const MangaBlackWhite = lazy(() => import('./pages/MangaBlackWhite'));
const MangaAdult = lazy(() => import('./pages/MangaAdult'));
const MangaDetail = lazy(() => import('./pages/MangaDetail').then(({ MangaDetail: Page }) => ({ default: Page })));
const Biblioteca = lazy(() => import('./pages/Biblioteca').then(({ Biblioteca: Page }) => ({ default: Page })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(({ AboutPage: Page }) => ({ default: Page })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(({ ContactPage: Page }) => ({ default: Page })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(({ ProfilePage: Page }) => ({ default: Page })));
const TermsAndPrivacy = lazy(() => import('./pages/TermsAndPrivacy').then(({ TermsAndPrivacy: Page }) => ({ default: Page })));
const SavedMangas = lazy(() => import('./pages/SavedMangas').then(({ SavedMangas: Page }) => ({ default: Page })));
const ReaderPage = lazy(() => import('./pages/ReaderPage').then(({ ReaderPage: Page }) => ({ default: Page })));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess').then(({ PaymentSuccess: Page }) => ({ default: Page })));
const AuthPage = lazy(() => import('./pages/AuthPage'));

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};

function AppInner() {
  useEffect(() => {
    migrateOldDataToWordPress().catch(console.error);
  }, []);

  return (
    <Router>
      <GlobalLoader />
      <ScrollToTop />
      <Navbar />
      <div className="min-h-screen bg-black text-white font-sans transition-colors duration-300">
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/nosotros" element={<AboutPage />} />
            <Route path="/contacto" element={<ContactPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/saved" element={<SavedMangas />} />
            <Route path="/legal" element={<TermsAndPrivacy />} />
            <Route path="/biblioteca" element={<Biblioteca />} />
            <Route path="/auth/:view" element={<AuthPage />} />
            <Route path="/login" element={<Navigate to="/auth/login" replace />} />
            <Route path="/register" element={<Navigate to="/auth/register" replace />} />
            <Route path="/registro" element={<Navigate to="/auth/register" replace />} />
            <Route path="/catalog" element={<Navigate to="/biblioteca" replace />} />
            <Route path="/catalogo" element={<Navigate to="/biblioteca" replace />} />
            <Route path="/manga/:id" element={<MangaDetail />} />
            <Route path="/read/:chapterId" element={<ReaderPage />} />
            <Route path="/pago-exitoso" element={<PaymentSuccess />} />
            <Route path="/manga-bn" element={<MangaBlackWhite />} />
            <Route path="/manga-19" element={<MangaAdult />} />
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
