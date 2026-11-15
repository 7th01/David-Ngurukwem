export interface ColumnProfile {
  name: string;
  inferredType: 'number' | 'date' | 'text';
  missingCount: number;
  uniqueCount: number;
  typeMismatchCount: number;
  sampleValues: string[];
}

export interface QualitySummary {
  totalRows: number;
  totalColumns: number;
  duplicateCount: number;
  totalMissingCells: number;
  typeWarnings: string[];
}

export interface CleaningAndMappingConfig {
  selectedColumns: string[];
  deduplicate: boolean;
  missingStrategy: 'keep' | 'drop_rows' | 'impute_zero';
  dateColumn: string | null;
  revenueColumn: string | null;
  expenseColumn: string | null;
  categoryColumn: string | null;
  productColumn: string | null;
  quantityColumn: string | null;
}

export interface CalculatedMetrics {
  businessName: string;
  industry: string;
  datasetName: string;
  rowCount: number;
  analyzedRowCount: number;
  dateColumn: string | null;
  revenueColumn: string | null;
  expenseColumn: string | null;
  categoryColumn: string | null;
  productColumn: string | null;
  quantityColumn: string | null;
  totalRevenue: number;
  totalExpenses: number;
  estimatedProfit: number;
  profitMarginPct: number;
  totalTransactions: number;
  avgTransactionValue: number;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  trendSeries: {
    period: string;
    revenue: number;
    expenses: number;
    profit: number;
    count: number;
  }[];
  categoryBreakdown: {
    category: string;
    revenue: number;
    expenses: number;
    sharePct: number;
    count: number;
  }[];
  productPerformance: {
    product: string;
    revenue: number;
    quantity: number;
    sharePct: number;
  }[];
  anomalies: {
    rowIndex: number;
    label: string;
    value: number;
    zScore: number;
    reason: string;
  }[];
  cleaningApplied: {
    deduplicate: boolean;
    removedDuplicates: number;
    missingStrategy: string;
    selectedColumnsCount: number;
  };
}

export function parseNumericValue(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim();
  if (!str) return null;
  // Strip Naira symbol, USD, commas, spaces
  const cleaned = str.replace(/[₦$,\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function parseDateString(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim();
  if (!str || str.length < 6) return null;
  if (/^\d+(\.\d+)?$/.test(str)) return null;
  const dt = new Date(str);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

export function isCellMissing(raw: unknown): boolean {
  if (raw === null || raw === undefined) return true;
  const s = String(raw).trim();
  return s === '' || s.toLowerCase() === 'null' || s.toLowerCase() === 'n/a' || s === '-';
}

export function profileDatasetRows(rows: Record<string, unknown>[]): {
  columns: ColumnProfile[];
  quality: QualitySummary;
  suggestedMapping: CleaningAndMappingConfig;
} {
  if (rows.length === 0) {
    return {
      columns: [],
      quality: {
        totalRows: 0,
        totalColumns: 0,
        duplicateCount: 0,
        totalMissingCells: 0,
        typeWarnings: [],
      },
      suggestedMapping: {
        selectedColumns: [],
        deduplicate: true,
        missingStrategy: 'impute_zero',
        dateColumn: null,
        revenueColumn: null,
        expenseColumn: null,
        categoryColumn: null,
        productColumn: null,
        quantityColumn: null,
      },
    };
  }

  const colNames = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  // Detect duplicate rows via stable JSON fingerprint
  const seen = new Set<string>();
  let duplicateCount = 0;
  for (const row of rows) {
    const key = colNames.map((c) => String(row[c] ?? '').trim()).join('||');
    if (seen.has(key)) duplicateCount += 1;
    else seen.add(key);
  }

  let totalMissingCells = 0;
  const typeWarnings: string[] = [];
  const columns: ColumnProfile[] = colNames.map((name) => {
    let missingCount = 0;
    let numCount = 0;
    let dateCount = 0;
    let nonEmpty = 0;
    const uniqueSet = new Set<string>();
    const samples: string[] = [];

    for (const row of rows) {
      const val = row[name];
      if (isCellMissing(val)) {
        missingCount += 1;
        continue;
      }
      nonEmpty += 1;
      const str = String(val).trim();
      uniqueSet.add(str);
      if (samples.length < 3 && !samples.includes(str)) samples.push(str);

      if (parseNumericValue(val) !== null) numCount += 1;
      else if (parseDateString(val) !== null) dateCount += 1;
    }

    totalMissingCells += missingCount;

    let inferredType: 'number' | 'date' | 'text' = 'text';
    let typeMismatchCount = 0;

    if (nonEmpty > 0) {
      if (numCount / nonEmpty >= 0.65) {
        inferredType = 'number';
        typeMismatchCount = nonEmpty - numCount;
      } else if (dateCount / nonEmpty >= 0.65) {
        inferredType = 'date';
        typeMismatchCount = nonEmpty - dateCount;
      }
    }

    if (typeMismatchCount > 0) {
      typeWarnings.push(
        `Column "${name}" is predominantly ${inferredType} but contains ${typeMismatchCount} non-conforming value(s).`
      );
    }

    return {
      name,
      inferredType,
      missingCount,
      uniqueCount: uniqueSet.size,
      typeMismatchCount,
      sampleValues: samples,
    };
  });

  // Auto-detect semantic column roles
  const findCol = (type: 'number' | 'date' | 'text', patterns: RegExp[]): string | null => {
    for (const pat of patterns) {
      const match = columns.find((c) => c.inferredType === type && pat.test(c.name.toLowerCase()));
      if (match) return match.name;
    }
    return null;
  };

  const dateColumn =
    findCol('date', [/date/, /day/, /month/, /period/, /time/]) ||
    columns.find((c) => c.inferredType === 'date')?.name ||
    null;

  const revenueColumn =
    findCol('number', [/revenue/, /sales/, /total/, /amount/, /income/, /price/, /turnover/]) ||
    columns.find((c) => c.inferredType === 'number')?.name ||
    null;

  const expenseColumn = findCol('number', [/expense/, /cost/, /cogs/, /spend/, /overhead/]);
  const quantityColumn = findCol('number', [/qty/, /quantity/, /units/, /count/, /volume/]);
  const productColumn = findCol('text', [/product/, /item/, /sku/, /service/, /description/]);
  const categoryColumn =
    findCol('text', [/category/, /segment/, /department/, /branch/, /store/, /channel/]) ||
    columns.find((c) => c.inferredType === 'text' && c.name !== productColumn)?.name ||
    null;

  return {
    columns,
    quality: {
      totalRows: rows.length,
      totalColumns: columns.length,
      duplicateCount,
      totalMissingCells,
      typeWarnings,
    },
    suggestedMapping: {
      selectedColumns: colNames,
      deduplicate: true,
      missingStrategy: 'impute_zero',
      dateColumn,
      revenueColumn,
      expenseColumn,
      categoryColumn,
      productColumn,
      quantityColumn,
    },
  };
}

export function cleanAndCalculateMetrics(
  rawRows: Record<string, unknown>[],
  config: CleaningAndMappingConfig,
  meta: { businessName: string; industry: string; datasetName: string }
): CalculatedMetrics {
  // Never mutate rawRows!
  const selectedSet = new Set(
    config.selectedColumns.length > 0
      ? config.selectedColumns
      : Object.keys(rawRows[0] || {})
  );

  // 1. Optional deduplication
  let workingRows: Record<string, unknown>[] = [];
  let removedDuplicates = 0;
  const seen = new Set<string>();

  for (const row of rawRows) {
    const projected: Record<string, unknown> = {};
    for (const k of selectedSet) {
      projected[k] = row[k];
    }

    if (config.deduplicate) {
      const sig = Array.from(selectedSet)
        .map((c) => String(projected[c] ?? '').trim())
        .join('||');
      if (seen.has(sig)) {
        removedDuplicates += 1;
        continue;
      }
      seen.add(sig);
    }

    if (config.missingStrategy === 'drop_rows') {
      const hasMissingRequired =
        (config.revenueColumn && isCellMissing(projected[config.revenueColumn])) ||
        (config.dateColumn && isCellMissing(projected[config.dateColumn]));
      if (hasMissingRequired) continue;
    }

    workingRows.push(projected);
  }

  // 2. Deterministic financial & operational calculations
  let totalRevenue = 0;
  let totalExpenses = 0;
  const revValues: { rowIndex: number; label: string; value: number }[] = [];

  const trendMap = new Map<
    string,
    { period: string; revenue: number; expenses: number; profit: number; count: number }
  >();
  const categoryMap = new Map<
    string,
    { category: string; revenue: number; expenses: number; count: number }
  >();
  const productMap = new Map<string, { product: string; revenue: number; quantity: number }>();
  const dates: string[] = [];

  workingRows.forEach((row, idx) => {
    const revRaw = config.revenueColumn ? parseNumericValue(row[config.revenueColumn]) : null;
    const rev = revRaw !== null ? revRaw : config.missingStrategy === 'impute_zero' ? 0 : 0;

    const expRaw = config.expenseColumn ? parseNumericValue(row[config.expenseColumn]) : null;
    const exp = expRaw !== null ? expRaw : 0;

    const qtyRaw = config.quantityColumn ? parseNumericValue(row[config.quantityColumn]) : null;
    const qty = qtyRaw !== null ? qtyRaw : 1;

    const dateStr = config.dateColumn ? parseDateString(row[config.dateColumn]) : null;
    if (dateStr) dates.push(dateStr);

    const cat =
      config.categoryColumn && !isCellMissing(row[config.categoryColumn])
        ? String(row[config.categoryColumn]).trim()
        : 'Uncategorized';

    const prod =
      config.productColumn && !isCellMissing(row[config.productColumn])
        ? String(row[config.productColumn]).trim()
        : cat;

    totalRevenue += rev;
    totalExpenses += exp;
    revValues.push({ rowIndex: idx + 1, label: prod, value: rev });

    const periodKey = dateStr ? dateStr.slice(0, 7) : `Batch ${Math.floor(idx / 10) + 1}`;
    const existingPeriod = trendMap.get(periodKey) ?? {
      period: periodKey,
      revenue: 0,
      expenses: 0,
      profit: 0,
      count: 0,
    };
    existingPeriod.revenue += rev;
    existingPeriod.expenses += exp;
    existingPeriod.profit += rev - exp;
    existingPeriod.count += 1;
    trendMap.set(periodKey, existingPeriod);

    const existingCat = categoryMap.get(cat) ?? {
      category: cat,
      revenue: 0,
      expenses: 0,
      count: 0,
    };
    existingCat.revenue += rev;
    existingCat.expenses += exp;
    existingCat.count += 1;
    categoryMap.set(cat, existingCat);

    const existingProd = productMap.get(prod) ?? { product: prod, revenue: 0, quantity: 0 };
    existingProd.revenue += rev;
    existingProd.quantity += qty;
    productMap.set(prod, existingProd);
  });

  const estimatedProfit = totalRevenue - totalExpenses;
  const profitMarginPct = totalRevenue > 0 ? (estimatedProfit / totalRevenue) * 100 : 0;
  const totalTransactions = workingRows.length;
  const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Z-score outlier detection on revenue
  const mean = avgTransactionValue;
  const variance =
    revValues.length > 1
      ? revValues.reduce((acc, r) => acc + Math.pow(r.value - mean, 2), 0) / revValues.length
      : 0;
  const stdDev = Math.sqrt(variance);

  const anomalies =
    stdDev > 0
      ? revValues
          .map((r) => ({
            ...r,
            zScore: (r.value - mean) / stdDev,
          }))
          .filter((r) => Math.abs(r.zScore) >= 2.2)
          .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))
          .slice(0, 8)
          .map((r) => ({
            rowIndex: r.rowIndex,
            label: r.label,
            value: Number(r.value.toFixed(2)),
            zScore: Number(r.zScore.toFixed(2)),
            reason:
              r.zScore > 0
                ? 'Significantly above mean transaction value'
                : 'Significantly below mean transaction value',
          }))
      : [];

  const sortedDates = [...dates].sort();

  const trendSeries = Array.from(trendMap.values()).sort((a, b) =>
    a.period.localeCompare(b.period)
  );

  const categoryBreakdown = Array.from(categoryMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map((c) => ({
      ...c,
      sharePct: totalRevenue > 0 ? (c.revenue / totalRevenue) * 100 : 0,
    }));

  const productPerformance = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 12)
    .map((p) => ({
      ...p,
      sharePct: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0,
    }));

  return {
    businessName: meta.businessName,
    industry: meta.industry,
    datasetName: meta.datasetName,
    rowCount: rawRows.length,
    analyzedRowCount: workingRows.length,
    dateColumn: config.dateColumn,
    revenueColumn: config.revenueColumn,
    expenseColumn: config.expenseColumn,
    categoryColumn: config.categoryColumn,
    productColumn: config.productColumn,
    quantityColumn: config.quantityColumn,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalExpenses: Number(totalExpenses.toFixed(2)),
    estimatedProfit: Number(estimatedProfit.toFixed(2)),
    profitMarginPct: Number(profitMarginPct.toFixed(2)),
    totalTransactions,
    avgTransactionValue: Number(avgTransactionValue.toFixed(2)),
    dateRangeStart: sortedDates[0] ?? null,
    dateRangeEnd: sortedDates[sortedDates.length - 1] ?? null,
    trendSeries,
    categoryBreakdown,
    productPerformance,
    anomalies,
    cleaningApplied: {
      deduplicate: config.deduplicate,
      removedDuplicates,
      missingStrategy: config.missingStrategy,
      selectedColumnsCount: selectedSet.size,
    },
  };
}

// Clearly labeled Demonstration Dataset (Nigerian Retail & Supermarket Ledger)
export const DEMO_DATASET_ROWS: Record<string, unknown>[] = [
  { Date: '2026-06-04', Branch: 'Ikeja Flagship', Category: 'Staples & Grains', Product: 'Mama Gold Rice 50kg', Quantity: 42, Revenue_NGN: 3444000, Expense_NGN: 2940000, Payment_Method: 'POS Transfer' },
  { Date: '2026-06-09', Branch: 'Lekki Phase 1', Category: 'Beverages & Dairy', Product: 'Peak Milk Tin Carton', Quantity: 85, Revenue_NGN: 1615000, Expense_NGN: 1292000, Payment_Method: 'Card' },
  { Date: '2026-06-15', Branch: 'Ikeja Flagship', Category: 'Pharmaceuticals & OTC', Product: 'Coartem & Analgesic Pack', Quantity: 130, Revenue_NGN: 1170000, Expense_NGN: 780000, Payment_Method: 'Cash' },
  { Date: '2026-06-22', Branch: 'Abuja Wuse II', Category: 'Personal Care', Product: 'Dettol & Hygiene Bundle', Quantity: 95, Revenue_NGN: 997500, Expense_NGN: 712500, Payment_Method: 'POS Transfer' },
  { Date: '2026-07-03', Branch: 'Ikeja Flagship', Category: 'Staples & Grains', Product: 'Honeywell Semolina 10kg', Quantity: 110, Revenue_NGN: 1815000, Expense_NGN: 1485000, Payment_Method: 'POS Transfer' },
  { Date: '2026-07-11', Branch: 'Lekki Phase 1', Category: 'Beverages & Dairy', Product: 'Milo Refill 800g Case', Quantity: 64, Revenue_NGN: 1536000, Expense_NGN: 1190400, Payment_Method: 'Card' },
  { Date: '2026-07-18', Branch: 'Abuja Wuse II', Category: 'Pharmaceuticals & OTC', Product: 'Vitamin C & Zinc Strip Box', Quantity: 160, Revenue_NGN: 1280000, Expense_NGN: 832000, Payment_Method: 'POS Transfer' },
  { Date: '2026-07-26', Branch: 'Ikeja Flagship', Category: 'Cooking Oils', Product: 'Devon Kings Oil 25L', Quantity: 48, Revenue_NGN: 2640000, Expense_NGN: 2232000, Payment_Method: 'Bank Transfer' },
  { Date: '2026-08-05', Branch: 'Lekki Phase 1', Category: 'Staples & Grains', Product: 'Mama Gold Rice 50kg', Quantity: 58, Revenue_NGN: 4872000, Expense_NGN: 4176000, Payment_Method: 'Bank Transfer' },
  { Date: '2026-08-12', Branch: 'Abuja Wuse II', Category: 'Personal Care', Product: 'Nivea Body Lotion Case', Quantity: 72, Revenue_NGN: 1440000, Expense_NGN: 1008000, Payment_Method: 'Card' },
  { Date: '2026-08-19', Branch: 'Ikeja Flagship', Category: 'Beverages & Dairy', Product: 'Hollandia Yoghurt Pack', Quantity: 140, Revenue_NGN: 1680000, Expense_NGN: 1260000, Payment_Method: 'POS Transfer' },
  { Date: '2026-08-27', Branch: 'Lekki Phase 1', Category: 'Pharmaceuticals & OTC', Product: 'Blood Pressure Monitor Kit', Quantity: 28, Revenue_NGN: 1260000, Expense_NGN: 840000, Payment_Method: 'Card' },
  { Date: '2026-09-04', Branch: 'Ikeja Flagship', Category: 'Cooking Oils', Product: 'Devon Kings Oil 25L', Quantity: 62, Revenue_NGN: 3472000, Expense_NGN: 2945000, Payment_Method: 'Bank Transfer' },
  { Date: '2026-09-14', Branch: 'Abuja Wuse II', Category: 'Staples & Grains', Product: 'Mama Gold Rice 50kg', Quantity: 92, Revenue_NGN: 7912000, Expense_NGN: 6808000, Payment_Method: 'Bank Transfer' },
  { Date: '2026-09-21', Branch: 'Lekki Phase 1', Category: 'Beverages & Dairy', Product: 'Peak Milk Tin Carton', Quantity: 115, Revenue_NGN: 2242500, Expense_NGN: 1782500, Payment_Method: 'POS Transfer' },
  { Date: '2026-09-28', Branch: 'Ikeja Flagship', Category: 'Personal Care', Product: 'Dettol & Hygiene Bundle', Quantity: 120, Revenue_NGN: 1320000, Expense_NGN: 924000, Payment_Method: 'Cash' },
  { Date: '2026-10-06', Branch: 'Lekki Phase 1', Category: 'Pharmaceuticals & OTC', Product: 'Coartem & Analgesic Pack', Quantity: 175, Revenue_NGN: 1662500, Expense_NGN: 1085000, Payment_Method: 'POS Transfer' },
  { Date: '2026-10-13', Branch: 'Abuja Wuse II', Category: 'Cooking Oils', Product: 'Devon Kings Oil 25L', Quantity: 54, Revenue_NGN: 3078000, Expense_NGN: 2619000, Payment_Method: 'Bank Transfer' },
  { Date: '2026-10-22', Branch: 'Ikeja Flagship', Category: 'Staples & Grains', Product: 'Honeywell Semolina 10kg', Quantity: 135, Revenue_NGN: 2295000, Expense_NGN: 1863000, Payment_Method: 'POS Transfer' },
  { Date: '2026-10-29', Branch: 'Lekki Phase 1', Category: 'Beverages & Dairy', Product: 'Milo Refill 800g Case', Quantity: 88, Revenue_NGN: 2200000, Expense_NGN: 1694000, Payment_Method: 'Card' },
  { Date: '2026-11-04', Branch: 'Abuja Wuse II', Category: 'Personal Care', Product: 'Nivea Body Lotion Case', Quantity: 96, Revenue_NGN: 2016000, Expense_NGN: 1411200, Payment_Method: 'POS Transfer' },
  { Date: '2026-11-11', Branch: 'Ikeja Flagship', Category: 'Staples & Grains', Product: 'Mama Gold Rice 50kg', Quantity: 68, Revenue_NGN: 5916000, Expense_NGN: 5032000, Payment_Method: 'Bank Transfer' },
];
