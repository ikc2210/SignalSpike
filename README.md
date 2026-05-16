# AI Policy Monitor

A full-stack AI policy monitoring dashboard that tracks regulatory entities, runs structured Perplexity queries, and surfaces policy signals through a Next.js web interface and a BullMQ background worker.

---

## Architecture

| Package | Role |
|---|---|
| `packages/ontology` | TypeScript types and Zod schemas for entities, signals, and query templates |
| `packages/db` | Prisma schema + singleton client; exports typed DB models |
| `packages/provider-perplexity` | Thin wrapper around the Perplexity sonar API |
| `packages/core` | BullMQ queue definition, template expander, run engine |
| `apps/web` | Next.js 14 dashboard (templates, entities, runs) |
| `workers/monitor` | BullMQ worker that processes run-template jobs |

Dependency graph (no cycles):

```
ontology  ←  db  ←  core  ←  web
                          ←  monitor
              provider-perplexity  ←  core
```

---

## Local Setup

### Prerequisites

- Node 20+
- pnpm 9+
- PostgreSQL (running locally or via Docker)
- Redis (running locally or via Docker)
- A Perplexity API key (https://www.perplexity.ai/settings/api)

### Install

```bash
pnpm install
```

### Configure environment

```bash
cp .env.example .env
# Edit .env and set DATABASE_URL, REDIS_URL, PPLX_API_KEY
```

### Database

```bash
pnpm db:migrate   # runs prisma migrate dev
pnpm db:seed      # seeds 30 query templates
```

### Run the web app

```bash
pnpm dev:web      # starts Next.js on http://localhost:3000
```

### Run the background worker

```bash
pnpm dev:worker   # starts the BullMQ monitor worker
```

---

## Notes on the Perplexity API key

- Set `PPLX_API_KEY` in your `.env` file. The key starts with `pplx-`.
- The default model is `sonar`. Override with `PPLX_MODEL=sonar-pro` for higher quality.
- Discovery templates run open-domain queries; monitoring templates may use `domainAllowlist` to restrict sources to authoritative government or standards sites.
- Without a valid API key the worker jobs will fail gracefully — runs are marked `failed` in the database with the error message stored.
