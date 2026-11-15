import {
  AppProfile,
  ChannelMetric,
  DailyMetricPoint,
  KeywordRanking,
  MetadataAuditCheck,
  PortfolioDataset,
  ReviewEntry,
  TerritoryMetric,
} from '../types/analytics';

const APPS: AppProfile[] = [
  {
    id: 'pulseflow',
    name: 'PulseFlow Focus',
    bundleId: 'com.statedge.pulseflow',
    category: 'Productivity',
    versionIos: '4.12.0',
    versionAndroid: '4.11.4',
    priceModel: 'Freemium · $6.99/mo',
    d1RetentionIos: 46.2,
    d1RetentionAndroid: 39.8,
    d30RetentionIos: 18.4,
    d30RetentionAndroid: 13.9,
  },
  {
    id: 'finledger',
    name: 'FinLedger Budget',
    bundleId: 'com.statedge.finledger',
    category: 'Finance',
    versionIos: '3.8.2',
    versionAndroid: '3.8.0',
    priceModel: 'Freemium · $49.99/yr',
    d1RetentionIos: 51.4,
    d1RetentionAndroid: 47.1,
    d30RetentionIos: 24.8,
    d30RetentionAndroid: 21.2,
  },
  {
    id: 'trailcast',
    name: 'TrailCast Alpine',
    bundleId: 'com.statedge.trailcast',
    category: 'Weather & Outdoors',
    versionIos: '2.9.1',
    versionAndroid: '2.9.0',
    priceModel: 'Freemium · $29.99/yr',
    d1RetentionIos: 42.7,
    d1RetentionAndroid: 41.3,
    d30RetentionIos: 16.5,
    d30RetentionAndroid: 15.8,
  },
  {
    id: 'scanvault',
    name: 'ScanVault OCR',
    bundleId: 'com.statedge.scanvault',
    category: 'Utilities',
    versionIos: '5.3.0',
    versionAndroid: '5.2.7',
    priceModel: 'Freemium · $4.99/mo',
    d1RetentionIos: 38.9,
    d1RetentionAndroid: 35.4,
    d30RetentionIos: 14.2,
    d30RetentionAndroid: 11.6,
  },
];

// Deterministic pseudo-random helper so data is crisp, reproducible, and realistic
function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function generateDailyMetrics(): DailyMetricPoint[] {
  const points: DailyMetricPoint[] = [];
  // Anchor end date to 2026-11-14 (current date from environment)
  const endDate = new Date('2026-11-14T00:00:00Z');
  const totalDays = 90;

  const appConfigs: Record<
    string,
    {
      iosDownloads: number;
      androidDownloads: number;
      iosConv: number;
      androidConv: number;
      iosArpi: number;
      androidArpi: number;
      iosRating: number;
      androidRating: number;
      iosCrashFree: number;
      androidCrashFree: number;
    }
  > = {
    pulseflow: {
      iosDownloads: 1420,
      androidDownloads: 1890,
      iosConv: 0.31,
      androidConv: 0.215, // noticeable Play Store conversion gap for actionable insight
      iosArpi: 1.42,
      androidArpi: 0.78,
      iosRating: 4.72,
      androidRating: 4.18,
      iosCrashFree: 99.62,
      androidCrashFree: 98.45,
    },
    finledger: {
      iosDownloads: 960,
      androidDownloads: 1140,
      iosConv: 0.345,
      androidConv: 0.285,
      iosArpi: 2.38,
      androidArpi: 1.44,
      iosRating: 4.81,
      androidRating: 4.64,
      iosCrashFree: 99.78,
      androidCrashFree: 99.41,
    },
    trailcast: {
      iosDownloads: 710,
      androidDownloads: 820,
      iosConv: 0.282,
      androidConv: 0.264,
      iosArpi: 1.24,
      androidArpi: 0.91,
      iosRating: 4.56,
      androidRating: 4.49,
      iosCrashFree: 99.51,
      androidCrashFree: 99.18,
    },
    scanvault: {
      iosDownloads: 880,
      androidDownloads: 1310,
      iosConv: 0.268,
      androidConv: 0.238,
      iosArpi: 1.05,
      androidArpi: 0.61,
      iosRating: 4.44,
      androidRating: 4.06,
      iosCrashFree: 99.12,
      androidCrashFree: 97.82,
    },
  };

  for (let d = totalDays - 1; d >= 0; d--) {
    const dt = new Date(endDate.getTime() - d * 86400000);
    const dateStr = dt.toISOString().slice(0, 10);
    const dayIndex = totalDays - 1 - d; // 0 .. 89
    const dayOfWeek = dt.getUTCDay(); // 0 Sun, 6 Sat
    const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 1.14 : 0.96;
    const growthSlope = 1 + (dayIndex / 90) * 0.14;

    APPS.forEach((app, appIdx) => {
      const cfg = appConfigs[app.id];
      const n1 = seededNoise(dayIndex * 13 + appIdx * 7 + 1);
      const n2 = seededNoise(dayIndex * 19 + appIdx * 11 + 3);

      // Simulate a recent 10-day Android crash spike & rating dip on ScanVault + Play Store listing drop on PulseFlow
      const recentPlayDrop = app.id === 'pulseflow' && dayIndex >= 72 ? 0.84 : 1.0;
      const scanVaultCrashDip = app.id === 'scanvault' && dayIndex >= 78 ? 1.85 : 0;

      // App Store row
      const iosDl = Math.round(cfg.iosDownloads * weekendFactor * growthSlope * (0.9 + n1 * 0.2));
      const iosConv = Number((cfg.iosConv * (0.95 + n2 * 0.1)).toFixed(4));
      const iosPv = Math.round(iosDl / iosConv);
      const iosImp = Math.round(iosPv * (3.1 + n1 * 0.45));
      const iosRev = Number((iosDl * cfg.iosArpi * (0.92 + n2 * 0.18)).toFixed(2));
      const iosD1 = Math.round(iosDl * (app.d1RetentionIos / 100));
      const iosTrials = Math.round(iosD1 * 0.24);
      const iosPaid = Math.round(iosTrials * 0.39);

      points.push({
        date: dateStr,
        appId: app.id,
        store: 'app_store',
        impressions: iosImp,
        pageViews: iosPv,
        downloads: iosDl,
        revenue: iosRev,
        activeDevices: Math.round(iosDl * 14.5 + dayIndex * 28),
        day1Activated: iosD1,
        trialStarts: iosTrials,
        paidConversions: iosPaid,
        crashFreeRate: Number((cfg.iosCrashFree - n1 * 0.18).toFixed(2)),
        avgRating: Number(Math.min(5, cfg.iosRating + (n2 - 0.5) * 0.08).toFixed(2)),
      });

      // Play Store row
      const andDl = Math.round(
        cfg.androidDownloads * weekendFactor * growthSlope * recentPlayDrop * (0.89 + n2 * 0.22)
      );
      const andConv = Number((cfg.androidConv * recentPlayDrop * (0.94 + n1 * 0.12)).toFixed(4));
      const andPv = Math.round(andDl / andConv);
      const andImp = Math.round(andPv * (3.6 + n2 * 0.5));
      const andRev = Number((andDl * cfg.androidArpi * (0.9 + n1 * 0.2)).toFixed(2));
      const andD1 = Math.round(andDl * (app.d1RetentionAndroid / 100));
      const andTrials = Math.round(andD1 * 0.19);
      const andPaid = Math.round(andTrials * 0.31);

      points.push({
        date: dateStr,
        appId: app.id,
        store: 'play_store',
        impressions: andImp,
        pageViews: andPv,
        downloads: andDl,
        revenue: andRev,
        activeDevices: Math.round(andDl * 16.2 + dayIndex * 34),
        day1Activated: andD1,
        trialStarts: andTrials,
        paidConversions: andPaid,
        crashFreeRate: Number((cfg.androidCrashFree - scanVaultCrashDip - n2 * 0.24).toFixed(2)),
        avgRating: Number(
          Math.max(3.2, cfg.androidRating - scanVaultCrashDip * 0.16 + (n1 - 0.5) * 0.1).toFixed(2)
        ),
      });
    });
  }

  return points;
}

const CHANNELS: ChannelMetric[] = [
  {
    channel: 'Store Search (ASO)',
    store: 'app_store',
    impressions: 2410000,
    downloads: 184200,
    conversionRate: 33.4,
    revenue: 289400,
  },
  {
    channel: 'Store Search (ASO)',
    store: 'play_store',
    impressions: 3120000,
    downloads: 218400,
    conversionRate: 25.1,
    revenue: 174900,
  },
  {
    channel: 'Browse & Explore',
    store: 'app_store',
    impressions: 1290000,
    downloads: 61800,
    conversionRate: 18.6,
    revenue: 86200,
  },
  {
    channel: 'Browse & Explore',
    store: 'play_store',
    impressions: 1840000,
    downloads: 109500,
    conversionRate: 16.2,
    revenue: 64100,
  },
  {
    channel: 'Paid Search Ads',
    store: 'app_store',
    impressions: 640000,
    downloads: 52400,
    conversionRate: 39.2,
    revenue: 112800,
  },
  {
    channel: 'Paid Search Ads',
    store: 'play_store',
    impressions: 890000,
    downloads: 68200,
    conversionRate: 29.8,
    revenue: 79400,
  },
  {
    channel: 'App Referrer',
    store: 'app_store',
    impressions: 420000,
    downloads: 34900,
    conversionRate: 36.1,
    revenue: 51300,
  },
  {
    channel: 'App Referrer',
    store: 'play_store',
    impressions: 510000,
    downloads: 39800,
    conversionRate: 28.4,
    revenue: 33200,
  },
  {
    channel: 'Web Referrer',
    store: 'app_store',
    impressions: 295000,
    downloads: 24100,
    conversionRate: 41.8,
    revenue: 44600,
  },
  {
    channel: 'Web Referrer',
    store: 'play_store',
    impressions: 380000,
    downloads: 29400,
    conversionRate: 34.5,
    revenue: 28900,
  },
];

const TERRITORIES: TerritoryMetric[] = [
  { country: 'United States', code: 'US', store: 'app_store', downloads: 142800, revenue: 284100, conversionRate: 33.8, avgRpi: 1.99, localizedListing: true },
  { country: 'United States', code: 'US', store: 'play_store', downloads: 121400, revenue: 148200, conversionRate: 26.4, avgRpi: 1.22, localizedListing: true },
  { country: 'United Kingdom', code: 'GB', store: 'app_store', downloads: 46200, revenue: 81400, conversionRate: 31.2, avgRpi: 1.76, localizedListing: true },
  { country: 'United Kingdom', code: 'GB', store: 'play_store', downloads: 38900, revenue: 41200, conversionRate: 24.8, avgRpi: 1.06, localizedListing: true },
  { country: 'Germany', code: 'DE', store: 'app_store', downloads: 39400, revenue: 64900, conversionRate: 28.9, avgRpi: 1.65, localizedListing: true },
  { country: 'Germany', code: 'DE', store: 'play_store', downloads: 51200, revenue: 49800, conversionRate: 23.1, avgRpi: 0.97, localizedListing: true },
  { country: 'Japan', code: 'JP', store: 'app_store', downloads: 31800, revenue: 69200, conversionRate: 19.4, avgRpi: 2.18, localizedListing: false },
  { country: 'Japan', code: 'JP', store: 'play_store', downloads: 24600, revenue: 31400, conversionRate: 16.8, avgRpi: 1.28, localizedListing: false },
  { country: 'Brazil', code: 'BR', store: 'app_store', downloads: 19200, revenue: 14100, conversionRate: 21.5, avgRpi: 0.73, localizedListing: true },
  { country: 'Brazil', code: 'BR', store: 'play_store', downloads: 68400, revenue: 28900, conversionRate: 22.9, avgRpi: 0.42, localizedListing: true },
  { country: 'Canada', code: 'CA', store: 'app_store', downloads: 28100, revenue: 49800, conversionRate: 32.1, avgRpi: 1.77, localizedListing: true },
  { country: 'Canada', code: 'CA', store: 'play_store', downloads: 22400, revenue: 24900, conversionRate: 25.3, avgRpi: 1.11, localizedListing: true },
  { country: 'South Korea', code: 'KR', store: 'app_store', downloads: 21400, revenue: 41800, conversionRate: 17.9, avgRpi: 1.95, localizedListing: false },
  { country: 'South Korea', code: 'KR', store: 'play_store', downloads: 34900, revenue: 36100, conversionRate: 18.2, avgRpi: 1.03, localizedListing: false },
  { country: 'India', code: 'IN', store: 'app_store', downloads: 14900, revenue: 8400, conversionRate: 20.1, avgRpi: 0.56, localizedListing: true },
  { country: 'India', code: 'IN', store: 'play_store', downloads: 94200, revenue: 21600, conversionRate: 24.4, avgRpi: 0.23, localizedListing: true },
];

const REVIEWS: ReviewEntry[] = [
  {
    id: 'rev-101',
    appId: 'scanvault',
    store: 'play_store',
    author: 'Marcus V.',
    rating: 1,
    version: '5.2.7',
    date: '2026-11-13',
    country: 'US',
    topic: 'Camera & Crash Stability',
    title: 'Crashes immediately when batch scanning multi-page PDFs',
    body: 'Ever since updating to 5.2.7 on Pixel 9, tapping save after 4 pages closes the app and loses the scan queue.',
    replied: false,
  },
  {
    id: 'rev-102',
    appId: 'pulseflow',
    store: 'play_store',
    author: 'Hannah K.',
    rating: 2,
    version: '4.11.4',
    date: '2026-11-12',
    country: 'DE',
    topic: 'Onboarding Friction',
    title: 'Paywall blocks me before I can even test one focus timer',
    body: 'Downloaded for Pomodoro tracking but hit an aggressive subscription screen before seeing the main workspace.',
    replied: false,
  },
  {
    id: 'rev-103',
    appId: 'finledger',
    store: 'app_store',
    author: 'Devon R.',
    rating: 5,
    version: '3.8.2',
    date: '2026-11-12',
    country: 'US',
    topic: 'Bank Sync & Speed',
    title: 'Fastest CSV import and category rules on iOS',
    body: 'Switched from two bloated budget apps. Auto-categorization and monthly cashflow breakdown are instant.',
    replied: true,
  },
  {
    id: 'rev-104',
    appId: 'pulseflow',
    store: 'app_store',
    author: 'Kenji T.',
    rating: 3,
    version: '4.12.0',
    date: '2026-11-11',
    country: 'JP',
    topic: 'Localization & Copy',
    title: 'App works well but store screenshots and widgets are English only',
    body: 'Japanese date formatting on the lock screen widget shows US month/day order and half the settings remain untranslated.',
    replied: false,
  },
  {
    id: 'rev-105',
    appId: 'scanvault',
    store: 'play_store',
    author: 'Priya S.',
    rating: 2,
    version: '5.2.7',
    date: '2026-11-10',
    country: 'IN',
    topic: 'Camera & Crash Stability',
    title: 'OCR export hangs on Android 15 devices',
    body: 'Single page works fine, anything above 6MB fails during PDF compression.',
    replied: false,
  },
  {
    id: 'rev-106',
    appId: 'trailcast',
    store: 'app_store',
    author: 'Claire M.',
    rating: 5,
    version: '2.9.1',
    date: '2026-11-09',
    country: 'CA',
    topic: 'Offline Mode',
    title: 'Saved us on a backcountry ridge with zero signal',
    body: 'Pre-cached elevation wind forecasts and offline topo overlays worked flawlessly without cell service.',
    replied: true,
  },
  {
    id: 'rev-107',
    appId: 'finledger',
    store: 'play_store',
    author: 'Lucas B.',
    rating: 4,
    version: '3.8.0',
    date: '2026-11-08',
    country: 'BR',
    topic: 'Subscription Pricing',
    title: 'Great ledger, wish regional annual pricing matched local tiers',
    body: 'Love the recurring bill alerts, though annual plan conversion in BRL feels steep compared to monthly.',
    replied: true,
  },
  {
    id: 'rev-108',
    appId: 'pulseflow',
    store: 'app_store',
    author: 'Elena W.',
    rating: 5,
    version: '4.12.0',
    date: '2026-11-07',
    country: 'GB',
    topic: 'Calendar & Widget Sync',
    title: 'Live Activities focus timer is effortless',
    body: 'Syncs straight to macOS and keeps deep work blocks organized without noisy notifications.',
    replied: true,
  },
  {
    id: 'rev-109',
    appId: 'scanvault',
    store: 'app_store',
    author: 'Noah P.',
    rating: 4,
    version: '5.3.0',
    date: '2026-11-06',
    country: 'US',
    topic: 'OCR Accuracy',
    title: 'Sharp edge detection on receipts and contracts',
    body: 'Searchable PDF indexing is very accurate, just wish folder bulk rename was one tap.',
    replied: false,
  },
  {
    id: 'rev-110',
    appId: 'trailcast',
    store: 'play_store',
    author: 'Min-jun L.',
    rating: 3,
    version: '2.9.0',
    date: '2026-11-05',
    country: 'KR',
    topic: 'Localization & Copy',
    title: 'Accurate mountain forecasts, needs Korean trail labels',
    body: 'Weather radar is reliable, but regional trailhead names and store description are not localized.',
    replied: false,
  },
];

const KEYWORDS: KeywordRanking[] = [
  { id: 'kw-1', appId: 'pulseflow', keyword: 'pomodoro focus timer', store: 'app_store', searchVolume: 64200, difficulty: 62, currentRank: 3, previousRank: 5, estMonthlyInstalls: 8420, shareOfVoice: 18.4 },
  { id: 'kw-2', appId: 'pulseflow', keyword: 'pomodoro focus timer', store: 'play_store', searchVolume: 82400, difficulty: 68, currentRank: 8, previousRank: 6, estMonthlyInstalls: 5910, shareOfVoice: 9.2 },
  { id: 'kw-3', appId: 'pulseflow', keyword: 'deep work habit tracker', store: 'app_store', searchVolume: 38900, difficulty: 44, currentRank: 2, previousRank: 4, estMonthlyInstalls: 6140, shareOfVoice: 24.1 },
  { id: 'kw-4', appId: 'pulseflow', keyword: 'adhd routine planner', store: 'play_store', searchVolume: 71500, difficulty: 49, currentRank: 12, previousRank: 19, estMonthlyInstalls: 4320, shareOfVoice: 6.4 },
  { id: 'kw-5', appId: 'finledger', keyword: 'zero based budget app', store: 'app_store', searchVolume: 48600, difficulty: 57, currentRank: 4, previousRank: 4, estMonthlyInstalls: 5280, shareOfVoice: 15.8 },
  { id: 'kw-6', appId: 'finledger', keyword: 'expense tracker csv', store: 'play_store', searchVolume: 53400, difficulty: 41, currentRank: 2, previousRank: 3, estMonthlyInstalls: 7850, shareOfVoice: 27.6 },
  { id: 'kw-7', appId: 'finledger', keyword: 'monthly bill organizer', store: 'app_store', searchVolume: 41200, difficulty: 52, currentRank: 9, previousRank: 14, estMonthlyInstalls: 3110, shareOfVoice: 8.7 },
  { id: 'kw-8', appId: 'scanvault', keyword: 'pdf scanner ocr', store: 'app_store', searchVolume: 112000, difficulty: 81, currentRank: 7, previousRank: 7, estMonthlyInstalls: 9240, shareOfVoice: 11.3 },
  { id: 'kw-9', appId: 'scanvault', keyword: 'document scanner no watermark', store: 'play_store', searchVolume: 96400, difficulty: 54, currentRank: 4, previousRank: 9, estMonthlyInstalls: 11400, shareOfVoice: 16.9 },
  { id: 'kw-10', appId: 'trailcast', keyword: 'offline mountain weather', store: 'app_store', searchVolume: 27800, difficulty: 34, currentRank: 1, previousRank: 2, estMonthlyInstalls: 4650, shareOfVoice: 34.2 },
  { id: 'kw-11', appId: 'trailcast', keyword: 'hiking wind forecast', store: 'play_store', searchVolume: 31900, difficulty: 37, currentRank: 3, previousRank: 5, estMonthlyInstalls: 4120, shareOfVoice: 19.5 },
];

const METADATA_CHECKS: MetadataAuditCheck[] = [
  {
    id: 'meta-1',
    appId: 'pulseflow',
    store: 'play_store',
    field: 'Short Description & Feature Graphic',
    currentLength: 54,
    recommendedLength: '72–80 chars',
    status: 'warning',
    finding: 'Underutilized 26 chars in Play Store short description; missing "ADHD routine" high-intent keyword.',
    recommendation: 'Expand short description to 78 chars targeting "adhd routine planner" and refresh first 2 screenshots to show timer before paywall.',
  },
  {
    id: 'meta-2',
    appId: 'pulseflow',
    store: 'app_store',
    field: 'App Store Title + Subtitle',
    currentLength: 58,
    recommendedLength: '55–60 chars (30+30)',
    status: 'optimal',
    finding: 'Full 30-char title and 28-char subtitle utilized with zero duplicate keywords across keyword field.',
    recommendation: 'Maintain current EN-US structure; replicate localized keyword matrix for JP and KR storefronts.',
  },
  {
    id: 'meta-3',
    appId: 'scanvault',
    store: 'play_store',
    field: 'Android Vitals & Release Notes',
    currentLength: 140,
    recommendedLength: 'Crash rate < 1.09%',
    status: 'gap',
    finding: 'Crash rate on Android 15 (v5.2.7) reached 2.18%—exceeding Play Store bad behavior threshold and suppressing Explore visibility.',
    recommendation: 'Halt staged rollout of v5.2.7, patch multi-page bitmap OOM in PDF exporter, and ship hotfix v5.2.8.',
  },
  {
    id: 'meta-4',
    appId: 'finledger',
    store: 'app_store',
    field: 'In-App Events & Promo Video',
    currentLength: 0,
    recommendedLength: '15–30s App Preview',
    status: 'warning',
    finding: 'No App Preview video or active In-App Event configured ahead of Q4 financial planning surge.',
    recommendation: 'Publish a 20s App Preview highlighting instant CSV bank import to lift product page conversion by ~4.2%.',
  },
  {
    id: 'meta-5',
    appId: 'trailcast',
    store: 'app_store',
    field: 'Storefront Localization (JP / KR)',
    currentLength: 0,
    recommendedLength: 'Localized Title & Screenshots',
    status: 'gap',
    finding: 'Japan and South Korea show 2.1x higher RPI ($2.18) than global avg, yet listings remain EN-only with 18.6% conversion.',
    recommendation: 'Localize metadata and top 4 screenshots into Japanese and Korean to capture high-LTV outdoor subscribers.',
  },
];

export const DEFAULT_DATASET: PortfolioDataset = {
  sourceName: 'StatEdge Connected Portfolio (4 Apps · iOS + Android)',
  isCustomImport: false,
  apps: APPS,
  dailyMetrics: generateDailyMetrics(),
  channels: CHANNELS,
  territories: TERRITORIES,
  reviews: REVIEWS,
  keywords: KEYWORDS,
  metadataChecks: METADATA_CHECKS,
};
