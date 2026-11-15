import { useMemo, useState } from 'react';
import { CalculatedMetrics } from '../../lib/dataProcessor';

export function formatNaira(val: number): string {
  if (Math.abs(val) >= 1_000_000_000) return `₦${(val / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(val) >= 1_000_000) return `₦${(val / 1_000_000).toFixed(2)}M`;
  if (Math.abs(val) >= 10_000) return `₦${(val / 1_000).toFixed(1)}k`;
  return `₦${Math.round(val).toLocaleString('en-NG')}`;
}

export function TrendLineChart({ series }: { series: CalculatedMetrics['trendSeries'] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [mode, setMode] = useState<'line' | 'bar'>('line');

  const width = 760;
  const height = 270;
  const padL = 62;
  const padR = 20;
  const padT = 20;
  const padB = 34;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const { maxVal, yTicks, revPts, expPts, profPts } = useMemo(() => {
    if (series.length === 0) {
      return { maxVal: 100, yTicks: [0, 50, 100], revPts: [], expPts: [], profPts: [] };
    }
    const maxV = Math.max(
      10,
      ...series.flatMap((s) => [s.revenue, s.expenses, Math.abs(s.profit)])
    );
    const niceMax = maxV * 1.14;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => niceMax * t);

    const toX = (i: number) =>
      series.length === 1 ? padL + plotW / 2 : padL + (i / (series.length - 1)) * plotW;
    const toY = (v: number) => padT + plotH - (Math.max(0, v) / niceMax) * plotH;

    return {
      maxVal: niceMax,
      yTicks: ticks,
      revPts: series.map((s, i) => ({ x: toX(i), y: toY(s.revenue), val: s.revenue, period: s.period })),
      expPts: series.map((s, i) => ({ x: toX(i), y: toY(s.expenses), val: s.expenses, period: s.period })),
      profPts: series.map((s, i) => ({ x: toX(i), y: toY(s.profit), val: s.profit, period: s.period })),
    };
  }, [series]);

  const makePath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  const active = hoverIdx !== null && series[hoverIdx] ? series[hoverIdx] : null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Revenue, Expense & Profit Trend
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Calculated period trajectory · Hover points for exact Naira breakdown
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-md">
          <button
            type="button"
            onClick={() => setMode('line')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              mode === 'line'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Trend Line
          </button>
          <button
            type="button"
            onClick={() => setMode('bar')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              mode === 'bar'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Period Bars
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 pb-2 text-xs">
        <div className="flex items-center gap-5 text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 inline-block" />
            Revenue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-500 inline-block" />
            Expenses
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-500 inline-block" />
            Est. Profit
          </span>
        </div>

        {active ? (
          <div className="font-mono tabular-nums text-xs text-slate-700 dark:text-slate-200 flex items-center gap-3">
            <span className="text-slate-500 dark:text-slate-400">{active.period}</span>
            <span>Rev: {formatNaira(active.revenue)}</span>
            <span>Exp: {formatNaira(active.expenses)}</span>
            <span className="text-cyan-700 dark:text-cyan-400 font-semibold">
              Profit: {formatNaira(active.profit)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {series.length} period(s)
          </span>
        )}
      </div>

      {series.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
          No chronological records available to plot.
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[540px] select-none"
            onMouseLeave={() => setHoverIdx(null)}
          >
            {yTicks.map((t, idx) => {
              const y = padT + plotH - (t / maxVal) * plotH;
              return (
                <g key={idx}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={width - padR}
                    y2={y}
                    className="stroke-slate-200 dark:stroke-slate-800"
                    strokeDasharray={idx === 0 ? undefined : '2 3'}
                  />
                  <text
                    x={padL - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-400 text-[10px] font-mono"
                  >
                    {formatNaira(t)}
                  </text>
                </g>
              );
            })}

            {mode === 'line' ? (
              <>
                <path d={makePath(revPts)} fill="none" stroke="#2563EB" strokeWidth="2.2" />
                <path d={makePath(expPts)} fill="none" stroke="#F59E0B" strokeWidth="1.8" />
                <path d={makePath(profPts)} fill="none" stroke="#06B6D4" strokeWidth="2" />
                {revPts.map((p, idx) => (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r={hoverIdx === idx ? 5 : 3}
                    fill="#2563EB"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                ))}
              </>
            ) : (
              series.map((s, idx) => {
                const bandW = plotW / Math.max(1, series.length);
                const barW = Math.max(6, Math.min(24, bandW * 0.28));
                const center = padL + (idx + 0.5) * bandW;
                const revH = (s.revenue / maxVal) * plotH;
                const expH = (s.expenses / maxVal) * plotH;
                return (
                  <g key={s.period}>
                    <rect
                      x={center - barW - 1}
                      y={padT + plotH - revH}
                      width={barW}
                      height={Math.max(1, revH)}
                      fill="#2563EB"
                      rx="1"
                    />
                    <rect
                      x={center + 1}
                      y={padT + plotH - expH}
                      width={barW}
                      height={Math.max(1, expH)}
                      fill="#F59E0B"
                      rx="1"
                    />
                  </g>
                );
              })
            )}

            {series.map((s, idx) => {
              const x =
                mode === 'bar'
                  ? padL + ((idx + 0.5) * plotW) / Math.max(1, series.length)
                  : revPts[idx]?.x ?? padL;
              return (
                <text
                  key={s.period}
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {s.period}
                </text>
              );
            })}

            {series.map((_, idx) => {
              const colW = plotW / Math.max(1, series.length);
              return (
                <rect
                  key={idx}
                  x={padL + idx * colW}
                  y={padT}
                  width={Math.max(8, colW)}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(idx)}
                />
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}

const SLICE_COLORS = ['#1D4ED8', '#06B6D4', '#0F172A', '#0D9488', '#F59E0B', '#64748B'];

export function CategoryBarChart({
  categories,
  selectedCategory,
  onSelectCategory,
}: {
  categories: CalculatedMetrics['categoryBreakdown'];
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
}) {
  const top = categories.slice(0, 6);
  const maxRev = Math.max(1, ...top.map((c) => c.revenue));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
      <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Category Revenue & Margin Comparison
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {onSelectCategory
              ? 'Click any segment to cross-filter product performance'
              : 'Top performing business segments ranked by verified revenue'}
          </p>
        </div>
        {selectedCategory && selectedCategory !== 'all' && onSelectCategory && (
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className="text-xs font-medium text-blue-700 dark:text-cyan-400 hover:underline whitespace-nowrap shrink-0"
          >
            Reset filter
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3.5">
        {top.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No categories mapped.</p>
        ) : (
          top.map((c, idx) => {
            const widthPct = Math.max(3, (c.revenue / maxRev) * 100);
            const profit = c.revenue - c.expenses;
            const isSelected = selectedCategory === c.category;
            const isDimmed =
              selectedCategory && selectedCategory !== 'all' && !isSelected;

            const inner = (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                    {c.category}
                  </span>
                  <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
                    {formatNaira(c.revenue)} · {c.sharePct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-xs overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: SLICE_COLORS[idx % SLICE_COLORS.length],
                    }}
                  />
                </div>
                <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {c.count} transactions · Est. profit {formatNaira(profit)}
                </div>
              </>
            );

            if (onSelectCategory) {
              return (
                <button
                  key={c.category}
                  type="button"
                  onClick={() =>
                    onSelectCategory(isSelected ? 'all' : c.category)
                  }
                  className={`w-full text-left space-y-1 p-1.5 -mx-1.5 rounded transition-opacity ${
                    isSelected
                      ? 'bg-slate-50 dark:bg-slate-800/60 ring-1 ring-blue-500/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  } ${isDimmed ? 'opacity-50' : 'opacity-100'}`}
                >
                  {inner}
                </button>
              );
            }

            return (
              <div key={c.category} className="space-y-1">
                {inner}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function RevenueMixDonutChart({
  categories,
}: {
  categories: CalculatedMetrics['categoryBreakdown'];
}) {
  const top = categories.slice(0, 5);
  const total = top.reduce((a, c) => a + c.revenue, 0) || 1;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
      <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Revenue Share Mix (Pie Breakdown)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Concentration across top revenue categories
        </p>
      </div>

      {top.length === 0 ? (
        <div className="py-10 text-sm text-slate-500 dark:text-slate-400">No category data.</div>
      ) : (
        <div className="mt-5 flex flex-col sm:flex-row items-center gap-6">
          <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
            <g transform="rotate(-90 80 80)">
              {top.map((c, idx) => {
                const frac = c.revenue / total;
                const dashLen = frac * circumference;
                const offset = -cumulativeOffset;
                cumulativeOffset += dashLen;
                return (
                  <circle
                    key={c.category}
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="transparent"
                    stroke={SLICE_COLORS[idx % SLICE_COLORS.length]}
                    strokeWidth="22"
                    strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                    strokeDashoffset={offset}
                  />
                );
              })}
            </g>
            <text
              x="80"
              y="76"
              textAnchor="middle"
              className="fill-slate-500 dark:fill-slate-400 text-[10px]"
            >
              Total Share
            </text>
            <text
              x="80"
              y="94"
              textAnchor="middle"
              className="fill-slate-900 dark:fill-slate-100 text-xs font-mono font-semibold"
            >
              {formatNaira(total)}
            </text>
          </svg>

          <div className="flex-1 w-full space-y-2.5 text-xs">
            {top.map((c, idx) => (
              <div key={c.category} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: SLICE_COLORS[idx % SLICE_COLORS.length] }}
                  />
                  <span className="text-slate-700 dark:text-slate-300 truncate">{c.category}</span>
                </span>
                <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 shrink-0">
                  {c.sharePct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
