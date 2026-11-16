import { fetchCatalogJson, isValidIsbn, lookupIsbn, normalizeIsbn, type IsbnBook } from './isbnLookup';

export type BookSearchMode = 'isbn' | 'asin' | 'issn' | 'title' | 'author';
export interface BookSearchResult extends IsbnBook {
  id: string;
  isbn?: string;
  editionKey?: string;
  publisher?: string;
}

export function isValidIssn(value: string): boolean {
  const code = normalizeIsbn(value);
  return /^\d{7}[\dX]$/.test(code) && [...code].reduce((sum, digit, index) =>
    sum + (digit === 'X' ? 10 : Number(digit)) * (8 - index), 0) % 11 === 0;
}

export function isValidAsin(value: string): boolean {
  return /^[A-Z0-9]{10}$/.test(value.trim().toUpperCase());
}

interface Edition {
  key: string;
  title?: string;
  publish_date?: string;
  number_of_pages?: number;
  covers?: number[];
  publishers?: string[];
  authors?: { key?: string }[];
  identifiers?: { amazon?: string[] };
}

function year(date?: string): number | undefined {
  const match = date?.match(/\b(1\d{3}|20\d{2}|2100)\b/);
  return match ? Number(match[0]) : undefined;
}

async function mapEdition(edition: Edition): Promise<BookSearchResult | null> {
  if (!edition.title) return null;
  const authors = await Promise.all((edition.authors || []).slice(0, 5).map(async author => {
    if (!author.key || !/^\/authors\/OL\d+A$/.test(author.key)) return '';
    try { return (await fetchCatalogJson(`https://openlibrary.org${author.key}.json`)).name || ''; }
    catch { return ''; }
  }));
  const cover = edition.covers?.find(id => id > 0);
  return {
    id: edition.key, title: edition.title, author: authors.filter(Boolean).join(', ') || undefined,
    year: year(edition.publish_date), pages: edition.number_of_pages && edition.number_of_pages > 0 ? edition.number_of_pages : undefined,
    coverUrl: cover ? `https://covers.openlibrary.org/b/id/${cover}-L.jpg` : undefined,
    publisher: edition.publishers?.join(', '), source: 'Open Library',
  };
}

export async function searchBooks(mode: BookSearchMode, value: string): Promise<BookSearchResult[]> {
  const query = value.trim();
  if (mode === 'isbn') {
    if (!isValidIsbn(query)) throw new Error('Digite um ISBN-10 ou ISBN-13 válido.');
    const book = await lookupIsbn(query);
    return book ? [{ ...book, id: normalizeIsbn(query) }] : [];
  }
  if (mode === 'issn') {
    if (!isValidIssn(query)) throw new Error('Digite um ISSN válido, como 0378-5955.');
    const code = normalizeIsbn(query);
    const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
    // Crossref identifies the periodical, not a particular issue or its page count.
    const response = await fetch(`https://api.crossref.org/journals/${formatted}`, { signal: AbortSignal.timeout(15000) });
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`Catálogo de periódicos indisponível (${response.status}).`);
    const journal = (await response.json()).message;
    if (!journal?.title || !journal.ISSN?.some((issn: string) => normalizeIsbn(issn) === code)) return [];
    return [{ id: formatted, title: journal.title, publisher: journal.publisher, source: 'Crossref' }];
  }
  if (mode === 'asin') {
    if (!isValidAsin(query)) throw new Error('Digite um ASIN de 10 letras ou números.');
    const asin = query.toUpperCase();
    // Printed books can use their ISBN-10 as the ASIN.
    if (isValidIsbn(asin)) {
      const book = await lookupIsbn(asin);
      if (book) return [{ ...book, id: asin }];
    }
    const keys: string[] = await fetchCatalogJson(`https://openlibrary.org/query.json?${new URLSearchParams({ type: '/type/edition', 'identifiers:amazon': asin, limit: '8' })}`);
    const matches = await Promise.all(keys.filter(key => /^\/books\/OL\d+M$/.test(key)).map(async key => {
      const edition: Edition = await fetchCatalogJson(`https://openlibrary.org${key}.json`);
      if (!edition.identifiers?.amazon?.some(id => id.toUpperCase() === asin)) return null;
      return mapEdition(edition);
    }));
    return matches.filter((book): book is BookSearchResult => book !== null);
  }
  if (query.length < 2) throw new Error('Digite pelo menos 2 caracteres para buscar.');
  const params = new URLSearchParams({ [mode === 'title' ? 'title' : 'author']: query, limit: '12', lang: 'pt', fields: 'key,title,author_name,first_publish_year,cover_i,isbn,edition_key' });
  try {
    const data = await fetchCatalogJson(`https://openlibrary.org/search.json?${params}`);
    if (data.docs?.length) {
      return data.docs.map((doc: { key: string; title: string; author_name?: string[]; cover_i?: number; isbn?: string[]; edition_key?: string[] }) => ({
        id: doc.key, title: doc.title, author: doc.author_name?.join(', '),
        // Work-level first publication year/pages are not edition metadata.
        coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
        isbn: doc.isbn?.find(isValidIsbn), editionKey: doc.edition_key?.[0], source: 'Open Library',
      }));
    }
  } catch { /* Try the alternate public catalog. */ }
  const googleQuery = `${mode === 'title' ? 'intitle' : 'inauthor'}:${query}`;
  const data = await fetchCatalogJson(`https://www.googleapis.com/books/v1/volumes?${new URLSearchParams({ q: googleQuery, maxResults: '12' })}`);
  return (data.items || []).filter((item: { volumeInfo?: { title?: string } }) => item.volumeInfo?.title).map((item: {
    id: string; volumeInfo: { title: string; authors?: string[]; publishedDate?: string; pageCount?: number; publisher?: string; imageLinks?: { thumbnail?: string } };
  }) => ({
    id: item.id, title: item.volumeInfo.title, author: item.volumeInfo.authors?.join(', '),
    year: year(item.volumeInfo.publishedDate), pages: item.volumeInfo.pageCount && item.volumeInfo.pageCount > 0 ? item.volumeInfo.pageCount : undefined,
    coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace(/^http:/, 'https:'), publisher: item.volumeInfo.publisher, source: 'Google Books',
  }));
}

export async function resolveSearchResult(book: BookSearchResult): Promise<IsbnBook> {
  if (book.isbn) {
    const edition = await lookupIsbn(book.isbn);
    if (edition) return edition;
  }
  if (book.editionKey && /^OL\d+M$/.test(book.editionKey)) {
    const edition = await mapEdition(await fetchCatalogJson(`https://openlibrary.org/books/${book.editionKey}.json`));
    if (edition) return edition;
  }
  return book;
}