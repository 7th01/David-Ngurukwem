import { FormEvent, useState } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { BusinessRecord, DbUser } from '../../types/statedge';

interface AccountSecurityViewProps {
  user: DbUser | null;
  business: BusinessRecord;
  isDemo: boolean;
  onProfileUpdated: (user: DbUser) => void;
  onBusinessUpdated: (business: BusinessRecord) => void;
  onDataPurged: () => void;
}

export function AccountSecurityView({
  user,
  business,
  isDemo,
  onProfileUpdated,
  onBusinessUpdated,
  onDataPurged,
}: AccountSecurityViewProps) {
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || '');

  const [bizName, setBizName] = useState(business.businessName);
  const [industry, setIndustry] = useState(business.industry);
  const [city, setCity] = useState(business.city);
  const [state, setState] = useState(business.state);
  const [rcNumber, setRcNumber] = useState(business.rcNumber || '');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmPurge, setConfirmPurge] = useState(false);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (isDemo) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await apiRequest<{ user: DbUser }>('/api/me/profile', {
        method: 'PUT',
        body: JSON.stringify({ fullName, phone, jobTitle }),
      });
      onProfileUpdated(res.user);
      setFeedback('User profile updated.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBusiness = async (e: FormEvent) => {
    e.preventDefault();
    if (isDemo) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await apiRequest<{ business: BusinessRecord }>(
        `/api/businesses/${business.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            businessName: bizName,
            industry,
            city,
            state,
            rcNumber,
            monthlyRevenueBand: business.monthlyRevenueBand,
          }),
        }
      );
      onBusinessUpdated(res.business);
      setFeedback('Business profile updated.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteData = async (immediate: boolean) => {
    if (isDemo) return;
    setSaving(true);
    try {
      await apiRequest('/api/me/request-deletion', {
        method: 'POST',
        body: JSON.stringify({ confirmImmediateDelete: immediate }),
      });
      if (immediate) {
        onDataPurged();
      } else {
        setFeedback('Account and data deletion request logged with Statedge Data Protection.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {isDemo && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg text-xs text-amber-800 dark:text-amber-300">
          You are exploring Demonstration Mode. Sign in with Google to manage a persistent account,
          business profile, and security controls.
        </div>
      )}

      {feedback && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-md text-xs text-emerald-800 dark:text-emerald-300">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Profile */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            User Profile & Role
          </h2>
          <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                Email Address (Google OAuth Verified)
              </label>
              <input
                type="text"
                disabled
                value={user?.email || 'demo@statedge.ng'}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                disabled={isDemo}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  disabled={isDemo}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  disabled={isDemo}
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Managing Director"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isDemo || saving}
              className="px-4 py-2 font-semibold text-white bg-slate-900 dark:bg-blue-600 rounded-md disabled:opacity-50"
            >
              Save User Profile
            </button>
          </form>
        </section>

        {/* Business Profile */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Business Profile
          </h2>
          <form onSubmit={handleSaveBusiness} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Business Name
              </label>
              <input
                type="text"
                disabled={isDemo}
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Industry
              </label>
              <input
                type="text"
                disabled={isDemo}
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  disabled={isDemo}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  State
                </label>
                <input
                  type="text"
                  disabled={isDemo}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  RC Number
                </label>
                <input
                  type="text"
                  disabled={isDemo}
                  value={rcNumber}
                  onChange={(e) => setRcNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isDemo || saving}
              className="px-4 py-2 font-semibold text-white bg-slate-900 dark:bg-blue-600 rounded-md disabled:opacity-50"
            >
              Update Business Profile
            </button>
          </form>
        </section>
      </div>

      {/* Security, Recovery & Data Deletion Governance */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-cyan-400" aria-hidden="true" />
          Authentication, Recovery & Confidentiality Controls
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
          Your session uses verified Firebase OAuth tokens stored strictly in memory (never in
          browser local storage). Password recovery and multi-factor authentication are managed
          directly through your Google account security settings. All datasets and reports are
          isolated per business owner UID on PostgreSQL.
        </p>

        {!isDemo && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400">
                <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                Data & Account Deletion Request
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Request formal deletion or immediately purge all your uploaded datasets, analyses, and projects.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleDeleteData(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Log Formal Deletion Request
              </button>

              {!confirmPurge ? (
                <button
                  type="button"
                  onClick={() => setConfirmPurge(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                >
                  Purge All Business Data
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleDeleteData(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md"
                >
                  Confirm Permanent Purge
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
