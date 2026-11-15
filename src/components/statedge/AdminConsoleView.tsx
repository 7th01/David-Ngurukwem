import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/apiClient';
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
  ProjectStatus,
} from '../../types/statedge';

interface AdminOverviewPayload {
  users: DbUser[];
  businesses: BusinessRecord[];
  projects: ProjectRecord[];
  datasets: DatasetRecord[];
  analyses: AnalysisRecord[];
  payments: PaymentRecord[];
  pricingPlans: PricingPlanRecord[];
  auditLogs: AuditLogRecord[];
  paymentConfig: PaymentConfigState;
}

const PROJECT_STATUSES: ProjectStatus[] = [
  'New Request',
  'Under Review',
  'Awaiting Payment',
  'In Progress',
  'Quality Review',
  'Completed',
];

export function AdminConsoleView({
  onPaymentConfigChanged,
}: {
  onPaymentConfigChanged?: (cfg: PaymentConfigState) => void;
}) {
  const [data, setData] = useState<AdminOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<
    'projects' | 'reports' | 'users' | 'pricing' | 'payment_config' | 'audit'
  >('projects');
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configDraft, setConfigDraft] = useState<PaymentConfigState>({
    paymentEnabled: true,
    paymentMode: 'development',
    paystackEnabled: true,
    flutterwaveEnabled: true,
    enforcePlanLimits: false,
  });

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<AdminOverviewPayload>('/api/admin/overview');
      setData(res);
      if (res.paymentConfig) {
        setConfigDraft(res.paymentConfig);
        onPaymentConfigChanged?.(res.paymentConfig);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load admin console.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-500">
        Loading Statedge Administrator Console...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-sm text-red-700 dark:text-red-300">
        {error || 'Administrator data unavailable.'}
      </div>
    );
  }

  const verifiedRevenue = data.payments
    .filter((p) => p.status === 'verified')
    .reduce((a, p) => a + p.amountNgn, 0);
  const pendingPayments = data.payments.filter((p) => p.status === 'pending');
  const pendingProjects = data.projects.filter((p) => p.status !== 'Completed').length;
  const completedProjects = data.projects.filter((p) => p.status === 'Completed').length;

  const updateProject = async (
    proj: ProjectRecord,
    updates: { status?: ProjectStatus; quotedAmountNgn?: number; deliverableTitle?: string; deliverableSummary?: string }
  ) => {
    setActionMsg(null);
    await apiRequest(`/api/admin/projects/${proj.id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    setActionMsg(`Updated project "${proj.title}".`);
    await loadAdminData();
  };

  const reviewAnalysis = async (
    an: AnalysisRecord,
    publishStatus: 'published' | 'pending_review',
    reviewedNotes: string
  ) => {
    setActionMsg(null);
    await apiRequest(`/api/admin/analyses/${an.id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ publishStatus, reviewedNotes }),
    });
    setActionMsg(`Updated review status for "${an.title}".`);
    await loadAdminData();
  };

  const toggleUserRole = async (u: DbUser) => {
    const nextRole = u.role === 'admin' ? 'client' : 'admin';
    await apiRequest(`/api/admin/users/${u.uid}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: nextRole }),
    });
    setActionMsg(`Changed ${u.email} role to ${nextRole}.`);
    await loadAdminData();
  };

  const updatePlan = async (plan: PricingPlanRecord) => {
    await apiRequest(`/api/admin/pricing/${plan.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        monthlyPriceNgn: plan.monthlyPriceNgn,
        priceLabel: plan.priceLabel,
        maxDatasets: plan.maxDatasets,
        maxRowsPerDataset: plan.maxRowsPerDataset,
        isActive: plan.isActive,
      }),
    });
    setActionMsg(`Saved pricing configuration for ${plan.name}.`);
    await loadAdminData();
  };

  const verifyPaymentAdmin = async (paymentId: number) => {
    await apiRequest(`/api/admin/payments/${paymentId}/verify`, { method: 'PUT' });
    setActionMsg(`Payment #${paymentId} manually verified and receipt issued.`);
    await loadAdminData();
  };

  const savePaymentConfig = async () => {
    setSavingConfig(true);
    setActionMsg(null);
    try {
      const res = await apiRequest<{ paymentConfig: PaymentConfigState }>(
        '/api/admin/payment-config',
        {
          method: 'PUT',
          body: JSON.stringify({
            paymentEnabled: configDraft.paymentEnabled,
            paymentMode: configDraft.paymentMode,
            paystackEnabled: configDraft.paystackEnabled,
            flutterwaveEnabled: configDraft.flutterwaveEnabled,
            enforcePlanLimits: configDraft.enforcePlanLimits,
          }),
        }
      );
      setConfigDraft(res.paymentConfig);
      onPaymentConfigChanged?.(res.paymentConfig);
      setActionMsg(
        `Saved payment settings (${res.paymentConfig.paymentEnabled ? 'Checkout Enabled' : 'Checkout Disabled'} · ${res.paymentConfig.paymentMode.toUpperCase()} mode).`
      );
      await loadAdminData();
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Operational KPI Strip */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg grid grid-cols-2 lg:grid-cols-6 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
        <div className="p-4">
          <div className="text-[11px] text-slate-500">Registered Clients</div>
          <div className="mt-1 font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-white">
            {data.users.length}
          </div>
          <div className="text-[11px] text-slate-400">{data.businesses.length} businesses</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] text-slate-500">Total Projects</div>
          <div className="mt-1 font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-white">
            {data.projects.length}
          </div>
          <div className="text-[11px] text-slate-400">{pendingProjects} active</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] text-slate-500">Completed Projects</div>
          <div className="mt-1 font-mono tabular-nums text-xl font-bold text-emerald-700 dark:text-emerald-400">
            {completedProjects}
          </div>
          <div className="text-[11px] text-slate-400">Delivered</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] text-slate-500">Verified Revenue</div>
          <div className="mt-1 font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-white">
            ₦{verifiedRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400">Confirmed NGN</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] text-slate-500">Pending Payments</div>
          <div className="mt-1 font-mono tabular-nums text-xl font-bold text-amber-700 dark:text-amber-400">
            {pendingPayments.length}
          </div>
          <div className="text-[11px] text-slate-400">Awaiting verification</div>
        </div>
        <div className="p-4">
          <div className="text-[11px] text-slate-500">Uploaded Datasets</div>
          <div className="mt-1 font-mono tabular-nums text-xl font-bold text-slate-900 dark:text-white">
            {data.datasets.length}
          </div>
          <div className="text-[11px] text-slate-400">{data.analyses.length} AI reports</div>
        </div>
      </section>

      {actionMsg && (
        <div className="px-4 py-2.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
          {actionMsg}
        </div>
      )}

      {/* Admin Sub-Navigation */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-md w-fit">
        {(
          [
            { id: 'projects', label: 'Project & Payment Ops' },
            { id: 'reports', label: 'AI Report Review' },
            { id: 'users', label: 'Users & Businesses' },
            { id: 'pricing', label: 'Configurable Pricing' },
            { id: 'payment_config', label: 'Payment Config' },
            { id: 'audit', label: 'Security Audit Logs' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Projects & Pending Payments */}
      {tab === 'projects' && (
        <div className="space-y-6">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Client Analytical Projects ({data.projects.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.projects.map((p) => {
                const biz = data.businesses.find((b) => b.id === p.businessId);
                return (
                  <div key={p.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-2xl">
                      <div className="text-xs text-slate-500">
                        {biz?.businessName || `Business #${p.businessId}`} · Updated{' '}
                        {String(p.updatedAt).slice(0, 10)}
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {p.title}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{p.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <select
                        value={p.status}
                        onChange={(e) =>
                          updateProject(p, { status: e.target.value as ProjectStatus })
                        }
                        className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
                      >
                        {PROJECT_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          updateProject(p, {
                            status: 'Awaiting Payment',
                            quotedAmountNgn: p.quotedAmountNgn || 75000,
                          })
                        }
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Quote ₦{(p.quotedAmountNgn || 75000).toLocaleString()}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateProject(p, {
                            status: 'Completed',
                            deliverableTitle: `${p.title} — Statedge Executive Deliverable`,
                            deliverableSummary:
                              'Full quantitative audit, margin diagnostic, and board presentation approved by Statedge Data Analytics.',
                          })
                        }
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 rounded-md"
                      >
                        Publish Deliverable
                      </button>
                    </div>
                  </div>
                );
              })}
              {data.projects.length === 0 && (
                <div className="p-6 text-xs text-slate-500">No client projects submitted yet.</div>
              )}
            </div>
          </section>

          {pendingPayments.length > 0 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Pending Payments Queue
                </h2>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingPayments.map((pay) => (
                  <div key={pay.id} className="px-6 py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="font-mono">
                      {pay.reference} · ₦{pay.amountNgn.toLocaleString()} · {pay.gateway.toUpperCase()}
                    </div>
                    <button
                      type="button"
                      onClick={() => verifyPaymentAdmin(pay.id)}
                      className="px-3 py-1.5 font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-md"
                    >
                      Confirm & Issue Receipt
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Tab 2: AI Report Quality Review Queue */}
      {tab === 'reports' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              AI-Generated Analyses & Publication Review ({data.analyses.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.analyses.map((an) => (
              <div key={an.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="text-xs text-slate-500 capitalize">
                    Status: <strong>{an.publishStatus.replace('_', ' ')}</strong> · Model:{' '}
                    {an.aiInterpretationJson.generatedBy}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {an.title}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {an.aiInterpretationJson.executiveSummary}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      reviewAnalysis(
                        an,
                        'published',
                        'Verified and approved by Statedge Principal Data Analyst.'
                      )
                    }
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-md"
                  >
                    Approve & Publish
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      reviewAnalysis(an, 'pending_review', 'Held for manual metric reconciliation.')
                    }
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md"
                  >
                    Hold for Review
                  </button>
                </div>
              </div>
            ))}
            {data.analyses.length === 0 && (
              <div className="p-6 text-xs text-slate-500">No client analyses generated yet.</div>
            )}
          </div>
        </section>
      )}

      {/* Tab 3: Users & Businesses */}
      {tab === 'users' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Registered Users & Role Permissions ({data.users.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <th className="py-2.5 px-6">User</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Registered Business</th>
                  <th className="py-2.5 px-4">Deletion Status</th>
                  <th className="py-2.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.users.map((u) => {
                  const biz = data.businesses.find((b) => b.ownerUid === u.uid);
                  return (
                    <tr key={u.uid}>
                      <td className="py-3 px-6">
                        <div className="font-medium text-slate-900 dark:text-white">{u.fullName}</div>
                        <div className="text-slate-500">{u.email}</div>
                      </td>
                      <td className="py-3 px-4 font-mono uppercase font-semibold">{u.role}</td>
                      <td className="py-3 px-4">
                        {biz ? `${biz.businessName} (${biz.subscriptionTier})` : 'Unregistered'}
                      </td>
                      <td className="py-3 px-4">
                        {u.deletionRequestedAt ? (
                          <span className="text-red-600 font-medium">Deletion Requested</span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400">Active</span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => toggleUserRole(u)}
                          className="px-3 py-1 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          Switch to {u.role === 'admin' ? 'Client' : 'Admin'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab 4: Configurable Commercial Pricing Plans */}
      {tab === 'pricing' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Configurable Commercial Subscription Packages
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Adjust Naira pricing, dataset quotas, and row limits dynamically without code changes
            </p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.pricingPlans.map((plan) => (
              <PlanEditorRow key={plan.id} plan={plan} onSave={updatePlan} />
            ))}
          </div>
        </section>
      )}

      {/* Tab 5: Optional Payment Integration Configuration */}
      {tab === 'payment_config' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Optional Payment Gateway & Quota Configuration
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Payment integration is optional. Statedge Intelligence runs fully in Development Payment Mode without external Paystack or Flutterwave credentials.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <label className="flex items-start gap-3 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md cursor-pointer">
                <input
                  type="checkbox"
                  checked={configDraft.paymentEnabled}
                  onChange={(e) =>
                    setConfigDraft({ ...configDraft, paymentEnabled: e.target.checked })
                  }
                  className="mt-0.5"
                />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Enable Client Checkout Flow
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                    When unchecked, client billing becomes read-only and all core analytics run without checkout prompts.
                  </div>
                </div>
              </label>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md space-y-2">
                <div className="font-semibold text-slate-900 dark:text-white">
                  Active Payment Mode
                </div>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymentMode"
                      checked={configDraft.paymentMode === 'development'}
                      onChange={() =>
                        setConfigDraft({ ...configDraft, paymentMode: 'development' })
                      }
                    />
                    <span>
                      <strong>Development Mode</strong> (no external gateway credentials required)
                    </span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="paymentMode"
                      checked={configDraft.paymentMode === 'live'}
                      onChange={() =>
                        setConfigDraft({ ...configDraft, paymentMode: 'live' })
                      }
                    />
                    <span>
                      <strong>Live Gateway Mode</strong> (verifies via server PAYSTACK_SECRET_KEY / FLUTTERWAVE_SECRET_KEY)
                    </span>
                  </label>
                </div>
              </div>

              <label className="flex items-start gap-3 p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md cursor-pointer">
                <input
                  type="checkbox"
                  checked={configDraft.enforcePlanLimits}
                  onChange={(e) =>
                    setConfigDraft({ ...configDraft, enforcePlanLimits: e.target.checked })
                  }
                  className="mt-0.5"
                />
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Enforce Subscription Dataset & Row Quotas
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Keep unchecked during development/evaluation so clients can upload datasets freely without subscribing.
                  </div>
                </div>
              </label>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md space-y-3">
                <div className="font-semibold text-slate-900 dark:text-white">
                  Enabled Payment Providers
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={configDraft.paystackEnabled}
                    onChange={(e) =>
                      setConfigDraft({ ...configDraft, paystackEnabled: e.target.checked })
                    }
                  />
                  <span>Paystack (NGN)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={configDraft.flutterwaveEnabled}
                    onChange={(e) =>
                      setConfigDraft({ ...configDraft, flutterwaveEnabled: e.target.checked })
                    }
                  />
                  <span>Flutterwave (NGN)</span>
                </label>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md space-y-2">
                <div className="font-semibold text-slate-900 dark:text-white">
                  Server Secret Readiness (Optional for Production)
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span>PAYSTACK_SECRET_KEY</span>
                  <span
                    className={
                      data.paymentConfig?.envStatus?.hasPaystackSecret
                        ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                        : 'text-slate-500'
                    }
                  >
                    {data.paymentConfig?.envStatus?.hasPaystackSecret
                      ? 'Configured'
                      : 'Not Configured (Optional)'}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span>FLUTTERWAVE_SECRET_KEY</span>
                  <span
                    className={
                      data.paymentConfig?.envStatus?.hasFlutterwaveSecret
                        ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                        : 'text-slate-500'
                    }
                  >
                    {data.paymentConfig?.envStatus?.hasFlutterwaveSecret
                      ? 'Configured'
                      : 'Not Configured (Optional)'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={savingConfig}
                onClick={savePaymentConfig}
                className="px-4 py-2 font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-md disabled:opacity-50"
              >
                {savingConfig ? 'Saving Configuration...' : 'Save Payment Configuration'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Tab 5: Audit Logs */}
      {tab === 'audit' && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Security & Administrative Audit Logs
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <th className="py-2.5 px-6">Timestamp</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-6">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5 px-6 font-mono text-slate-500 whitespace-nowrap">
                      {String(log.createdAt).slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="py-2.5 px-4">
                      {log.actorEmail} ({log.actorRole})
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-6 text-slate-600 dark:text-slate-300">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function PlanEditorRow({
  plan,
  onSave,
}: {
  plan: PricingPlanRecord;
  onSave: (p: PricingPlanRecord) => Promise<void>;
}) {
  const [monthlyPriceNgn, setMonthlyPriceNgn] = useState<string>(
    plan.monthlyPriceNgn !== null ? String(plan.monthlyPriceNgn) : ''
  );
  const [priceLabel, setPriceLabel] = useState(plan.priceLabel);
  const [maxDatasets, setMaxDatasets] = useState(String(plan.maxDatasets));
  const [maxRowsPerDataset, setMaxRowsPerDataset] = useState(String(plan.maxRowsPerDataset));
  const [isActive, setIsActive] = useState(plan.isActive);
  const [saving, setSaving] = useState(false);

  return (
    <div className="p-5 grid grid-cols-1 lg:grid-cols-6 gap-3 items-end text-xs">
      <div>
        <div className="font-semibold text-sm text-slate-900 dark:text-white">{plan.name}</div>
        <div className="text-slate-500 font-mono">{plan.slug}</div>
      </div>

      <div>
        <label className="block text-slate-500 mb-1">Price (NGN)</label>
        <input
          type="number"
          value={monthlyPriceNgn}
          onChange={(e) => setMonthlyPriceNgn(e.target.value)}
          placeholder="Custom"
          className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded"
        />
      </div>

      <div>
        <label className="block text-slate-500 mb-1">Display Label</label>
        <input
          type="text"
          value={priceLabel}
          onChange={(e) => setPriceLabel(e.target.value)}
          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded"
        />
      </div>

      <div>
        <label className="block text-slate-500 mb-1">Max Datasets</label>
        <input
          type="number"
          value={maxDatasets}
          onChange={(e) => setMaxDatasets(e.target.value)}
          className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded"
        />
      </div>

      <div>
        <label className="block text-slate-500 mb-1">Max Rows/Dataset</label>
        <input
          type="number"
          value={maxRowsPerDataset}
          onChange={(e) => setMaxRowsPerDataset(e.target.value)}
          className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <label className="inline-flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave({
                ...plan,
                monthlyPriceNgn: monthlyPriceNgn ? Number(monthlyPriceNgn) : null,
                priceLabel,
                maxDatasets: Number(maxDatasets) || 5,
                maxRowsPerDataset: Number(maxRowsPerDataset) || 5000,
                isActive,
              });
            } finally {
              setSaving(false);
            }
          }}
          className="px-3 py-1.5 font-semibold text-white bg-slate-900 dark:bg-blue-600 rounded"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
