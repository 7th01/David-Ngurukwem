import { useMemo, useState } from 'react';
import { ChannelMetric, StoreFilter, TerritoryMetric } from '../../types/analytics';
import { FunnelSummary, formatCompactNumber, formatCurrency } from '../../utils/analyticsEngine';
import { FunnelComparisonChart } from '../charts/FunnelComparisonChart';

interface AcquisitionViewProps {
  funnels: { app_store: FunnelSummary; play_store: FunnelSummary };
  channels: ChannelMetric[];
  territories: TerritoryMetric[];
  storeFilter: StoreFilter;
}

export function AcquisitionView({
  funnels,
  channels,
  territories,
  storeFilter,
}: AcquisitionViewProps) {
  const [territoryFilter, setTerritoryFilter] = useState<'all' | 'unlocalized'>('all');

  const filteredChannels = useMemo(
    () => channels.filter((c) => storeFilter === 'all' || c.store === storeFilter),
    [channels, storeFilter]
  );

  const filteredTerritories = useMemo(
    () =>
      territories
        .filter((t) => storeFilter === 'all' || t.store === storeFilter)
        .filter((t) => (territoryFilter === 'unlocalized' ? !t.localizedListing : true))
        .sort((a, b) => b.revenue - a.revenue),
    [territories, storeFilter, territoryFilter]
  );

  const totalChannelDownloads = filteredChannels.reduce((a, c) => a + c.downloads, 0) || 1;

  // Compute quantified recoverable installs if Play Store matches 50% of App Store conversion gap
  const iosConv =
    funnels.app_store.pageViews > 0
      ? (funnels.app_store.downloads / funnels.app_store.pageViews) * 100
      : 0;
  const playConv =
    funnels.play_store.pageViews > 0
      ? (funnels.play_store.downloads / funnels.play_store.pageViews) * 100
      : 0;
  const convGap = Math.max(0, iosConv - playConv);
  const recoverableInstalls = Math.round(funnels.play_store.pageViews * ((convGap * 0.5) / 100));

  return (
    <div className="space-y-6">
      {/* Funnel Diagnostics Summary Row */}
      <section className="bg-white border border-slate-200 rounded-lg grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
        <div className="p-5">
          <div className="text-xs text-slate-500">App Store Page-to-Install</div>
          <div className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-slate-900">
            {iosConv.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            {formatCompactNumber(funnels.app_store.downloads)} installs from{' '}
            {formatCompactNumber(funnels.app_store.pageViews)} views
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-slate-500">Play Store Page-to-Install</div>
          <div className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-slate-900">
            {playConv.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            {formatCompactNumber(funnels.play_store.downloads)} installs from{' '}
            {formatCompactNumber(funnels.play_store.pageViews)} views
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-slate-500">Recoverable Funnel Opportunity</div>
          <div className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-teal-700">
            +{formatCompactNumber(recoverableInstalls)} installs
          </div>
          <div className="mt-1 text-xs text-slate-600">
            Closing 50% of {convGap.toFixed(1)} pt Play Store listing gap
          </div>
        </div>
      </section>

      {/* Visual Funnel Comparison */}
      <FunnelComparisonChart funnels={funnels} storeFilter={storeFilter} />

      {/* Channel Attribution Table */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Acquisition Channel Attribution</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Traffic source efficiency across Store Search, Browse, Referrers, and Paid Search Ads
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                <th className="py-2.5 px-6 whitespace-nowrap">Channel</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Store</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Impressions</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Downloads</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Share</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Conv Rate</th>
                <th className="py-2.5 px-6 text-right whitespace-nowrap">Attributed Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredChannels.map((c) => {
                const share = (c.downloads / totalChannelDownloads) * 100;
                return (
                  <tr key={`${c.channel}-${c.store}`} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-6 font-medium text-slate-900">{c.channel}</td>
                    <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {c.store === 'app_store' ? 'App Store' : 'Google Play'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      {formatCompactNumber(c.impressions)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
                      {formatCompactNumber(c.downloads)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      {share.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {c.conversionRate.toFixed(1)}%
                    </td>
                    <td className="py-3 px-6 text-right font-mono tabular-nums font-medium text-slate-900">
                      {formatCurrency(c.revenue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Territory & Localization Opportunity Matrix */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Territory Performance & Localization Gaps
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              High Revenue-Per-Install (RPI) markets with unlocalized metadata represent immediate lift
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            <button
              type="button"
              onClick={() => setTerritoryFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                territoryFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Markets
            </button>
            <button
              type="button"
              onClick={() => setTerritoryFilter('unlocalized')}
              className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                territoryFilter === 'unlocalized'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unlocalized Only
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                <th className="py-2.5 px-6 whitespace-nowrap">Territory</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Store</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Downloads</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Revenue</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">RPI</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Conv %</th>
                <th className="py-2.5 px-6 text-right whitespace-nowrap">Listing Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredTerritories.map((t) => (
                <tr key={`${t.code}-${t.store}`} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-6 font-medium text-slate-900">
                    {t.country} <span className="text-xs font-mono text-slate-400">({t.code})</span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                    {t.store === 'app_store' ? 'App Store' : 'Google Play'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                    {formatCompactNumber(t.downloads)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
                    {formatCurrency(t.revenue)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                    ${t.avgRpi.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                    {t.conversionRate.toFixed(1)}%
                  </td>
                  <td className="py-3 px-6 text-right text-xs font-medium whitespace-nowrap">
                    {t.localizedListing ? (
                      <span className="text-emerald-700">Localized</span>
                    ) : (
                      <span className="text-amber-700">Localization Gap</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
