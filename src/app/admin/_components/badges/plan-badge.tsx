import type { Plan } from '@/types/admin';

const STYLES: Record<Plan, { bg: string; color: string; label: string }> = {
  free:       { bg: 'var(--surface-2)',  color: 'var(--muted)',     label: 'Free'       },
  starter:    { bg: '#EFF6FF',           color: '#1D4ED8',          label: 'Starter'    },
  pro:        { bg: 'var(--accent-soft)',color: 'var(--accent-ink)',label: 'Pro'        },
  growth:     { bg: '#F0FDF4',           color: '#15803D',          label: 'Growth'     },
  enterprise: { bg: 'transparent',       color: '#fff',             label: 'Enterprise' },
};

export default function PlanBadge({ plan }: { plan: Plan }) {
  const s = STYLES[plan] ?? STYLES.free;
  const isEnterprise = plan === 'enterprise';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 'var(--radius-xs)',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.02em',
      background: isEnterprise ? 'linear-gradient(135deg,#6E5BFF 0%,#2F7DFB 100%)' : s.bg,
      color: s.color,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}
