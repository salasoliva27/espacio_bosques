import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useT } from '../context/LanguageContext';

interface Project {
  id: string;
  title: string;
  summary: string;
  category: string;
  status: string;
  fundingGoal: string;
  fundingRaised: string;
  planner: { walletAddress: string };
  milestones: any[];
}

const CATEGORY_COLORS: Record<string, string> = {
  INFRASTRUCTURE: '#3b82f6',
  COMMUNITY: '#8b5cf6',
  ENVIRONMENTAL: '#10b981',
  TECHNOLOGY: '#00e5c4',
  EDUCATION: '#f59e0b',
  infrastructure: '#3b82f6',
  community: '#8b5cf6',
  environment: '#10b981',
  technology: '#00e5c4',
  education: '#f59e0b',
};

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useT();

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data.projects);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const toEth = (amount: string) => {
    try { return (Number(BigInt(amount)) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
    catch { return '0'; }
  };

  const pct = (raised: string, goal: string) => {
    try {
      const r = BigInt(raised), g = BigInt(goal);
      if (g === BigInt(0)) return 0;
      return Math.min(Number((r * BigInt(100)) / g), 100);
    } catch { return 0; }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#080c10' }}>
      <p style={{ color: '#6b7280', fontSize: 14 }}>{t('dashboard.loading')}</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#080c10' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#e8f4f0' }}>{t('dashboard.title')}</h1>
            <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>{t('dashboard.subtitle')}</p>
          </div>
          <Link
            to="/create"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: '#00e5c4', color: '#080c10' }}
          >
            + {t('nav.create')}
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const progress = pct(project.fundingRaised, project.fundingGoal);
            const catColor = CATEGORY_COLORS[project.category] || '#6b7280';
            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="group flex flex-col rounded-xl overflow-hidden transition-all hover:-translate-y-0.5"
                style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}
              >
                {/* Card top accent */}
                <div style={{ height: 3, background: catColor }} />

                <div className="flex flex-col flex-1 p-5">
                  {/* Category + status */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${catColor}22`, color: catColor }}>
                      {project.category}
                    </span>
                    <span className="text-xs font-medium" style={{ color: project.status === 'ACTIVE' ? '#10b981' : '#6b7280' }}>
                      ● {project.status}
                    </span>
                  </div>

                  {/* Title + summary */}
                  <h3 className="font-semibold text-base mb-2 leading-snug" style={{ color: '#e8f4f0' }}>{project.title}</h3>
                  <p className="text-sm flex-1 mb-4 line-clamp-3" style={{ color: '#6b7280' }}>{project.summary}</p>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs" style={{ color: '#9ca3af' }}>
                      <span>{t('dashboard.progress')}</span>
                      <span className="font-semibold" style={{ color: '#e8f4f0' }}>{progress}%</span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ background: '#1e2d3d' }}>
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, background: '#00e5c4' }} />
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: '#6b7280' }}>
                      <span>{toEth(project.fundingRaised)} ETH raised</span>
                      <span>{project.milestones.length} milestones</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {projects.length === 0 && (
          <div className="text-center py-20">
            <p style={{ color: '#6b7280' }}>{t('dashboard.empty')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
