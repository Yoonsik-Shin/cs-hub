export const AUTO_REFRESH_INTERVALS = [0, 10, 30, 60, 300] as const;

export function parseRefreshInterval(value: string | null): number {
  if (value === null || value.trim() === '') {
    return 0;
  }

  const interval = Number(value);
  return AUTO_REFRESH_INTERVALS.some((allowed) => allowed === interval)
    ? interval
    : 0;
}
