import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { migrateOldDataToSupabase } from './utils/migration';
import { HomeDataProvider, useHomeData } from './context/HomeDataContext';
import { GlobalLoader } from './components/GlobalLoader';

// --- PÁGINAS Y COMPONENTES ---
import Home from './pages/Home';
import { MangaDetail } from './pages/MangaDetail';
import { Navbar } from './components/Navbar';
import { Catalog } from './pages/Catalog';
import { AboutSection } from './components/AboutSection';
import { ContactSection } from './components/ContactSection';
import { ProfilePage } from './pages/ProfilePage';
import { TermsAndPrivacy } from './pages/TermsAndPrivacy';
import { SavedMangas } from './pages/SavedMangas';
import { ReaderPage } from './pages/ReaderPage';
import { PaymentSuccess } from './pages/PaymentSuccess';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};

function AppInner() {
  const { isReady } = useHomeData();

  useEffect(() => {
    migrateOldDataToSupabase().catch(console.error);
  }, []);

  return (
    <Router>
      <GlobalLoader isLoaded={isReady} />
      <ScrollToTop />
      <Navbar />
      <div className="min-h-screen bg-[#02040a] text-white font-sans transition-colors duration-300">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/nosotros" element={<AboutSection />} />
          <Route path="/contacto" element={<ContactSection />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/saved" element={<SavedMangas />} />
          <Route path="/legal" element={<TermsAndPrivacy />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/manga/:id" element={<MangaDetail />} />
          <Route path="/read/:chapterId" element={<ReaderPage />} />
          <Route path="/pago-exitoso" element={<PaymentSuccess />} />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <HomeDataProvider>
      <AppInner />
    </HomeDataProvider>
  );
}

export default App;
