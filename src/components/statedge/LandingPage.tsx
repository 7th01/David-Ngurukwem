import { ArrowRight, Check, Moon, ShieldCheck, Sun } from 'lucide-react';
import { PricingPlanRecord } from '../../types/statedge';

interface LandingPageProps {
  plans: PricingPlanRecord[];
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onSignIn: () => void;
  onEnterDemo: () => void;
  authLoading: boolean;
  authError: string | null;
}

const SECTORS = [
  {
    num: '01.',
    title: 'Retail Stores & Supermarkets',
    outcome:
      'Track branch turnover, detect slow-moving stock, and monitor daily POS vs. cash reconciliation.',
  },
  {
    num: '02.',
    title: 'Pharmaceutical Businesses',
    outcome:
      'Monitor OTC vs. prescription margins, flag supplier cost inflation, and identify high-velocity SKUs.',
  },
  {
    num: '03.',
    title: 'Distributors & Wholesalers',
    outcome:
      'Analyze bulk order concentration, regional route profitability, and anomalous credit invoices.',
  },
  {
    num: '04.',
    title: 'Schools, Restaurants & SMEs',
    outcome:
      'Turn term fee ledgers, daily kitchen expenses, and spreadsheet records into clear cashflow forecasts.',
  },
];

export function LandingPage({
  plans,
  darkMode,
  onToggleDarkMode,
  onSignIn,
  onEnterDemo,
  authLoading,
  authError,
}: LandingPageProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-slate-950 dark:text-white whitespace-nowrap shrink-0"
          >
            Statedge Intelligence
          </a>

          <nav
            aria-label="Landing navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            <a
              href="#capabilities"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Platform
            </a>
            <a
              href="#industries"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Industries
            </a>
            <a
              href="#pricing"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Pricing
            </a>
            <a
              href="#security"
              className="hover:text-slate-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Security
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onSignIn}
              disabled={authLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {authLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-16 pb-14 lg:pt-24 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-blue-700 dark:text-cyan-400">
                  Statedge Data Analytics · Nigeria
                </span>
                <span aria-hidden="true">·</span>
                <span>Turning Data into Better Decisions</span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white underline-offset-4 hover:underline"
                >
                  {darkMode ? (
                    <>
                      <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                      Light theme
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                      Dark theme
                    </>
                  )}
                </button>
              </div>

              <h1
                className="font-display font-bold tracking-tight text-slate-950 dark:text-white leading-[1.1] max-w-3xl"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
              >
                Business intelligence built for Nigerian enterprises without a full-time data team.
              </h1>

              <p className="text-base lg:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Upload Excel or CSV sales and expense records, validate data quality automatically,
                explore interactive financial dashboards, and generate executive PDF reports backed by
                verifiable calculations and Statedge analyst review.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onSignIn}
                  disabled={authLoading}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
                >
                  {authLoading ? 'Connecting...' : 'Sign In with Google'}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={onEnterDemo}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  Explore Live Demo Workspace
                </button>
              </div>

              {authError && (
                <div
                  role="alert"
                  className="max-w-xl text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-4 py-2.5"
                >
                  {authError}
                </div>
              )}
            </div>

            {/* Mechanism-to-Outcome Proof Panel */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                End-to-End Analytical Workflow
              </div>
              <ol className="space-y-4 text-sm">
                <li className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    1. Upload .xlsx or .csv Records
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Automatic duplicate detection, missing-cell counts, and non-destructive cleaning.
                  </div>
                </li>
                <li className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    2. Grounded AI Interpretation
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Separates calculated facts, assumptions, anomalies, and Naira recommendations.
                  </div>
                </li>
                <li>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    3. Branded PDF & Advisory Delivery
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Export 9-section board reports or commission Statedge analysts for bespoke projects.
                  </div>
                </li>
              </ol>
            </div>
          </div>

          {/* 4-Column Quantitative Strip */}
          <div className="mt-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
            <div className="p-5">
              <div className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-white">
                .xlsx + .csv
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Direct spreadsheet validation & column profiling
              </div>
            </div>
            <div className="p-5">
              <div className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-white">
                0% Hallucinated
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                AI strictly cites calculated database metrics
              </div>
            </div>
            <div className="p-5">
              <div className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-white">
                ₦10,000 / mo
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Starter access built for Nigerian SMEs
              </div>
            </div>
            <div className="p-5">
              <div className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-white">
                9-Section PDF
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Boardroom-ready Statedge executive reporting
              </div>
            </div>
          </div>
        </section>

        {/* Core Capabilities */}
        <section
          id="capabilities"
          className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 py-16"
        >
          <div className="max-w-7xl mx-auto px-6 space-y-10">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-slate-950 dark:text-white">
                Built to turn messy spreadsheets into audited executive decisions
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Every workflow connects client self-service analytics with optional human data-scientist review from Statedge Data Analytics.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-3">
                <div className="text-xs font-mono text-blue-700 dark:text-cyan-400">
                  01. AI Data Analyst & Automated Dashboards
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Verified calculations first, natural-language insight second
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Before a single sentence of narrative is generated, Statedge computes exact total
                  revenue, expenses, operating margin, z-score transaction outliers, and category
                  concentration directly from your cleaned records—never altering your original file.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-3">
                <div className="text-xs font-mono text-blue-700 dark:text-cyan-400">
                  02. Service Project Pipeline
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Request custom analyst deliverables
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Submit custom analytical briefs, track progress from review to completion, message
                  Statedge analysts directly, and settle Naira invoices securely.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Nigerian Target Industries */}
        <section id="industries" className="max-w-7xl mx-auto px-6 py-16 space-y-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-slate-950 dark:text-white">
              Designed for high-growth Nigerian business sectors
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SECTORS.map((sector) => (
              <div
                key={sector.num}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-2"
              >
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {sector.num}
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {sector.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {sector.outcome}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Commercial Packages */}
        <section
          id="pricing"
          className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 py-16"
        >
          <div className="max-w-7xl mx-auto px-6 space-y-8">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-slate-950 dark:text-white">
                Transparent Naira pricing for every stage
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                Packages are dynamically managed from the Statedge Administrator Console and support Paystack & Flutterwave checkout.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.slug}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 flex flex-col justify-between gap-6"
                >
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {plan.name}
                    </div>
                    <div className="font-mono tabular-nums text-2xl font-bold text-slate-950 dark:text-white">
                      {plan.priceLabel}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {plan.description}
                    </p>
                    <ul className="pt-3 space-y-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                      {(plan.featuresJson || []).map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <Check
                            className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={onSignIn}
                    className="w-full py-2 px-4 text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap"
                  >
                    {plan.monthlyPriceNgn ? `Choose ${plan.name}` : 'Request Enterprise Quote'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security & Data Governance */}
        <section id="security" className="max-w-7xl mx-auto px-6 py-16">
          <div className="bg-slate-900 dark:bg-slate-900 border border-slate-800 rounded-lg p-8 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-medium text-cyan-400">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                Strict Multi-Tenant Data Isolation
              </div>
              <h2 className="font-display text-xl lg:text-2xl font-bold">
                Your financial records stay confidential and immutable
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Every business workspace is isolated by verified Firebase authentication and
                server-side ownership enforcement in PostgreSQL. Original uploaded files are
                preserved untouched, administrative reviews are audit-logged, and clients can
                purge their datasets and account at any time.
              </p>
            </div>

            <button
              type="button"
              onClick={onSignIn}
              className="px-5 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors whitespace-nowrap shrink-0 self-start lg:self-center"
            >
              Launch Secure Workspace
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 px-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>Statedge Intelligence · Developed by Statedge Data Analytics, Nigeria</div>
          <div>Turning Data into Better Decisions</div>
        </div>
      </footer>
    </div>
  );
}
