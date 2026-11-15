import { useMemo, useState } from 'react';
import { Check, Copy, Search } from 'lucide-react';
import { AppProfile, ReviewEntry, StoreFilter } from '../../types/analytics';

interface SentimentViewProps {
  reviews: ReviewEntry[];
  apps: AppProfile[];
  storeFilter: StoreFilter;
  selectedAppId: string;
}

export function SentimentView({
  reviews,
  apps,
  storeFilter,
  selectedAppId,
}: SentimentViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [starFilter, setStarFilter] = useState<'all' | 'critical' | 'positive'>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scopedReviews = useMemo(() => {
    return reviews.filter(
      (r) =>
        (storeFilter === 'all' || r.store === storeFilter) &&
        (selectedAppId === 'all' || r.appId === selectedAppId)
    );
  }, [reviews, storeFilter, selectedAppId]);

  const starDistribution = useMemo(() => {
    const counts = [5, 4, 3, 2, 1].map((stars) => {
      const count = scopedReviews.filter((r) => r.rating === stars).length;
      const pct = scopedReviews.length > 0 ? (count / scopedReviews.length) * 100 : 0;
      return { stars, count, pct };
    });
    return counts;
  }, [scopedReviews]);

  const topicClusters = useMemo(() => {
    const map = new Map<string, { topic: string; count: number; ratingSum: number; negCount: number }>();
    for (const r of scopedReviews) {
      const existing = map.get(r.topic) ?? { topic: r.topic, count: 0, ratingSum: 0, negCount: 0 };
      existing.count += 1;
      existing.ratingSum += r.rating;
      if (r.rating <= 2) existing.negCount += 1;
      map.set(r.topic, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [scopedReviews]);

  const visibleReviews = useMemo(() => {
    return scopedReviews.filter((r) => {
      if (starFilter === 'critical' && r.rating > 2) return false;
      if (starFilter === 'positive' && r.rating < 4) return false;
      if (selectedTopic !== 'all' && r.topic !== selectedTopic) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.body.toLowerCase().includes(q) ||
          r.topic.toLowerCase().includes(q) ||
          r.version.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [scopedReviews, starFilter, selectedTopic, searchQuery]);

  const avgRating =
    scopedReviews.length > 0
      ? scopedReviews.reduce((a, r) => a + r.rating, 0) / scopedReviews.length
      : 0;
  const replyCoverage =
    scopedReviews.length > 0
      ? (scopedReviews.filter((r) => r.replied).length / scopedReviews.length) * 100
      : 0;

  const copyReplyTemplate = (review: ReviewEntry) => {
    const appName = apps.find((a) => a.id === review.appId)?.name ?? 'the app';
    const template =
      review.rating <= 2
        ? `Hi ${review.author}, thank you for reporting this on ${appName} (${review.version}). Our engineering team is actively investigating the ${review.topic.toLowerCase()} issue and preparing a patch. Please reach out via Support with your device model so we can prioritize your case.`
        : `Thank you for the feedback, ${review.author}! We appreciate you using ${appName} and sharing how ${review.topic.toLowerCase()} works in your workflow.`;
    navigator.clipboard?.writeText(template).catch(() => {});
    setCopiedId(review.id);
    setTimeout(() => setCopiedId((prev) => (prev === review.id ? null : prev)), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Split: Rating Breakdown & Topic Clusters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-baseline justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Star Rating Distribution</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {scopedReviews.length} analyzed store reviews · {replyCoverage.toFixed(0)}% developer reply rate
              </p>
            </div>
            <div className="font-mono tabular-nums text-2xl font-semibold text-slate-900">
              {avgRating.toFixed(2)} ★
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {starDistribution.map((row) => (
              <div key={row.stars} className="flex items-center gap-3 text-xs">
                <span className="w-10 font-mono tabular-nums text-slate-700 shrink-0">
                  {row.stars} ★
                </span>
                <div className="flex-1 h-2.5 bg-slate-100 rounded-xs overflow-hidden">
                  <div
                    className={`h-full ${
                      row.stars >= 4
                        ? 'bg-teal-600'
                        : row.stars === 3
                          ? 'bg-amber-500'
                          : 'bg-red-600'
                    }`}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
                <span className="w-14 text-right font-mono tabular-nums text-slate-600 shrink-0">
                  {row.count} ({row.pct.toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Extracted Sentiment Themes</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any theme row to filter user reviews below
              </p>
            </div>
            {selectedTopic !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedTopic('all')}
                className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap"
              >
                Clear theme filter
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                  <th className="py-2 px-6 whitespace-nowrap">Theme Cluster</th>
                  <th className="py-2 px-4 text-right whitespace-nowrap">Mentions</th>
                  <th className="py-2 px-4 text-right whitespace-nowrap">Avg Rating</th>
                  <th className="py-2 px-6 text-right whitespace-nowrap">Risk Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {topicClusters.map((c) => {
                  const mean = c.ratingSum / c.count;
                  const active = selectedTopic === c.topic;
                  return (
                    <tr
                      key={c.topic}
                      onClick={() => setSelectedTopic(active ? 'all' : c.topic)}
                      className={`cursor-pointer transition-colors ${
                        active ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-6 font-medium text-slate-900">{c.topic}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                        {c.count}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900">
                        {mean.toFixed(1)} ★
                      </td>
                      <td className="py-2.5 px-6 text-right text-xs font-medium whitespace-nowrap">
                        {c.negCount > 0 ? (
                          <span className="text-red-700">{c.negCount} critical (1–2★)</span>
                        ) : (
                          <span className="text-emerald-700">Positive driver</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Searchable Review Feed */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviews, versions, topics..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(
              [
                { id: 'all', label: 'All Ratings' },
                { id: 'critical', label: '1–2★ Critical' },
                { id: 'positive', label: '4–5★ Praise' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStarFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                  starFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {visibleReviews.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No reviews match your current filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleReviews.map((rev) => {
              const appName = apps.find((a) => a.id === rev.appId)?.name ?? rev.appId;
              const isCopied = copiedId === rev.id;
              return (
                <article key={rev.id} className="px-6 py-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span
                        className={`font-mono tabular-nums font-semibold ${
                          rev.rating <= 2
                            ? 'text-red-700'
                            : rev.rating === 3
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                        }`}
                      >
                        {rev.rating}.0 ★
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-800">{appName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{rev.store === 'app_store' ? 'App Store' : 'Google Play'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">v{rev.version}</span>
                      <span aria-hidden="true">·</span>
                      <span>{rev.country}</span>
                      <span aria-hidden="true">·</span>
                      <span>{rev.topic}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{rev.date}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{rev.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{rev.body}</p>
                    <div className="text-xs text-slate-400">
                      By {rev.author} · {rev.replied ? 'Developer replied' : 'Awaiting developer reply'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyReplyTemplate(rev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 self-start"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                        Copied Reply
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        Copy Reply Draft
                      </>
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
