import { FormEvent, useState } from 'react';
import { apiRequest } from '../../lib/apiClient';
import { BusinessRecord } from '../../types/statedge';

interface BusinessRegistrationViewProps {
  userEmail: string;
  userName: string;
  onRegistered: (business: BusinessRecord) => void;
  onSignOut: () => void;
  onCancel?: () => void;
}

const INDUSTRIES = [
  'Retail Stores & Supermarkets',
  'Pharmaceutical & Healthcare',
  'Educational Institutions',
  'Distributors & Wholesalers',
  'Restaurants & Hospitality',
  'Growing Nigerian Enterprise',
];

const NIGERIAN_STATES = [
  'Lagos',
  'FCT Abuja',
  'Rivers',
  'Oyo',
  'Kano',
  'Ogun',
  'Enugu',
  'Anambra',
  'Kaduna',
  'Delta',
  'Edo',
  'Other',
];

export function BusinessRegistrationView({
  userEmail,
  userName,
  onRegistered,
  onSignOut,
  onCancel,
}: BusinessRegistrationViewProps) {
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [city, setCity] = useState('Lagos');
  const [state, setState] = useState('Lagos');
  const [rcNumber, setRcNumber] = useState('');
  const [monthlyRevenueBand, setMonthlyRevenueBand] = useState('₦2M – ₦15M / month');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{ business: BusinessRecord }>('/api/businesses', {
        method: 'POST',
        body: JSON.stringify({
          businessName,
          industry,
          city,
          state,
          rcNumber,
          monthlyRevenueBand,
        }),
      });
      onRegistered(res.business);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register business.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div>
            <div className="text-xs font-semibold text-blue-700 dark:text-cyan-400">
              Statedge Intelligence · Business Onboarding
            </div>
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white mt-1">
              Register your business profile
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Signed in as {userName} ({userEmail}). Your datasets and reports are strictly isolated to this business workspace.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs font-medium text-blue-700 dark:text-cyan-400 hover:underline whitespace-nowrap"
              >
                Back to Workspace
              </button>
            )}
            <button
              type="button"
              onClick={onSignOut}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
            >
              Sign Out
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Registered Business Name *
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g., Mainland MedPlus Pharmacy Ltd"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Business Sector *
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
              >
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Estimated Monthly Turnover
              </label>
              <select
                value={monthlyRevenueBand}
                onChange={(e) => setMonthlyRevenueBand(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
              >
                <option value="Under ₦2M / month">Under ₦2M / month</option>
                <option value="₦2M – ₦15M / month">₦2M – ₦15M / month</option>
                <option value="₦15M – ₦75M / month">₦15M – ₦75M / month</option>
                <option value="Above ₦75M / month">Above ₦75M / month</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                City *
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                State *
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
              >
                {NIGERIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                CAC / RC Number
              </label>
              <input
                type="text"
                value={rcNumber}
                onChange={(e) => setRcNumber(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
              />
            </div>
          </div>

          {error && (
            <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-md transition-colors disabled:opacity-60"
          >
            {submitting ? 'Creating Business Workspace...' : 'Create Business Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}
