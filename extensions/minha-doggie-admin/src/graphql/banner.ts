/**
 * Banner da conta de cliente: ler/gravar a configuração (metafield `$app.banner` da loja)
 * e enviar a imagem para Conteúdo › Ficheiros (stagedUploadsCreate → POST → fileCreate).
 */
import {BANNER_LIMITS, parseBanner, safeBannerImageUrl, serializeBanner, type BannerConfig} from '@minha-doggie/core';
import {adminRequest, type AdminRequestOptions, type FetchLike} from './client';
import {
  BANNER_QUERY,
  BANNER_SET_MUTATION,
  FILE_CREATE_MUTATION,
  FILE_STATUS_QUERY,
  STAGED_UPLOAD_MUTATION,
} from './operations';

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

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateBannerFile(file: {type: string; size: number}): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'type';
  if (file.size > BANNER_LIMITS.fileMaxBytes) return 'size';
  return null;
}

interface StagedTarget {
  url: string;
  resourceUrl: string;
  parameters: Array<{name: string; value: string}>;
}

/**
 * Envia a imagem para a Shopify e devolve o URL público (cdn.shopify.com) quando o
 * ficheiro fica pronto. `uploadFetch` é injetável nos testes.
 */
export async function uploadBannerImage(
  file: File,
  options: AdminRequestOptions & {uploadFetch?: FetchLike; sleep?: (ms: number) => Promise<void>; maxPolls?: number} = {},
): Promise<string> {
  const staged = await adminRequest<{
    stagedUploadsCreate: {stagedTargets: StagedTarget[]; userErrors: Array<{message: string}>} | null;
  }>(
    STAGED_UPLOAD_MUTATION,
    {
      input: [
        {filename: file.name, mimeType: file.type, resource: 'IMAGE', httpMethod: 'POST', fileSize: String(file.size)},
      ],
    },
    options,
  );
  const stagedErrors = staged.stagedUploadsCreate?.userErrors ?? [];
  const target = staged.stagedUploadsCreate?.stagedTargets?.[0];
  if (stagedErrors.length > 0 || !target) throw new BannerError(stagedErrors.map((e) => e.message).join(' | ') || 'staged');

  const form = new FormData();
  for (const parameter of target.parameters) form.append(parameter.name, parameter.value);
  form.append('file', file);
  const upload = options.uploadFetch ?? ((input, init) => fetch(input, init));
  const response = await upload(target.url, {method: 'POST', body: form});
  if (!response.ok) throw new BannerError(`upload HTTP ${response.status}`);

  const created = await adminRequest<{
    fileCreate: {files: Array<{id: string; fileStatus: string}>; userErrors: Array<{message: string}>} | null;
  }>(
    FILE_CREATE_MUTATION,
    {files: [{originalSource: target.resourceUrl, contentType: 'IMAGE', alt: ''}]},
    options,
  );
  const createdErrors = created.fileCreate?.userErrors ?? [];
  const fileId = created.fileCreate?.files?.[0]?.id;
  if (createdErrors.length > 0 || !fileId) throw new BannerError(createdErrors.map((e) => e.message).join(' | ') || 'file');

  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const maxPolls = options.maxPolls ?? 20;
  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    const status = await adminRequest<{node: {fileStatus: string; image: {url: string} | null} | null}>(
      FILE_STATUS_QUERY,
      {id: fileId},
      options,
    );
    const node = status.node;
    if (node?.fileStatus === 'FAILED') throw new BannerError('processing');
    if (node?.fileStatus === 'READY') {
      const url = safeBannerImageUrl(node.image?.url);
      if (!url) throw new BannerError('url');
      return url;
    }
    await sleep(1000);
  }
  throw new BannerError('timeout');
}
