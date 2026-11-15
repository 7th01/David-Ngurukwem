import { FormEvent, useState } from 'react';
import { Download, Send, Sparkles } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { downloadExecutivePdfReport } from '../../lib/pdfGenerator';
import { AnalysisRecord, BusinessRecord } from '../../types/statedge';
import { formatNaira } from '../bi/BiCharts';

interface AiAnalystViewProps {
  business: BusinessRecord;
  analyses: AnalysisRecord[];
  activeAnalysis: AnalysisRecord | null;
  isDemo: boolean;
  onSelectAnalysis: (analysis: AnalysisRecord) => void;
}

interface QaExchange {
  question: string;
  answer: string;
  citedFacts: string[];
  generatedBy: string;
}

const SUGGESTED_PROMPTS = [
  'Which category drives the most revenue and what is its operating margin?',
  'Are there any unusual transactions or revenue outliers I should inspect?',
  'How did our latest period compare against earlier periods?',
];

export function AiAnalystView({
  business,
  analyses,
  activeAnalysis,
  isDemo,
  onSelectAnalysis,
}: AiAnalystViewProps) {
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [qaHistory, setQaHistory] = useState<QaExchange[]>([]);

  if (!activeAnalysis) {
    return (
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-10 text-center space-y-2">
        <h1 className="text-base font-semibold text-slate-900 dark:text-white">
          No AI Analysis Generated Yet
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Upload a dataset in the Data Upload Centre to compute verified metrics and generate an
          AI-grounded report.
        </p>
      </section>
    );
  }

  const m = activeAnalysis.metricsJson;
  const ai = activeAnalysis.aiInterpretationJson;

  const submitQuestion = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || asking) return;
    setAsking(true);
    setAskError(null);
    try {
      const res = isDemo
        ? await apiRequest<{
            answer: string;
            citedFacts: string[];
            generatedBy: string;
          }>(
            '/api/demo/ask',
            {
              method: 'POST',
              body: JSON.stringify({ metrics: m, question: trimmed }),
            },
            false
          )
        : await apiRequest<{
            answer: string;
            citedFacts: string[];
            generatedBy: string;
          }>(`/api/analyses/${activeAnalysis.id}/ask`, {
            method: 'POST',
            body: JSON.stringify({ question: trimmed }),
          });

      setQaHistory((prev) => [
        {
          question: trimmed,
          answer: res.answer,
          citedFacts: res.citedFacts || [],
          generatedBy: res.generatedBy,
        },
        ...prev,
      ]);
      setQuestion('');
    } catch (err) {
      setAskError(
        err instanceof Error ? err.message : 'Unable to answer question right now.'
      );
    } finally {
      setAsking(false);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitQuestion(question);
  };

  return (
    <div className="space-y-6">
      {/* Report Header & Selector */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-blue-700 dark:text-cyan-400">
              AI Data Analyst · {ai.generatedBy}
            </span>
            <span aria-hidden="true">·</span>
            <span className="capitalize">
              Report Status: {activeAnalysis.publishStatus.replace('_', ' ')}
            </span>
            {isDemo && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  Demonstration Data
                </span>
              </>
            )}
          </div>
          <h1 className="font-display text-xl font-bold text-slate-950 dark:text-white">
            {activeAnalysis.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {analyses.length > 1 && (
            <select
              aria-label="Select analysis report"
              value={activeAnalysis.id}
              onChange={(e) => {
                const found = analyses.find((a) => String(a.id) === e.target.value);
                if (found) {
                  setQaHistory([]);
                  onSelectAnalysis(found);
                }
              }}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
            >
              {analyses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() =>
              downloadExecutivePdfReport({
                reportTitle: activeAnalysis.title,
                businessName: business.businessName,
                industry: business.industry,
                location: `${business.city}, ${business.state}`,
                metrics: m,
                interpretation: ai,
                analystNotes: activeAnalysis.reviewedNotes || undefined,
                isDemo,
              })
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Download Branded PDF Report
          </button>
        </div>
      </section>

      {/* Interactive Grounded Q&A */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-cyan-400" aria-hidden="true" />
              Ask Statedge AI Analyst
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ask questions grounded strictly in verified calculations from{' '}
              <strong className="text-slate-700 dark:text-slate-300">{m.datasetName}</strong>.
            </p>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about revenue drivers, expense ratios, anomalies, or product performance..."
            className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={asking || !question.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            {asking ? 'Analyzing...' : 'Ask Analyst'}
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={asking}
              onClick={() => submitQuestion(prompt)}
              className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-left"
            >
              {prompt}
            </button>
          ))}
        </div>

        {askError && (
          <div className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-3.5 py-2">
            {askError}
          </div>
        )}

        {qaHistory.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {qaHistory.map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md space-y-2"
              >
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Q: {item.question}
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {item.answer}
                </p>
                {item.citedFacts.length > 0 && (
                  <div className="pt-1.5 border-t border-slate-200/70 dark:border-slate-800">
                    <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      Cited Dataset Facts ({item.generatedBy})
                    </div>
                    <ul className="mt-1 space-y-0.5 text-[11px] font-mono text-slate-600 dark:text-slate-400 list-disc pl-4">
                      {item.citedFacts.map((fact, fIdx) => (
                        <li key={fIdx}>{fact}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Executive Summary & Conclusion */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Executive Summary
          </h2>
          <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {ai.executiveSummary}
          </p>
        </div>

        {activeAnalysis.reviewedNotes && (
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md">
            <div className="text-xs font-semibold text-blue-700 dark:text-cyan-400">
              Statedge Analyst Review Notes
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
              {activeAnalysis.reviewedNotes}
            </p>
          </div>
        )}
      </section>

      {/* Strict Separation: Calculated Facts vs Assumptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-3">
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Verified Calculated Facts (Reproducible from Dataset)
          </div>
          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed list-disc pl-4">
            {ai.calculatedFacts.map((fact, idx) => (
              <li key={idx}>{fact}</li>
            ))}
          </ul>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-3">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Analytical Scope & Assumptions
          </div>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed list-disc pl-4">
            {ai.assumptions.map((assump, idx) => (
              <li key={idx}>{assump}</li>
            ))}
          </ul>
        </section>
      </div>

      {/* Findings & Identified Problems */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Key Analytical Findings
          </h2>
          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed list-disc pl-4">
            {ai.keyFindings.map((finding, idx) => (
              <li key={idx}>{finding}</li>
            ))}
          </ul>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-3">
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">
            Identified Business Problems & Risks
          </h2>
          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed list-disc pl-4">
            {ai.identifiedProblems.map((prob, idx) => (
              <li key={idx}>{prob}</li>
            ))}
          </ul>
        </section>
      </div>

      {/* Actionable Recommendations */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Actionable Business Recommendations
          </h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {ai.recommendations.map((rec, idx) => (
            <div key={idx} className="px-6 py-4 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`font-semibold ${
                    rec.priority === 'High'
                      ? 'text-red-700 dark:text-red-400'
                      : rec.priority === 'Medium'
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {rec.priority} Priority
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-slate-600 dark:text-slate-400">
                  Expected Impact: {rec.expectedImpact}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{rec.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {rec.rationale}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Statistical Anomalies Table (if any) */}
      {m.anomalies.length > 0 && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Flagged Statistical Outliers (|z| &ge; 2.2)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <th className="py-2.5 px-6">Row #</th>
                  <th className="py-2.5 px-4">Item / Label</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4 text-right">Z-Score</th>
                  <th className="py-2.5 px-6">Diagnostic Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {m.anomalies.map((anom) => (
                  <tr key={anom.rowIndex}>
                    <td className="py-2.5 px-6 font-mono tabular-nums">{anom.rowIndex}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">
                      {anom.label}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                      {formatNaira(anom.value)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-amber-700 dark:text-amber-400">
                      {anom.zScore.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-6 text-slate-600 dark:text-slate-300">
                      {anom.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Conclusion */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Conclusion</h2>
        <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {ai.conclusion}
        </p>
      </section>
    </div>
  );
}
