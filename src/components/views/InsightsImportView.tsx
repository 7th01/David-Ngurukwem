import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { Check, Download, RotateCcw, Upload } from 'lucide-react';
import {
  ActionableInsight,
  InsightCategory,
  InsightStatus,
  NavSection,
} from '../../types/analytics';
import { formatCompactNumber, formatCurrency, generateSampleCsv } from '../../utils/analyticsEngine';

interface InsightsImportViewProps {
  insights: ActionableInsight[];
  insightStatuses: Record<string, InsightStatus>;
  isCustomImport: boolean;
  sourceName: string;
  onUpdateInsightStatus: (id: string, status: InsightStatus) => void;
  onNavigate: (section: NavSection) => void;
  onImportCsvText: (csvText: string, fileName: string) => void;
  onResetDefaultDataset: () => void;
}

export function InsightsImportView({
  insights,
  insightStatuses,
  isCustomImport,
  sourceName,
  onUpdateInsightStatus,
  onNavigate,
  onImportCsvText,
  onResetDefaultDataset,
}: InsightsImportViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<'All' | InsightCategory>('All');
  const [adoptionRate, setAdoptionRate] = useState<number>(75); // % execution slider for lift simulator
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [pasteCsv, setPasteCsv] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredInsights = useMemo(
    () =>
      insights.filter((i) => (categoryFilter === 'All' ? true : i.category === categoryFilter)),
    [insights, categoryFilter]
  );

  const totalProjectedDownloads = useMemo(
    () =>
      insights.reduce((acc, i) => acc + i.projectedDownloadsDelta, 0) * (adoptionRate / 100),
    [insights, adoptionRate]
  );

  const totalProjectedRevenue = useMemo(
    () =>
      insights.reduce((acc, i) => acc + i.projectedRevenueDelta, 0) * (adoptionRate / 100),
    [insights, adoptionRate]
  );

  const appliedCount = insights.filter((i) => insightStatuses[i.id] === 'applied').length;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportSuccess(null);

    try {
      const text = await file.text();
      onImportCsvText(text, file.name);
      setImportSuccess(`Loaded "${file.name}" into StatEdge analytics engine.`);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Unable to parse CSV file.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePasteImport = () => {
    if (!pasteCsv.trim()) {
      setImportError('Paste CSV rows with header before analyzing.');
      return;
    }
    setImportError(null);
    setImportSuccess(null);
    try {
      onImportCsvText(pasteCsv, 'Pasted Store Export.csv');
      setImportSuccess('Parsed pasted CSV data and updated all dashboard metrics.');
      setPasteCsv('');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Invalid CSV format.');
    }
  };

  const handleDownloadSampleCsv = () => {
    const csv = generateSampleCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'statedge_sample_store_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const categories: ('All' | InsightCategory)[] = [
    'All',
    'Conversion',
    'Monetization',
    'Stability',
    'ASO',
    'Retention',
  ];

  return (
    <div className="space-y-6">
      {/* What-If Impact Simulator Banner */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1 max-w-xl">
            <h2 className="text-base font-semibold text-slate-900">
              Projected Lift Simulator & Execution Progress
            </h2>
            <p className="text-xs text-slate-500">
              Adjust expected implementation confidence to model incremental installs and net store proceeds across all {insights.length} detected recommendations.
            </p>
            <div className="pt-2 flex items-center gap-4">
              <label htmlFor="adoption-slider" className="text-xs font-medium text-slate-700 whitespace-nowrap">
                Execution Confidence: <span className="font-mono tabular-nums">{adoptionRate}%</span>
              </label>
              <input
                id="adoption-slider"
                type="range"
                min={25}
                max={100}
                step={5}
                value={adoptionRate}
                onChange={(e) => setAdoptionRate(Number(e.target.value))}
                className="w-44 accent-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-200 lg:pl-6 shrink-0">
            <div>
              <div className="text-xs text-slate-500">Projected Installs</div>
              <div className="mt-1 font-mono tabular-nums text-xl font-semibold text-teal-700">
                +{formatCompactNumber(totalProjectedDownloads)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Projected Net Rev</div>
              <div className="mt-1 font-mono tabular-nums text-xl font-semibold text-slate-900">
                +{formatCurrency(totalProjectedRevenue)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Actions Applied</div>
              <div className="mt-1 font-mono tabular-nums text-xl font-semibold text-slate-900">
                {appliedCount}/{insights.length}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full Insights Engine List */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Actionable Insights Queue
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Generated directly from active time-series vitals, funnel conversion ratios, and review clusters
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                  categoryFilter === cat
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredInsights.map((ins) => {
            const status = insightStatuses[ins.id] ?? 'pending';
            const severityText =
              ins.severity === 'critical'
                ? 'Critical Alert'
                : ins.severity === 'opportunity'
                  ? 'High-Impact Opportunity'
                  : 'Optimization';
            const severityColor =
              ins.severity === 'critical'
                ? 'text-red-700'
                : ins.severity === 'opportunity'
                  ? 'text-amber-700'
                  : 'text-emerald-700';

            return (
              <div key={ins.id} className="p-6 flex flex-col xl:flex-row xl:items-start justify-between gap-5">
                <div className="space-y-2 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className={`font-semibold ${severityColor}`}>{severityText}</span>
                    <span aria-hidden="true">·</span>
                    <span>{ins.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-slate-700">{ins.appName}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {ins.store === 'all'
                        ? 'Cross-Store'
                        : ins.store === 'app_store'
                          ? 'App Store'
                          : 'Google Play'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums font-medium text-slate-800">
                      {ins.projectedLiftLabel}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900">{ins.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong className="font-medium text-slate-800">Diagnosis ({ins.mechanism}):</strong>{' '}
                    {ins.diagnosis}
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <strong className="font-medium text-slate-900">Recommended Action:</strong>{' '}
                    {ins.recommendedAction}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onNavigate(ins.targetSection)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    Open Evidence
                  </button>

                  <select
                    aria-label={`Status for ${ins.title}`}
                    value={status}
                    onChange={(e) =>
                      onUpdateInsightStatus(ins.id, e.target.value as InsightStatus)
                    }
                    className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="applied">Applied</option>
                  </select>

                  {status === 'applied' && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      Tracked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CSV Store Data Importer */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Import App Store / Google Play CSV Export
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Active source: <span className="font-medium text-slate-700">{sourceName}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Sample CSV Template
            </button>

            {isCustomImport && (
              <button
                type="button"
                onClick={() => {
                  onResetDefaultDataset();
                  setImportSuccess('Restored StatEdge connected portfolio dataset.');
                  setImportError(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Reset Demo Portfolio
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-700">
              Upload CSV File (date, app_name, store, downloads, revenue, impressions, page_views, crash_free_rate, avg_rating)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 px-4 border border-dashed border-slate-300 rounded-md bg-slate-50 hover:bg-slate-100/70 transition-colors flex flex-col items-center justify-center gap-2 text-center"
            >
              <Upload className="w-5 h-5 text-slate-500" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-800">
                Choose CSV file from computer
              </span>
              <span className="text-xs text-slate-500">
                Runs 100% locally in browser and recalculates all charts and insights
              </span>
            </button>
          </div>

          <div className="space-y-3">
            <label htmlFor="paste-csv" className="block text-xs font-medium text-slate-700">
              Or Paste Raw CSV Rows Directly
            </label>
            <textarea
              id="paste-csv"
              rows={4}
              value={pasteCsv}
              onChange={(e) => setPasteCsv(e.target.value)}
              placeholder="date,app_name,store,downloads,revenue&#10;2026-11-12,MyApp,app_store,1420,1980.50&#10;2026-11-12,MyApp,play_store,2150,1410.00"
              className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
            <button
              type="button"
              onClick={handlePasteImport}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
            >
              Analyze Pasted Data
            </button>
          </div>
        </div>

        {importError && (
          <div role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-2.5">
            {importError}
          </div>
        )}
        {importSuccess && (
          <div role="status" className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-4 py-2.5">
            {importSuccess}
          </div>
        )}
      </section>
    </div>
  );
}
