import {PET_COPY, PET_LIMITS, type PetValidationMessages} from '@minha-doggie/core';

/** Textos do admin (pt-PT, dirigidos à equipa DOGGIE). */
export const ADMIN_COPY = {
  block: {
    heading: 'Companheiros (Minha DOGGIE)',
    collapsed: (count: number) => (count === 1 ? '1 companheiro' : `${count} companheiros`),
    loading: 'A carregar companheiros…',
    loadError: 'Não foi possível carregar os companheiros deste cliente.',
    retry: 'Tentar novamente',
    empty: 'Este cliente ainda não registou companheiros.',
    corrupted:
      'Os dados de companheiros deste cliente não puderam ser lidos. Para não perder informação, a edição está bloqueada.',
    discarded: (n: number) => `${n} registo(s) antigo(s) incompleto(s) não são mostrados (e serão descartados na próxima gravação).`,
    add: 'Adicionar companheiro',
    edit: (name: string) => `Editar ${name}`,
    remove: (name: string) => `Remover ${name}`,
    limitReached: `O cliente pode registar até ${PET_LIMITS.maxPets} companheiros.`,
    outOfSync: 'Os índices de segmentação (espécies/contagem) deste cliente estão desatualizados.',
    syncNow: 'Sincronizar índices',
    synced: 'Índices sincronizados.',
    saved: 'Companheiro guardado.',
    removed: 'Companheiro removido.',
    conflict: 'O cliente alterou os companheiros entretanto. Recarregámos a lista — confirma e repete a alteração.',
    saveError: (detail: string) => `Não foi possível guardar: ${detail}`,
    accessError:
      'Sem permissão para alterar este cliente. Confirma que tens a permissão «Clientes» e que a app tem acesso aos dados protegidos de clientes.',
  },
  form: {
    headingNew: 'Novo companheiro',
    headingEdit: 'Editar companheiro',
    name: 'Nome',
    species: 'Espécie',
    breed: 'Raça (opcional)',
    ageValue: 'Idade aproximada (opcional)',
    ageUnit: 'Unidade',
    save: 'Guardar',
    cancel: 'Cancelar',
  },
  confirm: {
    body: (name: string) => `Remover ${name} da conta deste cliente? Esta ação não pode ser anulada.`,
    confirm: 'Remover',
    cancel: 'Manter',
  },
  validation: {
    ...PET_COPY.validation,
    nameRequired: 'Indica o nome do companheiro.',
  } satisfies PetValidationMessages,
  tools: {
    heading: 'Minha DOGGIE',
    close: 'Fechar',
  },
  exporter: {
    heading: 'Exportar companheiros (CSV)',
    headingSelection: 'Exportar companheiros dos clientes selecionados',
    intro:
      'Gera um CSV com uma linha por companheiro: customer id, name, email, nome, espécie, raça, idade. Contém dados pessoais: uso interno da equipa DOGGIE, não partilhar, apagar quando já não for necessário.',
    selectionCount: (n: number) => (n === 1 ? '1 cliente selecionado.' : `${n} clientes selecionados.`),
    source: 'Origem',
    sourceAll: 'Todos os clientes (exato, mais lento)',
    sourceSegment: 'Segmento «com companheiros» (rápido, requer índices sincronizados)',
    delimiter: 'Separador',
    delimiterSemicolon: 'Ponto e vírgula (Excel em português)',
    delimiterComma: 'Vírgula',
    generate: 'Gerar CSV',
    cancel: 'Parar',
    progress: (n: number) => `${n} clientes lidos…`,
    ready: (pets: number, customers: number) =>
      `${pets} companheiro(s) de ${customers} cliente(s). O ficheiro é gerado no teu navegador; nada é guardado na Shopify.`,
    readyEmpty: 'Nenhum companheiro encontrado.',
    truncated: 'A leitura foi interrompida: o ficheiro está incompleto.',
    unreadable: (n: number) => `${n} cliente(s) com dados ilegíveis foram ignorados.`,
    download: 'Descarregar CSV',
    large: 'Ficheiro grande: se o download não arrancar, exporta por partes com a seleção de clientes.',
    showText: 'Mostrar CSV para copiar',
    hideText: 'Esconder CSV',
    textLabel: 'Conteúdo CSV',
    segmentUnavailable: 'Os índices ainda não existem nesta loja: usa «Todos os clientes».',
    error: (detail: string) => `A exportação falhou: ${detail}`,
  },
  segments: {
    heading: 'Segmentos por espécie',
    intro:
      'Consultas para Clientes › Segmentos. O namespace da app é lido da Shopify (não é inventado). «Verificar» valida a consulta e conta clientes; «Criar segmento» guarda-o.',
    loading: 'A ler as definições de metafields…',
    missing:
      'As definições pet_species/pet_count ainda não existem nesta loja. Faz deploy da versão da app que as declara e volta a abrir.',
    verify: 'Verificar',
    create: 'Criar segmento',
    count: (n: number) => (n === 1 ? '1 cliente' : `${n} clientes`),
    created: 'Segmento criado.',
    error: (detail: string) => `Erro: ${detail}`,
    suggestion: (queryName: string) => `Filtro confirmado pelo editor de segmentos: ${queryName}`,
  },
  reindex: {
    heading: 'Reindexar espécies (backfill)',
    intro:
      'Recalcula pet_species e pet_count a partir de pets para todos os clientes que usam a Minha DOGGIE. Corre uma vez depois de instalar esta versão (é seguro repetir: só escreve onde há diferenças, e nunca altera a lista de companheiros).',
    run: 'Reindexar agora',
    cancel: 'Parar',
    scanning: (n: number) => `${n} clientes analisados…`,
    writing: (done: number, total: number) => `A corrigir ${done}/${total}…`,
    summary: (s: {scanned: number; withPets: number; alreadyInSync: number; repaired: number; conflicts: number; unreadable: number; failed: number}) =>
      `Analisados: ${s.scanned}. Com companheiros: ${s.withPets}. Já sincronizados: ${s.alreadyInSync}. Corrigidos: ${s.repaired}. Conflitos (repetir): ${s.conflicts}. Ilegíveis: ${s.unreadable}. Falhas: ${s.failed}.`,
    truncated: 'Interrompido: volta a correr para terminar.',
    error: (detail: string) => `A reindexação falhou: ${detail}`,
  },
} as const;
