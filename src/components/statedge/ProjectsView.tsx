import { FormEvent, useEffect, useState } from 'react';
import { Download, Send } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { DatasetRecord, ProjectMessageRecord, ProjectRecord } from '../../types/statedge';

interface ProjectsViewProps {
  businessId: number;
  datasets: DatasetRecord[];
  projects: ProjectRecord[];
  isDemo: boolean;
  onProjectCreated: (project: ProjectRecord) => void;
  onPayProject: (project: ProjectRecord) => void;
}

const STAGES = [
  'New Request',
  'Under Review',
  'Awaiting Payment',
  'In Progress',
  'Quality Review',
  'Completed',
];

export function ProjectsView({
  businessId,
  datasets,
  projects,
  isDemo,
  onProjectCreated,
  onPayProject,
}: ProjectsViewProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [datasetId, setDatasetId] = useState<string>('');
  const [supportingDocName, setSupportingDocName] = useState('');
  const [supportingDocSummary, setSupportingDocSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(projects[0] || null);
  const [messages, setMessages] = useState<ProjectMessageRecord[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  useEffect(() => {
    if (!activeProject && projects.length > 0) {
      setActiveProject(projects[0]);
    } else if (activeProject) {
      const updated = projects.find((p) => p.id === activeProject.id);
      if (updated) setActiveProject(updated);
    }
  }, [projects]);

  useEffect(() => {
    if (!activeProject || isDemo) {
      setMessages([]);
      return;
    }
    apiRequest<{ messages: ProjectMessageRecord[] }>(`/api/projects/${activeProject.id}/messages`)
      .then((res) => setMessages(res.messages))
      .catch(() => setMessages([]));
  }, [activeProject?.id, isDemo]);

  const handleSubmitProject = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (isDemo) {
      setFormError('Sign in with Google to submit persistent advisory service projects to Statedge analysts.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest<{ project: ProjectRecord }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          businessId,
          datasetId: datasetId ? Number(datasetId) : null,
          title,
          description,
          supportingDocName,
          supportingDocSummary,
        }),
      });
      onProjectCreated(res.project);
      setActiveProject(res.project);
      setTitle('');
      setDescription('');
      setSupportingDocName('');
      setSupportingDocSummary('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject || !replyText.trim() || isDemo) return;
    setSendingMsg(true);
    try {
      const res = await apiRequest<{ message: ProjectMessageRecord }>(
        `/api/projects/${activeProject.id}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ message: replyText }),
        }
      );
      setMessages((prev) => [...prev, res.message]);
      setReplyText('');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleDownloadDeliverable = (proj: ProjectRecord) => {
    const content = [
      `STATEDGE INTELLIGENCE — COMPLETED PROJECT DELIVERABLE`,
      `Project: ${proj.title}`,
      `Status: ${proj.status}`,
      `Deliverable: ${proj.deliverableTitle || 'Executive Analytical Brief'}`,
      `------------------------------------------------------------`,
      proj.deliverableSummary || 'Completed analytical deliverable prepared by Statedge Data Analytics.',
    ].join('\n\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proj.title.replace(/[^a-z0-9]+/gi, '_')}_Deliverable.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Request Analytical Service Form */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
          <div>
            <h1 className="font-display text-base font-bold text-slate-950 dark:text-white">
              Request Statedge Analytical Service
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Commission Statedge data scientists for deep audits, branch forecasting, or custom BI models.
            </p>
          </div>

          <form onSubmit={handleSubmitProject} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Project Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Q4 Branch Inventory & Margin Audit"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Attach Uploaded Dataset (Optional)
              </label>
              <select
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
              >
                <option value="">None attached</option>
                {datasets.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.rowCount} rows)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Project Brief & Business Questions *
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what decisions you want to make and any key targets..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Supporting Document Ref
                </label>
                <input
                  type="text"
                  value={supportingDocName}
                  onChange={(e) => setSupportingDocName(e.target.value)}
                  placeholder="e.g., Supplier_Price_List.pdf"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Document Context
                </label>
                <input
                  type="text"
                  value={supportingDocSummary}
                  onChange={(e) => setSupportingDocSummary(e.target.value)}
                  placeholder="Q3 Lagos wholesale pricing"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
                />
              </div>
            </div>

            {formError && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 px-4 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-md transition-colors disabled:opacity-60"
            >
              {submitting ? 'Submitting Request...' : 'Submit Analytical Project Request'}
            </button>
          </form>
        </section>

        {/* Active Projects Pipeline & Thread */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Your Analytical Projects ({projects.length})
            </h2>
          </div>

          {projects.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500 dark:text-slate-400">
              No service requests submitted yet. Submit a project brief on the left to track deliverables here.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {projects.map((p) => {
                const selected = activeProject?.id === p.id;
                const stageIdx = Math.max(0, STAGES.indexOf(p.status));
                return (
                  <div
                    key={p.id}
                    onClick={() => setActiveProject(p)}
                    className={`p-5 cursor-pointer transition-colors space-y-3 ${
                      selected
                        ? 'bg-blue-50/40 dark:bg-slate-800/60'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {p.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Status: <strong className="text-slate-800 dark:text-slate-200">{p.status}</strong>
                          {p.quotedAmountNgn > 0 && (
                            <span className="font-mono tabular-nums">
                              {' · '}Fee: ₦{p.quotedAmountNgn.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {p.status === 'Awaiting Payment' && p.quotedAmountNgn > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPayProject(p);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md whitespace-nowrap"
                          >
                            Pay ₦{p.quotedAmountNgn.toLocaleString()}
                          </button>
                        )}
                        {p.status === 'Completed' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadDeliverable(p);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md whitespace-nowrap"
                          >
                            <Download className="w-3.5 h-3.5" aria-hidden="true" />
                            Deliverable
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 6-Stage Step Bar */}
                    <div className="grid grid-cols-6 gap-1">
                      {STAGES.map((st, idx) => (
                        <div key={st} className="space-y-1">
                          <div
                            className={`h-1.5 rounded-xs ${
                              idx <= stageIdx
                                ? 'bg-blue-600 dark:bg-cyan-400'
                                : 'bg-slate-200 dark:bg-slate-800'
                            }`}
                          />
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {st}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected Project Communication Thread */}
          {activeProject && (
            <div className="border-t border-slate-200 dark:border-slate-800 p-5 bg-slate-50/70 dark:bg-slate-950/60 space-y-3">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Project Discussion · {activeProject.title}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {activeProject.description}
              </p>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {m.senderName} ({m.senderRole === 'admin' ? 'Statedge Analyst' : 'Client'})
                      </span>
                      <span className="font-mono">{String(m.createdAt).slice(0, 10)}</span>
                    </div>
                    <div className="mt-1 text-slate-700 dark:text-slate-300">{m.message}</div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-xs text-slate-400">No messages yet on this project.</div>
                )}
              </div>

              {!isDemo && (
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a message to your Statedge analyst..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
                  />
                  <button
                    type="submit"
                    disabled={sendingMsg || !replyText.trim()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 rounded-md disabled:opacity-50 whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    Send
                  </button>
                </form>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
