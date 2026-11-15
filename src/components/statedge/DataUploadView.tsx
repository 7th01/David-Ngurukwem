import { ChangeEvent, useRef, useState } from 'react';
import { Check, Download, Play, Trash2, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  CleaningAndMappingConfig,
  ColumnProfile,
  DEMO_DATASET_ROWS,
  profileDatasetRows,
  QualitySummary,
} from '../../lib/dataProcessor';
import { parseUploadedSpreadsheet } from '../../lib/fileParser';
import { DatasetRecord } from '../../types/statedge';

interface DataUploadViewProps {
  datasets: DatasetRecord[];
  isDemo: boolean;
  busy: boolean;
  onSaveAndAnalyze: (payload: {
    name: string;
    originalFileName: string;
    fileType: 'csv' | 'xlsx';
    rows: Record<string, unknown>[];
    cleaningConfig: CleaningAndMappingConfig;
    requestAdminReview: boolean;
    isDemoUpload: boolean;
  }) => Promise<void>;
  onAnalyzeExisting: (
    dataset: DatasetRecord,
    cleaningConfig: CleaningAndMappingConfig,
    requestAdminReview: boolean
  ) => Promise<void>;
  onDeleteDataset: (datasetId: number) => Promise<void>;
}

export function DataUploadView({
  datasets,
  isDemo,
  busy,
  onSaveAndAnalyze,
  onAnalyzeExisting,
  onDeleteDataset,
}: DataUploadViewProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [stagedFile, setStagedFile] = useState<{
    name: string;
    originalFileName: string;
    fileType: 'csv' | 'xlsx';
    rows: Record<string, unknown>[];
    columns: ColumnProfile[];
    quality: QualitySummary;
    config: CleaningAndMappingConfig;
    isDemoUpload: boolean;
  } | null>(null);

  const [requestAdminReview, setRequestAdminReview] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const stageRows = (
    rows: Record<string, unknown>[],
    fileName: string,
    fileType: 'csv' | 'xlsx',
    isDemoUpload: boolean
  ) => {
    const profile = profileDatasetRows(rows);
    setStagedFile({
      name: fileName.replace(/\.(csv|xlsx|xls)$/i, ''),
      originalFileName: fileName,
      fileType,
      rows,
      columns: profile.columns,
      quality: profile.quality,
      config: profile.suggestedMapping,
      isDemoUpload,
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const parsed = await parseUploadedSpreadsheet(file);
      stageRows(parsed.rows, parsed.fileName, parsed.fileType, false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to parse file.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleLoadDemoLedger = () => {
    setUploadError(null);
    stageRows(
      DEMO_DATASET_ROWS,
      'Nigerian_Retail_Pharmacy_Demo_Ledger.xlsx',
      'xlsx',
      true
    );
  };

  const handleDownloadSampleTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet(DEMO_DATASET_ROWS.slice(0, 8));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales_Ledger');
    XLSX.writeFile(workbook, 'Statedge_Sample_Business_Template.xlsx');
  };

  const toggleColumn = (colName: string) => {
    if (!stagedFile) return;
    const exists = stagedFile.config.selectedColumns.includes(colName);
    const nextCols = exists
      ? stagedFile.config.selectedColumns.filter((c) => c !== colName)
      : [...stagedFile.config.selectedColumns, colName];
    setStagedFile({
      ...stagedFile,
      config: { ...stagedFile.config, selectedColumns: nextCols },
    });
  };

  const handleRunStaged = async () => {
    if (!stagedFile) return;
    setUploadError(null);
    try {
      await onSaveAndAnalyze({
        name: stagedFile.name,
        originalFileName: stagedFile.originalFileName,
        fileType: stagedFile.fileType,
        rows: stagedFile.rows,
        cleaningConfig: stagedFile.config,
        requestAdminReview,
        isDemoUpload: stagedFile.isDemoUpload,
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Analysis failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Dropzone & Demo Loader */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              Data Upload & Validation Centre
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Upload Excel (.xlsx) or CSV (.csv) business records. Original files are preserved untouched; cleaning rules apply non-destructively.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadSampleTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Download Sample .xlsx Template
            </button>
            <button
              type="button"
              onClick={handleLoadDemoLedger}
              className="px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              Load Demonstration Ledger
            </button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full py-8 px-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors flex flex-col items-center justify-center gap-2 text-center"
        >
          <Upload className="w-5 h-5 text-blue-600 dark:text-cyan-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            Select Excel (.xlsx) or CSV (.csv) file
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Validates schema, detects duplicates, flags missing cells & data type mismatches
          </span>
        </button>

        {uploadError && (
          <div role="alert" className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-4 py-2.5">
            {uploadError}
          </div>
        )}
      </section>

      {/* Staged Dataset Validation, Cleaning & Column Mapping */}
      {stagedFile && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-xs font-medium text-blue-700 dark:text-cyan-400">
                Validated Preview · {stagedFile.originalFileName}
                {stagedFile.isDemoUpload && ' (Demonstration Data)'}
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mt-0.5">
                Data Quality Audit & Non-Destructive Cleaning
              </h2>
            </div>

            <button
              type="button"
              onClick={handleRunStaged}
              disabled={busy || stagedFile.config.selectedColumns.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              <Play className="w-3.5 h-3.5" aria-hidden="true" />
              {busy ? 'Running AI Analyst...' : 'Save & Generate AI Analysis'}
            </button>
          </div>

          {/* Quality Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md">
              <div className="text-slate-500 dark:text-slate-400">Rows Detected</div>
              <div className="mt-1 font-mono tabular-nums text-lg font-semibold text-slate-900 dark:text-white">
                {stagedFile.quality.totalRows.toLocaleString()}
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md">
              <div className="text-slate-500 dark:text-slate-400">Duplicate Records</div>
              <div className="mt-1 font-mono tabular-nums text-lg font-semibold text-amber-700 dark:text-amber-400">
                {stagedFile.quality.duplicateCount.toLocaleString()}
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md">
              <div className="text-slate-500 dark:text-slate-400">Missing Cells</div>
              <div className="mt-1 font-mono tabular-nums text-lg font-semibold text-slate-900 dark:text-white">
                {stagedFile.quality.totalMissingCells.toLocaleString()}
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md">
              <div className="text-slate-500 dark:text-slate-400">Type Warnings</div>
              <div className="mt-1 font-mono tabular-nums text-lg font-semibold text-slate-900 dark:text-white">
                {stagedFile.quality.typeWarnings.length}
              </div>
            </div>
          </div>

          {stagedFile.quality.typeWarnings.length > 0 && (
            <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-3 space-y-1">
              {stagedFile.quality.typeWarnings.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
          )}

          {/* Column Profiling & Selection */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Column Profiling & Inclusion (select columns to include in analysis)
            </div>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-md">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    <th className="py-2 px-4">Include</th>
                    <th className="py-2 px-4">Column Name</th>
                    <th className="py-2 px-4">Detected Type</th>
                    <th className="py-2 px-4 text-right">Missing</th>
                    <th className="py-2 px-4 text-right">Type Mismatches</th>
                    <th className="py-2 px-4">Sample Values</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stagedFile.columns.map((col) => {
                    const checked = stagedFile.config.selectedColumns.includes(col.name);
                    return (
                      <tr key={col.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-4">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleColumn(col.name)}
                            aria-label={`Include column ${col.name}`}
                          />
                        </td>
                        <td className="py-2 px-4 font-medium text-slate-900 dark:text-white">
                          {col.name}
                        </td>
                        <td className="py-2 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {col.inferredType}
                        </td>
                        <td className="py-2 px-4 text-right font-mono tabular-nums">
                          {col.missingCount}
                        </td>
                        <td className="py-2 px-4 text-right font-mono tabular-nums">
                          {col.typeMismatchCount}
                        </td>
                        <td className="py-2 px-4 text-slate-500 dark:text-slate-400 truncate max-w-xs">
                          {col.sampleValues.join(' · ')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cleaning Options & Semantic Mapping */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Dataset Title
              </label>
              <input
                type="text"
                value={stagedFile.name}
                onChange={(e) => setStagedFile({ ...stagedFile, name: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Missing Value Strategy
              </label>
              <select
                value={stagedFile.config.missingStrategy}
                onChange={(e) =>
                  setStagedFile({
                    ...stagedFile,
                    config: {
                      ...stagedFile.config,
                      missingStrategy: e.target.value as CleaningAndMappingConfig['missingStrategy'],
                    },
                  })
                }
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
              >
                <option value="impute_zero">Treat missing numbers as 0</option>
                <option value="drop_rows">Exclude rows missing date/revenue</option>
                <option value="keep">Keep raw records as-is</option>
              </select>
            </div>

            <div className="flex flex-col justify-end gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={stagedFile.config.deduplicate}
                  onChange={(e) =>
                    setStagedFile({
                      ...stagedFile,
                      config: { ...stagedFile.config, deduplicate: e.target.checked },
                    })
                  }
                />
                Remove duplicate rows during analysis
              </label>
              {!isDemo && (
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={requestAdminReview}
                    onChange={(e) => setRequestAdminReview(e.target.checked)}
                  />
                  Submit for Statedge Analyst review
                </label>
              )}
            </div>
          </div>

          {/* Semantic Column Role Mapping */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            {(
              [
                { key: 'dateColumn', label: 'Date Column' },
                { key: 'revenueColumn', label: 'Revenue Column' },
                { key: 'expenseColumn', label: 'Expense Column' },
                { key: 'categoryColumn', label: 'Category Column' },
                { key: 'productColumn', label: 'Product Column' },
                { key: 'quantityColumn', label: 'Quantity Column' },
              ] as const
            ).map((field) => (
              <div key={field.key}>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {field.label}
                </label>
                <select
                  value={stagedFile.config[field.key] ?? ''}
                  onChange={(e) =>
                    setStagedFile({
                      ...stagedFile,
                      config: {
                        ...stagedFile.config,
                        [field.key]: e.target.value || null,
                      },
                    })
                  }
                  className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md"
                >
                  <option value="">None</option>
                  {stagedFile.columns.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Raw Rows Preview (First 8 rows) */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Original File Preview (first 8 rows · read-only)
            </div>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-md">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    {stagedFile.columns.map((c) => (
                      <th key={c.name} className="py-2 px-3 whitespace-nowrap">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stagedFile.rows.slice(0, 8).map((row, idx) => (
                    <tr key={idx}>
                      {stagedFile.columns.map((c) => (
                        <td
                          key={c.name}
                          className="py-1.5 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300"
                        >
                          {String(row[c.name] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Saved Datasets Repository */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Saved Workspace Datasets ({datasets.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Original uploaded files remain immutable; re-run AI analysis anytime
          </p>
        </div>

        {datasets.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No datasets saved yet. Upload a CSV/XLSX file or load the demonstration ledger above.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {datasets.map((ds) => (
              <div
                key={ds.id}
                className="px-6 py-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {ds.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    {ds.originalFileName} · {ds.fileType.toUpperCase()} ·{' '}
                    {ds.rowCount.toLocaleString()} rows × {ds.columnCount} cols ·{' '}
                    {ds.qualitySummaryJson?.duplicateCount ?? 0} duplicates flagged
                    {ds.isDemo ? ' · Demonstration Data' : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      onAnalyzeExisting(
                        ds,
                        ds.cleanedConfigJson || profileDatasetRows(ds.rawRowsJson || []).suggestedMapping,
                        false
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-md transition-colors whitespace-nowrap"
                  >
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    Re-Run AI Analysis
                  </button>

                  {!isDemo && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onDeleteDataset(ds.id)}
                      className="p-1.5 text-slate-500 hover:text-red-600 border border-slate-200 dark:border-slate-700 rounded-md transition-colors"
                      aria-label={`Delete dataset ${ds.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
