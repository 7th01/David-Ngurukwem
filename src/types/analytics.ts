export type StoreFilter = 'all' | 'app_store' | 'play_store';
export type StorePlatform = 'app_store' | 'play_store';
export type TimeRange = '7d' | '30d' | '90d';
export type NavSection = 'overview' | 'acquisition' | 'sentiment' | 'aso' | 'insights';

export interface DailyMetricPoint {
  date: string; // YYYY-MM-DD
  appId: string;
  store: StorePlatform;
  impressions: number;
  pageViews: number;
  downloads: number;
  revenue: number; // USD net proceeds
  activeDevices: number;
  day1Activated: number;
  trialStarts: number;
  paidConversions: number;
  crashFreeRate: number; // 0 - 100
  avgRating: number; // 1 - 5
}

export interface AppProfile {
  id: string;
  name: string;
  bundleId: string;
  category: string;
  versionIos: string;
  versionAndroid: string;
  priceModel: string;
  d1RetentionIos: number;
  d1RetentionAndroid: number;
  d30RetentionIos: number;
  d30RetentionAndroid: number;
}

export interface ChannelMetric {
  channel: string;
  store: StorePlatform;
  impressions: number;
  downloads: number;
  conversionRate: number;
  revenue: number;
}

export interface TerritoryMetric {
  country: string;
  code: string;
  store: StorePlatform;
  downloads: number;
  revenue: number;
  conversionRate: number;
  avgRpi: number; // revenue per install
  localizedListing: boolean;
}

export interface ReviewEntry {
  id: string;
  appId: string;
  store: StorePlatform;
  author: string;
  rating: number;
  version: string;
  date: string;
  country: string;
  topic: string;
  title: string;
  body: string;
  replied: boolean;
}

export interface KeywordRanking {
  id: string;
  appId: string;
  keyword: string;
  store: StorePlatform;
  searchVolume: number; // monthly est
  difficulty: number; // 1 - 100
  currentRank: number;
  previousRank: number;
  estMonthlyInstalls: number;
  shareOfVoice: number; // %
}

export interface MetadataAuditCheck {
  id: string;
  appId: string;
  store: StorePlatform;
  field: string;
  currentLength: number;
  recommendedLength: string;
  status: 'optimal' | 'warning' | 'gap';
  finding: string;
  recommendation: string;
}

export type InsightCategory = 'Conversion' | 'Monetization' | 'Retention' | 'ASO' | 'Stability';
export type InsightSeverity = 'critical' | 'opportunity' | 'nominal';
export type InsightStatus = 'pending' | 'in_progress' | 'applied';

export interface ActionableInsight {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  store: StoreFilter;
  appName: string;
  title: string;
  mechanism: string;
  diagnosis: string;
  recommendedAction: string;
  projectedLiftLabel: string;
  projectedDownloadsDelta: number;
  projectedRevenueDelta: number;
  targetSection: NavSection;
}

export interface PortfolioDataset {
  sourceName: string;
  isCustomImport: boolean;
  apps: AppProfile[];
  dailyMetrics: DailyMetricPoint[];
  channels: ChannelMetric[];
  territories: TerritoryMetric[];
  reviews: ReviewEntry[];
  keywords: KeywordRanking[];
  metadataChecks: MetadataAuditCheck[];
}
