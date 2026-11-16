import { describe, expect, it, vi, afterEach } from 'vitest';
import { isValidIsbn, lookupIsbn, normalizeIsbn } from './isbnLookup';

afterEach(() => vi.unstubAllGlobals());

describe('ISBN lookup', () => {
  it('accepts ISBN-13 with separators and rejects an incorrect checksum', () => {
    expect(normalizeIsbn('978-85-359-1484-9')).toBe('9788535914849');
    expect(isValidIsbn('978-85-359-1484-9')).toBe(true);
    expect(isValidIsbn('9788535914848')).toBe(false);
  });
  it('accepts ISBN-10 including X and rejects malformed input', () => {
    expect(isValidIsbn('080442957X')).toBe(true);
    expect(isValidIsbn('8535914846')).toBe(true);
    expect(isValidIsbn('123')).toBe(false);
  });
  it('maps real edition fields without inventing missing metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      'ISBN:9788535914849': { title: '1984', authors: [{ name: 'George Orwell' }], number_of_pages: 416, publish_date: '2009' },
    }) }));
    expect(await lookupIsbn('9788535914849')).toEqual({ title: '1984', author: 'George Orwell', pages: 416, year: 2009, coverUrl: undefined, source: 'Open Library' });
  });
  it('falls back to an exact ISBN match in Google Books', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [
        { volumeInfo: { title: 'Wrong edition', industryIdentifiers: [{ identifier: '9788535914848' }] } },
        { volumeInfo: { title: '1984', industryIdentifiers: [{ identifier: '9788535914849' }] } },
      ] }) }));
    expect(await lookupIsbn('9788535914849')).toMatchObject({ title: '1984', source: 'Google Books', pages: undefined });
  });
  it('does not query a catalog for an invalid ISBN', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(lookupIsbn('123')).rejects.toThrow('ISBN válido');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});