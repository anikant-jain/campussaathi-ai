# Architecture

## Runtime

- Vite and React render the public landing page and protected workspace. TanStack Query fetches records and invalidates views after a mutation or a Socket.IO event.
- Express validates inputs, resolves session cookies, enforces staff role and record visibility, and serves the production frontend. Cookies are HTTP-only and become Secure in production. Mutating browser requests are same-origin.
- Node SQLite is the default local database. PostgreSQL uses a Prisma database worker so both databases can share the repository and transaction boundaries. The synchronous repository blocks the app worker during each database call. Use the current design for a small campus instance. A high-throughput deployment would benefit from asynchronous queries with targeted aggregate and pagination queries.
- Users, sessions, reset tokens and binary uploads have dedicated tables. Campus records share a typed-by-kind repository keyed by kind and ID, with an owner index and a pgvector column. Relationships between domain records are validated by the service routes. This is a compact schema, with domain objects represented as records rather than individual Prisma models.
- Transactional workflows include event capacity, inventory, conflict checks, password resets, message persistence and PDF indexing. PostgreSQL serializes those operations with a transaction-scoped advisory lock.
- Uploaded PDFs are signature-checked, size-limited, stored privately and served after an access check. Document citations refer to stored documents and page numbers. The service worker only caches public application assets and its offline screen.
- Socket.IO uses the same session as HTTP, and notification changes are scoped to the user. A scheduled scan writes deduplicated reminders for classes, exams, assignments, events and library loans.
- Local demo import preserves identifiers, existing complaint timelines and departments. Legacy Express routers are not mounted.

## AI

Named agents cover campus questions, tutoring, timetable planning, exams, events, library research, placements, complaints, administration, and teaching. The server selects a campus intent or accepts a feature-specific agent. It verifies admin and staff requests before reading analytics or teaching data.

A read-only tool call exchanges an allowlisted function name and the scoped result. The provider receives the minimal output projection and short conversation history. PDF material is extracted and split into overlapping page chunks. When embedding is enabled and approved for a shared PDF, PostgreSQL can rank those vectors by cosine similarity. Private PDFs remain searchable using local term matching. The application renders citations as links to the authorized PDF viewer.

Live text is streamed over SSE. Structured drafts and complaint classifications are validated before use. Provider failures return an error or a labeled rule-based result, depending on the feature. Campus data and document excerpts are treated as untrusted input. Compute and recording of administration metrics remain separate from model interpretation.

## Scope

Core workflows have direct API and browser interfaces. The current implementation uses catalog stock counts, free-text subject and room fields for schedules, a sample walking network and editable drafts for staff. Practice decks can be previewed, approved and used for flashcards or automatically graded quizzes. Mock interviews accept written and browser-dictated responses and can request provider feedback. Resume matching reports a local skill keyword estimate. Production SSO, fine-grained permission editing, multi-instance Socket.IO and dedicated domain tables are outside this version.

