import { useState } from 'react';
import { KeywordRanking } from '../../types/analytics';

interface KeywordMatrixChartProps {
  keywords: KeywordRanking[];
  selectedKeywordId: string | null;
  onSelectKeyword: (id: string) => void;
}

export function KeywordMatrixChart({
  keywords,
  selectedKeywordId,
  onSelectKeyword,
}: KeywordMatrixChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const width = 620;
  const height = 280;
  const padL = 52;
  const padR = 24;
  const padT = 22;
  const padB = 38;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxVol = Math.max(120000, ...keywords.map((k) => k.searchVolume));
  const maxRank = 20;

  const toX = (rank: number) => {
    const clamped = Math.min(maxRank, Math.max(1, rank));
    // Rank 1 on right (best), Rank 20 on left (opportunity)
    return padL + ((maxRank - clamped) / (maxRank - 1)) * plotW;
  };

  const toY = (vol: number) => {
    return padT + plotH - (vol / maxVol) * plotH;
  };

  const activeKw =
    keywords.find((k) => k.id === hoveredId) ??
    keywords.find((k) => k.id === selectedKeywordId) ??
    null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Keyword Volume vs. Rank Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Top-left quadrant flags high-volume keywords in striking distance (#6–#15)
          </p>
        </div>

        {activeKw ? (
          <div className="text-xs font-mono tabular-nums text-slate-700">
            <span className="font-semibold text-slate-900">"{activeKw.keyword}"</span> · Rank #
            {activeKw.currentRank} · {(activeKw.searchVolume / 1000).toFixed(1)}k/mo
          </div>
        ) : (
          <span className="text-xs text-slate-400">Select a bubble to inspect keyword</span>
        )}
      </div>

      <div className="w-full overflow-x-auto mt-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[480px] select-none">
          {/* Quadrant divider at Rank 5 and Volume 50k */}
          <line
            x1={toX(5)}
            y1={padT}
            x2={toX(5)}
            y2={padT + plotH}
            stroke="#CBD5E1"
            strokeDasharray="4 4"
          />
          <line
            x1={padL}
            y1={toY(50000)}
            x2={padL + plotW}
            y2={toY(50000)}
            stroke="#CBD5E1"
            strokeDasharray="4 4"
          />

          <text x={padL + 8} y={padT + 14} className="fill-amber-700 text-[10px] font-medium">
            High-Volume Growth Targets (Rank 6–20)
          </text>
          <text
            x={padL + plotW - 8}
            y={padT + 14}
            textAnchor="end"
            className="fill-teal-700 text-[10px] font-medium"
          >
            Defend Top-5 Leaders
          </text>

          {/* Axes */}
          <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="#CBD5E1" />
          <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#CBD5E1" />

          {[20, 15, 10, 5, 1].map((r) => (
            <text
              key={r}
              x={toX(r)}
              y={height - 12}
              textAnchor="middle"
              className="fill-slate-400 text-[10px] font-mono"
            >
              #{r}
            </text>
          ))}

          {[0, 40000, 80000, 120000].map((v) => (
            <text
              key={v}
              x={padL - 8}
              y={toY(v) + 4}
              textAnchor="end"
              className="fill-slate-400 text-[10px] font-mono"
            >
              {v === 0 ? '0' : `${v / 1000}k`}
            </text>
          ))}

          {keywords.map((kw) => {
            const cx = toX(kw.currentRank);
            const cy = toY(kw.searchVolume);
            const r = Math.max(5, Math.min(13, Math.sqrt(kw.estMonthlyInstalls) * 0.11));
            const isSelected = kw.id === selectedKeywordId || kw.id === hoveredId;
            const fill = kw.store === 'app_store' ? '#2563EB' : '#0D9488';

            return (
              <g
                key={kw.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredId(kw.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelectKeyword(kw.id)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={fill}
                  fillOpacity={isSelected ? 0.9 : 0.65}
                  stroke={isSelected ? '#0F172A' : '#FFFFFF'}
                  strokeWidth={isSelected ? 2 : 1.5}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
