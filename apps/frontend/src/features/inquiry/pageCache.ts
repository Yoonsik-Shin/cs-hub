export interface CursorPage<T> {
  inquiries: T[];
  nextCursor: string | null;
  hasNext: boolean;
}

export type PageCache<T> = Record<number, CursorPage<T>>;

interface PageResponse<T> {
  content: T[];
  nextCursor: string | null;
  hasNext: boolean;
}

export function replaceWithFirstPage<T>(response: PageResponse<T>): PageCache<T> {
  return {
    1: toCacheEntry(response),
  };
}

export function storePage<T>(
  cache: PageCache<T>,
  page: number,
  response: PageResponse<T>,
): PageCache<T> {
  return {
    ...cache,
    [page]: toCacheEntry(response),
  };
}

export function resolveRefreshTarget<T>(
  currentPage: number,
  cache: PageCache<T>,
): { page: number; cursor: string | null } {
  if (currentPage <= 1) {
    return { page: 1, cursor: null };
  }

  const previousPage = cache[currentPage - 1];
  return previousPage
    ? { page: currentPage, cursor: previousPage.nextCursor }
    : { page: 1, cursor: null };
}

export function updateCachedItem<T extends { id: string }>(
  cache: PageCache<T>,
  id: string,
  updatedFields: Partial<T>,
): PageCache<T> {
  return Object.fromEntries(
    Object.entries(cache).map(([page, entry]) => [
      Number(page),
      {
        ...entry,
        inquiries: entry.inquiries.map((inquiry) => (
          inquiry.id === id ? { ...inquiry, ...updatedFields } : inquiry
        )),
      },
    ]),
  );
}

function toCacheEntry<T>(response: PageResponse<T>): CursorPage<T> {
  return {
    inquiries: response.content,
    nextCursor: response.nextCursor,
    hasNext: response.hasNext,
  };
}
