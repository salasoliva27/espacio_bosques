import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from './lib/auth';
import SimulationBanner from './components/SimulationBanner';
import AuthScreen from './components/AuthScreen';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import CreateProject from './pages/CreateProject';
import Reports from './pages/Reports';

const queryClient = new QueryClient();

function App() {
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
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>Cargando…</p>
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
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
