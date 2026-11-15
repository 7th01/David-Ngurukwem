import { useMemo, useState } from 'react';
import { StoreFilter } from '../../types/analytics';
import { DailySeriesRow, formatCompactNumber, formatCurrency } from '../../utils/analyticsEngine';

export type ChartMetricKey = 'downloads' | 'revenue' | 'conversion' | 'crashFree';

interface DualStoreTimeChartProps {
  series: DailySeriesRow[];
  storeFilter: StoreFilter;
  metric: ChartMetricKey;
  onMetricChange: (m: ChartMetricKey) => void;
}

export function DualStoreTimeChart({
  series,
  storeFilter,
  metric,
  onMetricChange,
}: DualStoreTimeChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 860;
  const height = 290;
  const padLeft = 58;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getValues = (row: DailySeriesRow): { ios: number; android: number } => {
    switch (metric) {
      case 'downloads':
        return { ios: row.iosDownloads, android: row.androidDownloads };
      case 'revenue':
        return { ios: row.iosRevenue, android: row.androidRevenue };
      case 'conversion':
        return { ios: row.iosConversion, android: row.androidConversion };
      case 'crashFree':
        return { ios: row.iosCrashFree, android: row.androidCrashFree };
    }
  };

  const formatVal = (v: number): string => {
    if (metric === 'revenue') return formatCurrency(v);
    if (metric === 'conversion') return `${v.toFixed(1)}%`;
    if (metric === 'crashFree') return `${v.toFixed(2)}%`;
    return formatCompactNumber(v);
  };

  const { minY, maxY, yTicks, iosPoints, androidPoints } = useMemo(() => {
    if (series.length === 0) {
      return { minY: 0, maxY: 100, yTicks: [0, 50, 100], iosPoints: [], androidPoints: [] };
    }

    const vals: number[] = [];
    for (const r of series) {
      const { ios, android } = getValues(r);
      if (storeFilter !== 'play_store') vals.push(ios);
      if (storeFilter !== 'app_store') vals.push(android);
    }

    let rawMin = Math.min(...vals);
    let rawMax = Math.max(...vals);

    if (metric === 'crashFree') {
      rawMin = Math.max(94, Math.floor(rawMin - 0.5));
      rawMax = 100;
    } else if (metric === 'conversion') {
      rawMin = Math.max(0, Math.floor(rawMin - 3));
      rawMax = Math.ceil(rawMax + 3);
    } else {
      rawMin = 0;
      rawMax = rawMax * 1.12 || 10;
    }

    const span = rawMax - rawMin || 1;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => rawMin + t * span);

    const toX = (i: number) =>
      series.length === 1 ? padLeft + plotW / 2 : padLeft + (i / (series.length - 1)) * plotW;
    const toY = (v: number) => padTop + plotH - ((v - rawMin) / span) * plotH;

    const iosPts = series.map((r, i) => ({
      x: toX(i),
      y: toY(getValues(r).ios),
      val: getValues(r).ios,
      date: r.date,
    }));

    const andPts = series.map((r, i) => ({
      x: toX(i),
      y: toY(getValues(r).android),
      val: getValues(r).android,
      date: r.date,
    }));

    return {
      minY: rawMin,
      maxY: rawMax,
      yTicks: ticks,
      iosPoints: iosPts,
      androidPoints: andPts,
    };
  }, [series, storeFilter, metric]);

  const makePath = (pts: { x: number; y: number }[]) =>
    pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  const makeArea = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    const baseY = padTop + plotH;
    return `${makePath(pts)} L ${pts[pts.length - 1].x.toFixed(1)} ${baseY} L ${pts[0].x.toFixed(1)} ${baseY} Z`;
  };

  const activeIdx = hoverIdx !== null && hoverIdx < series.length ? hoverIdx : null;
  const activeRow = activeIdx !== null ? series[activeIdx] : null;

  const xLabelIndices = useMemo(() => {
    if (series.length <= 1) return [0];
    const step = Math.max(1, Math.floor((series.length - 1) / 5));
    const indices: number[] = [];
    for (let i = 0; i < series.length; i += step) indices.push(i);
    if (indices[indices.length - 1] !== series.length - 1) indices.push(series.length - 1);
    return indices;
  }, [series.length]);

  const metricTabs: { key: ChartMetricKey; label: string }[] = [
    { key: 'downloads', label: 'Downloads' },
    { key: 'revenue', label: 'Net Revenue' },
    { key: 'conversion', label: 'Page Conversion' },
    { key: 'crashFree', label: 'Crash-Free Rate' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Dual-Store Performance Trajectory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daily App Store vs. Google Play Store comparison · Hover chart to inspect exact daily metrics
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
          {metricTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onMetricChange(t.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                metric === t.key
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 pb-2 text-xs text-slate-600">
        <div className="flex items-center gap-5">
          {storeFilter !== 'play_store' && (
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-0.5 bg-blue-600" aria-hidden="true" />
              <span className="font-medium text-slate-700">Apple App Store</span>
            </div>
          )}
          {storeFilter !== 'app_store' && (
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-0.5 bg-teal-600" aria-hidden="true" />
              <span className="font-medium text-slate-700">Google Play Store</span>
            </div>
          )}
        </div>

        {activeRow ? (
          <div className="flex items-center gap-4 font-mono tabular-nums text-xs text-slate-700">
            <span className="text-slate-500">{activeRow.date}</span>
            {storeFilter !== 'play_store' && (
              <span>
                iOS: <strong className="text-blue-700">{formatVal(getValues(activeRow).ios)}</strong>
              </span>
            )}
            {storeFilter !== 'app_store' && (
              <span>
                Play: <strong className="text-teal-700">{formatVal(getValues(activeRow).android)}</strong>
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {series.length} days plotted ({minY.toFixed(0)}–{formatVal(maxY)} scale)
          </span>
        )}
      </div>

      {/* SVG Plot */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[600px] select-none"
          role="img"
          aria-label="Dual store daily performance chart"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="iosFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="androidFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0D9488" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines + Y axis labels */}
          {yTicks.map((tick, idx) => {
            const span = maxY - minY || 1;
            const y = padTop + plotH - ((tick - minY) / span) * plotH;
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray={idx === 0 ? undefined : '2 3'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {formatVal(tick)}
                </text>
              </g>
            );
          })}

          {/* X axis date labels */}
          {xLabelIndices.map((idx) => {
            const pt = iosPoints[idx];
            if (!pt) return null;
            return (
              <text
                key={idx}
                x={pt.x}
                y={height - 10}
                textAnchor="middle"
                className="fill-slate-400 text-[10px] font-mono"
              >
                {pt.date.slice(5)}
              </text>
            );
          })}

          {/* Area fills */}
          {storeFilter !== 'play_store' && iosPoints.length > 0 && (
            <path d={makeArea(iosPoints)} fill="url(#iosFill)" />
          )}
          {storeFilter !== 'app_store' && androidPoints.length > 0 && (
            <path d={makeArea(androidPoints)} fill="url(#androidFill)" />
          )}

          {/* Lines */}
          {storeFilter !== 'play_store' && iosPoints.length > 0 && (
            <path
              d={makePath(iosPoints)}
              fill="none"
              stroke="#2563EB"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          )}
          {storeFilter !== 'app_store' && androidPoints.length > 0 && (
            <path
              d={makePath(androidPoints)}
              fill="none"
              stroke="#0D9488"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          )}

          {/* Hover crosshair & markers */}
          {activeIdx !== null && (
            <g>
              <line
                x1={iosPoints[activeIdx]?.x ?? 0}
                y1={padTop}
                x2={iosPoints[activeIdx]?.x ?? 0}
                y2={padTop + plotH}
                stroke="#94A3B8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {storeFilter !== 'play_store' && iosPoints[activeIdx] && (
                <circle
                  cx={iosPoints[activeIdx].x}
                  cy={iosPoints[activeIdx].y}
                  r="4"
                  fill="#2563EB"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              )}
              {storeFilter !== 'app_store' && androidPoints[activeIdx] && (
                <circle
                  cx={androidPoints[activeIdx].x}
                  cy={androidPoints[activeIdx].y}
                  r="4"
                  fill="#0D9488"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              )}
            </g>
          )}

          {/* Invisible hover columns for smooth scrubbing */}
          {series.map((_, idx) => {
            const colW = plotW / Math.max(1, series.length);
            const x = padLeft + (idx / Math.max(1, series.length)) * plotW;
            return (
              <rect
                key={idx}
                x={x}
                y={padTop}
                width={Math.max(4, colW)}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(idx)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
