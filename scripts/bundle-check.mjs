/**
 * Verificação de bundles offline (complementa `shopify app build`). Para cada
 * target declarado nos shopify.extension.toml, usa esbuild com opções base
 * semelhantes às da CLI (ESM, JSX automático Preact) e verifica:
 *  - que o módulo compila;
 *  - tamanho do bundle (limite Shopify de 64 KB por UI extension; medido sem compressão, mais conservador);
 *  - ausência de segredos/tokens Admin e de HTML/CSS arbitrário;
 *  - o endpoint certo (Customer Account API na conta de cliente, Direct API no admin).
 */
import {build} from 'esbuild';
import {gzipSync} from 'node:zlib';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = path.join(root, 'dist-check');
mkdirSync(outDir, {recursive: true});
const LIMIT = 64 * 1024;

const EXTENSIONS = [
  {dir: 'extensions/minha-doggie', endpoint: 'shopify://customer-account/api/', forbidAdminApi: true},
  {dir: 'extensions/minha-doggie-admin', endpoint: 'shopify:admin/api/graphql.json', forbidAdminApi: false},
];

const forbiddenAlways = [
  [/shpat_[a-f0-9]+/i, 'token Admin (shpat_)'],
  [/shpss_[a-f0-9]+/i, 'shared secret (shpss_)'],
  [/shpca_[a-f0-9]+/i, 'token (shpca_)'],
  [/X-Shopify-Access-Token/i, 'header de token Admin'],
];

let failed = false;
for (const ext of EXTENSIONS) {
  const extDir = path.join(root, ext.dir);
  const toml = readFileSync(path.join(extDir, 'shopify.extension.toml'), 'utf8');
  const targets = [...toml.matchAll(/module\s*=\s*"([^"]+)"\s*\n\s*target\s*=\s*"([^"]+)"/g)].map((m) => ({module: m[1], target: m[2]}));
  if (targets.length === 0) {
    console.error(`${ext.dir}: nenhum target/module encontrado`);
    failed = true;
    continue;
  }
  for (const {module, target} of targets) {
    const entry = path.join(extDir, module);
    const result = await build({
      entryPoints: [entry],
      bundle: true,
      format: 'esm',
      target: 'es2020',
      jsx: 'automatic',
      jsxImportSource: 'preact',
      minify: true,
      legalComments: 'none',
      write: false,
      logLevel: 'warning',
      absWorkingDir: extDir,
      metafile: true,
    });
    const code = result.outputFiles[0].contents;
    const name = `${path.basename(ext.dir)}--${target}.js`;
    writeFileSync(path.join(outDir, name), code);
    const text = Buffer.from(code).toString('utf8');
    const problems = forbiddenAlways.filter(([re]) => re.test(text)).map(([, label]) => label);
    if (ext.forbidAdminApi && /\/admin\/api\/|shopify:admin\//.test(text)) problems.push('chamada à Admin API na conta de cliente');
    const inputs = Object.keys(result.metafile?.inputs ?? {}).filter((f) => !f.includes('node_modules/') || f.includes('packages/core'));
    for (const file of inputs) {
      const abs = path.resolve(extDir, file);
      if (!abs.startsWith(root) || abs.includes(`${path.sep}node_modules${path.sep}`)) continue;
      const src = readFileSync(abs, 'utf8');
      if (/innerHTML|dangerouslySetInnerHTML|style=\{/.test(src)) problems.push(`HTML/CSS arbitrário em ${file}`);
    }
    if (!text.includes(ext.endpoint)) problems.push(`endpoint ${ext.endpoint} em falta`);
    const gz = gzipSync(code).length;
    const own = inputs.filter((f) => !f.includes('node_modules/')).length;
    console.log(
      `${ext.dir} › ${target}\n  módulo ${module}: ${own} ficheiros próprios/partilhados; ` +
        `${(code.length / 1024).toFixed(1)} KB minificado (${(gz / 1024).toFixed(1)} KB gzip) — limite ${LIMIT / 1024} KB`,
    );
    if (code.length > LIMIT) problems.push('bundle acima de 64 KB');
    if (problems.length) {
      console.error(`  PROBLEMAS: ${problems.join(', ')}`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log('bundle-check OK');
