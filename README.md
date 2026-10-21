# Minha DOGGIE v1.2

Nova área de cliente **Minha DOGGIE** para a loja [store.doggie.pt](https://store.doggie.pt), integrada nas **novas contas de cliente** Shopify (`account.doggie.pt`) como **Customer Account UI Extension** de página completa (`customer-account.page.render`), e — desde a v1.2 — ferramentas para a equipa DOGGIE no **admin Shopify** (Admin UI Extensions).

*Much more than a pet!*

- App **sem backend**: sem servidor, sem base de dados externa, sem tokens no código. No admin, as chamadas usam o *Direct API Access* das Admin UI extensions (autenticado pela Shopify com a sessão do membro da equipa).
- **Preact + TypeScript + Polaris web components**, API **2026-10**.
- Não altera o tema publicado (`doggie_shopify/main`), não usa Liquid, não substitui páginas nativas.
- Estado: **v1.0 a renderizar na loja de desenvolvimento `doggie-dev.myshopify.com`; v1.1 e v1.2 compiladas e testadas localmente** (v1.2 ainda não vista no host real). Não instalada na loja de produção.

### Novidades da v1.2 (admin + segmentos)
- **Bloco «Companheiros (Minha DOGGIE)»** na ficha do cliente (`admin.customer-details.block.render`): ver, adicionar, editar e remover (com confirmação) os companheiros desse cliente, com a **mesma validação/serialização** da conta de cliente (pacote partilhado `packages/core`), estados de carregamento/vazio/erro e controlo de concorrência (`compareDigest`).
- **Segmentos por espécie:** dois metafields app-owned derivados de `pets` — `$app:pet_species` (lista: `cao`/`gato`) e `$app:pet_count` (inteiro) — escritos **na mesma chamada `metafieldsSet`** que `pets` (atómica), tanto pela conta de cliente como pelo bloco do admin. Consultas de segmento prontas (§10.2) e criação de segmentos a partir do admin.
- **Reindexação (backfill) única** a partir do admin, para clientes que gravaram companheiros antes da v1.2.
- **Exportação CSV** (customer id, name, email, nome, espécie, raça, idade) a partir da lista de clientes (todos, ou só os selecionados), gerada no navegador e descarregada sem servidor.
- Ajustes visuais de Paulo mantidos: hero sem fundo, mosaicos com contorno `border="base"`.

### Atualizar a cópia local (v1.1 → v1.2) sem tocar em `shopify.app.toml` nem `.shopify/`
```sh
# na raiz do projeto local (~/@devSpace/slabs/minha-doggie)
rm extensions/minha-doggie/src/lib/pets.ts extensions/minha-doggie/src/lib/text.ts \
   extensions/minha-doggie/tests/pets.test.ts            # movidos para packages/core (ver FICHEIROS-A-REMOVER.txt)
tar -xzf minha-doggie-update2.tar.gz                     # só ficheiros novos/alterados
# acrescentar ao shopify.app.toml as linhas indicadas em shopify.app.toml.patch-notes.md
npm install                                              # liga o workspace packages/core
SHOPIFY_CUSTOMER_SCHEMA=… SHOPIFY_ADMIN_SCHEMA=… npm run check
npx shopify app dev --store doggie-dev.myshopify.com     # SÓ a loja de desenvolvimento
```
O `extensions/minha-doggie/shopify.extension.toml` **não vem no pacote** (não mudou): a vossa linha `uid` mantém-se.

---

## 1. Funcionalidades

| Área | O que faz | Estado |
|---|---|---|
| Boas-vindas | Título da página "Olá, [primeiro nome]!" com o nome real do cliente autenticado (sem nome → "Olá!"), subtítulo "Esta é a tua área DOGGIE.", texto "Tudo o que precisas para cuidar de quem te faz mais feliz.", botões **Gerir perfil** (perfil nativo) e **Voltar a comprar** (loja), imagem opcional configurável | ✅ |
| Os meus companheiros | Listar, **adicionar**, **editar** e **remover com confirmação** cães e gatos (nome, espécie, raça, idade aproximada em anos ou meses). Guardado num metafield do cliente (`$app:pets`, JSON). Validação, estados vazio/erro, controlo de concorrência | ✅ |
| Subscrições | Secção discreta. Sem dados inventados. Ligação "Gerir subscrição ›" só se o lojista configurar o URL HTTPS da app de subscrições; caso contrário, estado vazio | ✅ (integração real com a app de subscrições: pendente) |
| Últimas encomendas | Até 3 encomendas reais (miniatura do 1.º artigo, número, data, total em €, estado, link para o detalhe nativo) + "Ver todas ›". Estados de carregamento, vazio e erro isolado | ✅ |
| Ações rápidas | Mosaicos: Ver encomendas (histórico, onde está o "Comprar novamente" nativo) · Atualizar morada · Adicionar companheiro (navegação/ação reais) | ✅ |
| Índices de segmentação | Cada gravação de companheiros (cliente ou admin) atualiza `$app:pet_species` e `$app:pet_count` na mesma chamada atómica | ✅ v1.2 |
| **Admin** · Página principal da app (`Aplicações › Minha DOGGIE`) | Painel central (`admin.app.home.render`) com configurações e paleta da página de cliente, estado das extensões, atalhos para o editor de Checkout/Contas, Clientes e Ficheiros, e ferramentas (Segmentos, Exportar CSV, Reindexar) | ✅ v1.2 |
| **Admin** · Bloco na ficha do cliente | Companheiros do cliente: listar, adicionar, editar, remover (confirmação); aviso + "Sincronizar índices" se estiverem desatualizados | ✅ v1.2 |
| **Admin** · Lista de clientes › Mais ações › Minha DOGGIE | Exportar CSV · Segmentos por espécie (consultas, verificação, criação) · Reindexar (backfill) | ✅ v1.2 |
| **Admin** · Lista de clientes › seleção › Minha DOGGIE | Exportar CSV só dos clientes selecionados | ✅ v1.2 |

### Pendentes / fora da V1
- Integração de dados com a app de subscrições instalada (hoje: só ligação configurável).
- Fotografias dos animais, data de nascimento exata, alergias/alimentação.
- Tradução para espanhol (o texto está centralizado em `src/copy.ts`, pronto a extrair para `locales/`).
- Testes numa loja de desenvolvimento (ver §7), incluindo as ferramentas de admin (§10).

---

## 2. Estrutura

```
minha-doggie-v1/
├─ shopify.app.toml                  # app, scopes e definições dos metafields $app:pets / pet_species / pet_count
├─ package.json                      # workspaces (packages/*, extensions/*) + scripts
├─ eslint.config.js · vitest.config.ts · .nvmrc (Node 22)
├─ assets/                           # ícone oficial da app para o Dev Dashboard (app-icon.png 1200×1200, app-icon-512.png)
├─ scripts/
│  ├─ bundle-check.mjs               # bundles esbuild offline (todos os targets) + verificações de segurança
│  └─ validate-graphql.mjs           # valida as operações contra os schemas oficiais (cliente + admin)
├─ docs/                             # AUDITORIA-STARTER, RELATORIO-TESTES, COMPARACAO-MOCKUP, assets/
├─ packages/core/                    # @minha-doggie/core — lógica pura PARTILHADA (sem globais da plataforma)
│  ├─ src/pets.ts · text.ts          # validação/serialização de companheiros (antes em extensions/minha-doggie/src/lib)
│  ├─ src/species.ts                 # índices pet_species/pet_count + planos de escrita atómica
│  ├─ src/csv.ts                     # CSV RFC 4180, anti-injeção de fórmulas, data URL
│  ├─ src/pagination.ts              # paginação por cursor, blocos, novas tentativas (THROTTLED)
│  ├─ src/segments.ts                # consultas de segmentos
│  └─ tests/                         # 60 testes
├─ extensions/minha-doggie/          # conta de cliente (customer-account.page.render) — inalterada visualmente
│  └─ src/ · tests/                  # 50 testes
└─ extensions/minha-doggie-admin/    # admin (4 targets, um só shopify.extension.toml)
   ├─ src/AppHome.tsx                # admin.app.home.render (Aplicações › Minha DOGGIE)
   ├─ src/CustomerPetsBlock.tsx      # admin.customer-details.block.render
   ├─ src/CustomerTools.tsx          # admin.customer-index.action.render
   ├─ src/CustomerSelectionExport.tsx# admin.customer-index.selection-action.render
   ├─ src/components/                # ConfigPanel, PetsBlock, PetForm, ExportPanel, SegmentsPanel, ReindexPanel
   ├─ src/graphql/                   # operations.ts (Admin API 2026-10), client.ts, api.ts
   └─ tests/                         # 27 testes (API simulada + renderização)
```

### Dados guardados

`$app:pets` (tipo `json`, fonte de verdade):

```json
{
  "version": 1,
  "pets": [
    {"id": "3f1c…", "name": "Bolinhas", "species": "dog", "breed": "Labrador",
     "age": {"value": 3, "unit": "years"},
     "createdAt": "2026-10-20T11:00:00.000Z", "updatedAt": "2026-10-20T11:00:00.000Z"}
  ]
}
```

Índices derivados (nunca editados à mão; recalculados em cada gravação):

| Metafield | Tipo | Exemplo | Regra |
|---|---|---|---|
| `$app:pet_species` | `list.single_line_text_field` (escolhas `cao`, `gato`) | `["cao","gato"]` | Espécies presentes, ordem fixa. **Removido** quando não há companheiros (listas vazias não são gravadas) |
| `$app:pet_count` | `number_integer` (0–12) | `2` | Número de companheiros (0 quando a lista fica vazia) |

---

## 3. Permissões necessárias

### Access scopes (`shopify.app.toml`) — **sem alterações na v1.2**

| Scope | Para quê |
|---|---|
| `customer_read_customers` | Ler o primeiro nome e os metafields da app do cliente autenticado (Customer Account API) |
| `customer_write_customers` | `metafieldsSet`/`metafieldsDelete` no próprio cliente (Customer Account API) |
| `customer_read_orders` | Ler as 3 últimas encomendas (Customer Account API) |
| `write_customers` | Definições de metafield de cliente (TOML) e, no admin (Direct API): ler clientes/metafields, `metafieldsSet`/`metafieldsDelete`, `customerSegmentMembers`, `metafieldDefinitions`, `segmentFilterSuggestions` e `segmentCreate`. `write_customers` inclui a leitura (`read_customers`), por isso não se acrescenta nenhum scope. |

Não são pedidos `network_access` nem `api_access`. Não é preciso `read_orders` nem outros scopes Admin.

**Direct API no admin:** por omissão em modo **online** — as chamadas correm com as permissões do **membro da equipa** que usa o admin, limitadas aos scopes da app. Quem não tem permissão de **Clientes** (ver/editar) não consegue ler nem gravar. Não usamos `direct_api_mode = "offline"`.

### Protected Customer Data (Dev Dashboard → app → *API access* / *Protected customer data*)

- **Nível 1** — obrigatório (dados de clientes e encomendas; também na Admin API).
- **Nível 2, campo *Name*** — saudação na conta de cliente e coluna `name` do CSV.
- **Nível 2, campo *Email*** — **novo na v1.2**, só para a coluna `email` do CSV exportado no admin. Se a DOGGIE não quiser pedir este campo, o CSV deixa de ter email (a API devolve erro de acesso: retirar `defaultEmailAddress` das operações de exportação).
- **Não** pedir telefone nem morada.
- Motivo a indicar: personalização da área de cliente; apoio ao cliente e segmentação de marketing por espécie pela equipa DOGGIE.

### Segurança e RGPD
- Conta de cliente: o `fetch('shopify://customer-account/api/2026-10/graphql.json')` corre no contexto do cliente autenticado; a API só lê/escreve dados **desse** cliente.
- Admin: `fetch('shopify:admin/api/graphql.json')` (Direct API Access) é autenticado pela Shopify; o código não contém nem recebe tokens. Só membros da equipa com acesso ao admin e permissão de Clientes o usam.
- Sem segredos, tokens ou credenciais no frontend (verificado por `npm run bundle:check` em todos os targets).
- Minimização: só nome, espécie, raça e idade dos animais. A reindexação lê **apenas** id + metafields da app (sem nome/email). Só a exportação lê nome e email, porque são colunas pedidas.
- **CSV:** gerado no navegador do membro da equipa (URL `data:`), não é guardado na Shopify nem enviado a terceiros. Contém dados pessoais: uso interno, não partilhar, guardar em local seguro e apagar quando deixar de ser necessário (o painel avisa). Células começadas por `= + - @` são neutralizadas (anti-injeção de fórmulas no Excel).
- O cliente pode editar ou remover os dados a qualquer momento. A equipa pode corrigi-los no bloco do admin (p. ex. a pedido do cliente). A definição `pets` mantém `access.admin = "merchant_read"`: os campos não são editáveis nos ecrãs nativos do admin; **só a própria app** (dona do namespace `$app`) os escreve, pelo bloco.
- **Nota:** como `pet_species`/`pet_count` têm `customer_account = "read_write"` (necessário para os gravar na mesma chamada que `pets`), um cliente tecnicamente poderia alterar os seus próprios índices pela API. Impacto: só a sua própria inclusão num segmento de marketing; a "Reindexação" repõe os valores corretos.
- Pedidos de acesso/eliminação (RGPD) seguem o processo nativo da Shopify (os dados vivem no registo do cliente).
- **A fazer pela DOGGIE:** atualizar a Política de Privacidade (finalidades: personalização e segmentação de marketing por espécie; base legal; retenção).
- Webhooks obrigatórios de privacidade aplicam-se a apps públicas; esta app é de **distribuição personalizada** e não guarda dados fora da Shopify.

---

## 4. Desenvolvimento local

Requisitos: **Node.js 22.12+** (a Shopify CLI 4 exige-o), npm 10.

```sh
npm install
npm run typecheck      # tsc estrito (inclui testes)
npm run lint           # ESLint; proíbe HTML/CSS arbitrário
npm test               # 136 testes (Vitest + @shopify/ui-extensions-tester)
npm run build          # shopify app build (funciona sem login)
npm run bundle:check   # bundles offline (4 targets) + verificações de segurança
SHOPIFY_CUSTOMER_SCHEMA=/caminho/customer_2026-10.json SHOPIFY_ADMIN_SCHEMA=/caminho/admin_2026-10.json npm run validate:graphql
npm run check          # tudo acima exceto o build da CLI
```

---

## 5. Instalação na organização Shopify da DOGGIE

> ⚠️ Não executar `shopify app dev` nem `shopify app deploy` contra a loja de produção sem aprovação explícita. Testar sempre primeiro numa **loja de desenvolvimento**.

1. **Conta e organização** — Entrar no [Dev Dashboard](https://dev.shopify.com) com um utilizador da organização DOGGIE com permissão para gerir apps.
2. **Criar a app e ligar a configuração**
   ```sh
   npm install
   npx shopify app config link
   ```
   Escolher a organização DOGGIE → *Create a new app* → nome "Minha DOGGIE". A CLI preenche o `client_id`. Confirmar depois que `shopify.app.toml` mantém os **scopes** e os blocos `[customer.metafields.app.pets]`, `[customer.metafields.app.pet_species]` e `[customer.metafields.app.pet_count]` (se a CLI os tiver substituído, repor a partir deste ZIP).
3. **Protected Customer Data** — No Dev Dashboard, pedir nível 1 + campos *Name* e *Email* (§3).
4. **Testar numa loja de desenvolvimento** (com novas contas de cliente e um cliente de teste com encomendas):
   ```sh
   npx shopify app dev --store <loja-de-desenvolvimento>.myshopify.com
   ```
   Premir `p` → consola de desenvolvimento → pré-visualizar **Minha DOGGIE** (conta de cliente) e as extensões de admin. Executar as listas de verificação do §7 e do §10.
5. **Publicar uma versão (após aprovação)**
   ```sh
   npx shopify app deploy --no-release   # cria a versão (gera o uid da extensão)
   npx shopify app release --version <versão>   # ou libertar no Dev Dashboard
   ```
6. **Distribuição personalizada** — Dev Dashboard → app → *Distribution* → **Custom distribution** → indicar o domínio `*.myshopify.com` da DOGGIE → gerar o link de instalação.
7. **Instalar em store.doggie.pt** — Abrir o link com uma conta com permissões de instalação → rever e aceitar as permissões (§3).

### Ativar a página no editor de contas
1. Admin Shopify → **Definições → Checkout** (Checkout e contas de cliente) → **Personalizar**.
2. No seletor de páginas do editor, escolher **Contas de cliente** e adicionar a página da app **Minha DOGGIE**. Ao adicionar uma página completa, o editor propõe incluí-la no **menu do cabeçalho da conta** — aceitar (ou ajustar a posição).
3. No painel da extensão, preencher as definições:
   - **Imagem de boas-vindas (URL HTTPS)** — as extensões **não podem incluir imagens no bundle**, por isso a imagem por omissão é entregue como ficheiro: carregar `docs/assets/hero-pets-exemplo.png` (ou, melhor, uma fotografia oficial com direitos de uso, proporção **2:1, ≥ 1600×800 px**) em **Conteúdo → Ficheiros**, copiar o URL `https://cdn.shopify.com/...` e colá-lo aqui. Opcional: sem URL o hero mostra só o texto.
   - **Texto alternativo da imagem** (opcional).
   - **Gestão de subscrições (URL HTTPS)** — URL oficial do portal da app de subscrições; vazio = estado vazio.
   - **Loja** — por omissão `https://store.doggie.pt`.
4. **Guardar/Publicar** a personalização.
5. (Opcional) Atalho na loja: em **Conteúdo → Menus**, adicionar ao menu pretendido o URL da página copiado do editor. Não alterar o código do tema.
6. Validar em `https://account.doggie.pt` com um cliente de teste antes de divulgar.

### Identidade visual (no editor, não no código)
As UI extensions não aceitam cores nem fontes no código: os componentes herdam o Branding do **editor de checkout e contas**.

**Funciona sem Shopify Plus?** Sim. O editor de checkout e contas (logótipo, paleta, cores de destaque/botões, fundos, cabeçalho e tipografia, incluindo sobreposições só para as páginas de conta) está disponível em **Basic ou superior**. O Plus só é exigido para a Checkout Branding API / Checkout and Accounts Configuration API (personalização avançada por API) e para apps nas páginas de informação, envio e pagamento do checkout. Fontes: [Customizing and editing your checkout and accounts pages](https://help.shopify.com/en/manual/checkout-settings/customize-checkout-configurations), [Customizing customer accounts pages](https://help.shopify.com/en/manual/customers/customer-accounts/customize-customer-accounts/customize), [Customizing the style of your checkout](https://help.shopify.com/en/manual/checkout-settings/customize-checkout-configurations/checkout-style).

Definições → Checkout → **Personalizar** → ⚙ Definições:

| Secção do editor | Valor para aproximar o mockup |
|---|---|
| Logótipo | Logótipo DOGGIE |
| Paleta de cores | #4B0C62 · #92278F · #DA1C5C · #EE2A7B · #F15A29 · #FFFFFF |
| Destaque e botões → Destaque | **#92278F** (ligações "Ver todas ›", foco) |
| Destaque e botões → Botão | **#DA1C5C** (botões primários: "Gerir perfil", "Guardar") |
| Principal → Fundo | #FFFFFF |
| Cabeçalho → Fundo / Destaque | #FFFFFF / #4B0C62 |
| Tipografia → Títulos / Corpo | Fonte arredondada mais próxima disponível na lista (ex.: Poppins / Nunito Sans) |
| Páginas de conta → Principal (opcional) | Sobrepor destaque/fundo só nas contas, se quiserem diferir do checkout |

#EE2A7B e #F15A29 não têm onde ser aplicados pelo editor sem prejudicar o contraste; ficam para a imagem do hero. Gradientes, fundos rosa e badges verdes/azuis do mockup **não são configuráveis** (ver `docs/COMPARACAO-MOCKUP.md`).

### Desativar / reverter
Remover a página do menu no editor (efeito imediato), remover o bloco da ficha de cliente no admin, ou desinstalar a app. O tema não é afetado em nenhum dos casos.

---

## 6. Decisões técnicas (verificadas na documentação oficial 2026-10)

- Endpoint: `shopify://customer-account/api/2026-10/graphql.json` ([Customer Account API em UI extensions](https://shopify.dev/docs/api/customer-account-ui-extensions/2026-10/target-apis/account-apis/customer-account-api)).
- Metafields: definição declarativa `[customer.metafields.app.pets]` com `access.customer_account = "read_write"`; escrita com `metafieldsSet` ([guia](https://shopify.dev/docs/apps/build/customer-accounts/metafields)), leitura com `metafield(namespace: "$app", key: "pets") { value compareDigest }`.
- Concorrência: `compareDigest` (otimista). Conflito → recarrega e pede confirmação.
- Encomendas: `orders(first: 3, sortKey: PROCESSED_AT, reverse: true)`; estados `OrderFulfillmentStatus` 2026-10; detalhe via `shopify:customer-account/orders/<id>`.
- Navegação: `href` com protocolos `shopify:customer-account/orders` e `/profile` ([custom protocols](https://shopify.dev/docs/api/customer-account-ui-extensions/2026-10)).
- Overlays: `s-modal` abertos com `command="--show"` + `commandFor` (os modais só abrem por interação do utilizador); fecho com `hideOverlay()`.
- Layout responsivo: `s-query-container` + `gridTemplateColumns="@container (inline-size > Npx) …, 1fr"`.
- Página completa: não pode partilhar a extensão com outros targets ([full-page extensions](https://shopify.dev/docs/apps/build/customer-accounts/full-page-extensions)).
- Customer account UI extensions estão disponíveis em todos os planos (a DOGGIE não é Plus).
- Admin: targets `admin.customer-details.block.render`, `admin.customer-index.action.render`, `admin.customer-index.selection-action.render` ([targets de clientes](https://shopify.dev/docs/api/admin-extensions/2026-10/targets/customers)); Direct API `fetch('shopify:admin/api/graphql.json')` ([Direct API access](https://shopify.dev/docs/api/admin-extensions/2026-10#direct-api-access)).
- `metafieldsSet` é **atómica** ("no changes are persisted if an error is encountered") e aceita até 25 metafields: `pets` + `pet_count` + `pet_species` vão sempre juntos; o `compareDigest` de `pets` faz falhar a chamada inteira se outro dispositivo gravou entretanto.
- Metafields app-owned com `access.admin = "merchant_read"`: o lojista só lê; a app dona do namespace continua a poder escrever ([metafields app-owned](https://shopify.dev/docs/apps/build/metafields)).
- Segmentos: a Shopify permite filtros de segmento por metafields de cliente de tipo texto (incl. listas, `CONTAINS`), número, data e booleano ([Metafield-based customer segment filters](https://help.shopify.com/en/manual/customers/customer-segmentation/reference-guide/metafield-segments)). **Não existe** capability TOML a ativar para clientes (`admin_filterable` aplica-se a produtos, encomendas, empresas e metaobjetos).
- Download: `s-button` com `href` + `download` é suportado no admin; o nome do ficheiro é respeitado para URLs `data:` ([Button 2026-10](https://shopify.dev/docs/api/admin-extensions/2026-10/web-components/actions/button)).

---

## 7. Testes

Relatório completo: [`docs/RELATORIO-TESTES.md`](docs/RELATORIO-TESTES.md).

Resumo v1.2 (20/10/2026): typecheck ✅ · lint ✅ · 136/136 testes ✅ · `shopify app build` ✅ (2 extensões) · bundles ≤ 51,5 KB ✅ · 4/4 operações Customer Account API + 10/10 Admin API válidas ✅ · validador oficial de componentes (cliente e admin) ✅. A v1.0 foi pré-visualizada por Paulo em `doggie-dev.myshopify.com`; v1.1/v1.2 ainda não foram vistas no host real.

**Pendentes (exigem loja de desenvolvimento):** renderização real em desktop e mobile, leitura de encomendas reais, gravação real do metafield, conflito real entre separadores, navegação, configuração no editor, confirmação de que o tema fica intacto.

Lista de verificação na loja de desenvolvimento:
- [ ] Página aparece no menu da conta e abre em desktop e mobile.
- [ ] "Olá, [nome]!" com o nome do cliente de teste; cliente sem nome → "Olá!".
- [ ] Estado vazio de companheiros → adicionar cão → recarregar → persiste.
- [ ] Editar → recarregar → persiste; remover → confirmação → recarregar → desapareceu.
- [ ] Dois separadores: gravar num e depois noutro → aviso de conflito, nada perdido.
- [ ] Metafield visível (só leitura) no admin, na ficha do cliente.
- [ ] Encomendas: 3 mais recentes, valores em €, estados corretos, link abre o detalhe nativo.
- [ ] Cliente sem encomendas → estado vazio.
- [ ] Subscrições: sem URL → estado vazio; com URL → botão abre o portal.
- [ ] Gerir perfil / Voltar a comprar / mosaicos Ver encomendas · Atualizar morada · Adicionar companheiro.
- [ ] (v1.1) Cartão de companheiro abre a edição; "Remover companheiro" → confirmação → "Manter" volta ao formulário.
- [ ] (v1.1) Miniaturas das encomendas (artigos com e sem imagem); badges com ícone; "Ver todas ›".
- [ ] (v1.1) Hero com imagem: 2 colunas em desktop, empilhado em mobile; mosaicos lado a lado vs. empilhados.
- [ ] (v1.2) Depois de gravar companheiros na conta de cliente, a ficha do cliente no admin mostra `pet_species`/`pet_count` corretos (Metafields › ver todos).

**Saudação mostra "Olá!" em vez do nome?** A extensão nunca inventa nomes: só mostra o `firstName` devolvido pela API. Confirmar (1) que o cliente de teste tem nome próprio preenchido e (2) que no Dev Dashboard → app → *API access* → *Protected customer data* está selecionado o campo **Name** (nível 2), e voltar a correr `shopify app dev`/redeploy.
- [ ] Tema `doggie_shopify/main` sem alterações.

---

## 8. Comparação com o mockup

Ver [`docs/COMPARACAO-MOCKUP.md`](docs/COMPARACAO-MOCKUP.md). Em resumo (v1.1): estrutura, hierarquia, cabeçalhos com ícone e ligação, cartões compactos, linhas de encomenda com miniatura e mosaicos de ações estão próximos do mockup. Não reproduzíveis no código: cores/gradientes, tipografia, ícones em botões, ícone de pata/raio, badges verdes/azuis, fotos dos animais e dados de subscrição (que não se inventam). O resultado é aproximado, não idêntico.

## 9. Auditoria do starter

Ver [`docs/AUDITORIA-STARTER.md`](docs/AUDITORIA-STARTER.md) — 18 problemas identificados (2 críticos: endpoint em formato incorreto e projeto não compilável) e respetivas correções.

---

## 10. Ferramentas de admin (v1.2)

### 10.1 Bloco «Companheiros (Minha DOGGIE)» na ficha do cliente
1. Depois de instalar/atualizar a app (primeiro na loja de desenvolvimento), abrir **Clientes → um cliente**.
2. Os blocos de apps são **adicionados e fixados pelo lojista**: na ficha do cliente, usar o controlo de blocos de apps (ícone de apps / *Adicionar bloco*), escolher **Companheiros (Minha DOGGIE)** e fixá-lo. Pode ser reordenado ou recolhido (mostra "N companheiros" quando recolhido).
3. Funções: lista com nome e "Cão · Labrador · 3 anos"; **Adicionar companheiro**; ✏️ editar; 🗑️ remover → confirmação **Remover/Manter**. Validação idêntica à da conta de cliente (mesmo código).
4. Se outra pessoa (o cliente ou outro membro da equipa) gravar entretanto, aparece "O cliente alterou os companheiros entretanto" e a lista é recarregada; nada é sobrescrito.
5. Se os índices estiverem desatualizados (p. ex. cliente anterior à v1.2), aparece um aviso com **Sincronizar índices**.

### 10.2 Segmentos por espécie
**Pré-requisitos:** versão da app com as definições `pet_species`/`pet_count` instalada; correr **uma vez** a reindexação (10.3).

Em **Clientes → (Mais ações) → Minha DOGGIE → Segmentos por espécie** o painel lê da Shopify o namespace real da app (`$app` é resolvido para `app--<id da app>`) e mostra as consultas exatas, com **Verificar** (valida a sintaxe e conta clientes, só leitura) e **Criar segmento** (guarda-o em Clientes › Segmentos).

Consultas (substituir `app--<ID>` pelo namespace mostrado no painel ou sugerido pelo editor de segmentos ao escrever `metafields.`):

| Segmento | Consulta |
|---|---|
| Com companheiros | `metafields.app--<ID>.pet_count >= 1` |
| Tem cão | `metafields.app--<ID>.pet_species CONTAINS 'cao' AND metafields.app--<ID>.pet_count >= 1` |
| Tem gato | `metafields.app--<ID>.pet_species CONTAINS 'gato' AND metafields.app--<ID>.pet_count >= 1` |
| Tem cão e gato | `metafields.app--<ID>.pet_species CONTAINS 'cao' AND metafields.app--<ID>.pet_species CONTAINS 'gato' AND metafields.app--<ID>.pet_count >= 1` |
| Só cão | `metafields.app--<ID>.pet_species CONTAINS 'cao' AND metafields.app--<ID>.pet_species NOT CONTAINS 'gato'` |
| 2 ou mais companheiros | `metafields.app--<ID>.pet_count >= 2` |

`pet_count >= 1` protege contra um `pet_species` antigo que não tenha chegado a ser removido. Também é possível criar segmentos manualmente: **Clientes → Segmentos → Criar segmento**, escrever `metafields.` e escolher *Espécies dos companheiros (Minha DOGGIE)* na lista de filtros. Os segmentos servem para Shopify Email, descontos, Flow e exportação nativa de clientes.

> A sintaxe `metafields.<namespace>.<chave>` e os operadores (`CONTAINS`, `>=`) seguem a documentação oficial; o namespace exato só é conhecido depois de a app existir na organização — por isso o painel lê-o em runtime e "Verificar" confirma a consulta na própria loja.

### 10.3 Reindexação (backfill) — uma vez
**Clientes → (Mais ações) → Minha DOGGIE → Reindexar espécies → Reindexar agora.**
- Percorre todos os clientes (100 por página; respeita o limite de ritmo da API e repete automaticamente em `THROTTLED`).
- Só toca em clientes que têm `$app:pets`, e só onde os índices diferem. Não altera a lista de companheiros: regrava `pets` com o **valor original exato** + `compareDigest`, juntamente com os índices (mesma chamada atómica) — se o cliente editar ao mesmo tempo, essa linha conta como "conflito" e basta repetir.
- Resumo: analisados, com companheiros, já sincronizados, corrigidos, conflitos, ilegíveis, falhas. Pode ser repetido em segurança. Manter o modal aberto até terminar (pode ser parado em "Parar").

### 10.4 Exportação CSV
- **Todos:** Clientes → (Mais ações) → **Minha DOGGIE** → *Exportar companheiros (CSV)*. Origem:
  - *Todos os clientes (exato, mais lento)* — percorre todos os clientes;
  - *Segmento «com companheiros» (rápido)* — usa `customerSegmentMembers` com `pet_count >= 1` (exige 10.3 feito).
- **Selecionados:** na lista de clientes, selecionar clientes → menu de ações em massa → **Minha DOGGIE**.
- Separador: ponto e vírgula (Excel em português, por omissão) ou vírgula. Ficheiro UTF-8 com BOM, uma linha por companheiro: `customer id;name;email;nome;espécie;raça;idade` (o `customer id` é o número que aparece no URL do cliente no admin).
- **Gerar CSV** → **Descarregar CSV** (`minha-doggie-companheiros-AAAA-MM-DD.csv`). O ficheiro é criado no navegador (URL `data:`); se o navegador bloquear o download, para exportações até 500 linhas existe **Mostrar CSV para copiar**. Acima de ~2 MB, exportar por partes (seleção).
- Alternativa nativa (sem dados dos animais): abrir o segmento (10.2) → **Exportar** clientes (CSV nativo da Shopify com nome/email). Os campos nome/espécie/raça/idade de cada animal vivem no JSON `pets` e só a exportação da app os separa em colunas.
- A API de clientes não filtra por valor de metafield; por isso a origem «Todos» percorre os clientes e a origem «Segmento» usa `customerSegmentMembers`. O `customer id` na origem «Segmento» vem do id do membro do segmento (mesmo número do cliente; confirmar na loja de desenvolvimento).

### 10.5 Lista de verificação (loja de desenvolvimento)
- [ ] Bloco aparece na ficha do cliente; estados carregar/vazio/erro.
- [ ] Adicionar/editar/remover no admin → a conta de cliente mostra a alteração após recarregar (e vice-versa).
- [ ] Após cada gravação, `pet_species`/`pet_count` corretos; remover o último → `pet_count = 0` e `pet_species` removido.
- [ ] Conflito: editar na conta de cliente e depois no admin sem recarregar → aviso, nada perdido.
- [ ] Reindexação: resumo coerente; segunda execução → "Corrigidos: 0".
- [ ] Segmentos: "Verificar" devolve contagem; criar "Tem cão" → aparece em Clientes › Segmentos com os clientes certos.
- [ ] CSV (todos / segmento / seleção): abre no Excel com acentos corretos; colunas pedidas; download funciona em Chrome/Safari/Firefox.
- [ ] Membro da equipa sem permissão de Clientes: não consegue ler/gravar (mensagem de permissão).

