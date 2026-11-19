import React, { useEffect, useState } from 'react';
import {
  Clock,
  Eye,
  Wrench,
  CheckCircle2,
  ArrowDownRight,
  Minus,
  ArrowUpRight,
  AlertOctagon,
} from 'lucide-react';
import { IssuePriority, IssueStatus } from '../types/campuscare';

export function StatusLabel({ status }: { status: IssueStatus }) {
  const styles: Record<
    IssueStatus,
    { text: string; bg: string; border: string; icon: React.ReactNode }
  > = {
    Pending: {
      text: 'text-amber-800',
      bg: 'bg-amber-50/80',
      border: 'border-amber-200/80',
      icon: <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
    },
    'Under Review': {
      text: 'text-teal-800',
      bg: 'bg-teal-50/80',
      border: 'border-teal-200/80',
      icon: <Eye className="w-3.5 h-3.5 text-teal-600 shrink-0" />,
    },
    'In Progress': {
      text: 'text-emerald-800',
      bg: 'bg-emerald-50/80',
      border: 'border-emerald-200/80',
      icon: <Wrench className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
    },
    Resolved: {
      text: 'text-[#064E3B]',
      bg: 'bg-emerald-100/70',
      border: 'border-emerald-300/70',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0" />,
    },
  };

  const s = styles[status] || styles.Pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 ${s.bg} ${s.border} ${s.text}`}
    >
      {s.icon}
      {status}
    </span>
  );
}

export function PriorityLabel({ priority }: { priority: IssuePriority }) {
  const styles: Record<
    IssuePriority,
    { text: string; icon: React.ReactNode }
  > = {
    Low: {
      text: 'text-slate-600',
      icon: <ArrowDownRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
    },
    Medium: {
      text: 'text-[#047857]',
      icon: <Minus className="w-3.5 h-3.5 text-[#059669] shrink-0" />,
    },
    High: {
      text: 'text-amber-700',
      icon: <ArrowUpRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
    },
    Urgent: {
      text: 'text-rose-700 font-semibold',
      icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
    },
  };

  const s = styles[priority] || styles.Medium;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${s.text}`}>
      {s.icon}
      {priority}
    </span>
  );
}

export function AnimatedCounter({
  value,
  suffix = '',
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = display;
    const end = value;
    if (start === end) return;
    const duration = 380;
    const startTime = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setDisplay(current);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : Math.round(display).toString();

  return (
    <span className="tabular-nums">
      {formatted}
      {suffix}
    </span>
  );
}

export function formatDateShort(date: Date | null): string {
  if (!date) return 'Just now';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(date: Date | null): string {
  if (!date) return 'Pending timestamp';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="glass-panel rounded-2xl p-5 animate-pulse"
        >
          <div className="h-3.5 w-24 bg-emerald-950/10 rounded" />
          <div className="h-8 w-16 bg-emerald-950/10 rounded mt-3" />
          <div className="h-3 w-32 bg-emerald-950/5 rounded mt-3" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass-panel rounded-2xl overflow-hidden animate-pulse">
      <div className="h-11 bg-emerald-950/[0.03] border-b border-emerald-950/10" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 border-b border-emerald-950/5 last:border-b-0 px-5 flex items-center justify-between gap-4"
        >
          <div className="h-3.5 w-24 bg-emerald-950/10 rounded" />
          <div className="h-3.5 w-48 bg-emerald-950/10 rounded" />
          <div className="h-3.5 w-28 bg-emerald-950/5 rounded hidden md:block" />
          <div className="h-6 w-20 bg-emerald-950/5 rounded" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass-panel rounded-2xl py-14 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center mx-auto text-[#059669]">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-[#064E3B] mt-4 font-display">
        {title}
      </h3>
      <p className="text-sm text-[#52635D] mt-1.5 max-w-md mx-auto leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
