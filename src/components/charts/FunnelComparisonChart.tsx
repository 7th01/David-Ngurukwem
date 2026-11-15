import { FunnelSummary, formatCompactNumber } from '../../utils/analyticsEngine';
import { StoreFilter } from '../../types/analytics';

interface FunnelComparisonChartProps {
  funnels: { app_store: FunnelSummary; play_store: FunnelSummary };
  storeFilter: StoreFilter;
}

export function FunnelComparisonChart({ funnels, storeFilter }: FunnelComparisonChartProps) {
  const stages: { key: keyof Omit<FunnelSummary, 'store'>; label: string }[] = [
    { key: 'impressions', label: 'Store Impressions' },
    { key: 'pageViews', label: 'Product Page Views' },
    { key: 'downloads', label: 'First-Time Installs' },
    { key: 'day1Activated', label: 'Day-1 Activated Users' },
    { key: 'trialStarts', label: 'Trial Starts' },
    { key: 'paidConversions', label: 'Paid Conversions' },
  ];

  const iosMax = funnels.app_store.impressions || 1;
  const andMax = funnels.play_store.impressions || 1;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            End-to-End Store Conversion Funnel
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Stage-by-stage progression from storefront impression to paid subscriber conversion
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs text-slate-600">
          {storeFilter !== 'play_store' && (
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
              App Store
            </span>
          )}
          {storeFilter !== 'app_store' && (
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-xs bg-teal-600 inline-block" />
              Google Play
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-100 mt-2">
        {stages.map((stage, idx) => {
          const iosVal = funnels.app_store[stage.key];
          const andVal = funnels.play_store[stage.key];

          const prevKey = idx > 0 ? stages[idx - 1].key : null;
          const iosStepRate = prevKey
            ? (iosVal / Math.max(1, funnels.app_store[prevKey])) * 100
            : 100;
          const andStepRate = prevKey
            ? (andVal / Math.max(1, funnels.play_store[prevKey])) * 100
            : 100;

          const iosWidthPct = Math.max(2, (iosVal / iosMax) * 100);
          const andWidthPct = Math.max(2, (andVal / andMax) * 100);

          return (
            <div key={stage.key} className="py-3.5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              <div className="lg:col-span-3">
                <div className="text-sm font-medium text-slate-900">{stage.label}</div>
                <div className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                  {idx === 0 ? 'Top of funnel (100%)' : 'Step conversion vs. prior stage'}
                </div>
              </div>

              <div className="lg:col-span-9 space-y-2">
                {storeFilter !== 'play_store' && (
                  <div className="flex items-center gap-3">
                    <span className="w-16 text-xs font-medium text-slate-600 shrink-0">App Store</span>
                    <div className="flex-1 h-5 bg-slate-100 rounded-xs overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${iosWidthPct}%` }}
                      />
                    </div>
                    <span className="w-20 text-right font-mono tabular-nums text-xs font-medium text-slate-900 shrink-0">
                      {formatCompactNumber(iosVal)}
                    </span>
                    <span className="w-16 text-right font-mono tabular-nums text-xs text-slate-500 shrink-0">
                      {idx === 0 ? '100.0%' : `${iosStepRate.toFixed(1)}%`}
                    </span>
                  </div>
                )}

                {storeFilter !== 'app_store' && (
                  <div className="flex items-center gap-3">
                    <span className="w-16 text-xs font-medium text-slate-600 shrink-0">Play Store</span>
                    <div className="flex-1 h-5 bg-slate-100 rounded-xs overflow-hidden">
                      <div
                        className="h-full bg-teal-600 transition-all duration-300"
                        style={{ width: `${andWidthPct}%` }}
                      />
                    </div>
                    <span className="w-20 text-right font-mono tabular-nums text-xs font-medium text-slate-900 shrink-0">
                      {formatCompactNumber(andVal)}
                    </span>
                    <span className="w-16 text-right font-mono tabular-nums text-xs text-slate-500 shrink-0">
                      {idx === 0 ? '100.0%' : `${andStepRate.toFixed(1)}%`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
