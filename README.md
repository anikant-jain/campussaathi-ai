# CampusSaathi AI

One Campus. One Platform. Infinite Possibilities.

CampusSaathi is a campus workspace for students, faculty and operations staff. The local demo uses fictional Apex Institute records. The assistant reads from the signed-in account’s authorized data and labels local responses as demo output.

## Run the local demo

Requires Node.js 24 or newer. Open a terminal in the project folder.

**Windows PowerShell**

```powershell
npm.cmd ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd run db:seed
npm.cmd run dev
```

**Linux**

```bash
npm ci
[ -f .env ] || cp .env.example .env
npm run db:seed
npm run dev
```

Vite normally opens on [localhost:5173](http://localhost:5173). If the port is occupied, use the URL it prints. The Express API uses port 5000. SQLite seeds on the first launch when demo mode is enabled and persists at `server/data/campus.sqlite`. A pre-existing `server/data/db.json` is imported into a new demo database once. The original JSON stays in place.

| Role | Local email |
| --- | --- |
| Student | aman.singhal@campussaathi.edu |
| Faculty | r.chandra@campussaathi.edu |
| Administrator | dean.welfare@campussaathi.edu |
| Librarian | library@campussaathi.edu |
| Placement Officer | placements@campussaathi.edu |

All five local accounts initially use `CampusDemo!26`. The sign-in page has a shortcut for each. Public sign-up creates students. Staff assign academic cohorts from Campus Directory. Demo seeding, local reset-token responses and account shortcuts are disabled in production. Use a fresh database for production.

## PostgreSQL and pgvector

Set `DATABASE_URL` to a PostgreSQL connection string for a database where the vector extension is installed and permitted. Run:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Run demo seeding only on local development databases. The same API supports SQLite for a dependency-light demo. PostgreSQL applies the checked-in Prisma migration, including the vector extension. Set `CAMPUS_DB` to the path of a persistent volume if deploying SQLite.

## Enable live AI

| Provider | Configure in the backend environment |
| --- | --- |
| Google Gemini | `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL` |
| OpenAI-compatible | `AI_PROVIDER=openai`, `OPENAI_API_KEY`, `OPENAI_MODEL`, optional `OPENAI_BASE_URL` ending in the provider’s API prefix such as `/v1` |
| Local demo | `AI_PROVIDER=demo` |

Choose a model with text streaming, image input and function calling where required. `EMBEDDING_MODEL` enables vector indexing when authorized staff opt in while publishing a campus PDF. Private PDFs are indexed locally with term matching. Selected excerpts from a private document can be sent to the configured provider when the user explicitly attaches that document to a request. Browser speech features depend on browser support and permission, and browser speech recognition may use the browser vendor’s service.

Local AI features include real record lookups, PDF excerpts with page references, rule-based complaint routing and a deterministic exam planner. Generative answers and coaching drafts need a configured model. The app streams responses from the provider and saves completed turns. AI tools read campus data. Saving plans, drafts or reports requires a user action.

The local practice studio includes coding and aptitude sample decks, scored quiz attempts and flashcards. Placement Coach includes a resume keyword match against a job description and sample technical and HR interviews. A live model enables personalized questions and feedback.

## Build and test

```bash
npm run build
npm start
npm test
npx playwright install chromium
npm run test:e2e
npm run db:generate
npm run test:postgres
```

`npm start` serves the built frontend and API together. The Playwright server uses its own in-memory demo database on port 5188. The PostgreSQL test uses a temporary PGlite PostgreSQL runtime with pgvector and applies the real Prisma migration and seed. Browser integration does not need vendor AI or SMTP credentials.

## Deployment

Use a Node 24 or Docker host that supports HTTPS, WebSocket upgrades, long-running HTTP responses and a PostgreSQL service with pgvector. Set `NODE_ENV=production`, `DEMO_MODE=false`, a random `SESSION_SECRET` of at least 32 characters, and the exact HTTPS `PUBLIC_ORIGIN`. Set `TRUST_PROXY_HOPS` to the actual number of trusted reverse proxies. Keep the API and frontend on the same origin and allow SSE responses to flush without proxy buffering.

1. Supply `DATABASE_URL` as a backend secret or use the Compose `db` service.
2. Run `npm run db:generate`, `npm run db:migrate` and `npm run build` in the release environment.
3. Set `INIT_ADMIN_EMAIL`, `INIT_ADMIN_NAME` and `INIT_ADMIN_PASSWORD`, then run `npm run db:admin` once. Remove the bootstrap password from the environment afterward.
4. Run `npm start` or use the Docker image. For Compose, configure `POSTGRES_PASSWORD` in `.env`, then run `docker compose up -d --build` and `docker compose exec app npm run db:admin` with the bootstrap variables present.
5. Put the app behind HTTPS before testing sign-in. Production uses secure cookies. Configure SMTP for self-service password reset. Staff can also issue one-use reset links from Campus Directory after verifying identity.

Embarko documents support for Node apps and SQLite on a persistent data directory, but no managed PostgreSQL or WebSocket support. Use a host that supports both for the full stack. A limited Embarko deployment would need SQLite under `DATA_DIR`, polling for notifications, and verification that its bundler uses the Express start command and a Node 24 runtime. That deployment has not been verified. [Embarko deployment guide](https://embarko.ai/guides/deploy-app-without-github)

- [Architecture](docs/architecture.md)
- [HTTP API](docs/api.md)

