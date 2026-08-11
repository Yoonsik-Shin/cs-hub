interface Identifiable {
  id: string;
}

export function resolveSelectedInquiry<T extends Identifiable>(
  selectedId: string | null,
  visibleInquiries: readonly T[],
  cachedPages: readonly (readonly T[])[],
  previousSelection: T | null,
): T | null {
  if (!selectedId) {
    return null;
  }

  const visibleInquiry = visibleInquiries.find((inquiry) => inquiry.id === selectedId);
  if (visibleInquiry) {
    return visibleInquiry;
  }

  for (const cachedInquiries of cachedPages) {
    const cachedInquiry = cachedInquiries.find((inquiry) => inquiry.id === selectedId);
    if (cachedInquiry) {
      return cachedInquiry;
    }
  }

  return previousSelection?.id === selectedId ? previousSelection : null;
}
