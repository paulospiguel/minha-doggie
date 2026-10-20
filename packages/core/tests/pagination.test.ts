import {describe, expect, it, vi} from 'vitest';
import {chunk, collectPages, PaginationError, withRetry, type Page} from '../src/pagination';

function pages<T>(data: T[][]): (after: string | null) => Promise<Page<T>> {
  return async (after) => {
    const index = after == null ? 0 : Number(after.replace('c', ''));
    const last = index === data.length - 1;
    return {nodes: data[index], pageInfo: {hasNextPage: !last, endCursor: last ? null : `c${index + 1}`}};
  };
}

describe('collectPages', () => {
  it('segue endCursor até hasNextPage=false', async () => {
    const fetchPage = vi.fn(pages([[1, 2], [3], [4, 5]]));
    const progress: number[] = [];
    const result = await collectPages(fetchPage, {onPage: ({total}) => progress.push(total)});
    expect(result).toEqual({items: [1, 2, 3, 4, 5], pages: 3, truncated: false});
    expect(fetchPage.mock.calls.map((call) => call[0])).toEqual([null, 'c1', 'c2']);
    expect(progress).toEqual([2, 3, 5]);
  });
  it('página única', async () => {
    expect(await collectPages(pages([[]]))).toEqual({items: [], pages: 1, truncated: false});
  });
  it('para no limite de páginas e marca o resultado como incompleto', async () => {
    const result = await collectPages(pages([[1], [2], [3]]), {maxPages: 2});
    expect(result).toEqual({items: [1, 2], pages: 2, truncated: true});
  });
  it('cancelamento cooperativo', async () => {
    let cancel = false;
    const result = await collectPages(
      async () => {
        cancel = true;
        return {nodes: [1], pageInfo: {hasNextPage: true, endCursor: 'x'}};
      },
      {isCancelled: () => cancel},
    );
    expect(result).toEqual({items: [1], pages: 1, truncated: true});
  });
  it('erro em cursor repetido (ciclo) ou hasNextPage sem cursor', async () => {
    await expect(
      collectPages(async () => ({nodes: [1], pageInfo: {hasNextPage: true, endCursor: 'same'}})),
    ).rejects.toBeInstanceOf(PaginationError);
    await expect(
      collectPages(async () => ({nodes: [1], pageInfo: {hasNextPage: true, endCursor: null}})),
    ).rejects.toBeInstanceOf(PaginationError);
  });
});

describe('chunk', () => {
  it('divide em blocos', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
    expect(() => chunk([1], 0)).toThrow(RangeError);
  });
});

describe('withRetry', () => {
  it('repete erros recuperáveis com espera crescente', async () => {
    const sleep = vi.fn(async () => undefined);
    let n = 0;
    const value = await withRetry(
      async () => {
        n += 1;
        if (n < 3) throw new Error('THROTTLED');
        return 'ok';
      },
      (error) => error instanceof Error && error.message === 'THROTTLED',
      {sleep},
    );
    expect(value).toBe('ok');
    expect(sleep.mock.calls.map((call) => (call as unknown[])[0])).toEqual([1000, 2000]);
  });
  it('não repete erros não recuperáveis e desiste após N tentativas', async () => {
    const sleep = vi.fn(async () => undefined);
    await expect(withRetry(async () => Promise.reject(new Error('boom')), () => false, {sleep})).rejects.toThrow('boom');
    expect(sleep).not.toHaveBeenCalled();
    await expect(withRetry(async () => Promise.reject(new Error('x')), () => true, {sleep, retries: 2})).rejects.toThrow('x');
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
