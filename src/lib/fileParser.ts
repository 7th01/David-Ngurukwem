import * as XLSX from 'xlsx';

export interface ParsedSpreadsheet {
  fileName: string;
  fileType: 'csv' | 'xlsx';
  sheetNames: string[];
  rows: Record<string, unknown>[];
}

export async function parseUploadedSpreadsheet(file: File): Promise<ParsedSpreadsheet> {
  const lower = file.name.toLowerCase();
  const isCsv = lower.endsWith('.csv');
  const isXlsx = lower.endsWith('.xlsx') || lower.endsWith('.xls');

  if (!isCsv && !isXlsx) {
    throw new Error('Unsupported file format. Please upload a .csv or .xlsx spreadsheet.');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File exceeds the 10 MB upload limit.');
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded workbook contains no sheets.');
  }

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
    defval: '',
    raw: false,
  });

  if (jsonRows.length === 0) {
    throw new Error('The uploaded file has a header or is empty—no data rows found.');
  }

  return {
    fileName: file.name,
    fileType: isCsv ? 'csv' : 'xlsx',
    sheetNames: workbook.SheetNames,
    rows: jsonRows,
  };
}
