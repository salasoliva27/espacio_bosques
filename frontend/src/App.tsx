import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from './lib/auth';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { t } from './lib/i18n';
import SimulationBanner from './components/SimulationBanner';
import AuthScreen from './components/AuthScreen';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import CreateProject from './pages/CreateProject';
import Reports from './pages/Reports';

const queryClient = new QueryClient();

function AppInner() {
  const { lang } = useLanguage(); // re-render on lang change
  void lang;
  // undefined = loading, null = logged out, object = logged in
  const [session, setSession] = useState<any>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080c10' }}>
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>{t('app.loading')}</p>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <SimulationBanner />
        <div style={{ paddingTop: import.meta.env.VITE_SIMULATION_MODE === 'true' ? '28px' : '0' }}>
          <AuthScreen onSuccess={() => {}} />
        </div>
      </>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <SimulationBanner />
        <div
          className="min-h-screen bg-gray-50"
          style={{ paddingTop: import.meta.env.VITE_SIMULATION_MODE === 'true' ? '28px' : '0' }}
        >
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/create" element={<CreateProject />} />
            <Route path="/reports/:projectId" element={<Reports />} />
            <Route path="/auth/callback" element={<Dashboard />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  );
}

export default App;
