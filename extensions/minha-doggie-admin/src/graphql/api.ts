import {
  buildIndexRepair,
  buildPetsWrite,
  chunk,
  collectPages,
  isIndexInSync,
  namespaceFromFilterQueryName,
  parsePetsMetafield,
  PET_SPECIES_METAFIELD,
  PETS_METAFIELD,
  type CustomerPetsRecord,
  type MetafieldIdentifierInput,
  type MetafieldsSetInput,
  type Page,
  type Pet,
  type PetsWritePlan,
} from '@minha-doggie/core';
import {adminRequest, type AdminRequestOptions} from './client';
import {
  CUSTOMER_PETS_QUERY,
  DELETE_PET_INDEX_MUTATION,
  EXPORT_NODES_QUERY,
  EXPORT_SCAN_QUERY,
  EXPORT_SEGMENT_QUERY,
  INDEX_SCAN_QUERY,
  PET_DEFINITIONS_QUERY,
  SEGMENT_COUNT_QUERY,
  SEGMENT_CREATE_MUTATION,
  SET_PETS_MUTATION,
} from './operations';

/** Tamanho de página: equilíbrio entre custo de query (limite 1000 pontos) e número de pedidos. */
export const SCAN_PAGE_SIZE = 100;
export const SEGMENT_PAGE_SIZE = 250;
export const NODES_CHUNK_SIZE = 100;

type MetafieldValue = {value: string; compareDigest?: string} | null;

export class PetsConflictError extends Error {
  constructor() {
    super('Pets metafield changed since it was read');
    this.name = 'PetsConflictError';
  }
}

export class PetsSaveError extends Error {
  readonly codes: string[];
  constructor(message: string, codes: string[] = []) {
    super(message);
    this.name = 'PetsSaveError';
    this.codes = codes;
  }
}

export interface CustomerPetsState {
  customerId: string;
  /** null quando o JSON guardado está ilegível (escritas bloqueadas para não perder dados). */
  pets: Pet[] | null;
  discarded: number;
  compareDigest: string | null;
  indexInSync: boolean;
  rawPetsValue: string | null;
}

interface CustomerPetsData {
  customer: {
    id: string;
    pets: MetafieldValue;
    petSpecies: MetafieldValue;
    petCount: MetafieldValue;
  } | null;
}

export async function fetchCustomerPets(customerId: string, options?: AdminRequestOptions): Promise<CustomerPetsState> {
  const data = await adminRequest<CustomerPetsData>(CUSTOMER_PETS_QUERY, {id: customerId}, options);
  if (!data.customer) throw new PetsSaveError('Cliente não encontrado.');
  return toPetsState(data.customer);
}

function toPetsState(node: {id: string; pets: MetafieldValue; petSpecies: MetafieldValue; petCount: MetafieldValue}): CustomerPetsState {
  const raw = node.pets?.value ?? null;
  const base = {customerId: node.id, compareDigest: node.pets?.compareDigest ?? null, rawPetsValue: raw};
  try {
    const parsed = parsePetsMetafield(raw);
    return {
      ...base,
      pets: parsed.pets,
      discarded: parsed.discarded,
      indexInSync: isIndexInSync(parsed.pets, node.petSpecies?.value, node.petCount?.value),
    };
  } catch {
    return {...base, pets: null, discarded: 0, indexInSync: false};
  }
}

interface SetData {
  metafieldsSet: {
    metafields: Array<{key: string; value: string; compareDigest: string}> | null;
    userErrors: Array<{field: string[] | null; message: string; code: string | null}>;
  } | null;
}

interface DeleteData {
  metafieldsDelete: {userErrors: Array<{field: string[] | null; message: string}>} | null;
}

/** Executa um plano de escrita: 1 metafieldsSet atómico (+ remoção de índice vazio). */
export async function executeWritePlan(plan: PetsWritePlan, options?: AdminRequestOptions): Promise<string | null> {
  const data = await adminRequest<SetData>(SET_PETS_MUTATION, {metafields: plan.set satisfies MetafieldsSetInput[]}, options);
  const result = data.metafieldsSet;
  if (!result) throw new PetsSaveError('metafieldsSet returned null');
  if (result.userErrors.length > 0) {
    const codes = result.userErrors.map((error) => error.code ?? '').filter(Boolean);
    if (codes.some((code) => code === 'INVALID_COMPARE_DIGEST' || code === 'STALE_OBJECT')) throw new PetsConflictError();
    throw new PetsSaveError(result.userErrors.map((error) => error.message).join(' | '), codes);
  }
  const saved = result.metafields?.find((metafield) => metafield.key === PETS_METAFIELD.key);
  if (!saved) throw new PetsSaveError('A Shopify não confirmou a gravação.');
  if (plan.remove.length > 0) await removeIndex(plan.remove, options);
  return saved.compareDigest ?? null;
}

async function removeIndex(metafields: MetafieldIdentifierInput[], options?: AdminRequestOptions): Promise<void> {
  const data = await adminRequest<DeleteData>(DELETE_PET_INDEX_MUTATION, {metafields}, options);
  const errors = data.metafieldsDelete?.userErrors ?? [];
  if (errors.length > 0) throw new PetsSaveError(errors.map((error) => error.message).join(' | '));
}

/** Grava a lista completa + índices de segmentação (mesma chamada atómica). */
export function saveCustomerPets(
  customerId: string,
  pets: readonly Pet[],
  compareDigest: string | null,
  options?: AdminRequestOptions,
): Promise<string | null> {
  return executeWritePlan(buildPetsWrite(customerId, pets, compareDigest), options);
}

// ---------------------------------------------------------------------------
// Reindexação (backfill) de pet_species / pet_count a partir de pets
// ---------------------------------------------------------------------------

export interface ReindexSummary {
  scanned: number;
  withPets: number;
  alreadyInSync: number;
  repaired: number;
  conflicts: number;
  unreadable: number;
  failed: number;
  truncated: boolean;
}

interface IndexScanData {
  customers: Page<{id: string; pets: MetafieldValue; petSpecies: MetafieldValue; petCount: MetafieldValue}>;
}

export interface ProgressOptions extends AdminRequestOptions {
  onProgress?: (message: {phase: 'scan' | 'write'; done: number; total?: number}) => void;
  isCancelled?: () => boolean;
}

export async function reindexAllCustomers(options: ProgressOptions = {}): Promise<ReindexSummary> {
  const scan = await collectPages(
    async (after) =>
      (await adminRequest<IndexScanData>(INDEX_SCAN_QUERY, {first: SCAN_PAGE_SIZE, after}, options)).customers,
    {onPage: ({total}) => options.onProgress?.({phase: 'scan', done: total}), isCancelled: options.isCancelled},
  );
  const summary: ReindexSummary = {
    scanned: scan.items.length,
    withPets: 0,
    alreadyInSync: 0,
    repaired: 0,
    conflicts: 0,
    unreadable: 0,
    failed: 0,
    truncated: scan.truncated,
  };
  // Só clientes que já usaram a Minha DOGGIE (têm o metafield pets) são tocados.
  const candidates = scan.items.filter((node) => node.pets?.value != null);
  const toRepair: Array<{state: CustomerPetsState}> = [];
  for (const node of candidates) {
    const state = toPetsState(node);
    if (state.pets === null) {
      summary.unreadable += 1;
      continue;
    }
    if (state.pets.length > 0) summary.withPets += 1;
    if (state.indexInSync) summary.alreadyInSync += 1;
    else toRepair.push({state});
  }
  let done = 0;
  for (const {state} of toRepair) {
    if (options.isCancelled?.()) {
      summary.truncated = true;
      break;
    }
    try {
      await executeWritePlan(
        buildIndexRepair(state.customerId, state.pets ?? [], state.rawPetsValue ?? '', state.compareDigest),
        options,
      );
      summary.repaired += 1;
    } catch (error) {
      if (error instanceof PetsConflictError) summary.conflicts += 1;
      else summary.failed += 1;
    }
    done += 1;
    options.onProgress?.({phase: 'write', done, total: toRepair.length});
  }
  return summary;
}

// ---------------------------------------------------------------------------
// Exportação CSV
// ---------------------------------------------------------------------------

interface ExportNode {
  id: string;
  firstName: string | null;
  lastName: string | null;
  defaultEmailAddress: {emailAddress: string} | null;
  pets: MetafieldValue;
}

export interface ExportResult {
  records: CustomerPetsRecord[];
  scanned: number;
  unreadable: number;
  truncated: boolean;
}

export function toExportRecords(nodes: ReadonlyArray<ExportNode | null>): {records: CustomerPetsRecord[]; unreadable: number} {
  const records: CustomerPetsRecord[] = [];
  let unreadable = 0;
  for (const node of nodes) {
    if (!node || typeof node.id !== 'string' || node.pets?.value == null) continue;
    let pets: Pet[];
    try {
      pets = parsePetsMetafield(node.pets.value).pets;
    } catch {
      unreadable += 1;
      continue;
    }
    if (pets.length === 0) continue;
    records.push({
      customerId: node.id,
      name: [node.firstName, node.lastName].filter((part) => part && part.trim()).join(' '),
      email: node.defaultEmailAddress?.emailAddress ?? '',
      pets,
    });
  }
  return {records, unreadable};
}

interface ExportScanData {
  customers: Page<ExportNode>;
}

interface ExportSegmentData {
  customerSegmentMembers: {pageInfo: Page<ExportNode>['pageInfo']; edges: Array<{node: ExportNode}>};
}

interface ExportNodesData {
  nodes: Array<ExportNode | Record<string, never> | null>;
}

/** Varrimento completo (exato; não depende dos índices). */
export async function exportFromAllCustomers(options: ProgressOptions = {}): Promise<ExportResult> {
  const scan = await collectPages(
    async (after) =>
      (await adminRequest<ExportScanData>(EXPORT_SCAN_QUERY, {first: SCAN_PAGE_SIZE, after}, options)).customers,
    {onPage: ({total}) => options.onProgress?.({phase: 'scan', done: total}), isCancelled: options.isCancelled},
  );
  const {records, unreadable} = toExportRecords(scan.items);
  return {records, unreadable, scanned: scan.items.length, truncated: scan.truncated};
}

/** Via segmento `pet_count >= 1` (rápido; requer índices sincronizados). */
export async function exportFromSegment(segmentQuery: string, options: ProgressOptions = {}): Promise<ExportResult> {
  const scan = await collectPages(
    async (after) => {
      const data = await adminRequest<ExportSegmentData>(
        EXPORT_SEGMENT_QUERY,
        {query: segmentQuery, first: SEGMENT_PAGE_SIZE, after},
        options,
      );
      const connection = data.customerSegmentMembers;
      return {nodes: connection.edges.map((edge) => edge.node), pageInfo: connection.pageInfo};
    },
    {onPage: ({total}) => options.onProgress?.({phase: 'scan', done: total}), isCancelled: options.isCancelled},
  );
  const {records, unreadable} = toExportRecords(scan.items);
  return {records, unreadable, scanned: scan.items.length, truncated: scan.truncated};
}

/** Clientes selecionados na lista (ação de seleção). */
export async function exportFromIds(ids: readonly string[], options: ProgressOptions = {}): Promise<ExportResult> {
  const nodes: Array<ExportNode | null> = [];
  for (const group of chunk(ids, NODES_CHUNK_SIZE)) {
    const data = await adminRequest<ExportNodesData>(EXPORT_NODES_QUERY, {ids: group}, options);
    for (const node of data.nodes) nodes.push(node && 'id' in node ? (node as ExportNode) : null);
    options.onProgress?.({phase: 'scan', done: nodes.length, total: ids.length});
  }
  const {records, unreadable} = toExportRecords(nodes);
  return {records, unreadable, scanned: ids.length, truncated: false};
}

// ---------------------------------------------------------------------------
// Segmentos
// ---------------------------------------------------------------------------

interface DefinitionsData {
  metafieldDefinitions: {nodes: Array<{namespace: string; key: string; name: string}>};
  segmentFilterSuggestions: {nodes: Array<{queryName: string; localizedName: string}>};
}

export interface NamespaceInfo {
  /** Namespace resolvido (ex.: app--1234567), ou null se as definições ainda não existem. */
  namespace: string | null;
  /** Chaves das definições encontradas (pets, pet_species, pet_count). */
  keys: string[];
  /** queryName sugerido pelo editor de segmentos para pet_species, se existir. */
  suggestedQueryName: string | null;
}

export async function resolvePetNamespace(options?: AdminRequestOptions): Promise<NamespaceInfo> {
  const data = await adminRequest<DefinitionsData>(PET_DEFINITIONS_QUERY, {}, options);
  const definitions = data.metafieldDefinitions.nodes;
  const species = definitions.find((definition) => definition.key === PET_SPECIES_METAFIELD.key);
  const suggestion = data.segmentFilterSuggestions.nodes.find(
    (node) => namespaceFromFilterQueryName(node.queryName, PET_SPECIES_METAFIELD.key) === species?.namespace,
  );
  return {
    namespace: species?.namespace ?? null,
    keys: definitions.map((definition) => definition.key),
    suggestedQueryName: suggestion?.queryName ?? null,
  };
}

export async function countSegment(query: string, options?: AdminRequestOptions): Promise<number> {
  const data = await adminRequest<{customerSegmentMembers: {totalCount: number}}>(SEGMENT_COUNT_QUERY, {query}, options);
  return data.customerSegmentMembers.totalCount;
}

export async function createSegment(name: string, query: string, options?: AdminRequestOptions): Promise<string> {
  const data = await adminRequest<{
    segmentCreate: {segment: {id: string; name: string} | null; userErrors: Array<{message: string}>} | null;
  }>(SEGMENT_CREATE_MUTATION, {name, query}, options);
  const result = data.segmentCreate;
  if (!result || result.userErrors.length > 0 || !result.segment) {
    throw new PetsSaveError(result?.userErrors.map((error) => error.message).join(' | ') || 'segmentCreate falhou');
  }
  return result.segment.id;
}
