# Comparação visual com o mockup

Referências: `mockup/mockup.png` (alvo) e `mockup/current.png` (v1.0 na loja de desenvolvimento `doggie-dev.myshopify.com`, 20/10/2026).
Versão analisada: **v1.1** (revisão visual). Componentes, props e nomes de ícones verificados nas definições de tipos de `@shopify/ui-extensions` 2026.10.0 e na documentação oficial (customer-account-ui-extensions 2026-10). Sem CSS nem HTML próprios.

## O que mudou da v1.0 para a v1.1

| Área | v1.0 (screenshot atual) | v1.1 |
|---|---|---|
| Título | "Minha DOGGIE" + slogan como subtítulo; "Olá!" pequeno dentro de um cartão | **"Olá, {nome}!" é o título da página** (o maior nível tipográfico disponível) com o subtítulo neutro **"Esta é a tua área DOGGIE."** |
| Hero | Cartão branco só com texto e botões | Bloco de destaque **sem fundo próprio** (herda o fundo do cartão; ajuste de Paulo na v1.1), texto, slogan, **Gerir perfil** (primário) e **Voltar a comprar** (secundário); **imagem à direita** a ocupar a coluna (2:1, `cover`), empilhada em mobile |
| Cabeçalhos de secção | Título simples; botões "Adicionar"/"Ver todas" grandes | **Ícone + título à esquerda e ligação de texto à direita** ("Ver todas ›", "Gerir subscrição ›", "Adicionar +") |
| Companheiros | Cartões com botões Editar/Remover | **Grelha de 2 colunas de cartões compactos clicáveis**: avatar com iniciais, nome a negrito, espécie · raça, idade e **chevron**. Tocar abre a edição; "Remover companheiro" está no modal, com passo de confirmação |
| Encomendas | Lista com número/data e badge por baixo do total | **Linhas compactas**: miniatura do 1.º artigo, número, data, total, badge com ícone de estado e **chevron** |
| Subscrições | Texto simples | Secção com ícone, caixa `subdued` e ligação **"Gerir subscrição ›"** (só se o URL estiver configurado) |
| Ações rápidas | 3 botões empilhados | **3 mosaicos lado a lado** (contorno `border="base"`, raio grande; ajuste de Paulo na v1.1): ícone, chevron, título a negrito e descrição |
| Layout | 2/3 + 1/3 | **Hero a toda a largura; depois 2 colunas iguais** (companheiros + encomendas à esquerda; subscrições + ações rápidas à direita); 1 coluna em mobile |

## Elementos do mockup → implementação

| Mockup | v1.1 | Correspondência |
|---|---|---|
| "Olá, Sofia!" muito grande | Título da `s-page` | ≈ O tamanho é decidido pelo tema de contas (tipografia do editor), não pela extensão |
| "Bem-vinda à tua área DOGGIE." | Subtítulo da página "Esta é a tua área DOGGIE." | ≈ Texto neutro em género, como pedido |
| Banner rosa com cão e gato | `s-grid` (sem `background`) + `s-image` (URL configurável) | ≈ O fundo só poderia ser `base`/`subdued` (cinza claro do tema), nunca rosa/gradiente; optou-se por nenhum. O rosa vem da própria imagem |
| Botão "Gerir perfil" com gradiente rosa→laranja, ícone ⚙ e → | `s-button variant="primary"` | ✗ Sem gradiente; **`s-button` não tem prop de ícone** em contas de cliente. A cor do botão primário define-se no editor (Branding) |
| "Voltar a comprar" com ícone de carrinho | `s-button variant="secondary"` | ✗ Mesmo motivo (sem ícone em botões) |
| Ícone de pata em "Os meus companheiros" | Ícone `star` | ✗ Não existe ícone de pata (nem coração) na lista oficial de 75 ícones. `star` foi o mais próximo ("os favoritos") |
| Ícone caixa em "Últimas encomendas" | `order` | ✓ |
| Ícone de setas circulares em "Subscrição ativa" | `calendar` | ≈ Ícone oficial próximo (entregas agendadas) |
| Ícone raio em "Ações rápidas" | `grid` | ✗ Não existe ícone de raio |
| "Ver todos →" à direita | `s-link` "Ver todas ›" | ≈ `s-link` só aceita texto; o "›" é texto, com `accessibilityLabel` próprio |
| Fotos reais dos animais | `s-avatar` com iniciais | ✗ A v1 não guarda fotografias (seria preciso upload/armazenamento de ficheiros) |
| Símbolos ♂/♀ (sexo) | "Cão"/"Gato" | ✗ O sexo não é um campo pedido nem guardado (minimização de dados); não há ícones ♂/♀ |
| Chevron em círculo rosa no cartão | `s-icon type="chevron-right"` | ≈ Sem fundo circular colorido |
| "Max · Golden Retriever · 4 anos" | Nome / "Cão · Golden Retriever" / "4 anos" | ✓ |
| Miniatura do produto em cada encomenda | `s-product-thumbnail` com a imagem do 1.º artigo (`lineItems(first: 1)`, só HTTPS da CDN Shopify) | ✓ (placeholder nativo se o artigo não tiver imagem) |
| Badge verde "Entregue" / azul "Em preparação" | `s-badge` com ícone `check-circle`/`clock` | ≈ Em contas de cliente `s-badge` só tem tons `auto`/`neutral`/`critical`: **não há verde nem azul**. O estado é distinguido pelo ícone e pelo texto; canceladas/em espera usam `critical` |
| "Entregue" | "Enviada" | ✓ intencional: `FULFILLED` significa enviada, a API não garante a entrega |
| Subscrição ativa com "Próxima encomenda 12 de abril" e produto | Estado vazio ou ligação "Gerir subscrição ›" | ✗ intencional: **sem dados inventados**. A extensão não lê contratos de subscrição (exigiria a API da app de subscrições ou scopes adicionais) |
| Mosaicos de ações em rosa/lilás/pêssego | `s-clickable border="base"` | ≈ Mesmo contorno neutro para os três (cores livres não são permitidas) |
| "Repetir encomenda — Os teus produtos num só clique." | "Ver encomendas — Consulta o histórico e volta a comprar." | ✗ intencional: não existe "reorder" num clique disponível para esta extensão (a Customer Account API não expõe recompra). Leva ao histórico, onde a Shopify mostra "Comprar novamente" se estiver ativo no editor |
| Ícones coloridos nos mosaicos (carrinho, pin, pessoa) | `reorder`, `location`, `plus` (cor do tema) | ≈ `s-icon` só tem tons semânticos (`info`, `success`…), não cores de marca |
| Cabeçalho com logótipo, menu Início/Encomendas/Subscrições/Favoritos, sino e avatar | Cabeçalho nativo da Shopify | ✗ A extensão só desenha a área de conteúdo. Logótipo, cores do cabeçalho e menu configuram-se no editor de checkout e contas |
| Tipografia arredondada (estilo Nunito/Poppins) | Fonte do tema de contas | ✗ no código; ≈ no editor (Tipografia → Títulos/Corpo, lista de fontes da Shopify) |
| Fundo da página branco, cartões com sombra suave | Cartões `s-section` nativos | ✓ |

Legenda: ✓ equivalente · ≈ aproximado · ✗ não reproduzível (motivo indicado).

## Como aproximar mais (sem código): editor de checkout e contas

Disponível em **planos Basic ou superiores** (não exige Plus): o editor de checkout e contas, com logótipo, cores e tipografia, está incluído em "Standard checkout customizations". O Plus só é necessário para a Checkout Branding API e afins (personalização avançada por API). Fonte: [Help Center — Customizing and editing your checkout and accounts pages](https://help.shopify.com/en/manual/checkout-settings/customize-checkout-configurations) e [Customizing customer accounts pages](https://help.shopify.com/en/manual/customers/customer-accounts/customize-customer-accounts/customize).

Definições recomendadas (Definições → Checkout → Personalizar → ⚙ Definições):

| Definição | Valor sugerido | Efeito na Minha DOGGIE |
|---|---|---|
| Logótipo | Logótipo DOGGIE (versão horizontal) | Cabeçalho da conta |
| Paleta de cores | #4B0C62, #92278F, #DA1C5C, #EE2A7B, #F15A29, #FFFFFF | Reutilização rápida |
| Destaque e botões → **Destaque (Accent)** | **#92278F** | Ligações ("Ver todas ›", "Gerir subscrição ›", "Adicionar +"), foco |
| Destaque e botões → **Botão (Button)** | **#DA1C5C** (texto branco automático) | "Gerir perfil", "Guardar", "Adicionar companheiro" |
| Principal → Fundo | #FFFFFF | Fundo branco, como no mockup |
| Cabeçalho → Fundo / Destaque | #FFFFFF / #4B0C62 | Cabeçalho branco com ícones roxos |
| Tipografia → Títulos / Corpo | A fonte arredondada mais próxima da lista (ex.: Poppins / Nunito Sans, se disponíveis) | "Olá, {nome}!" e textos |
| Páginas de conta → Principal → Destaque | (opcional) sobrepor só nas contas | Cores das contas independentes do checkout |

Notas: o hero e os mosaicos já não usam fundo `subdued` (ajuste de Paulo: hero sem fundo, mosaicos com contorno `base`); qualquer fundo de componente seria derivado das cores do tema (nunca rosa fixo). Já não é possível adicionar imagens de fundo ao cabeçalho/área principal (desde 5/2/2026).

## Imagem do hero

As UI extensions não podem incluir imagens no bundle. A imagem de exemplo está em `docs/assets/hero-pets-exemplo.png` (769×285 px, recorte do mockup):
1. Admin → **Conteúdo → Ficheiros → Carregar** → copiar o URL (`https://cdn.shopify.com/...`).
2. Editor de contas → página **Minha DOGGIE** → definição **Imagem de boas-vindas (URL HTTPS)** → colar.
3. Recomendado: substituir por uma fotografia oficial com direitos de uso, **proporção 2:1, ≥ 1600×800 px** (a de exemplo é pequena e fica suave em ecrãs retina).
Sem URL, o hero mostra apenas o texto (a imagem é opcional).
