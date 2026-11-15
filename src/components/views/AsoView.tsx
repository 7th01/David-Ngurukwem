import { useMemo, useState } from 'react';
import { AppProfile, KeywordRanking, MetadataAuditCheck, StoreFilter } from '../../types/analytics';
import { formatCompactNumber } from '../../utils/analyticsEngine';
import { KeywordMatrixChart } from '../charts/KeywordMatrixChart';

interface AsoViewProps {
  keywords: KeywordRanking[];
  metadataChecks: MetadataAuditCheck[];
  apps: AppProfile[];
  storeFilter: StoreFilter;
  selectedAppId: string;
}

export function AsoView({
  keywords,
  metadataChecks,
  apps,
  storeFilter,
  selectedAppId,
}: AsoViewProps) {
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null);
  const [kwSearch, setKwSearch] = useState('');

  const filteredKeywords = useMemo(() => {
    return keywords
      .filter(
        (k) =>
          (storeFilter === 'all' || k.store === storeFilter) &&
          (selectedAppId === 'all' || k.appId === selectedAppId)
      )
      .filter((k) =>
        kwSearch.trim() ? k.keyword.toLowerCase().includes(kwSearch.toLowerCase()) : true
      )
      .sort((a, b) => b.estMonthlyInstalls - a.estMonthlyInstalls);
  }, [keywords, storeFilter, selectedAppId, kwSearch]);

  const filteredAudits = useMemo(() => {
    return metadataChecks.filter(
      (m) =>
        (storeFilter === 'all' || m.store === storeFilter) &&
        (selectedAppId === 'all' || m.appId === selectedAppId)
    );
  }, [metadataChecks, storeFilter, selectedAppId]);

  const totalEstInstalls = filteredKeywords.reduce((a, k) => a + k.estMonthlyInstalls, 0);
  const top3Count = filteredKeywords.filter((k) => k.currentRank <= 3).length;
  const strikingCount = filteredKeywords.filter(
    (k) => k.currentRank >= 4 && k.currentRank <= 12
  ).length;

  return (
    <div className="space-y-6">
      {/* ASO Summary Strip */}
      <section className="bg-white border border-slate-200 rounded-lg grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
        <div className="p-5">
          <div className="text-xs text-slate-500">Tracked Organic Keyword Installs</div>
          <div className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-slate-900">
            {formatCompactNumber(totalEstInstalls)}/mo
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Across {filteredKeywords.length} tracked search terms
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs text-slate-500">Top-3 Ranked Keywords</div>
          <div className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-slate-900">
            {top3Count}
          </div>
          <div className="mt-1 text-xs text-slate-500">High-intent category leaders</div>
        </div>
        <div className="p-5">
          <div className="text-xs text-slate-500">Striking-Distance Opportunities (#4–#12)</div>
          <div className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-amber-700">
            {strikingCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Keywords eligible for metadata & ad boost
          </div>
        </div>
      </section>

      {/* Keyword Matrix Scatter Chart */}
      <KeywordMatrixChart
        keywords={filteredKeywords}
        selectedKeywordId={selectedKeywordId}
        onSelectKeyword={setSelectedKeywordId}
      />

      {/* Keyword Rankings Table */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Keyword Ranking Intelligence</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Search volume, rank movement, difficulty, and estimated organic share of voice
            </p>
          </div>
          <input
            type="search"
            value={kwSearch}
            onChange={(e) => setKwSearch(e.target.value)}
            placeholder="Filter keywords..."
            className="w-full sm:w-60 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                <th className="py-2.5 px-6 whitespace-nowrap">Keyword</th>
                <th className="py-2.5 px-4 whitespace-nowrap">App · Store</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Volume/mo</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Rank</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Delta</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Difficulty</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Est. Installs</th>
                <th className="py-2.5 px-6 text-right whitespace-nowrap">Share of Voice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredKeywords.map((kw) => {
                const rankDelta = kw.previousRank - kw.currentRank; // positive means moved up
                const appName = apps.find((a) => a.id === kw.appId)?.name ?? kw.appId;
                const isSelected = selectedKeywordId === kw.id;

                return (
                  <tr
                    key={kw.id}
                    onClick={() => setSelectedKeywordId(isSelected ? null : kw.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-6 font-medium text-slate-900">{kw.keyword}</td>
                    <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {appName} · {kw.store === 'app_store' ? 'App Store' : 'Google Play'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {kw.searchVolume.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      #{kw.currentRank}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono tabular-nums font-medium ${
                        rankDelta > 0
                          ? 'text-emerald-700'
                          : rankDelta < 0
                            ? 'text-red-600'
                            : 'text-slate-400'
                      }`}
                    >
                      {rankDelta > 0 ? `+${rankDelta}` : rankDelta === 0 ? '0' : rankDelta}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      {kw.difficulty}/100
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
                      {kw.estMonthlyInstalls.toLocaleString()}
                    </td>
                    <td className="py-3 px-6 text-right font-mono tabular-nums text-slate-700">
                      {kw.shareOfVoice.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Storefront Metadata Audit */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Storefront Metadata & Vitals Audit</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Actionable field-level checks across App Store Connect and Google Play Console listings
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredAudits.map((item) => {
            const appName = apps.find((a) => a.id === item.appId)?.name ?? item.appId;
            const statusText =
              item.status === 'optimal'
                ? 'Optimal'
                : item.status === 'warning'
                  ? 'Optimization Recommended'
                  : 'Critical Gap';
            const statusClass =
              item.status === 'optimal'
                ? 'text-emerald-700'
                : item.status === 'warning'
                  ? 'text-amber-700'
                  : 'text-red-700';

            return (
              <div key={item.id} className="px-6 py-4 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className={`font-semibold ${statusClass}`}>{statusText}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-slate-800">{appName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.store === 'app_store' ? 'App Store' : 'Google Play'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.field}</span>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    Target: {item.recommendedLength}
                  </span>
                </div>
                <p className="text-sm text-slate-800">{item.finding}</p>
                <p className="text-xs text-slate-600">
                  <strong className="font-medium text-slate-800">Recommendation:</strong>{' '}
                  {item.recommendation}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
