import type { Page } from '../types/models';
export function resource<T>(response: {data: T}): T {
  if (response?.data === null || response?.data === undefined) throw new Error('The server returned an incomplete response. Please retry.');
  return response.data;
}
export function collection<T>(response: {data: T[]; page?: {nextCursor?: string | null}}): Page<T> {
  if (!Array.isArray(response?.data)) throw new Error('The server returned an invalid list. Please retry.');
  return {items: response.data, nextCursor: response.page?.nextCursor ?? null};
}
export function queryString(filters: object): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== false && value !== 'All') params.set(key, String(value));
  });
  return params.toString();
}
