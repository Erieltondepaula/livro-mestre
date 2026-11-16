# Architecture rules

- Keep registration catalog lookup in `src/lib/isbnLookup.ts` and `src/lib/bookSearch.ts`: Open Library/Google Books for books and exact Amazon identifiers, Crossref for ISSN periodicals; `BookSearch` selects and resolves edition metadata before filling the existing form without new storage or credentials.