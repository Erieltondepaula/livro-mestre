# Architecture rules

- Keep ISBN catalog lookup in `src/lib/isbnLookup.ts`, using public Open Library with exact-identifier Google Books fallback; this fills the existing book form without new storage or credentials.