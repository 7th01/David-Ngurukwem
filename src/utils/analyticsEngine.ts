import {
  ActionableInsight,
  AppProfile,
  DailyMetricPoint,
  PortfolioDataset,
  StoreFilter,
  StorePlatform,
  TimeRange,
} from '../types/analytics';

export interface PeriodKpis {
  downloads: number;
  downloadsDeltaPct: number;
  downloadsIos: number;
  downloadsAndroid: number;
  revenue: number;
  revenueDeltaPct: number;
  revenueIos: number;
  revenueAndroid: number;
  conversionRate: number;
  conversionDeltaPts: number;
  conversionIos: number;
  conversionAndroid: number;
  avgRating: number;
  ratingDelta: number;
  crashFreeRate: number;
  crashFreeDeltaPts: number;
  impressions: number;
  pageViews: number;
  day1Activated: number;
  trialStarts: number;
  paidConversions: number;
}

export interface DailySeriesRow {
  date: string;
  iosDownloads: number;
  androidDownloads: number;
  iosRevenue: number;
  androidRevenue: number;
  iosConversion: number;
  androidConversion: number;
  iosCrashFree: number;
  androidCrashFree: number;
}

export interface AppHealthRow {
  app: AppProfile;
  downloads: number;
  downloadsDeltaPct: number;
  revenue: number;
  conversionRate: number;
  avgRating: number;
  crashFreeRate: number;
  d30Retention: number;
  sparkline: number[];
}

export interface FunnelSummary {
  store: StorePlatform;
  impressions: number;
  pageViews: number;
  downloads: number;
  day1Activated: number;
  trialStarts: number;
  paidConversions: number;
}

function getRangeDays(range: TimeRange): number {
  if (range === '7d') return 7;
  if (range === '30d') return 30;
  return 90;
}

export function getSortedUniqueDates(points: DailyMetricPoint[]): string[] {
  const set = new Set<string>();
  for (const p of points) set.add(p.date);
  return Array.from(set).sort();
}

export function computeKpis(
  dataset: PortfolioDataset,
  storeFilter: StoreFilter,
  timeRange: TimeRange,
  appId: string
): {
  current: PeriodKpis;
  series: DailySeriesRow[];
  appRows: AppHealthRow[];
  funnels: { app_store: FunnelSummary; play_store: FunnelSummary };
} {
  const allDates = getSortedUniqueDates(dataset.dailyMetrics);
  const days = getRangeDays(timeRange);
  const currentDates = allDates.slice(-days);
  const prevStart = Math.max(0, allDates.length - days * 2);
  const prevEnd = Math.max(0, allDates.length - days);
  const prevDates = allDates.slice(prevStart, prevEnd);

  const currentDateSet = new Set(currentDates);
  const prevDateSet = new Set(prevDates);

  const filterPoint = (p: DailyMetricPoint) =>
    (storeFilter === 'all' || p.store === storeFilter) && (appId === 'all' || p.appId === appId);

  const currentPoints = dataset.dailyMetrics.filter((p) => currentDateSet.has(p.date) && filterPoint(p));
  const prevPoints = dataset.dailyMetrics.filter((p) => prevDateSet.has(p.date) && filterPoint(p));

  const agg = (pts: DailyMetricPoint[]) => {
    let downloads = 0;
    let downloadsIos = 0;
    let downloadsAndroid = 0;
    let revenue = 0;
    let revenueIos = 0;
    let revenueAndroid = 0;
    let impressions = 0;
    let pageViews = 0;
    let pvIos = 0;
    let pvAndroid = 0;
    let day1Activated = 0;
    let trialStarts = 0;
    let paidConversions = 0;
    let ratingSum = 0;
    let crashSum = 0;

    for (const p of pts) {
      downloads += p.downloads;
      revenue += p.revenue;
      impressions += p.impressions;
      pageViews += p.pageViews;
      day1Activated += p.day1Activated;
      trialStarts += p.trialStarts;
      paidConversions += p.paidConversions;
      ratingSum += p.avgRating;
      crashSum += p.crashFreeRate;

      if (p.store === 'app_store') {
        downloadsIos += p.downloads;
        revenueIos += p.revenue;
        pvIos += p.pageViews;
      } else {
        downloadsAndroid += p.downloads;
        revenueAndroid += p.revenue;
        pvAndroid += p.pageViews;
      }
    }

    const count = Math.max(1, pts.length);
    return {
      downloads,
      downloadsIos,
      downloadsAndroid,
      revenue,
      revenueIos,
      revenueAndroid,
      impressions,
      pageViews,
      conversionRate: pageViews > 0 ? (downloads / pageViews) * 100 : 0,
      conversionIos: pvIos > 0 ? (downloadsIos / pvIos) * 100 : 0,
      conversionAndroid: pvAndroid > 0 ? (downloadsAndroid / pvAndroid) * 100 : 0,
      avgRating: ratingSum / count,
      crashFreeRate: crashSum / count,
      day1Activated,
      trialStarts,
      paidConversions,
    };
  };

  const cur = agg(currentPoints);
  const prev = agg(prevPoints.length > 0 ? prevPoints : currentPoints);

  const pctChange = (c: number, p: number) => (p > 0 ? ((c - p) / p) * 100 : 0);

  const current: PeriodKpis = {
    downloads: cur.downloads,
    downloadsDeltaPct: pctChange(cur.downloads, prev.downloads),
    downloadsIos: cur.downloadsIos,
    downloadsAndroid: cur.downloadsAndroid,
    revenue: cur.revenue,
    revenueDeltaPct: pctChange(cur.revenue, prev.revenue),
    revenueIos: cur.revenueIos,
    revenueAndroid: cur.revenueAndroid,
    conversionRate: cur.conversionRate,
    conversionDeltaPts: cur.conversionRate - prev.conversionRate,
    conversionIos: cur.conversionIos,
    conversionAndroid: cur.conversionAndroid,
    avgRating: cur.avgRating,
    ratingDelta: cur.avgRating - prev.avgRating,
    crashFreeRate: cur.crashFreeRate,
    crashFreeDeltaPts: cur.crashFreeRate - prev.crashFreeRate,
    impressions: cur.impressions,
    pageViews: cur.pageViews,
    day1Activated: cur.day1Activated,
    trialStarts: cur.trialStarts,
    paidConversions: cur.paidConversions,
  };

  // Build daily chart series (always split by iOS and Android for selected appId)
  const byDate = new Map<string, DailyMetricPoint[]>();
  for (const d of currentDates) byDate.set(d, []);
  for (const p of dataset.dailyMetrics) {
    if (currentDateSet.has(p.date) && (appId === 'all' || p.appId === appId)) {
      byDate.get(p.date)?.push(p);
    }
  }

  const series: DailySeriesRow[] = currentDates.map((date) => {
    const pts = byDate.get(date) || [];
    const iosPts = pts.filter((x) => x.store === 'app_store');
    const andPts = pts.filter((x) => x.store === 'play_store');

    const sum = (arr: DailyMetricPoint[], fn: (x: DailyMetricPoint) => number) =>
      arr.reduce((acc, x) => acc + fn(x), 0);

    const iosDl = sum(iosPts, (x) => x.downloads);
    const andDl = sum(andPts, (x) => x.downloads);
    const iosPv = sum(iosPts, (x) => x.pageViews);
    const andPv = sum(andPts, (x) => x.pageViews);

    return {
      date,
      iosDownloads: iosDl,
      androidDownloads: andDl,
      iosRevenue: sum(iosPts, (x) => x.revenue),
      androidRevenue: sum(andPts, (x) => x.revenue),
      iosConversion: iosPv > 0 ? (iosDl / iosPv) * 100 : 0,
      androidConversion: andPv > 0 ? (andDl / andPv) * 100 : 0,
      iosCrashFree:
        iosPts.length > 0 ? sum(iosPts, (x) => x.crashFreeRate) / iosPts.length : 100,
      androidCrashFree:
        andPts.length > 0 ? sum(andPts, (x) => x.crashFreeRate) / andPts.length : 100,
    };
  });

  // Build per-app health table
  const appRows: AppHealthRow[] = dataset.apps.map((app) => {
    const appCur = dataset.dailyMetrics.filter(
      (p) =>
        currentDateSet.has(p.date) &&
        p.appId === app.id &&
        (storeFilter === 'all' || p.store === storeFilter)
    );
    const appPrev = dataset.dailyMetrics.filter(
      (p) =>
        prevDateSet.has(p.date) &&
        p.appId === app.id &&
        (storeFilter === 'all' || p.store === storeFilter)
    );
    const cAgg = agg(appCur);
    const pAgg = agg(appPrev.length > 0 ? appPrev : appCur);

    // 14-point sparkline from recent dates
    const sparkDates = currentDates.slice(-14);
    const sparkline = sparkDates.map((d) =>
      appCur.filter((x) => x.date === d).reduce((acc, x) => acc + x.downloads, 0)
    );

    const d30Retention =
      storeFilter === 'app_store'
        ? app.d30RetentionIos
        : storeFilter === 'play_store'
          ? app.d30RetentionAndroid
          : (app.d30RetentionIos + app.d30RetentionAndroid) / 2;

    return {
      app,
      downloads: cAgg.downloads,
      downloadsDeltaPct: pctChange(cAgg.downloads, pAgg.downloads),
      revenue: cAgg.revenue,
      conversionRate: cAgg.conversionRate,
      avgRating: cAgg.avgRating,
      crashFreeRate: cAgg.crashFreeRate,
      d30Retention,
      sparkline,
    };
  });

  // Funnels (per store across current dates and selected appId)
  const funnelPoints = dataset.dailyMetrics.filter(
    (p) => currentDateSet.has(p.date) && (appId === 'all' || p.appId === appId)
  );
  const buildFunnel = (store: StorePlatform): FunnelSummary => {
    const pts = funnelPoints.filter((p) => p.store === store);
    return {
      store,
      impressions: pts.reduce((a, x) => a + x.impressions, 0),
      pageViews: pts.reduce((a, x) => a + x.pageViews, 0),
      downloads: pts.reduce((a, x) => a + x.downloads, 0),
      day1Activated: pts.reduce((a, x) => a + x.day1Activated, 0),
      trialStarts: pts.reduce((a, x) => a + x.trialStarts, 0),
      paidConversions: pts.reduce((a, x) => a + x.paidConversions, 0),
    };
  };

  return {
    current,
    series,
    appRows,
    funnels: {
      app_store: buildFunnel('app_store'),
      play_store: buildFunnel('play_store'),
    },
  };
}

export function deriveActionableInsights(
  dataset: PortfolioDataset,
  timeRange: TimeRange
): ActionableInsight[] {
  const insights: ActionableInsight[] = [];
  const allDates = getSortedUniqueDates(dataset.dailyMetrics);
  const days = getRangeDays(timeRange);
  const recentDates = new Set(allDates.slice(-days));

  // 1. Check crash-free anomalies per app & store
  for (const app of dataset.apps) {
    for (const store of ['app_store', 'play_store'] as StorePlatform[]) {
      const pts = dataset.dailyMetrics.filter(
        (p) => recentDates.has(p.date) && p.appId === app.id && p.store === store
      );
      if (pts.length === 0) continue;
      const avgCrash = pts.reduce((a, x) => a + x.crashFreeRate, 0) / pts.length;
      const totalDl = pts.reduce((a, x) => a + x.downloads, 0);
      const totalRev = pts.reduce((a, x) => a + x.revenue, 0);

      if (avgCrash < 98.5) {
        const storeLabel = store === 'app_store' ? 'App Store' : 'Google Play';
        insights.push({
          id: `ins-crash-${app.id}-${store}`,
          category: 'Stability',
          severity: 'critical',
          store,
          appName: app.name,
          title: `${app.name} ${storeLabel} crash-free rate dropped to ${avgCrash.toFixed(2)}%`,
          mechanism: `${storeLabel} Store Ranking & Vitals Threshold`,
          diagnosis: `Crash-free sessions fell below the 98.9% store vitals threshold during the selected ${days}-day window, dragging average rating down and suppressing Explore impressions.`,
          recommendedAction: `Pause staged rollout on latest ${storeLabel} build, isolate top stack trace in PDF/media export pipeline, and ship hotfix release.`,
          projectedLiftLabel: `+${Math.round(totalDl * 0.08).toLocaleString()} installs/period`,
          projectedDownloadsDelta: Math.round(totalDl * 0.08),
          projectedRevenueDelta: Math.round(totalRev * 0.06),
          targetSection: 'sentiment',
        });
      }
    }
  }

  // 2. Check cross-store conversion gap per app
  for (const app of dataset.apps) {
    const iosPts = dataset.dailyMetrics.filter(
      (p) => recentDates.has(p.date) && p.appId === app.id && p.store === 'app_store'
    );
    const andPts = dataset.dailyMetrics.filter(
      (p) => recentDates.has(p.date) && p.appId === app.id && p.store === 'play_store'
    );
    if (iosPts.length === 0 || andPts.length === 0) continue;

    const iosPv = iosPts.reduce((a, x) => a + x.pageViews, 0);
    const iosDl = iosPts.reduce((a, x) => a + x.downloads, 0);
    const andPv = andPts.reduce((a, x) => a + x.pageViews, 0);
    const andDl = andPts.reduce((a, x) => a + x.downloads, 0);
    const andRev = andPts.reduce((a, x) => a + x.revenue, 0);

    const iosConv = iosPv > 0 ? (iosDl / iosPv) * 100 : 0;
    const andConv = andPv > 0 ? (andDl / andPv) * 100 : 0;
    const gap = iosConv - andConv;

    if (gap > 6.5) {
      const recoverableInstalls = Math.round(andPv * ((gap * 0.5) / 100));
      const rpi = andDl > 0 ? andRev / andDl : 0.7;
      insights.push({
        id: `ins-conv-${app.id}`,
        category: 'Conversion',
        severity: 'opportunity',
        store: 'play_store',
        appName: app.name,
        title: `Close ${gap.toFixed(1)} pt Play Store listing conversion gap on ${app.name}`,
        mechanism: `Product Page Views → First-Time Installs`,
        diagnosis: `App Store converts ${iosConv.toFixed(1)}% of store page views vs. ${andConv.toFixed(1)}% on Google Play across ${andPv.toLocaleString()} page views.`,
        recommendedAction: `Run a Google Play Store Listing Experiment testing benefit-led first 2 screenshots and expanding short description from 54 to 78 characters.`,
        projectedLiftLabel: `+${recoverableInstalls.toLocaleString()} installs/period`,
        projectedDownloadsDelta: recoverableInstalls,
        projectedRevenueDelta: Math.round(recoverableInstalls * rpi),
        targetSection: 'acquisition',
      });
    }
  }

  // 3. Check unlocalized high-RPI territories
  const unlocalizedHighRpi = dataset.territories.filter(
    (t) => !t.localizedListing && t.avgRpi >= 1.25
  );
  if (unlocalizedHighRpi.length > 0) {
    const countries = Array.from(new Set(unlocalizedHighRpi.map((t) => t.country))).join(' & ');
    const totalRev = unlocalizedHighRpi.reduce((a, t) => a + t.revenue, 0);
    const totalDl = unlocalizedHighRpi.reduce((a, t) => a + t.downloads, 0);
    insights.push({
      id: 'ins-locale-high-rpi',
      category: 'Monetization',
      severity: 'opportunity',
      store: 'all',
      appName: 'Portfolio-Wide',
      title: `Localize storefronts in ${countries} where RPI averages $${(totalRev / Math.max(1, totalDl)).toFixed(2)}`,
      mechanism: `Territory RPI vs. Listing Conversion`,
      diagnosis: `${countries} generate top-quartile Revenue Per Install ($1.95–$2.18 on iOS) despite unlocalized store metadata keeping page conversion ~12 pts below US/UK.`,
      recommendedAction: `Localize App Store & Play Store titles, keyword fields, and top 4 screenshots into native language with local currency paywall tiers.`,
      projectedLiftLabel: `+$${Math.round(totalRev * 0.22).toLocaleString()} net rev`,
      projectedDownloadsDelta: Math.round(totalDl * 0.24),
      projectedRevenueDelta: Math.round(totalRev * 0.22),
      targetSection: 'acquisition',
    });
  }

  // 4. ASO high-volume striking-distance keywords (rank 6 - 15)
  const strikingKeywords = dataset.keywords.filter(
    (k) => k.currentRank >= 6 && k.currentRank <= 15 && k.searchVolume >= 40000
  );
  if (strikingKeywords.length > 0) {
    const topKw = strikingKeywords.sort((a, b) => b.searchVolume - a.searchVolume)[0];
    const appName = dataset.apps.find((a) => a.id === topKw.appId)?.name ?? 'Target App';
    const estGain = Math.round(topKw.searchVolume * 0.065);
    insights.push({
      id: `ins-aso-${topKw.id}`,
      category: 'ASO',
      severity: 'opportunity',
      store: topKw.store,
      appName,
      title: `Push "${topKw.keyword}" from #${topKw.currentRank} into top 3 (${(topKw.searchVolume / 1000).toFixed(1)}k/mo vol)`,
      mechanism: `Store Search Keyword Velocity & Exact Match Weight`,
      diagnosis: `"${topKw.keyword}" carries ${topKw.searchVolume.toLocaleString()} monthly searches with moderate difficulty (${topKw.difficulty}/100) and ${topKw.shareOfVoice.toFixed(1)}% share of voice.`,
      recommendedAction: `Move exact phrase "${topKw.keyword}" into the primary subtitle/short description and align exact-match search ad bid boost for 14 days.`,
      projectedLiftLabel: `+${estGain.toLocaleString()} organic installs`,
      projectedDownloadsDelta: estGain,
      projectedRevenueDelta: Math.round(estGain * 1.15),
      targetSection: 'aso',
    });
  }

  // 5. Trial-to-paid & onboarding paywall friction
  const onboardingNegatives = dataset.reviews.filter(
    (r) =>
      r.rating <= 3 &&
      (r.topic.toLowerCase().includes('onboarding') || r.topic.toLowerCase().includes('pricing'))
  );
  if (onboardingNegatives.length > 0) {
    insights.push({
      id: 'ins-retention-paywall',
      category: 'Retention',
      severity: 'nominal',
      store: 'play_store',
      appName: 'PulseFlow Focus',
      title: `Shift paywall trigger after first completed focus session on Android`,
      mechanism: `Day-1 Activation → Trial Start Rate`,
      diagnosis: `Play Store D1 retention trails App Store by 6.4 pts (39.8% vs 46.2%), corroborated by 1–2 star reviews citing immediate paywall before testing core timer.`,
      recommendedAction: `Allow 1 free Pomodoro session prior to paywall presentation; display annual plan anchor with localized regional pricing.`,
      projectedLiftLabel: `+$14,800 trial revenue`,
      projectedDownloadsDelta: 1250,
      projectedRevenueDelta: 14800,
      targetSection: 'sentiment',
    });
  }

  return insights;
}

export function formatCompactNumber(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}k`;
  return Math.round(val).toLocaleString();
}

export function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 10_000) return `$${(val / 1_000).toFixed(1)}k`;
  return `$${Math.round(val).toLocaleString()}`;
}

export function generateSampleCsv(): string {
  const headers = [
    'date',
    'app_name',
    'store',
    'impressions',
    'page_views',
    'downloads',
    'revenue',
    'crash_free_rate',
    'avg_rating',
  ].join(',');

  const rows: string[] = [headers];
  const endDate = new Date('2026-11-14T00:00:00Z');
  for (let i = 29; i >= 0; i--) {
    const dt = new Date(endDate.getTime() - i * 86400000).toISOString().slice(0, 10);
    const wave = Math.sin(i * 0.4) * 140;
    const iosDl = Math.round(1650 + wave);
    const andDl = Math.round(2120 + wave * 1.2);
    rows.push(
      `${dt},NovaNote Pro,app_store,${Math.round(iosDl * 9.5)},${Math.round(iosDl / 0.33)},${iosDl},${(iosDl * 1.62).toFixed(2)},99.65,4.78`
    );
    rows.push(
      `${dt},NovaNote Pro,play_store,${Math.round(andDl * 11.2)},${Math.round(andDl / 0.22)},${andDl},${(andDl * 0.84).toFixed(2)},98.12,4.24`
    );
  }
  return rows.join('\n');
}

export function parseStoreCsv(csvText: string, fileName: string, baseDataset: PortfolioDataset): PortfolioDataset {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('CSV must include a header row and at least one data row.');
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);

  const dateIdx = idx('date');
  const appIdx = idx('app_name');
  const storeIdx = idx('store');
  const dlIdx = idx('downloads');
  const revIdx = idx('revenue');

  if (dateIdx === -1 || storeIdx === -1 || dlIdx === -1) {
    throw new Error('Required columns missing: date, store, downloads (optional: app_name, impressions, page_views, revenue, crash_free_rate, avg_rating).');
  }

  const impIdx = idx('impressions');
  const pvIdx = idx('page_views');
  const crashIdx = idx('crash_free_rate');
  const ratingIdx = idx('avg_rating');

  const appMap = new Map<string, AppProfile>();
  const dailyMetrics: DailyMetricPoint[] = [];

  for (let r = 1; r < lines.length; r++) {
    const cols = lines[r].split(',').map((c) => c.trim());
    if (cols.length < 3) continue;

    const date = cols[dateIdx];
    const rawApp = appIdx !== -1 && cols[appIdx] ? cols[appIdx] : 'Imported App';
    const appId = rawApp.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const rawStore = (cols[storeIdx] || '').toLowerCase();
    const store: StorePlatform =
      rawStore.includes('play') || rawStore.includes('android') ? 'play_store' : 'app_store';

    const downloads = Math.max(0, Number(cols[dlIdx]) || 0);
    const revenue = revIdx !== -1 ? Math.max(0, Number(cols[revIdx]) || 0) : downloads * 1.1;
    const pageViews =
      pvIdx !== -1 && Number(cols[pvIdx]) > 0
        ? Number(cols[pvIdx])
        : Math.round(downloads / (store === 'app_store' ? 0.31 : 0.23));
    const impressions =
      impIdx !== -1 && Number(cols[impIdx]) > 0 ? Number(cols[impIdx]) : Math.round(pageViews * 3.4);
    const crashFreeRate =
      crashIdx !== -1 && Number(cols[crashIdx]) > 0 ? Math.min(100, Number(cols[crashIdx])) : 99.2;
    const avgRating =
      ratingIdx !== -1 && Number(cols[ratingIdx]) > 0
        ? Math.min(5, Math.max(1, Number(cols[ratingIdx])))
        : 4.5;

    if (!appMap.has(appId)) {
      appMap.set(appId, {
        id: appId,
        name: rawApp,
        bundleId: `com.imported.${appId}`,
        category: 'Imported Portfolio',
        versionIos: '1.0.0',
        versionAndroid: '1.0.0',
        priceModel: 'Custom CSV Import',
        d1RetentionIos: 44.5,
        d1RetentionAndroid: 39.2,
        d30RetentionIos: 17.8,
        d30RetentionAndroid: 14.1,
      });
    }

    const d1 = Math.round(downloads * (store === 'app_store' ? 0.44 : 0.39));
    const trials = Math.round(d1 * 0.22);
    const paid = Math.round(trials * 0.35);

    dailyMetrics.push({
      date,
      appId,
      store,
      impressions,
      pageViews,
      downloads,
      revenue,
      activeDevices: Math.round(downloads * 14),
      day1Activated: d1,
      trialStarts: trials,
      paidConversions: paid,
      crashFreeRate,
      avgRating,
    });
  }

  if (dailyMetrics.length === 0) {
    throw new Error('No valid metric rows could be parsed from the file.');
  }

  return {
    ...baseDataset,
    sourceName: `${fileName} (${dailyMetrics.length} rows imported)`,
    isCustomImport: true,
    apps: Array.from(appMap.values()),
    dailyMetrics: dailyMetrics.sort((a, b) => a.date.localeCompare(b.date)),
  };
}
