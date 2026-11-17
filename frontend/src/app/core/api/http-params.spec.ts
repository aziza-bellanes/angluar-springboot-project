import { describe, expect, it } from 'vitest';
import { toParams } from './http-params';

describe('toParams', () => {
  it('skips null, undefined and empty-string values', () => {
    const params = toParams({ a: null, b: undefined, c: '', d: 'kept' });
    expect(params.keys()).toEqual(['d']);
    expect(params.get('d')).toBe('kept');
  });

  it('keeps zero and false as real values', () => {
    const params = toParams({ count: 0, active: false });
    expect(params.get('count')).toBe('0');
    expect(params.get('active')).toBe('false');
  });

  it('appends each item of an array under the same key', () => {
    const params = toParams({ roles: ['ADMIN', 'BIDDER'], ids: [1, 2, 3] });
    expect(params.getAll('roles')).toEqual(['ADMIN', 'BIDDER']);
    expect(params.getAll('ids')).toEqual(['1', '2', '3']);
  });

  it('skips an empty array without adding the key', () => {
    const params = toParams({ roles: [] });
    expect(params.has('roles')).toBe(false);
  });
});
