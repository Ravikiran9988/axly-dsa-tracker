import React from 'react';
import { AlertTriangle } from 'lucide-react';

/* ─── Difficulty Badge ──────────────────────────────────────── */
export function DifficultyBadge({ difficulty }) {
  const cls = {
    easy:   'badge-easy',
    medium: 'badge-medium',
    hard:   'badge-hard',
  }[String(difficulty).toLowerCase()] || 'badge-neutral';
  return <span className={cls}>{difficulty}</span>;
}

/* ─── Status Badge ──────────────────────────────────────────── */
export function StatusBadge({ status }) {
  const map = {
    solved:         { cls: 'badge-solved',  label: 'Solved' },
    in_progress:    { cls: 'badge-prog',    label: 'In Progress' },
    'in-progress':  { cls: 'badge-prog',    label: 'In Progress' },
    abandoned:      { cls: 'badge-medium',  label: 'Abandoned' },
    not_started:    { cls: 'badge-neutral', label: 'Not Started' },
  };
  const { cls = 'badge-neutral', label = status || '—' } = map[status] || {};
  return <span className={cls}>{label}</span>;
}

/* ─── Skeleton ──────────────────────────────────────────────── */
export function Skeleton({ className = '' }) {
  return <div className={`skeleton-shimmer rounded ${className}`} />;
}

export function SkeletonRows({ count = 5, cols = 6 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-3 border-b border-[#1a2540]/50">
              <div
                className="skeleton-shimmer rounded h-4"
                style={{ width: j === 1 ? '60%' : j === 0 ? '32px' : '70%', opacity: Math.max(0.3, 1 - i * 0.15) }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ─── EmptyState ────────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4 animate-fade-in">
      {Icon && <Icon className="w-10 h-10 text-slate-600 mb-4" strokeWidth={1.5} />}
      <h3 className="text-sm font-semibold text-slate-300 mb-1">{title}</h3>
      {description && <p className="text-xs text-slate-500 max-w-xs mb-4 leading-relaxed">{description}</p>}
      {action}
    </div>
  );
}

/* ─── ErrorState ─────────────────────────────────────────────── */
export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 animate-fade-in">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="text-sm">{message || 'Something went wrong. Please try again.'}</span>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-danger btn-sm ml-4 shrink-0">
          Try again
        </button>
      )}
    </div>
  );
}

/* ─── PageHeader ─────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 animate-fade-in">
      <div className="space-y-0.5 min-w-0">
        <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/* ─── StatCard ───────────────────────────────────────────────── */
export function StatCard({ label, value, color = 'text-white', icon: Icon }) {
  return (
    <div className="card p-4 flex flex-col gap-0.5">
      <div className="text-xs text-slate-500 font-medium">{label}</div>
      <div className={`text-xl font-bold ${color} flex items-center gap-1.5`}>
        {Icon && <Icon className="w-4 h-4" />}
        {value}
      </div>
    </div>
  );
}

/* ─── Spinner ────────────────────────────────────────────────── */
export function Spinner({ size = 'sm' }) {
  const s = size === 'sm' ? 'w-5 h-5 border-2' : 'w-8 h-8 border-[3px]';
  return <div className={`${s} rounded-full border-axly-500/20 border-t-axly-500 animate-spin`} />;
}

/* ─── Divider ────────────────────────────────────────────────── */
export function Divider() {
  return <div className="h-px bg-[#1e2d45] my-4" />;
}
