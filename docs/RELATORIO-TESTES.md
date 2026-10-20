# Relatório de testes — Minha DOGGIE

## v1.2 (admin, segmentos, CSV) — 20/10/2026, ~15:45 (hora de Lisboa)

Ambiente: Node 22.23.3, Shopify CLI 4.9.4, `@shopify/ui-extensions` 2026.10.0, schemas oficiais 2026-10 (Shopify AI Toolkit). Sem login na CLI, sem loja.

| Comando | Resultado |
|---|---|
| `SHOPIFY_CUSTOMER_SCHEMA=…/customer_2026-10.json.br SHOPIFY_ADMIN_SCHEMA=…/admin_2026-10.json.br npm run check` | ✅ tudo verde (exit 0) |
| `npm run typecheck` (packages/core + 2 extensões, `tsc --strict`) | ✅ |
| `npm run lint` (proíbe HTML/CSS arbitrário, `any`, `console`) | ✅ |
| `npm test` | ✅ **136/136** em 13 ficheiros: core 60 (pets 25, species 12, csv 12, pagination 8, segments 3) · conta de cliente 50 (+3 sincronização atómica de índices; os 25 testes de pets passaram para o core) · admin 26 (API simulada 16, renderização do bloco 8, exportação de seleção 1, ficheiro CSV 1) |
| `npm run bundle:check` | ✅ conta de cliente 51,5 KB (18,0 KB gzip); admin: bloco 41,0 KB, ferramentas 46,4 KB, seleção 38,5 KB — limite 64 KB; sem tokens; endpoints corretos |
| `npm run validate:graphql` | ✅ Customer Account API 4/4 · Admin API 10/10 |
| Validador oficial GraphQL (`--api customer` / `--api admin`, 2026-10) | ✅ todas as operações novas/alteradas |
| Validador oficial de componentes `polaris-admin-extensions` 2026-10 | ✅ CustomerPetsBlock, PetsBlock, PetForm (`admin.customer-details.block.render`); CustomerTools, ExportPanel, SegmentsPanel, ReindexPanel (`admin.customer-index.action.render`); CustomerSelectionExport, ExportPanel (`admin.customer-index.selection-action.render`) |
| Validador oficial `polaris-customer-account-extensions` | ✅ App, PetFormModal, PetCard, PetsSection (ficheiros com imports alterados) |
| `CI=1 npx shopify app build --skip-dependencies-installation` | ✅ "Minha DOGGIE built!" — minha-doggie 53,3 KB (~16,9 KB comprimido); minha-doggie-admin 58,0 KB (~18,2 KB comprimido; um único bundle com os 3 targets) |

**O que os testes cobrem:** derivação e verificação de índices (`cao`/`gato`, contagem), plano de escrita atómica (pets+count+species num `metafieldsSet`; remoção de `pet_species` quando vazio), reparação com valor bruto + `compareDigest`, CSV (RFC 4180, aspas, quebras de linha, separador, BOM, anti-injeção de fórmulas, data URL reversível), paginação (cursores, limite, cancelamento, ciclos), novas tentativas em `THROTTLED`, exportação (todos/segmento/seleção em blocos de 100), namespace dos segmentos, bloco do admin (carregar/vazio/erro/adicionar/validar/remover com confirmação/conflito/sincronizar/JSON ilegível).

**Não testado (exige loja de desenvolvimento):** host real do admin (aspeto, fixar o bloco, download `data:` em cada navegador), sintaxe das consultas de segmento com o namespace real `app--<id>` (o painel valida-as em runtime com «Verificar»), aceitação de `validations.choices` numa lista no deploy, id dos membros de segmento = id do cliente, limites de ritmo reais numa base grande, permissões de staff/Protected customer data (Email).

## v1.1 (revisão visual) — 20/10/2026, ~14:50 (hora de Lisboa)

| Comando | Resultado |
|---|---|
| `SHOPIFY_CUSTOMER_SCHEMA=…/customer_2026-10.json.br npm run check` (typecheck + lint + test + bundle:check + validate:graphql) | ✅ tudo verde |
| `npm test` | ✅ **72/72** (era 68; +2 miniaturas/estados, +2 renderização: remoção no modal, "Remover" ausente ao criar; vários testes de renderização reforçados: título da página, imagem/fundo do hero, cartões clicáveis, badges com ícone, miniaturas, mosaicos, ícones dos cabeçalhos) |
| `npm run bundle:check` | ✅ 50,6 KB minificado (17,6 KB gzip), limite 64 KB |
| `npm run validate:graphql` + validador oficial `--api customer --version 2026-10` | ✅ 3/3 (inclui `lineItems(first: 1) { nodes { title image { url(transform: {maxWidth: 160, maxHeight: 160}) altText } } }`) |
| Validador oficial de componentes (`polaris-customer-account-extensions`, `customer-account.page.render`, 2026-10) | ✅ App, WelcomeSection, SectionHeader, PetsSection, PetCard, PetFormModal, OrdersSection, SubscriptionsSection, QuickActions |
| `CI=1 npx shopify app build --skip-dependencies-installation` | ✅ "Minha DOGGIE built!" (52,4 KB, ~16,5 KB comprimido) |

**Na loja de desenvolvimento:** a v1.0 renderiza em `doggie-dev.myshopify.com` (captura de Paulo). A saudação aparecia como "Olá!" — ver README › Testes (nome do cliente de teste / campo *Name* em Protected customer data). A **v1.1 ainda não foi vista no host real**: confirmar sobretudo o tamanho do título, a imagem do hero a ocupar a coluna, os mosaicos e as linhas de encomenda em mobile.

---

## v1.0

Executado a 20 de outubro de 2026 (hora de Lisboa) numa máquina de desenvolvimento **sem sessão Shopify CLI** e **sem loja de desenvolvimento**. Node.js 22.23.3, npm 10, Shopify CLI 4.9.4, `@shopify/ui-extensions` 2026.10.0, `@shopify/ui-extensions-tester` 2026.10.0.

## Comandos executados

| Comando | Resultado |
|---|---|
| `npm install` | ✅ OK (339 pacotes). `npm audit --omit=dev`: 6 avisos "high" em `ts-morph → micromatch/braces`, dependência de *build* de `@shopify/ui-extensions`; não entra no bundle da extensão. |
| `npm run typecheck` (`tsc --noEmit`, modo `strict`, inclui testes) | ✅ 0 erros |
| `npm run lint` (ESLint 9 + typescript-eslint; regras que proíbem HTML/CSS arbitrário, `style`, `dangerouslySetInnerHTML`) | ✅ 0 problemas |
| `npm test` (Vitest + jsdom) | ✅ **68/68** testes (5 ficheiros) |
| `npx shopify app build` | ✅ "Minha DOGGIE built!" — 48,4 KB (~15,7 KB comprimido). Funciona offline; não requer login. |
| `npm run bundle:check` (esbuild) | ✅ 46,8 KB minificado (limite 64 KB); sem tokens Admin, sem `/admin/api/`, sem HTML/CSS arbitrário no código-fonte |
| `npm run validate:graphql` (graphql-js contra o schema Customer Account API 2026-10) | ✅ 3/3 operações válidas |
| Validador oficial Shopify AI Toolkit `--api customer --version 2026-10` | ✅ `MinhaDoggieCustomer`, `MinhaDoggieRecentOrders`, `MinhaDoggieSetPets` |
| Validador oficial de componentes `--api polaris-customer-account-extensions --target customer-account.page.render --version 2026-10` | ✅ todos os ficheiros com componentes Polaris (App, Welcome, Pets, PetCard, PetFormModal, DeletePetModal (removido na v1.1), Orders, Subscriptions, QuickActions) |
| `npx shopify app config validate` | ⛔ Não executável: exige `shopify app config link` (login na organização DOGGIE). |

## O que os testes automáticos cobrem

**Lógica pura (`pets`, `orders`, `settings`, `api`)** — 49 testes
- Validação do animal: nome obrigatório/tamanho/caracteres, espécie só cão/gato, raça opcional, idade inteira 0–30 anos ou 0–23 meses, remoção de caracteres de controlo.
- Metafield: leitura de vazio/nulo, round-trip do formato v1, migração do formato do starter (`ageYears`), descarte de registos inválidos/duplicados, limite de 12, JSON ilegível → erro (nunca sobrescreve), minimização (campos extra não são gravados).
- Encomendas: `24,90 €` (pt-PT), datas "12 de outubro de 2026" (fuso de Lisboa), GID → `shopify:customer-account/orders/<id>`, todos os estados do enum 2026-10, canceladas, ordenação e limite a 3.
- Definições: só URLs HTTPS válidos, defaults (`https://store.doggie.pt`), nome nunca inventado.
- Cliente GraphQL: endpoint oficial, erros de rede/HTTP/GraphQL/JSON, `metafieldsSet` com `ownerId` do cliente autenticado, `namespace: "$app"`, `type: "json"`, `compareDigest`, conflitos e `APP_NOT_AUTHORIZED`.

**Renderização simulada (`@shopify/ui-extensions-tester`, mock oficial do global `shopify` + jsdom)** — 19 testes
- Saudação com o nome real; "Olá!" quando não há nome; imagem só com URL HTTPS configurado.
- Companheiros: estado vazio, listagem, **adicionar**, **editar** (com `compareDigest`), **remover só após confirmação**, erro de validação sem gravação, conflito entre separadores, dados corrompidos → escrita bloqueada.
- Encomendas: lista com links nativos, estado vazio, erro isolado (o resto da página continua).
- Subscrições: estado vazio sem URL, botão com URL HTTPS, URL HTTP ignorado.
- Ações rápidas e "Voltar a comprar" com destinos corretos; slogan.

## Testes que NÃO foram executados (pendentes)

Nenhum destes foi feito; não declarar sucesso até serem executados numa **loja de desenvolvimento** (nunca em store.doggie.pt antes de aprovação):

1. **Renderização real** nas contas de cliente (desktop e mobile): o jsdom não "pinta" os web components Polaris; o aspeto visual, espaçamentos, quebra para uma coluna em mobile (container queries) e o comportamento dos `s-modal` só podem ser verificados no host Shopify (`shopify app dev` → `p` → pré-visualização).
2. **Leitura de encomendas reais** de um cliente de teste via Customer Account API (dependente de scopes concedidos e Protected Customer Data).
3. **Escrita real do metafield** (`metafieldsSet`) — criação da definição `$app:pets` no deploy e gravação/edição/remoção persistidas após recarregar a página.
4. **Conflito real** entre dois separadores (resposta da Shopify a `compareDigest` desatualizado).
5. **Navegação real**: `shopify:customer-account/profile`, `.../orders`, `.../orders/<id>`, link externo da loja e da app de subscrições.
6. **Editor de checkout e contas**: adicionar a página, definições (imagem/subscrições/loja), entrada no menu da conta.
7. **Isolamento do tema**: a app não toca no tema (não há código Liquid nem `theme app extension`), mas deve confirmar-se que `doggie_shopify/main` fica inalterado após a instalação.
8. `shopify app config validate` / `shopify app deploy` (requerem login e aprovação).
9. Acessibilidade com leitor de ecrã real (as `accessibilityLabel` estão definidas, mas não foram testadas com VoiceOver/TalkBack).
