import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase, signOut } from '../lib/auth';
import { useLanguage, useT } from '../context/LanguageContext';
import { LayoutGrid, Plus, LogOut, Globe, UserCircle, Briefcase, Rss } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const { lang, toggle } = useLanguage();
  const t = useT();
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.VITE_SIMULATION_MODE === 'true') {
      setUser({ id: 'sim-user', email: 'demo@bosques.mx', user_metadata: { full_name: 'Demo Usuario' } } as any);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav style={{ background: '#0d1520', borderBottom: '1px solid #1e2d3d' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight" style={{ color: '#00e5c4' }}>Espacio Bosques</span>
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{ color: isActive('/dashboard') ? '#00e5c4' : '#9ca3af', background: isActive('/dashboard') ? 'rgba(0,229,196,0.08)' : 'transparent' }}
              >
                <LayoutGrid size={13} />{t('nav.dashboard')}
              </Link>
              <Link
                to="/create"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{ color: isActive('/create') ? '#00e5c4' : '#9ca3af', background: isActive('/create') ? 'rgba(0,229,196,0.08)' : 'transparent' }}
              >
                <Plus size={13} />{t('nav.create')}
              </Link>
              <Link
                to="/providers"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{ color: isActive('/providers') ? '#00e5c4' : '#9ca3af', background: isActive('/providers') ? 'rgba(0,229,196,0.08)' : 'transparent' }}
              >
                <Briefcase size={13} />Providers
              </Link>
              <Link
                to="/feed"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{ color: isActive('/feed') ? '#00e5c4' : '#9ca3af', background: isActive('/feed') ? 'rgba(0,229,196,0.08)' : 'transparent' }}
              >
                <Rss size={13} />{t('nav.feed')}
              </Link>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md" style={{ background: '#1e2d3d', color: '#9ca3af', border: '1px solid #2a3f52' }}>
              <Globe size={11} />{lang === 'es' ? 'EN' : 'ES'}
            </button>
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-colors"
                  style={{ color: isActive('/profile') ? '#00e5c4' : '#9ca3af', background: isActive('/profile') ? 'rgba(0,229,196,0.08)' : '#1e2d3d', border: '1px solid #2a3f52' }}
                >
                  <UserCircle size={12} />
                  <span className="truncate max-w-[120px]">{user.user_metadata?.full_name || user.email?.split('@')[0]}</span>
                </Link>
                <button onClick={() => signOut()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md" style={{ background: '#1e2d3d', color: '#9ca3af', border: '1px solid #2a3f52' }}>
                  <LogOut size={11} />{t('nav.signout')}
                </button>
              </>
            ) : (
              <Link to="/dashboard" className="text-sm font-semibold px-4 py-1.5 rounded-md transition-opacity hover:opacity-90" style={{ background: '#00e5c4', color: '#080c10' }}>
                {t('nav.signin')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
