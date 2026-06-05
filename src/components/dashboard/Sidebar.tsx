'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './ui';

const BASE = '/app/business_dashboard';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', href: BASE, label: 'Dashboard', icon: 'home' as const },
      { id: 'funnel', href: `${BASE}/funnel-manager`, label: 'Funnel manager', icon: 'funnel' as const },
      { id: 'qr', href: `${BASE}/qr-dashboard`, label: 'QR codes', icon: 'qr' as const },
      { id: 'analytics', href: `${BASE}/analytics`, label: 'Analytics', icon: 'bars' as const },
    ],
  },
  {
    label: 'Records',
    items: [
      { id: 'history',     href: `${BASE}/history`,      label: 'Review history', icon: 'history' as const },
      { id: 'reviews',     href: `${BASE}/reviews`,      label: 'Reply drafts',   icon: 'msg'     as const },
      { id: 'gbp-replies', href: `${BASE}/gbp-replies`,  label: 'Review inbox',   icon: 'mail'    as const },
      { id: 'usage',       href: `${BASE}/usage`,        label: 'Usage',          icon: 'gauge'   as const },
      { id: 'notifications', href: `${BASE}/notifications`, label: 'Notifications', icon: 'bell' as const },
    ],
  },
  {
    label: 'Setup',
    items: [
      { id: 'qr-request', href: `${BASE}/qr-request`, label: 'Request QR', icon: 'plus' as const },
    ],
  },
];

interface SidebarProps {
  bizName?: string;
  bizInitials?: string;
  bizColor?: string;
  bizPlan?: string;
  bizLogoUrl?: string | null;
  ownerName?: string;
  ownerEmail?: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  bizName = '',
  bizInitials = '',
  bizColor = '#6366F1',
  bizPlan = 'free',
  bizLogoUrl = null,
  mobileOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, id: string) => {
    if (id === 'dashboard') return pathname === BASE || pathname === BASE + '/';
    return pathname.startsWith(href);
  };

  const planLabel = bizPlan === 'pro' ? 'Pro plan' : bizPlan === 'enterprise' ? 'Enterprise' : 'Free plan';

  return (
    <aside className={`lp-sidebar${mobileOpen ? ' is-mobile-open' : ''}`} style={{ position: 'relative' }}>
      {/* Close button — only visible on mobile via CSS */}
      <button
        className="lp-sidebar-close"
        onClick={onClose}
        aria-label="Close menu"
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6l-12 12" />
        </svg>
      </button>

      <div className="lp-brand">
        <div className="lp-brand-mark">R</div>
        <div className="lp-brand-name"><b>Reevo</b></div>
      </div>

      <div className="lp-biz-select">
        <div className="lp-biz-logo" style={{ background: bizColor, overflow: 'hidden', padding: bizLogoUrl ? 0 : undefined }}>
          {bizLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bizLogoUrl} alt={bizName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            bizInitials || bizName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || '??'
          )}
        </div>
        <div className="lp-biz-info">
          <div className="lp-biz-name lp-truncate">{bizName || 'Your business'}</div>
          <div className="lp-biz-sub">{planLabel}</div>
        </div>
        <Icon name="chevronD" size={14} className="lp-muted" />
      </div>

      <nav className="lp-sidebar-nav">
        {NAV_GROUPS.map(g => (
          <div key={g.label}>
            <div className="lp-nav-group">{g.label}</div>
            {g.items.map(item => (
              <Link key={item.id} href={item.href}
                className={`lp-nav-item ${isActive(item.href, item.id) ? 'is-on' : ''}`}
                onClick={onClose}>
                <Icon name={item.icon} size={16} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

    </aside>
  );
}
