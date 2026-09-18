import { collection, resource, queryString } from './contracts';

test('collection preserves bounded cursor pages and rejects malformed envelopes', () => {
  expect(collection<{ id: string }>({ data: [{ id: 'a' }], page: { nextCursor: 'a' } })).toEqual({ items: [{ id: 'a' }], nextCursor: 'a' });
  expect(collection<{ id: string }>({ data: [] })).toEqual({ items: [], nextCursor: null });
  expect(() => collection({ data: null as never })).toThrow('invalid list');
});

test('resource unwraps detail once and queryString omits inactive filters', () => {
  expect(resource({ data: { id: 'booking-1' } })).toEqual({ id: 'booking-1' });
  expect(() => resource({ data: null as never })).toThrow('incomplete response');
  expect(queryString({ city: 'Dhaka', format: 'All', availableOnly: false, limit: 30 })).toBe('city=Dhaka&limit=30');
});
