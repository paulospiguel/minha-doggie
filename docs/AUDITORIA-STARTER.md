# Auditoria do starter `minha-doggie-v2.zip`

Data: 20 de outubro de 2026. Versão de referência das APIs: **2026-10** (estável mais recente; `@shopify/ui-extensions@2026.10.0`, Shopify CLI 4.9.4).

O ZIP continha: `README.md`, `config/shopify.app.toml.additions`, `config/shopify.extension.toml.example`, `extensions/minha-doggie/src/MinhaDoggie.jsx`, `tests/check-syntax.js` e `assets/hero-pets-exemplo.png`. **Não continha a imagem do mockup completo**, só o recorte de cão e gato usado no banner.

## Problemas encontrados

| # | Gravidade | Problema | Correção na v1.0 |
|---|---|---|---|
| 1 | **Crítica** | Endpoint `shopify:customer-account/api/2026-07/graphql.json` (sem `//`). A referência oficial da API 2026-07 e da 2026-10 usa `shopify://customer-account/api/<versão>/graphql.json`. | `CUSTOMER_ACCOUNT_API_URL` em `src/constants.ts` usa `shopify://customer-account/api/2026-10/graphql.json`, testado em `api.test.ts`. |
| 2 | **Crítica** | Não era um projeto Shopify CLI: sem `package.json`, sem `shopify.app.toml` (só "additions"), sem `package.json`/`tsconfig` da extensão. Não compilava nem fazia build. | Projeto CLI completo (workspaces npm, `shopify app build` executado com sucesso). |
| 3 | Alta | Versão `2026-07`; a estável mais recente é `2026-10`. | `api_version = "2026-10"` e constante alinhada. |
| 4 | Alta | `fulfillmentLabel` usava `REQUEST_DECLINED` (não existe em `OrderFulfillmentStatus`) e ignorava `OPEN` e `RESTOCKED`; encomendas canceladas apareciam como "Enviado". | Todos os 9 valores do enum 2026-10 traduzidos; `cancelledAt` tem prioridade ("Cancelada"). |
| 5 | Alta | `orders(first: 3, reverse: true)` sem `sortKey`: a ordem dependia do default (ID), não da data. | `sortKey: PROCESSED_AT, reverse: true` + ordenação defensiva no cliente. |
| 6 | Alta | Ligação "Ver detalhe" para `statusPageUrl` (página externa de estado). | Página nativa `shopify:customer-account/orders/<id>`. |
| 7 | Alta | Sem controlo de concorrência: gravar de dois separadores apagava alterações (o próprio README admitia). | `compareDigest` lido com o metafield e enviado no `metafieldsSet`; `INVALID_COMPARE_DIGEST`/`STALE_OBJECT` → recarrega e avisa o cliente. |
| 8 | Alta | `normalizePets` convertia qualquer espécie desconhecida em "cão" (corrompia dados) e JSON inválido fazia falhar a página toda. | Registos inválidos descartados e contados; JSON ilegível bloqueia escritas (nunca sobrescreve) mas o resto da página funciona. |
| 9 | Média | `s-form onSubmit={(event) => event.preventDefault()}`: na API 2026-10 o callback não recebe evento (erro TypeScript). | Corrigido e verificado com `tsc` estrito. |
| 10 | Média | Confirmação de remoção inline e formulário no fundo da página (longe do botão em mobile). | `s-modal` para adicionar/editar e `s-modal` de confirmação (`tone="critical"`), abertos com `command="--show"`/`commandFor`. |
| 11 | Média | Textos diferentes do pedido ("A Minha DOGGIE", "Bem-vindo à tua área…"); slogan como texto solto no fim. | Textos exatos pedidos, centralizados em `src/copy.ts`; slogan como `subheading` da página. |
| 12 | Média | Idade apenas em anos inteiros (cachorros/gatinhos sem idade útil); campo de texto livre. | `s-number-field` + unidade (anos/meses), com limites (0–30 anos, 0–23 meses). |
| 13 | Média | Validação de URL só por regex `^https://`; TOML sem validações. | `URL` parse, só HTTPS, sem credenciais embutidas, limite de tamanho; `validations` no TOML. |
| 14 | Média | Ficheiro único de ~390 linhas (UI, GraphQL, validação, formatação misturados), JSX sem tipos. | TypeScript estrito; `components/`, `graphql/`, `hooks/`, `lib/`, `types.ts`, `constants.ts`, `copy.ts`. |
| 15 | Média | `tests/check-syntax.js` dependia de um caminho fixo (`/opt/nvm/versions/node/v22.16.0/...`) e o array `checks` nunca era avaliado: o teste passava sempre. | 68 testes Vitest reais (unitários + renderização com `@shopify/ui-extensions-tester`). |
| 16 | Baixa | Scopes corretos mas `write_customers` sem justificação clara ("pode requerer"). | Mantido e justificado: a documentação oficial exige `write_customers` para definições de metafield de cliente; nenhum token Admin é usado. |
| 17 | Baixa | README só mencionava Protected Customer Data nível 1; o primeiro nome é um campo de **nível 2 (Name)**. | Documentado nível 1 + campo Name (nível 2). |
| 18 | Baixa | `alt` da imagem fixo; IDs de animais com `Date.now()`+`Math.random()`. | `alt` configurável; `crypto.randomUUID()` com fallback. |

## Reutilizado do starter

- Escolha de arquitetura: extensão `customer-account.page.render`, app extension-only, metafield app-owned `[customer.metafields.app.pets]` (`type = "json"`, `access.customer_account = "read_write"`, `access.admin = "merchant_read"`).
- Definições `hero_image_url` e `subscriptions_url` (agora validadas) e a imagem `assets/hero-pets-exemplo.png`.
- Ideia das 4 áreas (companheiros, subscrições, encomendas, ações rápidas) e os limites (12 animais).
- Compatibilidade de leitura: o formato antigo (array com `ageYears`) é migrado automaticamente na leitura.
