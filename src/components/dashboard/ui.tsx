'use client';

import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import NextImage from 'next/image';

/* ========================= ICONS ========================= */
export type IconName =
  | 'home' | 'funnel' | 'qr' | 'bars' | 'history' | 'card' | 'gauge' | 'bell'
  | 'cog' | 'building' | 'user' | 'plus' | 'chevron' | 'chevronD' | 'search'
  | 'download' | 'copy' | 'refresh' | 'check' | 'x' | 'external' | 'arrow'
  | 'arrowUp' | 'arrowDown' | 'sparkles' | 'star' | 'globe' | 'device' | 'trash'
  | 'edit' | 'dot' | 'upload' | 'zap' | 'filter' | 'shield' | 'link' | 'trendUp'
  | 'flag' | 'mail' | 'msg' | 'team' | 'key' | 'moon' | 'sun' | 'menu' | 'play'
  | 'shop' | 'package' | 'smartphone' | 'monitor' | 'tablet' | 'more' | 'rocket'
  | 'lock' | 'eye';

const ICONS: Record<IconName, React.ReactNode> = {
  home:       <><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/></>,
  funnel:     <><path d="M3 5h18l-7 8v6l-4-2v-4z"/></>,
  qr:         <><rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><path d="M14 14h3v3M20 14v3M14 20h3M20 17v4"/></>,
  bars:       <><path d="M4 20V10M10 20V4M16 20v-8M22 20h-20"/></>,
  history:    <><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></>,
  card:       <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/></>,
  gauge:      <><path d="M12 14 8 8"/><circle cx="12" cy="13" r="9"/><path d="M3.5 13a8.5 8.5 0 0 1 17 0"/></>,
  bell:       <><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 19a2 2 0 0 0 4 0"/></>,
  cog:        <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 3.9 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.1l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.9 7l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
  building:   <><rect x="4" y="3" width="16" height="18" rx="1.2"/><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"/></>,
  user:       <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  plus:       <><path d="M12 5v14M5 12h14"/></>,
  chevron:    <><path d="M9 6l6 6-6 6"/></>,
  chevronD:   <><path d="M6 9l6 6 6-6"/></>,
  search:     <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
  download:   <><path d="M12 4v12M7 11l5 5 5-5M5 20h14"/></>,
  copy:       <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></>,
  refresh:    <><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></>,
  check:      <><path d="m5 12 5 5L20 7"/></>,
  x:          <><path d="M6 6l12 12M18 6 6 18"/></>,
  external:   <><path d="M14 4h6v6"/><path d="M10 14 20 4"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/></>,
  arrow:      <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  arrowUp:    <><path d="M7 17 17 7M9 7h8v8"/></>,
  arrowDown:  <><path d="M17 7 7 17M15 17H7V9"/></>,
  sparkles:   <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6 7.7 7.7M16.3 16.3l2.1 2.1M5.6 18.4 7.7 16.3M16.3 7.7l2.1-2.1"/></>,
  star:       <><path d="m12 3 2.6 6 6.4.6-4.9 4.4 1.5 6.4L12 17l-5.6 3.4 1.5-6.4L3 9.6 9.4 9z"/></>,
  globe:      <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
  device:     <><rect x="3" y="4" width="14" height="11" rx="1.5"/><path d="M2 19h16"/><rect x="17" y="9" width="5" height="11" rx="1.2"/></>,
  trash:      <><path d="M4 7h16M9 7V4h6v3M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7"/></>,
  edit:       <><path d="M16 3.5 20.5 8 8 20.5 3 21l.5-5z"/><path d="m13 6 5 5"/></>,
  dot:        <><circle cx="12" cy="12" r="3"/></>,
  upload:     <><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></>,
  zap:        <><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></>,
  filter:     <><path d="M3 5h18l-7 9v5l-4-2v-3z"/></>,
  shield:     <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/></>,
  link:       <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1.5 1.5"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.5-1.5"/></>,
  trendUp:    <><path d="M3 17 9 11l4 4 8-8"/><path d="M14 4h7v7"/></>,
  flag:       <><path d="M4 21V4h14l-2 4 2 4H4"/></>,
  mail:       <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/></>,
  msg:        <><path d="M21 12a8 8 0 0 1-8 8 9 9 0 0 1-4-1l-5 1 1-4a8 8 0 1 1 16-4z"/></>,
  team:       <><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 19a6 6 0 0 1 12 0M15 17a5 5 0 0 1 7 2"/></>,
  key:        <><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9 1 3-2 2 2 2-3 3-1-1"/></>,
  moon:       <><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/></>,
  sun:        <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></>,
  menu:       <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  play:       <><path d="M7 5v14l12-7z"/></>,
  shop:       <><path d="M4 7h16l-1 4H5z"/><path d="M5 11v9h14v-9"/><path d="M10 20v-4h4v4"/></>,
  package:    <><path d="M3 7 12 3l9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/></>,
  smartphone: <><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></>,
  monitor:    <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>,
  tablet:     <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M11 18h2"/></>,
  more:       <><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></>,
  rocket:     <><path d="M5 19c0-4 4-12 9-14 5 2 5 10 0 14-2 1-4 1-5 0s-1-2 0-4"/><path d="M14 10a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></>,
  lock:       <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></>,
  eye:        <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
};

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Icon = ({ name, size = 18, className = '', style = {} }: IconProps) => {
  const paths = ICONS[name];
  if (!paths) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
         strokeLinejoin="round" className={className} style={style}
         aria-hidden="true">
      {paths}
    </svg>
  );
};

/* ========================= FORMATTING ========================= */
export const fmt = (n: number | null | undefined): string => {
  if (n == null) return '—';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return Math.round(n).toLocaleString();
};

export const pct = (n: number, d = 1): string =>
  `${(n * 100).toFixed(d).replace(/\.0$/, '')}%`;

export function hashColor(s: string): string {
  const palette = ['#6366F1','#8B5CF6','#06B6D4','#10B981','#F59E0B','#EF4444','#EC4899','#14B8A6'];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return palette[h % palette.length];
}

/* ========================= CARD ========================= */
export interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  padded?: boolean;
  as?: React.ElementType;
  onClick?: () => void;
}

export const Card = ({ children, className = '', style = {}, padded = true, as: As = 'div', ...rest }: CardProps) => (
  <As className={`lp-card ${padded ? 'lp-card-pad' : ''} ${className}`} style={style} {...rest}>
    {children}
  </As>
);

export interface CardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  eyebrow?: React.ReactNode;
}

export const CardHeader = ({ title, subtitle, action, eyebrow }: CardHeaderProps) => (
  <div className="lp-card-hd">
    <div>
      {eyebrow && <div className="lp-eyebrow">{eyebrow}</div>}
      <div className="lp-card-title">{title}</div>
      {subtitle && <div className="lp-card-sub">{subtitle}</div>}
    </div>
    {action && <div className="lp-card-act">{action}</div>}
  </div>
);

/* ========================= BTN ========================= */
export type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type BtnSize = 'sm' | 'md' | 'lg';

export interface BtnProps {
  children?: React.ReactNode;
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: IconName;
  iconRight?: IconName;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const Btn = ({ children, variant = 'secondary', size = 'md', icon, iconRight, onClick, type, className = '', disabled, style }: BtnProps) => (
  <button type={type || 'button'} disabled={disabled} onClick={onClick}
          className={`lp-btn lp-btn-${variant} lp-btn-${size} ${className}`} style={style}>
    {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16}/>}
    {children && <span>{children}</span>}
    {iconRight && <Icon name={iconRight} size={size === 'sm' ? 14 : 16}/>}
  </button>
);

/* ========================= BADGE ========================= */
export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'violet' | 'cyan';

export interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  icon?: IconName;
}

export const Badge = ({ children, tone = 'neutral', dot = false, icon }: BadgeProps) => (
  <span className={`lp-badge lp-badge-${tone}`}>
    {dot && <span className="lp-badge-dot"/>}
    {icon && <Icon name={icon} size={12}/>}
    {children}
  </span>
);

/* ========================= AVATAR ========================= */
export interface AvatarProps {
  name?: string;
  color?: string;
  size?: number;
  src?: string;
}

export const Avatar = ({ name = '?', color, size = 32, src }: AvatarProps) => {
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  const bg = color || hashColor(name);
  if (src) return <NextImage src={src} alt={name} width={size} height={size} className="lp-avatar" style={{ borderRadius: '50%' }}/>;
  return (
    <div className="lp-avatar" style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
};

/* ========================= SWITCH ========================= */
export interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  sub?: string;
}

export const Switch = ({ checked, onChange, label, sub }: SwitchProps) => (
  <label className="lp-switch-row">
    {(label || sub) && (
      <div className="lp-switch-text">
        {label && <div className="lp-switch-label">{label}</div>}
        {sub && <div className="lp-switch-sub">{sub}</div>}
      </div>
    )}
    <span className={`lp-switch ${checked ? 'is-on' : ''}`}
          onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
      <span className="lp-switch-thumb"/>
    </span>
  </label>
);

/* ========================= FIELD / INPUT / SELECT ========================= */
export interface FieldProps {
  label?: React.ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export const Field = ({ label, hint, children, error, required }: FieldProps) => (
  <div className="lp-field">
    {label && (
      <label className="lp-field-lbl">
        {label}{required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
      </label>
    )}
    {children}
    {error && <div className="lp-field-err">{error}</div>}
    {hint && !error && <div className="lp-field-hint">{hint}</div>}
  </div>
);

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: IconName;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const Input = ({ icon, prefix, suffix, className = '', ...props }: InputProps) => (
  <div className={`lp-input ${className}`}>
    {icon && <Icon name={icon} size={15} className="lp-input-icon"/>}
    {prefix && <span className="lp-input-prefix">{prefix}</span>}
    <input {...props}/>
    {suffix && <span className="lp-input-suffix">{suffix}</span>}
  </div>
);

export interface SelectOption { value: string; label: string; }

export interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: (string | SelectOption)[];
  className?: string;
}

export const Select = ({ value, onChange, options, className = '' }: SelectProps) => (
  <div className={`lp-input lp-select ${className}`}>
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(o => typeof o === 'string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <Icon name="chevronD" size={14} className="lp-select-caret"/>
  </div>
);

/* ========================= SEGMENTED / TABS ========================= */
export interface SegmentedProps {
  value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
}

export const Segmented = ({ value, onChange, options }: SegmentedProps) => (
  <div className="lp-seg">
    {options.map(o => {
      const v = typeof o === 'string' ? o : o.value;
      const l = typeof o === 'string' ? o : o.label;
      return (
        <button key={v} className={value === v ? 'is-on' : ''} onClick={() => onChange(v)}>
          {l}
        </button>
      );
    })}
  </div>
);

export interface TabsProps {
  value: string;
  onChange: (v: string) => void;
  tabs: (string | { value: string; label: string })[];
}

export const Tabs = ({ value, onChange, tabs }: TabsProps) => (
  <div className="lp-tabs">
    {tabs.map(t => {
      const v = typeof t === 'string' ? t : t.value;
      const l = typeof t === 'string' ? t : t.label;
      return (
        <button key={v} className={`lp-tab ${value === v ? 'is-on' : ''}`} onClick={() => onChange(v)}>
          {l}
        </button>
      );
    })}
  </div>
);

/* ========================= PROGRESS ========================= */
export interface ProgressProps {
  value: number;
  max?: number;
  tone?: string;
  height?: number;
}

export const Progress = ({ value, max = 100, tone = 'primary', height = 6 }: ProgressProps) => (
  <div className="lp-progress" style={{ height }}>
    <div className={`lp-progress-bar lp-progress-${tone}`} style={{ width: `${Math.min(100, (value / max) * 100)}%`}}/>
  </div>
);

/* ========================= COUNTER ========================= */
export interface CounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export const Counter = ({ value, duration = 900, prefix = '', suffix = '', decimals = 0, className = '' }: CounterProps) => {
  const [n, setN] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(from + (value - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  const display = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString();
  return <span className={className}>{prefix}{display}{suffix}</span>;
};

/* ========================= SPARKLINE ========================= */
export interface SparklineProps {
  data: number[];
  height?: number;
  width?: number | string;
  tone?: string;
  fill?: boolean;
  strokeWidth?: number;
}

export const Sparkline = ({ data, height = 36, width = '100%', tone = 'primary', fill = true, strokeWidth = 1.5 }: SparklineProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(120);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      setW(Math.max(40, entries[0].contentRect.width));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const stepX = w / (data.length - 1 || 1);
  const points = data.map((v, i) => [i * stepX, height - 2 - ((v - min) / range) * (height - 4)]);
  const d = points.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const area = d + ` L ${w},${height} L 0,${height} Z`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const gradId = useMemo(() => 'spark-' + Math.random().toString(36).slice(2, 8), []);
  return (
    <div ref={ref} className="lp-spark" style={{ height, width: width as string }}>
      <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`}>
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={`var(--lp-${tone})`} stopOpacity="0.25"/>
            <stop offset="100%" stopColor={`var(--lp-${tone})`} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {fill && <path d={area} fill={`url(#${gradId})`}/>}
        <path d={d} fill="none" stroke={`var(--lp-${tone})`} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
};

/* ========================= CHART ========================= */
export interface ChartDataPoint {
  x: string;
  [key: string]: string | number;
}

export interface ChartProps {
  data: ChartDataPoint[];
  keys?: string[];
  colors?: string[];
  height?: number;
  kind?: 'area' | 'line' | 'bar';
  showGrid?: boolean;
  showAxis?: boolean;
  yTicks?: number;
  animate?: boolean;
  formatY?: (v: number) => string;
  strokeWidth?: number;
}

function smoothPath(pts: number[][]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1];
    const [x2, y2] = pts[i];
    const cx1 = x1 + (x2 - x1) / 2, cy1 = y1;
    const cx2 = x1 + (x2 - x1) / 2, cy2 = y2;
    d += ` C ${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`;
  }
  return d;
}

export const Chart = ({ data, keys = ['y'], colors = ['primary'], height = 220, kind = 'area', showGrid = true, showAxis = true, yTicks = 4, animate = true, formatY = (v) => fmt(v), strokeWidth = 2 }: ChartProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((e) => setW(Math.max(220, e[0].contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const padL = 38, padR = 12, padT = 10, padB = 26;
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;
  const hasData = data.length > 0;

  const allVals = data.flatMap(d => keys.map(k => (d[k] as number) || 0));
  const maxVal = allVals.length > 0 ? Math.max(1, Math.max(...allVals) * 1.15) : 1;
  const range = maxVal;

  const xFor = (i: number) => padL + (innerW * i) / (data.length - 1 || 1);
  const yFor = (v: number) => padT + innerH - (v / range) * innerH;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (maxVal * i) / yTicks);

  const [hover, setHover] = useState<number | null>(null);
  const [t, setT] = useState(animate ? 0 : 1);

  const keysKey = keys.join(',');
  useEffect(() => {
    if (!animate) return;
    setT(0);
    let raf: number;
    const start = performance.now();
    const tick = (n: number) => {
      const p = Math.min(1, (n - start) / 800);
      setT(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data.length, kind, keysKey, animate]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - padL;
    const idx = Math.round((x / innerW) * (data.length - 1));
    setHover(idx >= 0 && idx < data.length ? idx : null);
  };

  if (data.length === 0) {
    return (
      <div ref={ref} className="lp-chart">
        <svg width={w} height={height}>
          <text x={w / 2} y={height / 2} textAnchor="middle" dominantBaseline="middle" className="lp-axis">No data yet</text>
        </svg>
      </div>
    );
  }

  return (
    <div ref={ref} className="lp-chart" onMouseLeave={() => setHover(null)} onMouseMove={onMove}>
      <svg width={w} height={height}>
        <defs>
          {keys.map((k, i) => (
            <linearGradient key={k} id={`g-${k}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={`var(--lp-${colors[i] || colors[0]})`} stopOpacity="0.32"/>
              <stop offset="100%" stopColor={`var(--lp-${colors[i] || colors[0]})`} stopOpacity="0"/>
            </linearGradient>
          ))}
        </defs>
        {showGrid && ticks.map((tv, i) => (
          <line key={i} x1={padL} x2={w - padR} y1={yFor(tv)} y2={yFor(tv)}
                stroke="var(--lp-border)" strokeWidth="1" strokeDasharray={i === 0 ? '0' : '2 4'}/>
        ))}
        {showAxis && ticks.map((tv, i) => (
          <text key={i} x={padL - 6} y={yFor(tv) + 3} textAnchor="end" className="lp-axis">{formatY(tv)}</text>
        ))}
        {showAxis && data.map((d, i) => {
          const step = Math.ceil(data.length / 8);
          if (data.length > 14 && i % step !== 0 && i !== data.length - 1) return null;
          return <text key={i} x={xFor(i)} y={height - 8} textAnchor="middle" className="lp-axis">{d.x}</text>;
        })}
        {keys.map((k, i) => {
          const pts = data.map((d, j) => [xFor(j), yFor(((d[k] as number) || 0) * t)]);
          if (pts.length === 0) return null;
          if (kind === 'bar') {
            const barW = Math.max(4, (innerW / data.length) * 0.62 / keys.length);
            return (
              <g key={k}>
                {data.map((d, j) => {
                  const v = ((d[k] as number) || 0) * t;
                  const x = xFor(j) - (barW * keys.length) / 2 + i * barW + 1;
                  const yy = yFor(v);
                  return <rect key={j} x={x} y={yy} width={barW - 2} height={Math.max(0, padT + innerH - yy)}
                               rx="3" fill={`var(--lp-${colors[i] || colors[0]})`} opacity={hover != null && hover !== j ? 0.4 : 1}/>;
                })}
              </g>
            );
          }
          const pathD = smoothPath(pts);
          const area = pathD + ` L ${pts[pts.length - 1][0]},${padT + innerH} L ${pts[0][0]},${padT + innerH} Z`;
          return (
            <g key={k}>
              {kind === 'area' && <path d={area} fill={`url(#g-${k})`}/>}
              <path d={pathD} fill="none" stroke={`var(--lp-${colors[i] || colors[0]})`} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
            </g>
          );
        })}
        {!hasData && (
          <text x={padL + innerW / 2} y={padT + innerH / 2} textAnchor="middle" className="lp-axis">
            No data yet
          </text>
        )}
        {hover != null && hasData && kind !== 'bar' && (
          <g>
            <line x1={xFor(hover)} x2={xFor(hover)} y1={padT} y2={padT + innerH}
                  stroke="var(--lp-fg-muted)" strokeWidth="1" strokeDasharray="3 3" opacity="0.4"/>
            {keys.map((k, i) => (
              <circle key={k} cx={xFor(hover)} cy={yFor((data[hover][k] as number) || 0)} r="4"
                      fill="var(--lp-surface)" stroke={`var(--lp-${colors[i] || colors[0]})`} strokeWidth="2"/>
            ))}
          </g>
        )}
      </svg>
      {hover != null && hasData && (
        <div className="lp-chart-tip" style={{ left: Math.min(w - 140, Math.max(0, xFor(hover) - 60)) }}>
          <div className="lp-chart-tip-label">{data[hover].x}</div>
          {keys.map((k, i) => (
            <div key={k} className="lp-chart-tip-row">
              <span className="lp-chart-tip-dot" style={{ background: `var(--lp-${colors[i] || colors[0]})` }}/>
              <span className="lp-chart-tip-k">{k}</span>
              <span className="lp-chart-tip-v">{fmt(data[hover][k] as number)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ========================= RING ========================= */
export interface RingProps {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  tone?: string;
  label?: React.ReactNode;
  sub?: React.ReactNode;
}

export const Ring = ({ value, max = 100, size = 100, stroke = 9, tone = 'primary', label, sub }: RingProps) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [animV, setAnimV] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimV(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  const pctv = animV / max;
  return (
    <div className="lp-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--lp-border)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`var(--lp-${tone})`}
                strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={`${c * pctv} ${c}`}
                transform={`rotate(-90 ${size/2} ${size/2})`}/>
      </svg>
      <div className="lp-ring-center">
        {label && <div className="lp-ring-label">{label}</div>}
        {sub && <div className="lp-ring-sub">{sub}</div>}
      </div>
    </div>
  );
};

/* ========================= HEATMAP ========================= */
export interface HeatmapProps {
  rows: number;
  cols: number;
  data: number[];
  max: number;
  tone?: string;
}

export const Heatmap = ({ cols, data, max, tone = 'primary' }: HeatmapProps) => (
  <div className="lp-heat" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
    {data.map((v, i) => {
      const opacity = Math.max(0.06, Math.min(1, v / max));
      return <div key={i} className="lp-heat-cell" style={{ background: `var(--lp-${tone})`, opacity }} title={String(v)}/>;
    })}
  </div>
);

/* ========================= STAT ========================= */
export interface StatProps {
  label: string;
  value: number;
  delta?: number;
  deltaLabel?: string;
  icon?: IconName;
  sparkData?: number[];
  tone?: string;
  suffix?: string;
  prefix?: string;
  big?: boolean;
  decimals?: number;
}

export const Stat = ({ label, value, delta, deltaLabel, icon, sparkData, tone = 'neutral', suffix, prefix, big, decimals }: StatProps) => {
  const positive = (delta ?? 0) >= 0;
  return (
    <Card className="lp-stat">
      <div className="lp-stat-row">
        <div className="lp-stat-label">
          {icon && <span className="lp-stat-icon"><Icon name={icon} size={14}/></span>}
          {label}
        </div>
        {delta != null && (
          <Badge tone={positive ? 'success' : 'danger'}>
            <Icon name={positive ? 'arrowUp' : 'arrowDown'} size={11}/>
            {Math.abs(delta).toFixed(1)}%
          </Badge>
        )}
      </div>
      <div className={`lp-stat-value ${big ? 'lp-stat-big' : ''}`}>
        <Counter value={value} prefix={prefix} suffix={suffix} decimals={decimals ?? 0}/>
      </div>
      {sparkData && <Sparkline data={sparkData} height={28} tone={tone}/>}
      {deltaLabel && <div className="lp-stat-deltalabel">{deltaLabel}</div>}
    </Card>
  );
};

/* ========================= STAR RATING ========================= */
export interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  max?: number;
  readonly?: boolean;
}

export const StarRating = ({ value, onChange, size = 22, max = 5, readonly }: StarRatingProps) => {
  const [hover, setHover] = useState<number | null>(null);
  const v = hover ?? value;
  return (
    <div className="lp-stars" onMouseLeave={() => setHover(null)}>
      {Array.from({ length: max }, (_, i) => (
        <button key={i} type="button"
                onMouseEnter={() => !readonly && setHover(i + 1)}
                onClick={() => !readonly && onChange?.(i + 1)}
                className={`lp-star ${i < v ? 'is-on' : ''}`}
                style={{ width: size, height: size }}>
          <Icon name="star" size={size}/>
        </button>
      ))}
    </div>
  );
};

/* ========================= SKELETON ========================= */
export interface SkeletonProps {
  w?: number | string;
  h?: number;
  r?: number;
  className?: string;
}

export const Skeleton = ({ w = '100%', h = 14, r = 6, className = '' }: SkeletonProps) => (
  <div className={`lp-skel ${className}`} style={{ width: w as string, height: h, borderRadius: r }}/>
);

/* ========================= EMPTY ========================= */
export interface EmptyProps {
  icon?: IconName;
  title: string;
  sub?: string;
  action?: React.ReactNode;
}

export const Empty = ({ icon, title, sub, action }: EmptyProps) => (
  <div className="lp-empty">
    {icon && <div className="lp-empty-icon"><Icon name={icon} size={22}/></div>}
    <div className="lp-empty-title">{title}</div>
    {sub && <div className="lp-empty-sub">{sub}</div>}
    {action}
  </div>
);


/* ========================= DATA HELPERS ========================= */
export function genSeries(n: number, base: number, jitter = 0.3, trend = 0.05): number[] {
  const arr: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const v = base * (1 + trend * t * 4) * (1 + (Math.sin(i * 0.7) + Math.cos(i * 0.3)) * jitter * 0.4) + base * jitter * Math.random() * 0.5;
    arr.push(Math.max(0, Math.round(v)));
  }
  return arr;
}

export function dayLabels(n: number): string[] {
  const today = new Date();
  const arr: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    arr.push(`${d.getDate()}/${d.getMonth() + 1}`);
  }
  return arr;
}
