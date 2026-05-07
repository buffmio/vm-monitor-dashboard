import type { MetricPoint } from '../types';
import { formatMetric } from '../lib/vmUtils';
import { useState } from 'react';

type MetricKey = keyof Omit<MetricPoint, 'time'>;

interface LineChartProps {
  title: string;
  points: MetricPoint[];
  metric: MetricKey;
  unit: string;
  tone?: 'green' | 'amber' | 'red' | 'blue' | 'violet';
}

const toneClass = {
  green: 'chart-green',
  amber: 'chart-amber',
  red: 'chart-red',
  blue: 'chart-blue',
  violet: 'chart-violet'
};

export function LineChart({ title, points, metric, unit, tone = 'blue' }: LineChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <section className="chart-panel">
        <div className="chart-title">{title}</div>
        <div className="empty-chart">No metric history</div>
      </section>
    );
  }

  const values = points.map((point) => point[metric]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 320;
  const height = 120;
  const padding = 14;
  const step = (width - padding * 2) / Math.max(points.length - 1, 1);
  const coordinates = values.map((value, index) => {
    const x = padding + step * index;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y, value, point: points[index] };
  });
  const activePoint = activeIndex === null ? null : coordinates[activeIndex];

  return (
    <section className={`chart-panel ${toneClass[tone]}`}>
      <div className="chart-header">
        <div>
          <div className="chart-title">{title}</div>
          <span>{points[0].time} - {points[points.length - 1].time}</span>
        </div>
        <strong>{activePoint ? formatMetric(activePoint.value, unit) : formatMetric(values[values.length - 1], unit)}</strong>
      </div>
      <div className={`chart-hover-readout ${activePoint ? 'visible' : ''}`}>
        {activePoint ? `${activePoint.point.time} / ${formatMetric(activePoint.value, unit)}` : 'Hover a point for details'}
      </div>
      <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} trend`}>
        <polyline points={coordinates.map(({ x, y }) => `${x},${y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="4" />
        {activePoint ? (
          <g className="chart-guide" pointerEvents="none">
            <line x1={activePoint.x} x2={activePoint.x} y1={padding} y2={height - padding} />
          </g>
        ) : null}
        {coordinates.map(({ x, y, value, point }, index) => (
          <g key={`${metric}-${index}`}>
            <circle
              className={activeIndex === index ? 'active-point' : ''}
              cx={x}
              cy={y}
              r={activeIndex === index ? '5' : '3.5'}
            />
            <circle
              className="hit-point"
              cx={x}
              cy={y}
              r="12"
              tabIndex={0}
              aria-label={`${title} ${point.time}: ${formatMetric(value, unit)}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
            />
          </g>
        ))}
      </svg>
      <div className="chart-scale">
        <span>Min {formatMetric(min, unit)}</span>
        <span>Max {formatMetric(max, unit)}</span>
      </div>
    </section>
  );
}
