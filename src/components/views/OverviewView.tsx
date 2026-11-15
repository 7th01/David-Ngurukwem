import { useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, Check } from 'lucide-react';
import {
  ActionableInsight,
  InsightStatus,
  NavSection,
  StoreFilter,
} from '../../types/analytics';
import {
  AppHealthRow,
  DailySeriesRow,
  PeriodKpis,
  formatCompactNumber,
  formatCurrency,
} from '../../utils/analyticsEngine';
import { ChartMetricKey, DualStoreTimeChart } from '../charts/DualStoreTimeChart';
import { Sparkline } from '../charts/Sparkline';

interface OverviewViewProps {
  kpis: PeriodKpis;
  series: DailySeriesRow[];
  appRows: AppHealthRow[];
  insights: ActionableInsight[];
  insightStatuses: Record<string, InsightStatus>;
  storeFilter: StoreFilter;
  selectedAppId: string;
  onSelectApp: (appId: string) => void;
  onUpdateInsightStatus: (id: string, status: InsightStatus) => void;
  onNavigate: (section: NavSection) => void;
}

type SortKey = 'downloads' | 'revenue' | 'conversionRate' | 'avgRating' | 'crashFreeRate' | 'd30Retention';

export function OverviewView({
  kpis,
  series,
  appRows,
  insights,
  insightStatuses,
  storeFilter,
  selectedAppId,
  onSelectApp,
  onUpdateInsightStatus,
  onNavigate,
}: OverviewViewProps) {
  const [chartMetric, setChartMetric] = useState<ChartMetricKey>('downloads');
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortAsc, setSortAsc] = useState(false);

  const sortedRows = useMemo(() => {
    const copy = [...appRows];
    copy.sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortAsc ? diff : -diff;
    });
    return copy;
  }, [appRows, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const formatDelta = (val: number, suffix = '%') => {
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}${suffix}`;
  };

  const priorityInsights = insights.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Summary Strip (flat container, hairline dividers) */}
      <section
        aria-label="Key store performance metrics"
        className="bg-white border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200"
      >
        <div className="p-5">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span>Total Downloads</span>
            <span
              className={`font-mono tabular-nums font-medium ${
                kpis.downloadsDeltaPct >= 0 ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {formatDelta(kpis.downloadsDeltaPct)} vs prior
            </span>
          </div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-slate-900">
            {formatCompactNumber(kpis.downloads)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            iOS {formatCompactNumber(kpis.downloadsIos)} · Play {formatCompactNumber(kpis.downloadsAndroid)}
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span>Net Store Revenue</span>
            <span
              className={`font-mono tabular-nums font-medium ${
                kpis.revenueDeltaPct >= 0 ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {formatDelta(kpis.revenueDeltaPct)} vs prior
            </span>
          </div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-slate-900">
            {formatCurrency(kpis.revenue)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            iOS {formatCurrency(kpis.revenueIos)} · Play {formatCurrency(kpis.revenueAndroid)}
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span>Store Page Conversion</span>
            <span
              className={`font-mono tabular-nums font-medium ${
                kpis.conversionDeltaPts >= 0 ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {formatDelta(kpis.conversionDeltaPts, ' pts')}
            </span>
          </div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-slate-900">
            {kpis.conversionRate.toFixed(1)}%
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            iOS {kpis.conversionIos.toFixed(1)}% · Play {kpis.conversionAndroid.toFixed(1)}%
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span>Blended Rating & Vitals</span>
            <span
              className={`font-mono tabular-nums font-medium ${
                kpis.crashFreeRate >= 99.0 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {kpis.crashFreeRate >= 99.0 ? 'Nominal' : 'Watch Vitals'}
            </span>
          </div>
          <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-slate-900">
            {kpis.avgRating.toFixed(2)} ★
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            {kpis.crashFreeRate.toFixed(2)}% crash-free ({formatDelta(kpis.crashFreeDeltaPts, ' pts')})
          </div>
        </div>
      </section>

      {/* Focal Visualization: Dual-Store Time Series */}
      <DualStoreTimeChart
        series={series}
        storeFilter={storeFilter}
        metric={chartMetric}
        onMetricChange={setChartMetric}
      />

      {/* Actionable Insights Strip (Claim-to-Proof Adjacency) */}
      <section className="bg-white border border-slate-200 rounded-lg">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Priority Actionable Insights
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Statistically detected conversion gaps, stability regressions, and revenue opportunities
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('insights')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
          >
            View all {insights.length} insights
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {priorityInsights.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No critical anomalies detected for the selected date window.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {priorityInsights.map((ins) => {
              const status = insightStatuses[ins.id] ?? 'pending';
              const severityLabel =
                ins.severity === 'critical'
                  ? 'Critical Alert'
                  : ins.severity === 'opportunity'
                    ? 'High-Impact Opportunity'
                    : 'Optimization';
              const severityTextClass =
                ins.severity === 'critical'
                  ? 'text-red-700'
                  : ins.severity === 'opportunity'
                    ? 'text-amber-700'
                    : 'text-emerald-700';

              return (
                <div
                  key={ins.id}
                  className="px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className={`font-medium ${severityTextClass}`}>{severityLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{ins.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{ins.appName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums font-medium text-slate-700">
                        Est. Impact: {ins.projectedLiftLabel}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{ins.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong className="font-medium text-slate-800">Action:</strong>{' '}
                      {ins.recommendedAction}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onNavigate(ins.targetSection)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                    >
                      Inspect Data
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateInsightStatus(
                          ins.id,
                          status === 'applied' ? 'pending' : 'applied'
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        status === 'applied'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {status === 'applied' && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                      {status === 'applied' ? 'Applied' : 'Mark Applied'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Portfolio Health Matrix Table */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">App Portfolio Health Matrix</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any row to filter the entire dashboard to that app · Click headers to sort
            </p>
          </div>
          {selectedAppId !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectApp('all')}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              Show All Apps
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                <th className="py-2.5 px-6 whitespace-nowrap">Application</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('downloads')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    Downloads
                    {sortKey === 'downloads' &&
                      (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('revenue')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    Net Revenue
                    {sortKey === 'revenue' &&
                      (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('conversionRate')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    Conv %
                    {sortKey === 'conversionRate' &&
                      (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('avgRating')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    Rating
                    {sortKey === 'avgRating' &&
                      (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('crashFreeRate')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    Crash-Free
                    {sortKey === 'crashFreeRate' &&
                      (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('d30Retention')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    D30 Ret.
                    {sortKey === 'd30Retention' &&
                      (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="py-2.5 px-6 text-right whitespace-nowrap">14D Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {sortedRows.map((row) => {
                const isSelected = selectedAppId === row.app.id;
                return (
                  <tr
                    key={row.app.id}
                    onClick={() => onSelectApp(isSelected ? 'all' : row.app.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-6">
                      <div className="font-medium text-slate-900">{row.app.name}</div>
                      <div className="text-xs text-slate-500">
                        {row.app.category} · {row.app.priceModel}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                      <div>{formatCompactNumber(row.downloads)}</div>
                      <div
                        className={`text-xs ${
                          row.downloadsDeltaPct >= 0 ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {formatDelta(row.downloadsDeltaPct)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
                      {formatCurrency(row.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {row.conversionRate.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {row.avgRating.toFixed(2)} ★
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono tabular-nums font-medium ${
                        row.crashFreeRate >= 99.0 ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {row.crashFreeRate.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {row.d30Retention.toFixed(1)}%
                    </td>
                    <td className="py-3 px-6 text-right">
                      <Sparkline
                        values={row.sparkline}
                        positive={row.downloadsDeltaPct >= 0}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
