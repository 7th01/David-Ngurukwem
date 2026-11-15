import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Download,
  FileSpreadsheet,
  FolderKanban,
  Upload,
} from 'lucide-react';
import {
  CalculatedMetrics,
  isCellMissing,
  parseNumericValue,
} from '../../lib/dataProcessor';
import { downloadExecutivePdfReport } from '../../lib/pdfGenerator';
import {
  AnalysisRecord,
  AuditLogRecord,
  BusinessRecord,
  DatasetRecord,
  ProjectRecord,
  WorkspaceTab,
} from '../../types/statedge';
import {
  CategoryBarChart,
  formatNaira,
  RevenueMixDonutChart,
  TrendLineChart,
} from '../bi/BiCharts';

interface ClientDashboardViewProps {
  business: BusinessRecord;
  datasets: DatasetRecord[];
  analyses: AnalysisRecord[];
  projects: ProjectRecord[];
  recentActivities: AuditLogRecord[];
  activeAnalysis: AnalysisRecord | null;
  isDemo: boolean;
  onSelectAnalysis: (analysis: AnalysisRecord) => void;
  onNavigate: (tab: WorkspaceTab) => void;
}

function calcDeltaPct(curr: number, prev: number): number | null {
  if (!Number.isFinite(prev) || Math.abs(prev) < 0.0001) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function formatDeltaLabel(delta: number | null, prevPeriod: string | undefined): string {
  if (delta === null || !prevPeriod) return 'Single period';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}% vs ${prevPeriod}`;
}

export function ClientDashboardView({
  business,
  datasets,
  analyses,
  projects,
  recentActivities,
  activeAnalysis,
  isDemo,
  onSelectAnalysis,
  onNavigate,
}: ClientDashboardViewProps) {
  const [productQuery, setProductQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [periodPreset, setPeriodPreset] = useState<'all' | 'recent_6' | 'recent_3' | 'custom'>('all');
  const [startPeriod, setStartPeriod] = useState<string>('');
  const [endPeriod, setEndPeriod] = useState<string>('');

  const metrics: CalculatedMetrics | null = activeAnalysis?.metricsJson || null;
  const activeDataset = useMemo(
    () =>
      activeAnalysis
        ? datasets.find((d) => d.id === activeAnalysis.datasetId) || null
        : null,
    [activeAnalysis, datasets]
  );

  const availablePeriods = useMemo(
    () => (metrics ? metrics.trendSeries.map((s) => s.period) : []),
    [metrics]
  );

  useEffect(() => {
    setSelectedCategory('all');
    setProductQuery('');
    setPeriodPreset('all');
    if (availablePeriods.length > 0) {
      setStartPeriod(availablePeriods[0]);
      setEndPeriod(availablePeriods[availablePeriods.length - 1]);
    } else {
      setStartPeriod('');
      setEndPeriod('');
    }
  }, [activeAnalysis?.id, availablePeriods]);

  const applyPreset = (preset: 'all' | 'recent_6' | 'recent_3') => {
    setPeriodPreset(preset);
    if (availablePeriods.length === 0) return;
    if (preset === 'all') {
      setStartPeriod(availablePeriods[0]);
      setEndPeriod(availablePeriods[availablePeriods.length - 1]);
    } else if (preset === 'recent_3') {
      const sliced = availablePeriods.slice(-3);
      setStartPeriod(sliced[0]);
      setEndPeriod(sliced[sliced.length - 1]);
    } else {
      const sliced = availablePeriods.slice(-6);
      setStartPeriod(sliced[0]);
      setEndPeriod(sliced[sliced.length - 1]);
    }
  };

  const filteredTrend = useMemo(() => {
    if (!metrics) return [];
    if (!startPeriod && !endPeriod) return metrics.trendSeries;
    return metrics.trendSeries.filter((pt) => {
      if (startPeriod && pt.period < startPeriod) return false;
      if (endPeriod && pt.period > endPeriod) return false;
      return true;
    });
  }, [metrics, startPeriod, endPeriod]);

  const isFilteredRange =
    Boolean(metrics) &&
    filteredTrend.length > 0 &&
    filteredTrend.length < (metrics?.trendSeries.length || 0);

  const kpiSummary = useMemo(() => {
    if (!metrics) return null;
    const rev = isFilteredRange
      ? filteredTrend.reduce((acc, s) => acc + s.revenue, 0)
      : metrics.totalRevenue;
    const exp = isFilteredRange
      ? filteredTrend.reduce((acc, s) => acc + s.expenses, 0)
      : metrics.totalExpenses;
    const prof = rev - exp;
    const txCount = isFilteredRange
      ? filteredTrend.reduce((acc, s) => acc + s.count, 0)
      : metrics.totalTransactions;
    const marginPct = rev > 0 ? (prof / rev) * 100 : 0;
    const avgTicket = txCount > 0 ? rev / txCount : 0;

    const latest =
      filteredTrend.length >= 2 ? filteredTrend[filteredTrend.length - 1] : null;
    const previous =
      filteredTrend.length >= 2 ? filteredTrend[filteredTrend.length - 2] : null;

    return {
      totalRevenue: rev,
      totalExpenses: exp,
      estimatedProfit: prof,
      profitMarginPct: marginPct,
      totalTransactions: txCount,
      avgTransactionValue: avgTicket,
      prevPeriod: previous?.period,
      latestPeriod: latest?.period,
      revDelta: latest && previous ? calcDeltaPct(latest.revenue, previous.revenue) : null,
      expDelta: latest && previous ? calcDeltaPct(latest.expenses, previous.expenses) : null,
      profDelta: latest && previous ? calcDeltaPct(latest.profit, previous.profit) : null,
      txDelta: latest && previous ? calcDeltaPct(latest.count, previous.count) : null,
    };
  }, [metrics, filteredTrend, isFilteredRange]);

  const filteredProducts = useMemo(() => {
    if (!metrics) return [];
    let baseList = metrics.productPerformance;

    if (
      selectedCategory !== 'all' &&
      activeDataset?.rawRowsJson &&
      metrics.categoryColumn
    ) {
      const catCol = metrics.categoryColumn;
      const prodCol = metrics.productColumn;
      const revCol = metrics.revenueColumn;
      const qtyCol = metrics.quantityColumn;

      const prodMap = new Map<
        string,
        { product: string; revenue: number; quantity: number }
      >();
      let catTotal = 0;

      for (const row of activeDataset.rawRowsJson) {
        const catVal = !isCellMissing(row[catCol])
          ? String(row[catCol]).trim()
          : 'Uncategorized';
        if (catVal !== selectedCategory) continue;

        const prodVal =
          prodCol && !isCellMissing(row[prodCol])
            ? String(row[prodCol]).trim()
            : catVal;
        const rev = revCol ? parseNumericValue(row[revCol]) ?? 0 : 0;
        const qty = qtyCol ? parseNumericValue(row[qtyCol]) ?? 1 : 1;

        catTotal += rev;
        const existing = prodMap.get(prodVal) ?? {
          product: prodVal,
          revenue: 0,
          quantity: 0,
        };
        existing.revenue += rev;
        existing.quantity += qty;
        prodMap.set(prodVal, existing);
      }

      baseList = Array.from(prodMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .map((p) => ({
          ...p,
          sharePct: catTotal > 0 ? (p.revenue / catTotal) * 100 : 0,
        }));
    }

    if (!productQuery.trim()) return baseList;
    const q = productQuery.trim().toLowerCase();
    return baseList.filter((p) => p.product.toLowerCase().includes(q));
  }, [metrics, activeDataset, selectedCategory, productQuery]);

  return (
    <div className="space-y-6">
      {/* Business Overview Header Strip */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {business.industry} · {business.city}, {business.state} · Plan:{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200 capitalize">
              {business.subscriptionTier}
            </span>
            {isDemo && (
              <>
                <span aria-hidden="true"> · </span>
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  Demonstration Data
                </span>
              </>
            )}
          </div>
          <h1 className="font-display text-xl font-bold text-slate-950 dark:text-white mt-0.5">
            {business.businessName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {analyses.length > 0 && (
            <select
              aria-label="Select analyzed report"
              value={activeAnalysis?.id ?? ''}
              onChange={(e) => {
                const found = analyses.find((a) => String(a.id) === e.target.value);
                if (found) onSelectAnalysis(found);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
            >
              {analyses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => onNavigate('upload')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            Upload Dataset
          </button>

          {activeAnalysis && metrics && (
            <button
              type="button"
              onClick={() =>
                downloadExecutivePdfReport({
                  reportTitle: activeAnalysis.title,
                  businessName: business.businessName,
                  industry: business.industry,
                  location: `${business.city}, ${business.state}`,
                  metrics,
                  interpretation: activeAnalysis.aiInterpretationJson,
                  analystNotes: activeAnalysis.reviewedNotes || undefined,
                  isDemo,
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Export PDF
            </button>
          )}
        </div>
      </section>

      {!metrics || !kpiSummary ? (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-10 text-center space-y-4">
          <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto" aria-hidden="true" />
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              No analyzed dataset in this workspace yet
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Upload an Excel (.xlsx) or CSV (.csv) sales and expense sheet to generate verified
              KPIs, automated visualisations, and AI-grounded insights.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('upload')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 rounded-md hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
          >
            Go to Data Upload Centre
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </section>
      ) : (
        <>
          {/* 4-Column Financial KPI Summary with Period-over-Period Comparison */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
            <div className="p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total Revenue</span>
                {kpiSummary.revDelta !== null && (
                  <span
                    className={`text-[11px] font-mono tabular-nums font-medium ${
                      kpiSummary.revDelta >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {formatDeltaLabel(kpiSummary.revDelta, kpiSummary.prevPeriod)}
                  </span>
                )}
              </div>
              <div className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-slate-950 dark:text-white">
                {formatNaira(kpiSummary.totalRevenue)}
              </div>
              <div className="mt-1 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                Avg ticket {formatNaira(kpiSummary.avgTransactionValue)}
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total Expenses</span>
                {kpiSummary.expDelta !== null && (
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {formatDeltaLabel(kpiSummary.expDelta, kpiSummary.prevPeriod)}
                  </span>
                )}
              </div>
              <div className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-slate-950 dark:text-white">
                {formatNaira(kpiSummary.totalExpenses)}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {metrics.expenseColumn
                  ? `Source: ${metrics.expenseColumn}`
                  : 'No expense column mapped'}
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Estimated Profit</span>
                {kpiSummary.profDelta !== null && (
                  <span
                    className={`text-[11px] font-mono tabular-nums font-medium ${
                      kpiSummary.profDelta >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {formatDeltaLabel(kpiSummary.profDelta, kpiSummary.prevPeriod)}
                  </span>
                )}
              </div>
              <div
                className={`mt-1.5 font-mono tabular-nums text-2xl font-semibold ${
                  kpiSummary.estimatedProfit >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatNaira(kpiSummary.estimatedProfit)}
              </div>
              <div className="mt-1 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {kpiSummary.profitMarginPct.toFixed(1)}% operating margin
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Total Transactions
                </span>
                {kpiSummary.txDelta !== null && (
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {formatDeltaLabel(kpiSummary.txDelta, kpiSummary.prevPeriod)}
                  </span>
                )}
              </div>
              <div className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-slate-950 dark:text-white">
                {kpiSummary.totalTransactions.toLocaleString()}
              </div>
              <div className="mt-1 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {isFilteredRange
                  ? `Filtered: ${startPeriod} to ${endPeriod}`
                  : metrics.dateRangeStart && metrics.dateRangeEnd
                    ? `${metrics.dateRangeStart} to ${metrics.dateRangeEnd}`
                    : `${metrics.anomalies.length} outlier(s) flagged`}
              </div>
            </div>
          </section>

          {/* Date Range & Comparison Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Dataset: <strong className="text-slate-800 dark:text-slate-200">{metrics.datasetName}</strong>
              {' · '}
              <button
                type="button"
                onClick={() => onNavigate('analyst')}
                className="text-blue-700 dark:text-cyan-400 font-medium hover:underline"
              >
                Open Full AI Interpretation & Q&A
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {availablePeriods.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <select
                    aria-label="Start period"
                    value={startPeriod}
                    onChange={(e) => {
                      const nextStart = e.target.value;
                      setPeriodPreset('custom');
                      setStartPeriod(nextStart);
                      if (endPeriod && nextStart > endPeriod) setEndPeriod(nextStart);
                    }}
                    className="px-2.5 py-1 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
                  >
                    {availablePeriods.map((p) => (
                      <option key={p} value={p}>
                        From {p}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="End period"
                    value={endPeriod}
                    onChange={(e) => {
                      const nextEnd = e.target.value;
                      setPeriodPreset('custom');
                      setEndPeriod(nextEnd);
                      if (startPeriod && nextEnd < startPeriod) setStartPeriod(nextEnd);
                    }}
                    className="px-2.5 py-1 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
                  >
                    {availablePeriods.map((p) => (
                      <option key={p} value={p}>
                        To {p}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-md">
                {(
                  [
                    { id: 'all', label: 'All Periods' },
                    { id: 'recent_6', label: 'Last 6' },
                    { id: 'recent_3', label: 'Last 3' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyPreset(t.id)}
                    className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap transition-colors ${
                      periodPreset === t.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Focal Chart */}
          <TrendLineChart series={filteredTrend} />

          {/* Secondary Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryBarChart
              categories={metrics.categoryBreakdown}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
            <RevenueMixDonutChart categories={metrics.categoryBreakdown} />
          </div>

          {/* Product Performance Table */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Product & Item Performance
                  {selectedCategory !== 'all' ? ` · ${selectedCategory}` : ''}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Top products ranked by verified Naira revenue
                  {selectedCategory !== 'all' && (
                    <>
                      {' · '}
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('all')}
                        className="text-blue-700 dark:text-cyan-400 hover:underline"
                      >
                        Show all categories
                      </button>
                    </>
                  )}
                </p>
              </div>
              <input
                type="search"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Filter product name..."
                className="w-full sm:w-56 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <th className="py-2.5 px-6 whitespace-nowrap">Product / Item</th>
                    <th className="py-2.5 px-4 text-right whitespace-nowrap">Units / Volume</th>
                    <th className="py-2.5 px-4 text-right whitespace-nowrap">Revenue</th>
                    <th className="py-2.5 px-6 text-right whitespace-nowrap">Revenue Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-6 px-6 text-center text-xs text-slate-500 dark:text-slate-400"
                      >
                        No products match the active category or search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => (
                      <tr key={p.product} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-6 font-medium text-slate-900 dark:text-slate-100">
                          {p.product}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          {p.quantity.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-white">
                          {formatNaira(p.revenue)}
                        </td>
                        <td className="py-3 px-6 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          {p.sharePct.toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Workspace Summary Row: Uploaded Datasets, Generated Reports & Active Projects */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Uploaded Datasets ({datasets.length})
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('upload')}
              className="text-xs font-medium text-blue-700 dark:text-cyan-400 hover:underline"
            >
              Manage
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {datasets.slice(0, 3).map((ds) => (
              <div key={ds.id} className="py-2 flex items-center justify-between gap-2">
                <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                  {ds.name}
                </span>
                <span className="font-mono tabular-nums text-slate-500 shrink-0">
                  {ds.rowCount.toLocaleString()} rows
                </span>
              </div>
            ))}
            {datasets.length === 0 && (
              <div className="py-3 text-slate-500 dark:text-slate-400">No datasets uploaded yet.</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Generated Reports ({analyses.length})
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('analyst')}
              className="text-xs font-medium text-blue-700 dark:text-cyan-400 hover:underline"
            >
              View AI
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {analyses.slice(0, 3).map((an) => (
              <button
                key={an.id}
                type="button"
                onClick={() => onSelectAnalysis(an)}
                className="w-full py-2 flex items-center justify-between gap-2 text-left hover:text-blue-700 dark:hover:text-cyan-400"
              >
                <span className="truncate font-medium">{an.title}</span>
                <span className="text-slate-500 shrink-0 capitalize">
                  {an.publishStatus.replace('_', ' ')}
                </span>
              </button>
            ))}
            {analyses.length === 0 && (
              <div className="py-3 text-slate-500 dark:text-slate-400">No reports generated yet.</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Active Projects ({projects.length})
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="text-xs font-medium text-blue-700 dark:text-cyan-400 hover:underline"
            >
              Open Projects
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {projects.slice(0, 3).map((p) => (
              <div key={p.id} className="py-2 flex items-center justify-between gap-2">
                <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                  {p.title}
                </span>
                <span className="text-slate-500 shrink-0">{p.status}</span>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="py-3 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <FolderKanban className="w-3.5 h-3.5" aria-hidden="true" />
                No advisory projects requested yet.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recent Workspace Activities */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-blue-600 dark:text-cyan-400" aria-hidden="true" />
            Recent Workspace Activities
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {recentActivities.length} event(s)
          </span>
        </div>

        {recentActivities.length === 0 ? (
          <div className="text-xs text-slate-500 dark:text-slate-400 py-2">
            Workspace events such as dataset uploads, AI analyses, and project updates will appear here.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {recentActivities.slice(0, 6).map((act) => (
              <div
                key={act.id}
                className="py-2.5 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {act.action.replace(/_/g, ' ')}
                  </span>
                  <span aria-hidden="true" className="mx-1.5 text-slate-300 dark:text-slate-700">
                    ·
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">{act.details}</span>
                </div>
                <span className="font-mono tabular-nums text-[11px] text-slate-400 shrink-0">
                  {new Date(act.createdAt).toLocaleString('en-NG', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
