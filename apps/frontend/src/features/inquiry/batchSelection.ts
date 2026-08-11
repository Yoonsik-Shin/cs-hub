export interface VisibleSelectionState {
  allSelected: boolean;
  someSelected: boolean;
}

export function toggleSelection(
  selectedIds: ReadonlySet<string>,
  inquiryId: string,
  checked: boolean,
): Set<string> {
  const next = new Set(selectedIds);
  if (checked) {
    next.add(inquiryId);
  } else {
    next.delete(inquiryId);
  }
  return next;
}

export function toggleVisibleSelection(
  selectedIds: ReadonlySet<string>,
  visibleIds: readonly string[],
): Set<string> {
  const next = new Set(selectedIds);
  const allVisibleSelected = visibleIds.length > 0
    && visibleIds.every((id) => selectedIds.has(id));

  visibleIds.forEach((id) => {
    if (allVisibleSelected) {
      next.delete(id);
    } else {
      next.add(id);
    }
  });
  return next;
}

export function retainVisibleSelection(
  selectedIds: ReadonlySet<string>,
  visibleIds: readonly string[],
): Set<string> {
  const visibleIdSet = new Set(visibleIds);
  return new Set([...selectedIds].filter((id) => visibleIdSet.has(id)));
}

export function getVisibleSelectionState(
  selectedIds: ReadonlySet<string>,
  visibleIds: readonly string[],
): VisibleSelectionState {
  return {
    allSelected: visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id)),
    someSelected: visibleIds.some((id) => selectedIds.has(id)),
  };
}
