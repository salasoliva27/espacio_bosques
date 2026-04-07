import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useT } from '../context/LanguageContext';
import InvestModal from '../components/InvestModal';
import MilestoneCalendar from '../components/MilestoneCalendar';
import VotingSection from '../components/VotingSection';
import TransactionLedger from '../components/TransactionLedger';
import BidModal from '../components/BidModal';

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  COMPLETED:  { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  IN_PROGRESS:{ color: '#00e5c4', bg: 'rgba(0,229,196,0.12)' },
  SUBMITTED:  { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  PENDING:    { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInvest, setShowInvest] = useState(false);
  const [bidRole, setBidRole] = useState<any>(null);
  const t = useT();

  useEffect(() => { fetchProject(); }, [id]);

  const fetchProject = async () => {
    try {
      const response = await axios.get(`/api/projects/${id}`);
      setProject(response.data.project);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setLoading(false);
    }
  };

  const toEth = (amount: string) => {
    try { return (Number(BigInt(amount)) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 4 }); }
    catch { return '0'; }
  };

  const fundingPct = (raised: string, goal: string) => {
    try {
      const r = Number(BigInt(raised)), g = Number(BigInt(goal));
      if (g === 0) return 0;
      return Math.min(Math.round((r / g) * 100), 100);
    } catch { return 0; }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#080c10' }}>
      <p style={{ color: '#6b7280', fontSize: 14 }}>{t('project.loading')}</p>
    </div>
  );
  if (!project) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#080c10' }}>
      <p style={{ color: '#6b7280', fontSize: 14 }}>{t('project.not_found')}</p>
    </div>
  );

  const progress = fundingPct(project.fundingRaised, project.fundingGoal);

  return (
    <div className="min-h-screen" style={{ background: '#080c10' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Breadcrumb */}
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm mb-6 transition-opacity hover:opacity-80" style={{ color: '#6b7280' }}>
          ← {t('project.back')}
        </Link>

        {/* Title row */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#e8f4f0' }}>{project.title}</h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{
              background: project.status === 'ACTIVE' ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.12)',
              color: project.status === 'ACTIVE' ? '#10b981' : '#9ca3af',
            }}>
              {project.status}
            </span>
          </div>
          <button
            onClick={() => setShowInvest(true)}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: '#00e5c4', color: '#080c10' }}
          >
            {t('project.fund_btn')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Milestone calendar — full width */}
          <div className="col-span-full">
            <MilestoneCalendar milestones={project.milestones} projectCreatedAt={project.createdAt} />
          </div>

          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">
            {/* About */}
            <div className="rounded-xl p-6" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
              <h2 className="text-base font-semibold mb-3" style={{ color: '#e8f4f0' }}>{t('project.about')}</h2>
              <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>{project.summary}</p>
            </div>

            {/* Milestones */}
            <div className="rounded-xl p-6" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: '#e8f4f0' }}>{t('project.milestones')}</h2>
              <div className="space-y-4">
                {project.milestones.map((m: any, i: number) => {
                  const s = STATUS_STYLES[m.status] || STATUS_STYLES.PENDING;
                  return (
                    <div key={m.id} className="flex gap-4">
                      {/* Step indicator */}
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}40` }}>
                          {i + 1}
                        </div>
                        {i < project.milestones.length - 1 && (
                          <div className="w-px flex-1 mt-1" style={{ background: '#1e2d3d' }} />
                        )}
                      </div>
                      <div className="pb-4 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-sm font-semibold" style={{ color: '#e8f4f0' }}>{m.title}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>{m.status}</span>
                        </div>
                        <p className="text-xs mb-2" style={{ color: '#6b7280' }}>{m.description}</p>
                        <div className="flex gap-4 text-xs" style={{ color: '#6b7280' }}>
                          <span>{m.fundingPercentage}% of funding</span>
                          <span>{m.durationDays} days</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Providers Needed */}
            <div className="rounded-xl p-6" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: '#e8f4f0' }}>{t('roles.title')}</h2>
              {!project.requiredRoles || project.requiredRoles.length === 0 ? (
                <p className="text-sm" style={{ color: '#6b7280' }}>{t('roles.empty')}</p>
              ) : (
                <div className="space-y-4">
                  {project.requiredRoles.map((role: any) => {
                    const linkedMilestone = project.milestones.find((m: any) => m.id === role.milestoneId);
                    return (
                      <div
                        key={role.id}
                        className="rounded-lg p-4"
                        style={{ background: '#0a1420', border: '1px solid #1e2d3d' }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold mb-1" style={{ color: '#e8f4f0' }}>{role.role}</p>
                            <p className="text-xs leading-relaxed mb-2" style={{ color: '#6b7280' }}>{role.description}</p>
                            {linkedMilestone && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(0,229,196,0.08)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.15)' }}
                              >
                                {t('roles.milestone')}: {linkedMilestone.title}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => setBidRole(role)}
                            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
                            style={{ background: 'rgba(0,229,196,0.12)', color: '#00e5c4', border: '1px solid rgba(0,229,196,0.2)' }}
                          >
                            {t('roles.bid_btn')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Funding card */}
            <div className="rounded-xl p-6" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: '#9ca3af' }}>{t('project.funding')}</h3>
              <div className="text-3xl font-bold mb-0.5" style={{ color: '#00e5c4' }}>
                {toEth(project.fundingRaised)} ETH
              </div>
              <div className="text-xs mb-4" style={{ color: '#6b7280' }}>
                of {toEth(project.fundingGoal)} ETH goal
              </div>
              <div className="w-full rounded-full h-2 mb-1" style={{ background: '#1e2d3d' }}>
                <div className="h-2 rounded-full" style={{ width: `${progress}%`, background: '#00e5c4' }} />
              </div>
              <div className="text-xs text-right mb-5" style={{ color: '#9ca3af' }}>{progress}%</div>
              <button
                onClick={() => setShowInvest(true)}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: '#00e5c4', color: '#080c10' }}
              >
                {t('project.fund_btn')}
              </button>
            </div>

            {/* Recent activity */}
            {project.investments?.length > 0 && (
              <div className="rounded-xl p-6" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: '#9ca3af' }}>{t('project.activity')}</h3>
                <div className="space-y-2.5">
                  {project.investments.slice(0, 5).map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: '#6b7280' }}>{t('dashboard.community')}</span>
                      <span className="text-xs font-semibold font-mono" style={{ color: '#e8f4f0' }}>{toEth(inv.amount)} ETH</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Telemetry */}
            {project.telemetry?.length > 0 && (
              <div className="rounded-xl p-6" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: '#9ca3af' }}>{t('project.telemetry')}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#6b7280' }}>{t('project.uptime')}</span>
                    <span className="font-semibold" style={{ color: '#e8f4f0' }}>{project.telemetry[0].data.uptimePercent?.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#6b7280' }}>{t('project.battery')}</span>
                    <span className="font-semibold" style={{ color: '#e8f4f0' }}>{project.telemetry[0].data.batteryPercent?.toFixed(0)}%</span>
                  </div>
                </div>
                <Link to={`/reports/${project.id}`} className="block mt-4 text-xs font-medium transition-opacity hover:opacity-80" style={{ color: '#00e5c4' }}>
                  {t('project.reports')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voting + Transaction ledger */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 space-y-6">
        <VotingSection projectId={project.id} milestones={project.milestones} />
        <TransactionLedger projectId={project.id} />
      </div>

      {showInvest && (
        <InvestModal
          projectId={project.id}
          projectTitle={project.title}
          onClose={() => { setShowInvest(false); fetchProject(); }}
        />
      )}

      {bidRole && (
        <BidModal
          projectId={project.id}
          projectTitle={project.title}
          role={bidRole}
          milestones={project.milestones}
          onClose={() => setBidRole(null)}
          onSubmitted={() => { setBidRole(null); }}
        />
      )}
    </div>
  );
}
