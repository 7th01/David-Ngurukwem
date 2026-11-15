import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  BarChart3,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Shield,
  Sparkles,
  Sun,
  Upload,
  UserCog,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AccountSecurityView } from './components/statedge/AccountSecurityView';
import { AdminConsoleView } from './components/statedge/AdminConsoleView';
import { AiAnalystView } from './components/statedge/AiAnalystView';
import { BillingView } from './components/statedge/BillingView';
import { BusinessRegistrationView } from './components/statedge/BusinessRegistrationView';
import { ClientDashboardView } from './components/statedge/ClientDashboardView';
import { DataUploadView } from './components/statedge/DataUploadView';
import { LandingPage } from './components/statedge/LandingPage';
import { ProjectsView } from './components/statedge/ProjectsView';
import { apiRequest, setAuthTokenInMemory } from './lib/apiClient';
import {
  cleanAndCalculateMetrics,
  CleaningAndMappingConfig,
  DEMO_DATASET_ROWS,
  profileDatasetRows,
} from './lib/dataProcessor';
import { auth, googleAuthProvider } from './lib/firebase';
import {
  AnalysisRecord,
  AuditLogRecord,
  BusinessRecord,
  DatasetRecord,
  DbUser,
  PaymentConfigState,
  PaymentRecord,
  PricingPlanRecord,
  ProjectRecord,
  WorkspaceTab,
} from './types/statedge';

const DEFAULT_PAYMENT_CONFIG_STATE: PaymentConfigState = {
  paymentEnabled: true,
  paymentMode: 'development',
  paystackEnabled: true,
  flutterwaveEnabled: true,
  enforcePlanLimits: false,
};

const FALLBACK_PLANS: PricingPlanRecord[] = [
  {
    id: 1,
    slug: 'starter',
    name: 'Starter',
    monthlyPriceNgn: 10000,
    priceLabel: '₦10,000 / month',
    description: 'For emerging retail shops, pharmacies, and solo founders organizing monthly records.',
    maxDatasets: 5,
    maxRowsPerDataset: 5000,
    featuresJson: [
      'Up to 5 active datasets/month',
      'Automated data validation & cleaning',
      'AI-grounded KPI & trend summaries',
      'Branded PDF executive reports',
    ],
    isActive: true,
  },
  {
    id: 2,
    slug: 'business',
    name: 'Business',
    monthlyPriceNgn: 25000,
    priceLabel: '₦25,000 / month',
    description: 'For supermarkets, schools, restaurants, and multi-product Nigerian SMEs.',
    maxDatasets: 25,
    maxRowsPerDataset: 25000,
    featuresJson: [
      'Up to 25 active datasets/month',
      'Full interactive dashboard builder',
      'Anomaly & leakage detection',
      'Priority Statedge analyst project support',
    ],
    isActive: true,
  },
  {
    id: 3,
    slug: 'professional',
    name: 'Professional',
    monthlyPriceNgn: 50000,
    priceLabel: '₦50,000 / month',
    description: 'For distributors, wholesalers, and multi-branch Nigerian enterprises.',
    maxDatasets: 100,
    maxRowsPerDataset: 100000,
    featuresJson: [
      'Up to 100 active datasets/month',
      'Human-reviewed AI executive reports',
      'Multi-branch & product profitability',
      'Dedicated advisory project SLA',
    ],
    isActive: true,
  },
  {
    id: 4,
    slug: 'enterprise',
    name: 'Enterprise',
    monthlyPriceNgn: null,
    priceLabel: 'Custom Pricing',
    description: 'Tailored deployment, ERP connectors, and dedicated Statedge data science team.',
    maxDatasets: 1000,
    maxRowsPerDataset: 500000,
    featuresJson: [
      'Unlimited datasets & custom pipelines',
      'Bespoke executive BI architecture',
      'On-premise / private cloud options',
      'Dedicated data science retainer',
    ],
    isActive: true,
  },
];

function createInitialDemoState(): {
  business: BusinessRecord;
  dataset: DatasetRecord;
  analysis: AnalysisRecord;
} {
  const profile = profileDatasetRows(DEMO_DATASET_ROWS);
  const metrics = cleanAndCalculateMetrics(DEMO_DATASET_ROWS, profile.suggestedMapping, {
    businessName: 'Mainland Retail & Pharmacy (Demonstration)',
    industry: 'Retail & Pharmaceutical',
    datasetName: 'Q2–Q4 2026 Lagos & Abuja Sales Ledger (Demo)',
  });

  const demoBiz: BusinessRecord = {
    id: 0,
    ownerUid: 'demo',
    businessName: 'Mainland Retail & Pharmacy (Demonstration)',
    industry: 'Retail Stores & Supermarkets',
    city: 'Lagos',
    state: 'Lagos',
    rcNumber: 'DEMO-RC-001',
    currency: 'NGN',
    subscriptionTier: 'business',
    monthlyRevenueBand: '₦15M – ₦75M / month',
    createdAt: new Date().toISOString(),
  };

  const demoDataset: DatasetRecord = {
    id: 1,
    businessId: 0,
    ownerUid: 'demo',
    name: 'Q2–Q4 2026 Lagos & Abuja Sales Ledger (Demo)',
    originalFileName: 'Nigerian_Retail_Pharmacy_Demo_Ledger.xlsx',
    fileType: 'xlsx',
    rowCount: DEMO_DATASET_ROWS.length,
    columnCount: profile.columns.length,
    columnsJson: profile.columns,
    qualitySummaryJson: profile.quality,
    rawRowsJson: DEMO_DATASET_ROWS,
    cleanedConfigJson: profile.suggestedMapping,
    isDemo: true,
    createdAt: new Date().toISOString(),
  };

  const demoAnalysis: AnalysisRecord = {
    id: 1,
    datasetId: 1,
    businessId: 0,
    ownerUid: 'demo',
    title: 'Q2–Q4 2026 Lagos & Abuja Sales Ledger — Demonstration Report',
    metricsJson: metrics,
    aiInterpretationJson: {
      calculatedFacts: [
        `Analyzed ${metrics.analyzedRowCount} demonstration records totaling ₦${metrics.totalRevenue.toLocaleString('en-NG')} in revenue and ₦${metrics.totalExpenses.toLocaleString('en-NG')} in recorded expenses.`,
        `Estimated operating profit is ₦${metrics.estimatedProfit.toLocaleString('en-NG')} (${metrics.profitMarginPct.toFixed(1)}% operating margin).`,
        `Top category "${metrics.categoryBreakdown[0]?.category}" accounts for ${metrics.categoryBreakdown[0]?.sharePct.toFixed(1)}% of total revenue.`,
      ],
      assumptions: [
        'This workspace is populated with clearly labeled Demonstration Data for evaluation.',
        'Upload your own .xlsx or .csv file in the Data Upload Centre to analyze live business records.',
      ],
      executiveSummary: `Across ${metrics.totalTransactions} demonstration transactions between ${metrics.dateRangeStart} and ${metrics.dateRangeEnd}, Mainland Retail & Pharmacy generated ₦${metrics.totalRevenue.toLocaleString('en-NG')} in sales with an estimated profit of ₦${metrics.estimatedProfit.toLocaleString('en-NG')} (${metrics.profitMarginPct.toFixed(1)}% margin).`,
      keyFindings: [
        `${metrics.categoryBreakdown[0]?.category} leads turnover at ₦${metrics.categoryBreakdown[0]?.revenue.toLocaleString('en-NG')}, while Pharmaceuticals & OTC delivers stronger unit margin contribution.`,
        `Average transaction value across Lagos (Ikeja, Lekki) and Abuja Wuse II stands at ₦${metrics.avgTransactionValue.toLocaleString('en-NG')}.`,
      ],
      identifiedProblems: [
        'High revenue reliance on staple grains compresses blended gross margin due to wholesale rice cost volatility.',
        metrics.anomalies.length > 0
          ? `${metrics.anomalies.length} high-value transaction outlier(s) flagged for bulk invoice reconciliation.`
          : 'No severe outlier anomalies detected in this sample.',
      ],
      recommendations: [
        {
          priority: 'High',
          title: 'Expand High-Margin OTC & Personal Care Merchandising',
          rationale:
            'Pharmaceuticals & OTC and Personal Care carry higher gross margins than bulk staples.',
          expectedImpact: 'Targets +2.5% to +4.0% blended operating margin lift.',
        },
        {
          priority: 'Medium',
          title: 'Lock Bi-Weekly Supplier Quotes on 50kg Rice & 25L Cooking Oil',
          rationale: 'Staples & Grains drive top-line traffic and cash velocity across all 3 branches.',
          expectedImpact: 'Protects working capital against sudden wholesale price swings.',
        },
      ],
      conclusion:
        'Click "Upload Dataset" to analyze your own Excel or CSV records with Statedge Intelligence, or sign in with Google to save projects and reports.',
      generatedBy: 'deterministic-fallback',
    },
    publishStatus: 'published',
    reviewedByUid: null,
    reviewedNotes: null,
    createdAt: new Date().toISOString(),
  };

  return { business: demoBiz, dataset: demoDataset, analysis: demoAnalysis };
}

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [plans, setPlans] = useState<PricingPlanRecord[]>(FALLBACK_PLANS);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigState>(
    DEFAULT_PAYMENT_CONFIG_STATE
  );

  // Auth & workspace state
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [activeBusiness, setActiveBusiness] = useState<BusinessRecord | null>(null);
  const [showAddBusiness, setShowAddBusiness] = useState(false);

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Client workspace data
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [recentActivities, setRecentActivities] = useState<AuditLogRecord[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Load configurable pricing plans & payment mode
  useEffect(() => {
    fetch('/api/pricing')
      .then((r) => r.json())
      .then((res) => {
        if (Array.isArray(res.plans) && res.plans.length > 0) {
          setPlans(res.plans);
        }
        if (res.paymentConfig) {
          setPaymentConfig(res.paymentConfig);
        }
      })
      .catch(() => {});
  }, []);

  const loadClientWorkspace = async (bizId?: number) => {
    const query = bizId ? `?businessId=${bizId}` : '';
    const res = await apiRequest<{
      business: BusinessRecord | null;
      datasets: DatasetRecord[];
      analyses: AnalysisRecord[];
      projects: ProjectRecord[];
      payments: PaymentRecord[];
      recentActivities?: AuditLogRecord[];
    }>(`/api/client/overview${query}`);

    setActiveBusiness(res.business);
    setDatasets(res.datasets);
    setAnalyses(res.analyses);
    setProjects(res.projects);
    setPayments(res.payments);
    setRecentActivities(res.recentActivities || []);
    setActiveAnalysis(res.analyses[0] || null);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setAuthTokenInMemory(null);
        setDbUser(null);
        setBusinesses([]);
        setActiveBusiness(null);
        setAuthReady(true);
        return;
      }

      try {
        const token = await fbUser.getIdToken();
        setAuthTokenInMemory(token);
        const me = await apiRequest<{
          user: DbUser;
          businesses: BusinessRecord[];
          plans: PricingPlanRecord[];
          paymentConfig?: PaymentConfigState;
        }>('/api/me');

        setDbUser(me.user);
        setBusinesses(me.businesses);
        if (me.plans?.length > 0) setPlans(me.plans);
        if (me.paymentConfig) setPaymentConfig(me.paymentConfig);
        setIsDemoMode(false);

        if (me.businesses.length > 0) {
          await loadClientWorkspace(me.businesses[0].id);
        } else {
          setActiveBusiness(null);
        }
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Unable to sync session.');
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  const handleSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Google Sign-In was cancelled or blocked by popup settings.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setAuthTokenInMemory(null);
    setDbUser(null);
    setActiveBusiness(null);
    setIsDemoMode(false);
    setDatasets([]);
    setAnalyses([]);
    setProjects([]);
    setPayments([]);
    setRecentActivities([]);
    setActiveAnalysis(null);
  };

  const enterDemoWorkspace = () => {
    const demo = createInitialDemoState();
    setIsDemoMode(true);
    setActiveBusiness(demo.business);
    setDatasets([demo.dataset]);
    setAnalyses([demo.analysis]);
    setActiveAnalysis(demo.analysis);
    setProjects([]);
    setPayments([]);
    setRecentActivities([
      {
        id: 1,
        actorUid: 'demo',
        actorEmail: 'demo@statedge.ng',
        actorRole: 'client',
        action: 'GENERATE_AI_ANALYSIS',
        targetType: 'analysis',
        targetId: '1',
        details: 'Loaded Q2–Q4 2026 Lagos & Abuja Sales Ledger demonstration report',
        createdAt: new Date().toISOString(),
      },
    ]);
    setActiveTab('dashboard');
  };

  // Upload + Save + AI Analysis handler (works for both Cloud SQL authenticated clients & Demo Sandbox)
  const handleSaveAndAnalyze = async (payload: {
    name: string;
    originalFileName: string;
    fileType: 'csv' | 'xlsx';
    rows: Record<string, unknown>[];
    cleaningConfig: CleaningAndMappingConfig;
    requestAdminReview: boolean;
    isDemoUpload: boolean;
  }) => {
    setBusy(true);
    setWorkspaceError(null);
    try {
      if (isDemoMode) {
        const res = await apiRequest<{ metrics: AnalysisRecord['metricsJson']; interpretation: AnalysisRecord['aiInterpretationJson'] }>(
          '/api/demo/analyze',
          {
            method: 'POST',
            body: JSON.stringify({
              rows: payload.rows,
              cleaningConfig: payload.cleaningConfig,
              businessName: activeBusiness?.businessName,
              industry: activeBusiness?.industry,
              datasetName: payload.name,
            }),
          },
          false
        );

        const profile = profileDatasetRows(payload.rows);
        const newDs: DatasetRecord = {
          id: Date.now(),
          businessId: 0,
          ownerUid: 'demo',
          name: payload.name,
          originalFileName: payload.originalFileName,
          fileType: payload.fileType,
          rowCount: payload.rows.length,
          columnCount: profile.columns.length,
          columnsJson: profile.columns,
          qualitySummaryJson: profile.quality,
          rawRowsJson: payload.rows,
          cleanedConfigJson: payload.cleaningConfig,
          isDemo: true,
          createdAt: new Date().toISOString(),
        };
        const newAn: AnalysisRecord = {
          id: Date.now() + 1,
          datasetId: newDs.id,
          businessId: 0,
          ownerUid: 'demo',
          title: `${payload.name} — Intelligence Report`,
          metricsJson: res.metrics,
          aiInterpretationJson: res.interpretation,
          publishStatus: 'published',
          reviewedByUid: null,
          reviewedNotes: null,
          createdAt: new Date().toISOString(),
        };
        setDatasets((prev) => [newDs, ...prev]);
        setAnalyses((prev) => [newAn, ...prev]);
        setRecentActivities((prev) => [
          {
            id: Date.now(),
            actorUid: 'demo',
            actorEmail: 'demo@statedge.ng',
            actorRole: 'client',
            action: 'UPLOAD_AND_ANALYZE',
            targetType: 'dataset',
            targetId: String(newDs.id),
            details: `Analyzed "${payload.originalFileName}" (${res.metrics.analyzedRowCount} rows)`,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        setActiveAnalysis(newAn);
        setActiveTab('analyst');
        return;
      }

      if (!activeBusiness) return;
      const dsRes = await apiRequest<{ dataset: DatasetRecord }>('/api/datasets', {
        method: 'POST',
        body: JSON.stringify({
          businessId: activeBusiness.id,
          name: payload.name,
          originalFileName: payload.originalFileName,
          fileType: payload.fileType,
          rows: payload.rows,
          cleaningConfig: payload.cleaningConfig,
          isDemo: payload.isDemoUpload,
        }),
      });

      const anRes = await apiRequest<{ analysis: AnalysisRecord }>(
        `/api/datasets/${dsRes.dataset.id}/analyze`,
        {
          method: 'POST',
          body: JSON.stringify({
            cleaningConfig: payload.cleaningConfig,
            requestAdminReview: payload.requestAdminReview,
          }),
        }
      );

      await loadClientWorkspace(activeBusiness.id);
      setActiveAnalysis(anRes.analysis);
      setActiveTab('analyst');
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : 'Operation failed.');
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleAnalyzeExisting = async (
    ds: DatasetRecord,
    cleaningConfig: CleaningAndMappingConfig,
    requestAdminReview: boolean
  ) => {
    setBusy(true);
    setWorkspaceError(null);
    try {
      if (isDemoMode) {
        const res = await apiRequest<{ metrics: AnalysisRecord['metricsJson']; interpretation: AnalysisRecord['aiInterpretationJson'] }>(
          '/api/demo/analyze',
          {
            method: 'POST',
            body: JSON.stringify({
              rows: ds.rawRowsJson || [],
              cleaningConfig,
              businessName: activeBusiness?.businessName,
              industry: activeBusiness?.industry,
              datasetName: ds.name,
            }),
          },
          false
        );
        const newAn: AnalysisRecord = {
          id: Date.now(),
          datasetId: ds.id,
          businessId: 0,
          ownerUid: 'demo',
          title: `${ds.name} — Updated Analysis`,
          metricsJson: res.metrics,
          aiInterpretationJson: res.interpretation,
          publishStatus: 'published',
          reviewedByUid: null,
          reviewedNotes: null,
          createdAt: new Date().toISOString(),
        };
        setAnalyses((prev) => [newAn, ...prev]);
        setActiveAnalysis(newAn);
        setActiveTab('analyst');
        return;
      }

      const res = await apiRequest<{ analysis: AnalysisRecord }>(
        `/api/datasets/${ds.id}/analyze`,
        {
          method: 'POST',
          body: JSON.stringify({ cleaningConfig, requestAdminReview }),
        }
      );
      if (activeBusiness) await loadClientWorkspace(activeBusiness.id);
      setActiveAnalysis(res.analysis);
      setActiveTab('analyst');
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : 'Unable to re-analyze dataset.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteDataset = async (datasetId: number) => {
    if (isDemoMode || !activeBusiness) return;
    setBusy(true);
    try {
      await apiRequest(`/api/datasets/${datasetId}`, { method: 'DELETE' });
      await loadClientWorkspace(activeBusiness.id);
    } finally {
      setBusy(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-sm text-slate-500">
        Initializing Statedge Intelligence...
      </div>
    );
  }

  // Show Landing Page when not signed in and not in Demo Mode
  if (!dbUser && !isDemoMode) {
    return (
      <LandingPage
        plans={plans}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onSignIn={handleSignIn}
        onEnterDemo={enterDemoWorkspace}
        authLoading={authLoading}
        authError={authError}
      />
    );
  }

  // Signed-in user without a business profile (or adding another business) -> Business Registration flow
  if (dbUser && (!activeBusiness || showAddBusiness)) {
    return (
      <BusinessRegistrationView
        userEmail={dbUser.email}
        userName={dbUser.fullName}
        onRegistered={async (biz) => {
          setBusinesses((prev) => [biz, ...prev.filter((b) => b.id !== biz.id)]);
          setActiveBusiness(biz);
          setShowAddBusiness(false);
          await loadClientWorkspace(biz.id);
        }}
        onSignOut={handleSignOut}
        onCancel={activeBusiness ? () => setShowAddBusiness(false) : undefined}
      />
    );
  }

  if (!activeBusiness) return null;

  const navItems: { id: WorkspaceTab; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Client Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Data Upload Centre', icon: Upload },
    { id: 'analyst', label: 'AI Data Analyst & PDF', icon: Sparkles },
    { id: 'projects', label: 'Projects & Services', icon: FolderKanban },
    { id: 'billing', label: 'Billing & Payments', icon: CreditCard },
    { id: 'account', label: 'Account & Security', icon: UserCog },
    ...(dbUser?.role === 'admin'
      ? [{ id: 'admin' as const, label: 'Statedge Admin', icon: Shield, adminOnly: true }]
      : []),
  ];

  const activeNavLabel = navItems.find((n) => n.id === activeTab)?.label || 'Workspace';

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 240px Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-14 px-5 flex items-center border-b border-slate-200 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="font-display text-base font-bold tracking-tight text-slate-950 dark:text-white whitespace-nowrap"
          >
            Statedge Intelligence
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Workspace navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileNavOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-slate-900 dark:bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-xs space-y-2">
          <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
            {dbUser ? dbUser.fullName : 'Demo Evaluator'}
          </div>
          <div className="text-slate-500 dark:text-slate-400 truncate">
            {dbUser ? `${dbUser.role === 'admin' ? 'Statedge Admin' : 'Business Client'} · ${dbUser.email}` : 'Demonstration Mode'}
          </div>
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {darkMode ? 'Light' : 'Dark'}
            </button>

            <button
              type="button"
              onClick={isDemoMode ? () => setIsDemoMode(false) : handleSignOut}
              className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-red-600"
            >
              <LogOut className="w-3.5 h-3.5" />
              {isDemoMode ? 'Exit Demo' : 'Sign Out'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0 truncate">
              {!isDemoMode && businesses.length > 1 ? (
                <select
                  aria-label="Switch business workspace"
                  value={activeBusiness.id}
                  onChange={(e) => {
                    const nextId = Number(e.target.value);
                    const found = businesses.find((b) => b.id === nextId);
                    if (found) {
                      setActiveBusiness(found);
                      loadClientWorkspace(found.id);
                    }
                  }}
                  className="px-2 py-1 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-200"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.businessName}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {activeBusiness.businessName}
                </span>
              )}
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-slate-900 dark:text-white truncate">
                {activeNavLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isDemoMode ? (
              <button
                type="button"
                onClick={handleSignIn}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md whitespace-nowrap shrink-0"
              >
                <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
                Sign In to Save Cloud Workspace
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowAddBusiness(true)}
                  className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md whitespace-nowrap shrink-0"
                >
                  + Business
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-md whitespace-nowrap shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  New Dataset
                </button>
              </>
            )}
          </div>
        </header>

        {isDemoMode && (
          <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900 px-4 lg:px-8 py-2 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong>Demonstration Mode:</strong> Metrics shown are labeled sample Nigerian retail
              records. Upload your own .xlsx/.csv to test live AI analysis, or sign in with Google to
              persist data in PostgreSQL.
            </span>
          </div>
        )}

        {workspaceError && (
          <div className="mx-4 lg:mx-8 mt-4 px-4 py-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
            {workspaceError}
          </div>
        )}

        <main className="flex-1 p-4 lg:p-8 max-w-[1400px] w-full mx-auto">
          {activeTab === 'dashboard' && (
            <ClientDashboardView
              business={activeBusiness}
              datasets={datasets}
              analyses={analyses}
              projects={projects}
              recentActivities={recentActivities}
              activeAnalysis={activeAnalysis}
              isDemo={isDemoMode}
              onSelectAnalysis={(an) => {
                setActiveAnalysis(an);
              }}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'upload' && (
            <DataUploadView
              datasets={datasets}
              isDemo={isDemoMode}
              busy={busy}
              onSaveAndAnalyze={handleSaveAndAnalyze}
              onAnalyzeExisting={handleAnalyzeExisting}
              onDeleteDataset={handleDeleteDataset}
            />
          )}

          {activeTab === 'analyst' && (
            <AiAnalystView
              business={activeBusiness}
              analyses={analyses}
              activeAnalysis={activeAnalysis}
              isDemo={isDemoMode}
              onSelectAnalysis={setActiveAnalysis}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsView
              businessId={activeBusiness.id}
              datasets={datasets}
              projects={projects}
              isDemo={isDemoMode}
              onProjectCreated={(proj) => setProjects((prev) => [proj, ...prev])}
              onPayProject={() => setActiveTab('billing')}
            />
          )}

          {activeTab === 'billing' && (
            <BillingView
              business={activeBusiness}
              plans={plans}
              payments={payments}
              awaitingProjects={projects.filter(
                (p) => p.status === 'Awaiting Payment' && p.quotedAmountNgn > 0
              )}
              paymentConfig={paymentConfig}
              isDemo={isDemoMode}
              onPaymentUpdated={async () => {
                if (activeBusiness && !isDemoMode) {
                  await loadClientWorkspace(activeBusiness.id);
                }
              }}
            />
          )}

          {activeTab === 'account' && (
            <AccountSecurityView
              key={activeBusiness.id}
              user={dbUser}
              business={activeBusiness}
              isDemo={isDemoMode}
              onProfileUpdated={(u) => setDbUser(u)}
              onBusinessUpdated={(b) => {
                setActiveBusiness(b);
                setBusinesses((prev) => prev.map((x) => (x.id === b.id ? b : x)));
              }}
              onDataPurged={async () => {
                await handleSignOut();
              }}
            />
          )}

          {activeTab === 'admin' && dbUser?.role === 'admin' && (
            <AdminConsoleView onPaymentConfigChanged={setPaymentConfig} />
          )}
        </main>
      </div>
    </div>
  );
}
