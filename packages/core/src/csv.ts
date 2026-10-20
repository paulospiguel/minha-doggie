/**
 * Construção de CSV (RFC 4180) para a exportação de companheiros no admin.
 * Inclui proteção contra "CSV/formula injection" (células começadas por
 * = + - @ TAB CR são prefixadas com apóstrofo) e BOM UTF-8 para o Excel.
 */
import {PET_COPY} from './copy';
import type {Pet} from './types';

export type CsvCell = string | number | null | undefined;
export type CsvDelimiter = ',' | ';';

const FORMULA_START = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: CsvCell, delimiter: CsvDelimiter = ','): string {
  if (value == null) return '';
  let text = typeof value === 'number' ? (Number.isFinite(value) ? String(value) : '') : String(value);
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  const needsQuotes =
    text.includes(delimiter) || text.includes('"') || text.includes('\n') || text.includes('\r') || /^\s|\s$/.test(text);
  return needsQuotes ? `"${text.replace(/"/g, '""')}"` : text;
}

export interface CsvOptions {
  delimiter?: CsvDelimiter;
  /** Prefixo BOM UTF-8 (o Excel precisa dele para acentos). Por omissão: true. */
  bom?: boolean;
}

export function buildCsv(header: readonly string[], rows: readonly (readonly CsvCell[])[], options: CsvOptions = {}): string {
  const delimiter = options.delimiter ?? ',';
  const lines = [header, ...rows].map((row) => row.map((cell) => escapeCsvCell(cell, delimiter)).join(delimiter));
  return `${options.bom === false ? '' : '\uFEFF'}${lines.join('\r\n')}\r\n`;
}

/** Colunas pedidas: customer id, name, email, nome, espécie, raça, idade. */
export const PET_CSV_HEADER = ['customer id', 'name', 'email', 'nome', 'espécie', 'raça', 'idade'] as const;

export interface CustomerPetsRecord {
  customerId: string;
  name: string;
  email: string;
  pets: readonly Pet[];
}

/** "gid://shopify/Customer/123" → "123" (id visível no URL do admin). */
export function legacyCustomerId(gid: string): string {
  const match = /^gid:\/\/shopify\/(?:Customer|CustomerSegmentMember)\/(\d+)$/.exec(gid);
  return match ? match[1] : gid;
}

/** Uma linha por companheiro; clientes sem companheiros não geram linhas. */
export function petCsvRows(records: readonly CustomerPetsRecord[]): CsvCell[][] {
  const rows: CsvCell[][] = [];
  for (const record of records) {
    for (const pet of record.pets) {
      rows.push([
        legacyCustomerId(record.customerId),
        record.name,
        record.email,
        pet.name,
        PET_COPY.species[pet.species],
        pet.breed,
        pet.age ? PET_COPY.age(pet.age.value, pet.age.unit) : '',
      ]);
    }
  }
  return rows;
}

/** URL `data:` para `<s-button href download>` (sem servidor, sem ficheiros temporários). */
export function csvDataUrl(csv: string): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

export function csvFileName(date: Date, prefix = 'minha-doggie-companheiros'): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${prefix}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.csv`;
}
