/**
 * Banner da conta de cliente: ler/gravar a configuração (metafield `$app.banner` da loja)
 * e listar imagens disponíveis em Conteúdo › Ficheiros (`files(query: "media_type:IMAGE")`).
 */
import {parseBanner, safeBannerImageUrl, sanitizeText, serializeBanner, truncate, type BannerConfig} from '@minha-doggie/core';
import {adminRequest, type AdminRequestOptions} from './client';
import {BANNER_QUERY, BANNER_SET_MUTATION, LIBRARY_FILES_QUERY} from './operations';

export class BannerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BannerError';
  }
}

export interface BannerState {
  shopId: string;
  config: BannerConfig;
}

export interface LibraryImage {
  id: string;
  url: string;
  filename: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export async function fetchBanner(options: AdminRequestOptions = {}): Promise<BannerState> {
  const data = await adminRequest<{shop: {id: string; banner: {value: string} | null}}>(BANNER_QUERY, {}, options);
  return {shopId: data.shop.id, config: parseBanner(data.shop.banner?.value)};
}

export async function saveBanner(shopId: string, config: BannerConfig, options: AdminRequestOptions = {}): Promise<void> {
  const data = await adminRequest<{
    metafieldsSet: {userErrors: Array<{message: string}>} | null;
  }>(
    BANNER_SET_MUTATION,
    {metafields: [{ownerId: shopId, namespace: '$app', key: 'banner', type: 'json', value: serializeBanner(config)}]},
    options,
  );
  const errors = data.metafieldsSet?.userErrors ?? [];
  if (errors.length > 0) throw new BannerError(errors.map((e) => e.message).join(' | '));
}

function filenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split('/').filter(Boolean).pop() ?? '';
    return decodeURIComponent(last) || 'imagem';
  } catch {
    return 'imagem';
  }
}

function buildFilesQuery(search: string): string {
  const clean = sanitizeText(search)
    .replace(/["'\\:()]/g, ' ')
    .trim();
  if (!clean) return 'media_type:IMAGE status:READY';
  return `media_type:IMAGE status:READY filename:*${truncate(clean, 60)}*`;
}

interface MediaImageNode {
  id?: string;
  alt?: string | null;
  image?: {
    url?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
}

/** Lista imagens prontas de Conteúdo › Ficheiros (mais recentes primeiro). */
export async function fetchLibraryImages(
  search = '',
  options: AdminRequestOptions = {},
): Promise<LibraryImage[]> {
  const data = await adminRequest<{files: {nodes: MediaImageNode[]}}>(
    LIBRARY_FILES_QUERY,
    {first: 24, query: buildFilesQuery(search)},
    options,
  );
  const result: LibraryImage[] = [];
  for (const node of data.files?.nodes ?? []) {
    const url = safeBannerImageUrl(node?.image?.url);
    if (!node?.id || !url) continue;
    result.push({
      id: node.id,
      url,
      filename: filenameFromUrl(url),
      alt: truncate(sanitizeText(node.alt ?? ''), 120),
      width: typeof node.image?.width === 'number' ? node.image.width : null,
      height: typeof node.image?.height === 'number' ? node.image.height : null,
    });
  }
  return result;
}
