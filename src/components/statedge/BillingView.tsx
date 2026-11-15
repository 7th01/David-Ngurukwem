import { useEffect, useState } from 'react';
import { Check, Download, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { downloadPaymentReceiptPdf } from '../../lib/pdfGenerator';
import {
  BusinessRecord,
  PaymentConfigState,
  PaymentRecord,
  PricingPlanRecord,
  ProjectRecord,
} from '../../types/statedge';

interface BillingViewProps {
  business: BusinessRecord;
  plans: PricingPlanRecord[];
  payments: PaymentRecord[];
  awaitingProjects: ProjectRecord[];
  paymentConfig: PaymentConfigState;
  isDemo: boolean;
  onPaymentUpdated: () => Promise<void>;
}

export function BillingView({
  business,
  plans,
  payments,
  awaitingProjects,
  paymentConfig,
  isDemo,
  onPaymentUpdated,
}: BillingViewProps) {
  const defaultGateway: 'paystack' | 'flutterwave' = paymentConfig.paystackEnabled
    ? 'paystack'
    : 'flutterwave';
  const [gateway, setGateway] = useState<'paystack' | 'flutterwave'>(defaultGateway);
  const [pendingCheckout, setPendingCheckout] = useState<{
    reference: string;
    amountNgn: number;
    label: string;
    gatewayMode: string;
  } | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (gateway === 'paystack' && !paymentConfig.paystackEnabled && paymentConfig.flutterwaveEnabled) {
      setGateway('flutterwave');
    } else if (
      gateway === 'flutterwave' &&
      !paymentConfig.flutterwaveEnabled &&
      paymentConfig.paystackEnabled
    ) {
      setGateway('paystack');
    }
  }, [gateway, paymentConfig.paystackEnabled, paymentConfig.flutterwaveEnabled]);

  const checkoutAvailable =
    paymentConfig.paymentEnabled &&
    (paymentConfig.paystackEnabled || paymentConfig.flutterwaveEnabled);

  const startPayment = async (params: {
    paymentType: 'subscription' | 'project';
    amountNgn: number;
    label: string;
    planSlug?: string;
    projectId?: number;
  }) => {
    setError(null);
    setSuccessMsg(null);
    if (isDemo) {
      setError('Sign in with Google to test workspace checkouts and receipts.');
      return;
    }
    if (!checkoutAvailable) {
      setError('Payment checkout is currently disabled by the Statedge administrator.');
      return;
    }

    setBusy(true);
    try {
      const res = await apiRequest<{ payment: PaymentRecord; gatewayMode: string }>(
        '/api/payments/initialize',
        {
          method: 'POST',
          body: JSON.stringify({
            businessId: business.id,
            paymentType: params.paymentType,
            gateway,
            amountNgn: params.amountNgn,
            planSlug: params.planSlug,
            projectId: params.projectId,
          }),
        }
      );
      setPendingCheckout({
        reference: res.payment.reference,
        amountNgn: res.payment.amountNgn,
        label: params.label,
        gatewayMode: res.gatewayMode,
      });
      setConfirmCode('');
      await onPaymentUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to initialize payment.');
    } finally {
      setBusy(false);
    }
  };

  const verifyPayment = async () => {
    if (!pendingCheckout) return;
    setError(null);
    setBusy(true);
    try {
      await apiRequest('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          reference: pendingCheckout.reference,
          gatewayConfirmationCode: confirmCode,
        }),
      });
      setSuccessMsg(
        `Payment ${pendingCheckout.reference} verified successfully. Receipt generated below.`
      );
      setPendingCheckout(null);
      await onPaymentUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Gateway Selector & Pending Invoices */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              Billing & Optional Nigerian Payment Checkout
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Active Plan:{' '}
              <strong className="capitalize text-slate-800 dark:text-slate-200">
                {business.subscriptionTier}
              </strong>
              {' · '}
              {!paymentConfig.paymentEnabled
                ? 'Payment integration is currently disabled in Admin Settings.'
                : paymentConfig.paymentMode === 'development'
                  ? 'Development Payment Mode active (no external gateway credentials required).'
                  : 'Live Gateway Mode active.'}
            </p>
          </div>

          {checkoutAvailable && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-md">
              {paymentConfig.paystackEnabled && (
                <button
                  type="button"
                  onClick={() => setGateway('paystack')}
                  className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap ${
                    gateway === 'paystack'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Paystack ({paymentConfig.paymentMode === 'development' ? 'Dev' : 'Live'})
                </button>
              )}
              {paymentConfig.flutterwaveEnabled && (
                <button
                  type="button"
                  onClick={() => setGateway('flutterwave')}
                  className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap ${
                    gateway === 'flutterwave'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Flutterwave ({paymentConfig.paymentMode === 'development' ? 'Dev' : 'Live'})
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {!paymentConfig.paymentEnabled
            ? 'Payment integration is optional and currently turned off by the Statedge administrator. Dataset uploads, AI analysis, dashboards, and PDF exports remain fully active.'
            : 'All core analytics features operate independently of external payment credentials. Transactions remain pending until explicitly verified.'}
        </div>

        {/* Gateway Verification Panel */}
        {pendingCheckout && (
          <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-blue-200 dark:border-blue-900 rounded-md space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-cyan-400">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              {pendingCheckout.gatewayMode !== 'live'
                ? `Development Payment Confirmation · ${gateway.toUpperCase()}`
                : `Live Gateway Verification Required · ${gateway.toUpperCase()}`}
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <div>
                Item: <strong>{pendingCheckout.label}</strong> —{' '}
                <span className="font-mono font-semibold">
                  ₦{pendingCheckout.amountNgn.toLocaleString()}
                </span>
              </div>
              <div className="font-mono text-slate-500">
                Reference:{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {pendingCheckout.reference}
                </strong>
              </div>
              {pendingCheckout.gatewayMode !== 'live' && (
                <div className="text-amber-700 dark:text-amber-400">
                  Development Payment Mode: Confirm with the last 4 digits of your reference (
                  <strong className="font-mono">{pendingCheckout.reference.slice(-4)}</strong>) to
                  complete verification without external API keys.
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="Enter 4-digit confirmation code"
                className="px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md"
              />
              {pendingCheckout.gatewayMode !== 'live' && (
                <button
                  type="button"
                  onClick={() => setConfirmCode(pendingCheckout.reference.slice(-4))}
                  className="px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-cyan-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md whitespace-nowrap"
                >
                  Fill Dev Code
                </button>
              )}
              <button
                type="button"
                onClick={verifyPayment}
                disabled={busy}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 rounded-md disabled:opacity-50 whitespace-nowrap"
              >
                {busy ? 'Verifying...' : 'Verify Payment'}
              </button>
              <button
                type="button"
                onClick={() => setPendingCheckout(null)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-2.5">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-4 py-2.5">
            {successMsg}
          </div>
        )}
      </section>

      {/* Awaiting Project Invoices */}
      {awaitingProjects.length > 0 && checkoutAvailable && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Pending Project Invoices
            </h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {awaitingProjects.map((proj) => (
              <div key={proj.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {proj.title}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    Fee: ₦{proj.quotedAmountNgn.toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    startPayment({
                      paymentType: 'project',
                      amountNgn: proj.quotedAmountNgn,
                      label: `Project: ${proj.title}`,
                      projectId: proj.id,
                    })
                  }
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md whitespace-nowrap"
                >
                  Pay via {gateway === 'paystack' ? 'Paystack' : 'Flutterwave'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dynamic Configurable Subscription Packages */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {plans.filter((p) => p.isActive).map((plan) => {
          const isCurrent = business.subscriptionTier === plan.slug;
          return (
            <div
              key={plan.slug}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-col justify-between gap-5"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {plan.name}
                  </span>
                  {isCurrent && (
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      Current Plan
                    </span>
                  )}
                </div>
                <div className="font-mono tabular-nums text-xl font-bold text-slate-950 dark:text-white">
                  {plan.priceLabel}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{plan.description}</p>
                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                  Limits: {plan.maxDatasets} datasets · {plan.maxRowsPerDataset.toLocaleString()} rows
                </div>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  {(plan.featuresJson || []).map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {plan.monthlyPriceNgn ? (
                <button
                  type="button"
                  disabled={busy || isCurrent || !checkoutAvailable}
                  onClick={() =>
                    startPayment({
                      paymentType: 'subscription',
                      amountNgn: plan.monthlyPriceNgn!,
                      label: `${plan.name} Monthly Subscription`,
                      planSlug: plan.slug,
                    })
                  }
                  className={`w-full py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    isCurrent || !checkoutAvailable
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-default'
                      : 'bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500'
                  }`}
                >
                  {isCurrent
                    ? 'Active Tier'
                    : !checkoutAvailable
                      ? 'Checkout Disabled (Optional)'
                      : `Subscribe (${plan.priceLabel})`}
                </button>
              ) : (
                <div className="text-xs text-center py-2 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-md">
                  Contact Statedge via Projects for Enterprise quote
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Payment History & Receipts */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Payment History & Downloadable Receipts
          </h2>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No transactions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <th className="py-2.5 px-6">Reference</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Gateway</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-6 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-6 font-mono text-slate-900 dark:text-white">
                      {p.reference}
                    </td>
                    <td className="py-3 px-4 capitalize">{p.paymentType}</td>
                    <td className="py-3 px-4 uppercase font-mono">{p.gateway}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-medium">
                      ₦{p.amountNgn.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold capitalize">
                      <span
                        className={
                          p.status === 'verified'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : p.status === 'failed'
                              ? 'text-red-600'
                              : 'text-amber-700 dark:text-amber-400'
                        }
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      {p.status === 'verified' && p.receiptNumber ? (
                        <button
                          type="button"
                          onClick={() =>
                            downloadPaymentReceiptPdf({
                              receiptNumber: p.receiptNumber!,
                              reference: p.reference,
                              businessName: business.businessName,
                              amountNgn: p.amountNgn,
                              gateway: p.gateway,
                              paymentType: p.paymentType,
                              verifiedAt: p.verifiedAt || p.createdAt,
                            })
                          }
                          className="inline-flex items-center gap-1 text-blue-700 dark:text-cyan-400 font-medium hover:underline"
                        >
                          <Download className="w-3.5 h-3.5" aria-hidden="true" />
                          {p.receiptNumber}
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
