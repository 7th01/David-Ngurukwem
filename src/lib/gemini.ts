import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

export function getGeminiClient(): GoogleGenAI {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface CalculatedDatasetMetrics {
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
  trendSeries: { period: string; revenue: number; expenses: number; profit: number; count: number }[];
  categoryBreakdown: { category: string; revenue: number; expenses: number; sharePct: number; count: number }[];
  productPerformance: { product: string; revenue: number; quantity: number; sharePct: number }[];
  anomalies: { rowIndex: number; label: string; value: number; zScore: number; reason: string }[];
  cleaningApplied: {
    deduplicate: boolean;
    removedDuplicates: number;
    missingStrategy: string;
    selectedColumnsCount: number;
  };
}

export interface AiAnalysisOutput {
  calculatedFacts: string[];
  assumptions: string[];
  executiveSummary: string;
  keyFindings: string[];
  identifiedProblems: string[];
  recommendations: {
    priority: 'High' | 'Medium' | 'Low';
    title: string;
    rationale: string;
    expectedImpact: string;
  }[];
  conclusion: string;
  generatedBy: 'gemini-4-hydrogen' | 'deterministic-fallback';
}

export async function generateGroundedAiInterpretation(
  metrics: CalculatedDatasetMetrics
): Promise<AiAnalysisOutput> {
  const calculatedFacts: string[] = [
    `Analyzed ${metrics.analyzedRowCount.toLocaleString()} cleaned records from "${metrics.datasetName}" (${metrics.rowCount.toLocaleString()} raw rows).`,
    `Total calculated revenue: ₦${metrics.totalRevenue.toLocaleString('en-NG', { maximumFractionDigits: 2 })}.`,
    `Total calculated expenses: ₦${metrics.totalExpenses.toLocaleString('en-NG', { maximumFractionDigits: 2 })}.`,
    `Estimated operating profit: ₦${metrics.estimatedProfit.toLocaleString('en-NG', { maximumFractionDigits: 2 })} (${metrics.profitMarginPct.toFixed(1)}% margin).`,
    `Average transaction value across ${metrics.totalTransactions.toLocaleString()} transactions: ₦${metrics.avgTransactionValue.toLocaleString('en-NG', { maximumFractionDigits: 2 })}.`,
  ];

  if (metrics.categoryBreakdown.length > 0) {
    const topCat = metrics.categoryBreakdown[0];
    calculatedFacts.push(
      `Top category "${topCat.category}" contributed ${topCat.sharePct.toFixed(1)}% of revenue (₦${topCat.revenue.toLocaleString('en-NG')}).`
    );
  }
  if (metrics.anomalies.length > 0) {
    calculatedFacts.push(
      `Detected ${metrics.anomalies.length} statistical outlier record(s) (|z| >= 2.2), led by "${metrics.anomalies[0].label}" at ₦${metrics.anomalies[0].value.toLocaleString('en-NG')}.`
    );
  }

  const assumptions: string[] = [
    metrics.expenseColumn
      ? `Expense figures are summed directly from mapped column "${metrics.expenseColumn}".`
      : 'No explicit expense column was mapped; expense values default to ₦0 unless provided in the dataset.',
    `Currency figures are interpreted in Nigerian Naira (₦ / NGN) matching the business profile.`,
    `Cleaning rules applied: deduplicate=${metrics.cleaningApplied.deduplicate} (${metrics.cleaningApplied.removedDuplicates} rows removed), missing-value strategy="${metrics.cleaningApplied.missingStrategy}".`,
  ];

  if (!apiKey) {
    return buildDeterministicInterpretation(metrics, calculatedFacts, assumptions);
  }

  try {
    const ai = getGeminiClient();
    const prompt = `You are the Senior Principal Data Scientist at Statedge Intelligence (Nigeria).
Analyze ONLY the verified, pre-calculated metrics below for "${metrics.businessName}" (Industry: ${metrics.industry}).
STRICT GROUNDING RULES:
1. NEVER invent, extrapolate, or alter any financial figure, percentage, date, or product name. Use ONLY exact numbers present in the JSON below.
2. Distinguish clearly between verified facts, assumptions, identified business problems, and actionable recommendations tailored to Nigerian business realities (cashflow, FX/supplier costs, inventory velocity, branch/product concentration).
3. Write clear, executive-ready prose in Naira (₦).

PRE-CALCULATED METRICS JSON:
${JSON.stringify(metrics, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are a rigorous Nigerian business intelligence analyst. Every claim must cite the exact calculated figures provided. Return valid JSON matching the schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            keyFindings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            identifiedProblems: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  priority: { type: Type.STRING },
                  title: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                  expectedImpact: { type: Type.STRING },
                },
              },
            },
            conclusion: { type: Type.STRING },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const recs = Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map((r: { priority?: string; title?: string; rationale?: string; expectedImpact?: string }) => ({
          priority:
            r.priority === 'High' || r.priority === 'Low' ? r.priority : ('Medium' as const),
          title: String(r.title || 'Operational Optimization'),
          rationale: String(r.rationale || ''),
          expectedImpact: String(r.expectedImpact || ''),
        }))
      : [];

    return {
      calculatedFacts,
      assumptions,
      executiveSummary:
        String(parsed.executiveSummary || '') ||
        buildDeterministicInterpretation(metrics, calculatedFacts, assumptions).executiveSummary,
      keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings.map(String) : [],
      identifiedProblems: Array.isArray(parsed.identifiedProblems)
        ? parsed.identifiedProblems.map(String)
        : [],
      recommendations: recs,
      conclusion: String(parsed.conclusion || ''),
      generatedBy: 'gemini-4-hydrogen',
    };
  } catch (error) {
    console.error('Gemini interpretation fallback triggered:', error);
    return buildDeterministicInterpretation(metrics, calculatedFacts, assumptions);
  }
}

function buildDeterministicInterpretation(
  metrics: CalculatedDatasetMetrics,
  calculatedFacts: string[],
  assumptions: string[]
): AiAnalysisOutput {
  const topCategory = metrics.categoryBreakdown[0];
  const secondCategory = metrics.categoryBreakdown[1];
  const topProduct = metrics.productPerformance[0];
  const lowMargin = metrics.profitMarginPct < 15;

  const keyFindings = [
    `Across ${metrics.analyzedRowCount.toLocaleString()} validated transactions, ${metrics.businessName} generated ₦${metrics.totalRevenue.toLocaleString('en-NG')} in revenue against ₦${metrics.totalExpenses.toLocaleString('en-NG')} in recorded expenses.`,
    topCategory
      ? `"${topCategory.category}" is the primary revenue driver at ₦${topCategory.revenue.toLocaleString('en-NG')} (${topCategory.sharePct.toFixed(1)}% of total revenue).`
      : 'Revenue distribution spans the full transaction log.',
    topProduct
      ? `"${topProduct.product}" leads product volume with ${topProduct.quantity.toLocaleString()} units sold (₦${topProduct.revenue.toLocaleString('en-NG')}).`
      : `Average transaction ticket stands at ₦${metrics.avgTransactionValue.toLocaleString('en-NG')}.`,
  ];

  const identifiedProblems: string[] = [];
  if (lowMargin) {
    identifiedProblems.push(
      `Compressed operating margin of ${metrics.profitMarginPct.toFixed(1)}% indicates elevated direct cost or overhead relative to top-line sales.`
    );
  }
  if (topCategory && topCategory.sharePct > 55) {
    identifiedProblems.push(
      `Revenue concentration risk: "${topCategory.category}" accounts for ${topCategory.sharePct.toFixed(1)}% of total sales, leaving revenue exposed to single-category disruption.`
    );
  }
  if (metrics.anomalies.length > 0) {
    identifiedProblems.push(
      `${metrics.anomalies.length} anomalous transaction(s) detected (e.g., "${metrics.anomalies[0].label}" at ₦${metrics.anomalies[0].value.toLocaleString('en-NG')}, z=${metrics.anomalies[0].zScore.toFixed(1)}), requiring audit verification.`
    );
  }
  if (identifiedProblems.length === 0) {
    identifiedProblems.push(
      'No severe margin compression or statistical anomalies detected; primary focus should be scaling top-converting segments.'
    );
  }

  return {
    calculatedFacts,
    assumptions,
    executiveSummary: `${metrics.businessName} recorded ₦${metrics.totalRevenue.toLocaleString('en-NG')} in total revenue and ₦${metrics.estimatedProfit.toLocaleString('en-NG')} in estimated profit (${metrics.profitMarginPct.toFixed(1)}% margin) across ${metrics.totalTransactions.toLocaleString()} transactions.`,
    keyFindings,
    identifiedProblems,
    recommendations: [
      {
        priority: 'High',
        title: topCategory
          ? `Protect Stock Availability & Supplier Pricing for "${topCategory.category}"`
          : 'Audit Top Revenue Drivers and Supplier Cost',
        rationale: topCategory
          ? `${topCategory.category} drives ${topCategory.sharePct.toFixed(1)}% of revenue (₦${topCategory.revenue.toLocaleString('en-NG')}).`
          : 'Core revenue items determine cashflow stability.',
        expectedImpact: 'Stabilizes working capital and prevents high-margin stockouts.',
      },
      {
        priority: lowMargin ? 'High' : 'Medium',
        title: lowMargin
          ? 'Re-price Low-Margin SKUs & Audit Expense Leakage'
          : 'Cross-Sell Secondary Categories',
        rationale: secondCategory
          ? `"${secondCategory.category}" currently contributes ${secondCategory.sharePct.toFixed(1)}% of sales.`
          : `Current net margin sits at ${metrics.profitMarginPct.toFixed(1)}%.`,
        expectedImpact: 'Targets +3% to +5% operating margin improvement.',
      },
      {
        priority: metrics.anomalies.length > 0 ? 'High' : 'Low',
        title:
          metrics.anomalies.length > 0
            ? 'Verify Flagged Statistical Outlier Transactions'
            : 'Establish Weekly Automated Cashflow Reporting',
        rationale:
          metrics.anomalies.length > 0
            ? `${metrics.anomalies.length} transaction(s) deviated significantly (|z| >= 2.2) from the dataset mean.`
            : 'Consistent weekly tracking catches margin drift early.',
        expectedImpact: 'Improves ledger accuracy and audit readiness.',
      },
    ],
    conclusion: `Grounded in ${metrics.analyzedRowCount.toLocaleString()} verified records, ${metrics.businessName} shows an average transaction value of ₦${metrics.avgTransactionValue.toLocaleString('en-NG')} and ${metrics.profitMarginPct.toFixed(1)}% estimated operating margin. Executing the cost and category actions above will strengthen resilience.`,
    generatedBy: 'deterministic-fallback',
  };
}

export async function answerGroundedDatasetQuestion(
  metrics: CalculatedDatasetMetrics,
  question: string
): Promise<{
  answer: string;
  citedFacts: string[];
  generatedBy: 'gemini-4-hydrogen' | 'deterministic-fallback';
}> {
  const cleanQ = question.trim();
  if (!cleanQ) {
    throw new Error('Please enter an analytical question.');
  }

  const fallbackFacts = [
    `Total Revenue: ₦${metrics.totalRevenue.toLocaleString('en-NG')}`,
    `Total Expenses: ₦${metrics.totalExpenses.toLocaleString('en-NG')}`,
    `Estimated Profit: ₦${metrics.estimatedProfit.toLocaleString('en-NG')} (${metrics.profitMarginPct.toFixed(1)}%)`,
  ];

  if (!apiKey) {
    const topCat = metrics.categoryBreakdown[0];
    const topProd = metrics.productPerformance[0];
    return {
      answer: `Based strictly on ${metrics.analyzedRowCount} verified records for ${metrics.businessName}: Total Revenue is ₦${metrics.totalRevenue.toLocaleString('en-NG')}, Total Expenses are ₦${metrics.totalExpenses.toLocaleString('en-NG')}, and Estimated Profit is ₦${metrics.estimatedProfit.toLocaleString('en-NG')} (${metrics.profitMarginPct.toFixed(1)}% margin).${topCat ? ` The leading category is "${topCat.category}" at ₦${topCat.revenue.toLocaleString('en-NG')} (${topCat.sharePct.toFixed(1)}% share).` : ''}${topProd ? ` Top product is "${topProd.product}" with ${topProd.quantity} units sold.` : ''}`,
      citedFacts: fallbackFacts,
      generatedBy: 'deterministic-fallback',
    };
  }

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Business: ${metrics.businessName} (${metrics.industry})
User Question: ${cleanQ}

VERIFIED CALCULATED METRICS JSON:
${JSON.stringify(metrics, null, 2)}`,
      config: {
        systemInstruction:
          'You are Statedge AI Data Analyst. Answer the user question using ONLY the exact numbers and entities in the VERIFIED CALCULATED METRICS JSON. If a requested detail is not in the JSON, explicitly state that it is not present in the uploaded dataset. Never invent metrics. Return JSON with "answer" (string) and "citedFacts" (array of short factual strings).',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING },
            citedFacts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return {
      answer: String(parsed.answer || 'Unable to compute an answer from the current dataset.'),
      citedFacts: Array.isArray(parsed.citedFacts)
        ? parsed.citedFacts.map(String)
        : fallbackFacts,
      generatedBy: 'gemini-4-hydrogen',
    };
  } catch (error) {
    console.error('Grounded Q&A fallback triggered:', error);
    return {
      answer: `Based strictly on ${metrics.analyzedRowCount} verified records: Revenue is ₦${metrics.totalRevenue.toLocaleString('en-NG')}, Expenses are ₦${metrics.totalExpenses.toLocaleString('en-NG')}, and Estimated Profit is ₦${metrics.estimatedProfit.toLocaleString('en-NG')} (${metrics.profitMarginPct.toFixed(1)}%).`,
      citedFacts: fallbackFacts,
      generatedBy: 'deterministic-fallback',
    };
  }
}

