import {buildCsv, csvDataUrl, csvFileName, PET_CSV_HEADER, petCsvRows, type CsvDelimiter, type CustomerPetsRecord} from '@minha-doggie/core';

export interface ExportFile {
  csv: string;
  dataUrl: string;
  fileName: string;
  rows: number;
  customers: number;
  /** Tamanho aproximado em bytes (UTF-8). */
  bytes: number;
}

/** Gera o ficheiro CSV no próprio navegador (sem servidor, sem Files da loja). */
export function buildExportFile(records: readonly CustomerPetsRecord[], delimiter: CsvDelimiter, now: Date = new Date()): ExportFile {
  const rows = petCsvRows(records);
  const csv = buildCsv(PET_CSV_HEADER, rows, {delimiter});
  return {
    csv,
    dataUrl: csvDataUrl(csv),
    fileName: csvFileName(now),
    rows: rows.length,
    customers: records.length,
    bytes: new TextEncoder().encode(csv).length,
  };
}

/** Acima disto, alguns navegadores podem recusar URLs `data:` longas. */
export const LARGE_EXPORT_BYTES = 2 * 1024 * 1024;
/** Mostrar o CSV em texto só para exportações pequenas. */
export const MAX_INLINE_TEXT_ROWS = 500;
