/**
 * Valida as operações GraphQL contra os schemas oficiais (introspeção JSON, .json ou .json.br):
 *   SHOPIFY_CUSTOMER_SCHEMA → extensions/minha-doggie/src/graphql/operations.ts (Customer Account API 2026-10)
 *   SHOPIFY_ADMIN_SCHEMA    → extensions/minha-doggie-admin/src/graphql/operations.ts (GraphQL Admin API 2026-10)
 *
 * Um schema em falta é reportado como SKIPPED (não falha), para não bloquear
 * quem não tem os ficheiros; a validação foi também executada com o validador
 * oficial do Shopify AI Toolkit (ver docs/RELATORIO-TESTES.md).
 */
import {existsSync, readFileSync} from 'node:fs';
import {brotliDecompressSync} from 'node:zlib';
import path from 'node:path';
import {buildClientSchema, parse, validate} from 'graphql';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SETS = [
  {label: 'Customer Account API', env: 'SHOPIFY_CUSTOMER_SCHEMA', file: 'extensions/minha-doggie/src/graphql/operations.ts'},
  {label: 'Admin API', env: 'SHOPIFY_ADMIN_SCHEMA', file: 'extensions/minha-doggie-admin/src/graphql/operations.ts'},
];

function loadSchema(schemaPath) {
  const raw = readFileSync(schemaPath);
  const json = JSON.parse((schemaPath.endsWith('.br') ? brotliDecompressSync(raw) : raw).toString('utf8'));
  return buildClientSchema(json.data ?? json);
}

let failures = 0;
for (const set of SETS) {
  const schemaPath = process.env[set.env];
  if (!schemaPath || !existsSync(schemaPath)) {
    console.warn(`[${set.label}] SKIPPED — definir ${set.env} com o schema 2026-10.`);
    continue;
  }
  const schema = loadSchema(schemaPath);
  const source = readFileSync(path.join(root, set.file), 'utf8');
  const re = /export const (\w+) = \/\* GraphQL \*\/ `([\s\S]*?)`;/g;
  let match;
  let count = 0;
  while ((match = re.exec(source))) {
    count += 1;
    const errors = validate(schema, parse(match[2]));
    if (errors.length) {
      failures += 1;
      console.error(`✗ [${set.label}] ${match[1]}:\n  ${errors.map((e) => e.message).join('\n  ')}`);
    } else {
      console.log(`✓ [${set.label}] ${match[1]}`);
    }
  }
  if (count === 0) {
    console.error(`[${set.label}] nenhuma operação encontrada em ${set.file}`);
    failures += 1;
  }
}
process.exit(failures ? 1 : 0);
