export interface IsbnBook {
  title: string;
  author?: string;
  year?: number;
  pages?: number;
  coverUrl?: string;
  source: 'Open Library' | 'Google Books';
}

export function normalizeIsbn(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase();
}

export function isValidIsbn(value: string): boolean {
  const isbn = normalizeIsbn(value);
  if (/^\d{9}[\dX]$/.test(isbn)) {
    return [...isbn].reduce((sum, digit, index) => sum + (digit === 'X' ? 10 : Number(digit)) * (10 - index), 0) % 11 === 0;
  }
  if (/^97[89]\d{10}$/.test(isbn)) {
    return [...isbn].reduce((sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 1 : 3), 0) % 10 === 0;
  }
  return false;
}

function publicationYear(date?: string): number | undefined {
  const match = date?.match(/\b(1\d{3}|20\d{2}|2100)\b/);
  return match ? Number(match[0]) : undefined;
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Consulta indisponível (${response.status}).`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function lookupIsbn(value: string): Promise<IsbnBook | null> {
  const isbn = normalizeIsbn(value);
  if (!isValidIsbn(isbn)) throw new Error('Digite um ISBN válido de 10 ou 13 caracteres.');
  let libraryFailed = false;
  try {
    const data = await fetchJson(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`);
    const book = data[`ISBN:${isbn}`];
    if (book?.title) {
      return {
        title: book.title,
        author: book.authors?.map((author: { name: string }) => author.name).join(', '),
        year: publicationYear(book.publish_date),
        pages: book.number_of_pages > 0 ? book.number_of_pages : undefined,
        coverUrl: book.cover?.large?.replace(/^http:/, 'https:'),
        source: 'Open Library',
      };
    }
  } catch {
    libraryFailed = true;
  }

  try {
    const data = await fetchJson(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=5`);
    // Only accept an edition whose identifier matches the requested ISBN.
    const book = data.items?.find((item: { volumeInfo?: { industryIdentifiers?: { identifier: string }[] } }) =>
      item.volumeInfo?.industryIdentifiers?.some(identifier => normalizeIsbn(identifier.identifier) === isbn)
    )?.volumeInfo;
    if (!book?.title) return null;
    return {
      title: book.title,
      author: book.authors?.join(', '),
      year: publicationYear(book.publishedDate),
      pages: book.pageCount > 0 ? book.pageCount : undefined,
      coverUrl: (book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail)?.replace(/^http:/, 'https:'),
      source: 'Google Books',
    };
  } catch {
    if (libraryFailed) throw new Error('Não foi possível consultar os catálogos. Tente novamente mais tarde.');
    throw new Error('Livro não encontrado na Open Library; o catálogo alternativo está indisponível. Tente novamente ou preencha manualmente.');
  }
}