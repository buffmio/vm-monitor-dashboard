import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface MetricCardProps {
  label: string;
  value: string | number;
  detail: string;
  tone?: 'neutral' | 'good' | 'warning' | 'critical' | 'accent';
  icon?: ReactNode;
  to?: string;
}

export function MetricCard({ label, value, detail, tone = 'neutral', icon, to }: MetricCardProps) {
  const content = (
    <>
      <div className="metric-card-header">
        <span>{label}</span>
        {icon ? <span className="metric-icon">{icon}</span> : null}
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </>
  );

  if (to) {
    return (
      <Link className={`metric-card metric-${tone} metric-link`} to={to} aria-label={label}>
        {content}
      </Link>
    );
  }

  return (
    <section className={`metric-card metric-${tone}`}>
      {content}
    </section>
  );
}
