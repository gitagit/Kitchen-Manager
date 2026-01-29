/**
 * Lightweight normalizer so "Canned Chickpeas" matches "canned chickpeas".
 * Not trying to be perfect — just usable.
 */
export function normName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
