/**
 * MilestoneCalendar — horizontal timeline showing milestone date ranges.
 * Dates are computed sequentially from projectCreatedAt + durationDays.
 */
interface Milestone {
  id: string;
  title: string;
  status: string;
  durationDays: number;
  fundingPercentage: number;
}

interface Props {
  milestones: Milestone[];
  projectCreatedAt: string | Date;
}

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: '#10b981',
  IN_PROGRESS: '#00e5c4',
  SUBMITTED: '#3b82f6',
  PENDING: '#374151',
};

const STATUS_BG: Record<string, string> = {
  COMPLETED: 'rgba(16,185,129,0.18)',
  IN_PROGRESS: 'rgba(0,229,196,0.18)',
  SUBMITTED: 'rgba(59,130,246,0.18)',
  PENDING: 'rgba(55,65,81,0.35)',
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmt(date: Date): string {
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export default function MilestoneCalendar({ milestones, projectCreatedAt }: Props) {
  const base = new Date(projectCreatedAt);
  const totalDays = milestones.reduce((s, m) => s + m.durationDays, 0);

  // Compute start/end per milestone
  let cursor = base;
  const segments = milestones.map(m => {
    const start = cursor;
    const end = addDays(start, m.durationDays);
    cursor = end;
    return { ...m, start, end };
  });

  const projectEnd = cursor;

  return (
    <div className="rounded-xl p-6" style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold" style={{ color: '#e8f4f0' }}>Project Timeline</h2>
        <span className="text-xs" style={{ color: '#6b7280' }}>
          {fmt(base)} → {fmt(projectEnd)} · {totalDays} days
        </span>
      </div>

      {/* Bar track */}
      <div className="relative flex rounded-full overflow-hidden h-5 mb-4" style={{ background: '#111d2b' }}>
        {segments.map(seg => {
          const pct = (seg.durationDays / totalDays) * 100;
          const color = STATUS_COLOR[seg.status] || STATUS_COLOR.PENDING;
          return (
            <div
              key={seg.id}
              title={`${seg.title} — ${seg.durationDays} days`}
              style={{
                width: `${pct}%`,
                background: color,
                opacity: seg.status === 'PENDING' ? 0.35 : 1,
                borderRight: '1.5px solid #080c10',
              }}
            />
          );
        })}
      </div>

      {/* Segment labels below bar */}
      <div className="space-y-2">
        {segments.map((seg, i) => {
          const color = STATUS_COLOR[seg.status] || STATUS_COLOR.PENDING;
          const bg = STATUS_BG[seg.status] || STATUS_BG.PENDING;
          return (
            <div key={seg.id} className="flex items-center gap-3 text-xs">
              <span className="font-bold tabular-nums" style={{ color: '#6b7280', minWidth: 20 }}>{i + 1}</span>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: bg, color }}
              >
                {seg.status}
              </span>
              <span className="flex-1 truncate font-medium" style={{ color: '#e8f4f0' }}>{seg.title}</span>
              <span className="tabular-nums" style={{ color: '#6b7280' }}>
                {fmt(seg.start)} – {fmt(seg.end)}
              </span>
              <span className="tabular-nums" style={{ color: '#4b5563' }}>
                {seg.durationDays}d
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
