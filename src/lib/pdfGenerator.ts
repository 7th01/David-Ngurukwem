import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CalculatedMetrics } from './dataProcessor';
import { AiAnalysisOutput } from './gemini';

function fmtNgn(val: number): string {
  return `NGN ${val.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

export function downloadExecutivePdfReport(params: {
  reportTitle: string;
  businessName: string;
  industry: string;
  location: string;
  metrics: CalculatedMetrics;
  interpretation: AiAnalysisOutput;
  analystNotes?: string;
  isDemo?: boolean;
}) {
  const { reportTitle, businessName, industry, location, metrics, interpretation, analystNotes, isDemo } =
    params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header Banner (Deep Navy)
  doc.setFillColor(11, 31, 59);
  doc.rect(0, 0, 210, 34, 'F');
  doc.setFillColor(6, 182, 212);
  doc.rect(0, 34, 210, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('STATEDGE INTELLIGENCE', 14, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Statedge Data Analytics · Turning Data into Better Decisions', 14, 20);
  doc.text(
    `Generated: ${new Date().toISOString().slice(0, 10)}${isDemo ? ' · DEMONSTRATION DATA' : ''}`,
    14,
    27
  );

  let y = 44;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(reportTitle, 14, y);
  y += 7;

  // 1. Business Overview
  doc.setFontSize(11);
  doc.text('1. Business Overview', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    `Client: ${businessName} | Industry: ${industry} | Location: ${location} | Dataset: ${metrics.datasetName} (${metrics.analyzedRowCount.toLocaleString()} cleaned records)`,
    14,
    y,
    { maxWidth: 182 }
  );
  y += 11;

  // 2. Executive Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. Executive Summary', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const execLines = doc.splitTextToSize(interpretation.executiveSummary, 182);
  doc.text(execLines, 14, y);
  y += execLines.length * 4.8 + 4;

  // 3. Key Performance Indicators
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. Key Performance Indicators', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Verified Value', 'Context']],
    body: [
      ['Total Revenue', fmtNgn(metrics.totalRevenue), `${metrics.totalTransactions} transactions`],
      ['Total Expenses', fmtNgn(metrics.totalExpenses), metrics.expenseColumn ? `Mapped from ${metrics.expenseColumn}` : 'Not mapped'],
      ['Estimated Profit', fmtNgn(metrics.estimatedProfit), `${metrics.profitMarginPct.toFixed(1)}% operating margin`],
      ['Avg Transaction Value', fmtNgn(metrics.avgTransactionValue), `${metrics.dateRangeStart || 'N/A'} to ${metrics.dateRangeEnd || 'N/A'}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [11, 31, 59], fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    margin: { left: 14, right: 14 },
  });

  // @ts-expect-error jspdf-autotable attaches lastAutoTable
  y = doc.lastAutoTable.finalY + 8;

  // 4. Data Analysis (Category Breakdown)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. Data Analysis (Category Performance)', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['Category', 'Transactions', 'Revenue', 'Expenses', 'Share %']],
    body: metrics.categoryBreakdown.slice(0, 8).map((c) => [
      c.category,
      c.count.toLocaleString(),
      fmtNgn(c.revenue),
      fmtNgn(c.expenses),
      `${c.sharePct.toFixed(1)}%`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [29, 78, 216], fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5 },
    margin: { left: 14, right: 14 },
  });

  // @ts-expect-error jspdf-autotable attaches lastAutoTable
  y = doc.lastAutoTable.finalY + 8;

  const ensureSpace = (needed = 30) => {
    if (y + needed > 278) {
      doc.addPage();
      y = 18;
    }
  };

  // 5. Visualisations (Vector Revenue vs Expense Chart across periods)
  const chartPeriods = metrics.trendSeries.slice(-8);
  if (chartPeriods.length > 0) {
    ensureSpace(58);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('5. Visualisations (Period Revenue vs. Expenses)', 14, y);
    y += 5;

    // Legend
    doc.setFillColor(29, 78, 216);
    doc.rect(14, y, 4, 3, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Revenue', 20, y + 2.6);

    doc.setFillColor(245, 158, 11);
    doc.rect(42, y, 4, 3, 'F');
    doc.text('Expenses', 48, y + 2.6);
    y += 7;

    const chartX = 16;
    const chartW = 178;
    const chartH = 34;
    const maxV = Math.max(1, ...chartPeriods.flatMap((p) => [p.revenue, p.expenses]));
    const slotW = chartW / chartPeriods.length;
    const barW = Math.min(8, slotW * 0.34);

    // Baseline
    doc.setDrawColor(203, 213, 225);
    doc.line(chartX, y + chartH, chartX + chartW, y + chartH);

    chartPeriods.forEach((p, idx) => {
      const center = chartX + (idx + 0.5) * slotW;
      const revH = (p.revenue / maxV) * chartH;
      const expH = (p.expenses / maxV) * chartH;

      doc.setFillColor(29, 78, 216);
      doc.rect(center - barW - 0.5, y + chartH - revH, barW, Math.max(0.8, revH), 'F');

      doc.setFillColor(245, 158, 11);
      doc.rect(center + 0.5, y + chartH - expH, barW, Math.max(0.8, expH), 'F');

      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(p.period, center, y + chartH + 4, { align: 'center' });
    });

    doc.setTextColor(15, 23, 42);
    y += chartH + 11;
  }

  // 6. Important Findings (Calculated Facts vs Assumptions)
  ensureSpace(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('6. Important Findings (Calculated Facts & Assumptions)', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  for (const item of [...interpretation.calculatedFacts, ...interpretation.keyFindings]) {
    ensureSpace(12);
    const lines = doc.splitTextToSize(`• ${item}`, 180);
    doc.text(lines, 15, y);
    y += lines.length * 4.5 + 1.5;
  }

  ensureSpace(20);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  for (const a of interpretation.assumptions) {
    ensureSpace(10);
    const lines = doc.splitTextToSize(`Assumption: ${a}`, 180);
    doc.text(lines, 15, y);
    y += lines.length * 4.2 + 1;
  }
  y += 4;

  // 7. Identified Business Problems
  ensureSpace(28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('7. Identified Business Problems', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (const prob of interpretation.identifiedProblems) {
    ensureSpace(12);
    const lines = doc.splitTextToSize(`• ${prob}`, 180);
    doc.text(lines, 15, y);
    y += lines.length * 4.5 + 1.5;
  }
  y += 3;

  // 8. Recommendations
  ensureSpace(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('8. Strategic Recommendations', 14, y);
  y += 3;
  autoTable(doc, {
    startY: y,
    head: [['Priority', 'Recommendation', 'Rationale', 'Expected Impact']],
    body: interpretation.recommendations.map((r) => [
      r.priority,
      r.title,
      r.rationale,
      r.expectedImpact,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [11, 31, 59], fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  // @ts-expect-error jspdf-autotable attaches lastAutoTable
  y = doc.lastAutoTable.finalY + 8;

  // 9. Conclusion
  ensureSpace(28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('9. Conclusion', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const concLines = doc.splitTextToSize(interpretation.conclusion, 182);
  doc.text(concLines, 14, y);
  y += concLines.length * 4.8 + 4;

  if (analystNotes) {
    ensureSpace(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('Statedge Analyst Review Notes:', 14, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(analystNotes, 182);
    doc.text(noteLines, 14, y);
  }

  doc.save(`${businessName.replace(/[^a-z0-9]+/gi, '_')}_Statedge_Report.pdf`);
}

export function downloadPaymentReceiptPdf(params: {
  receiptNumber: string;
  reference: string;
  businessName: string;
  amountNgn: number;
  gateway: string;
  paymentType: string;
  verifiedAt: string;
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  doc.setFillColor(11, 31, 59);
  doc.rect(0, 0, 148, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('STATEDGE DATA ANALYTICS', 12, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Official Payment Receipt · Statedge Intelligence', 12, 18);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Receipt: ${params.receiptNumber}`, 12, 38);

  autoTable(doc, {
    startY: 44,
    head: [['Field', 'Value']],
    body: [
      ['Business Client', params.businessName],
      ['Transaction Reference', params.reference],
      ['Payment Gateway', params.gateway.toUpperCase()],
      ['Payment Type', params.paymentType],
      ['Amount Paid', fmtNgn(params.amountNgn)],
      ['Verification Status', 'VERIFIED'],
      ['Verified Date', params.verifiedAt.slice(0, 10)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [11, 31, 59], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 12, right: 12 },
  });

  doc.save(`${params.receiptNumber}.pdf`);
}
