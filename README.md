# SignalSpike: An AI Policy Monitor

A full-stack intelligence platform that automatically monitors AI policy developments across governments, regulators, courts, and frontier developers; ultimately surfacing what matters for a personalized user through a structured signal feed.

---

## What it does

The system continuously queries the Perplexity search API across a set of curated query templates, extracts structured signals using Claude, and presents them across three lenses:

- **Activities** — Discrete actions taken by monitored entities (legislation introduced, rules proposed, model releases, personnel moves, etc.)
- **Positions** — What entities appear to believe or advocate on specific policy topics
- **Priorities** — Strategic priorities inferred by Claude from recent activity and position patterns for a given entity

A **signal** is the platform's structured unit of intelligence: a normalized, database-stored record extracted from a raw Perplexity finding. Each signal is typed (activity, position, or priority), linked to a specific entity, and carries structured fields — importance score, confidence score, topic tags, source URLs, and objective-specific data — rather than raw text.

Results are ordered by a simple rule-based relevance score derived from the user's profile — surfacing the most relevant signals first without hiding others.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js Web App                     │
│   /awareness/activities  /positions  /priorities        │
│   /entities  /runs  /settings  /report                  │
└────────────────────┬────────────────────────────────────┘
                     │ reads
┌────────────────────▼────────────────────────────────────┐
│                   PostgreSQL (Prisma)                    │
│  QueryTemplate → MonitoringRun → RunFinding → Signal    │
│  Entity → EntityAlias                                   │
└──────────┬──────────────────────────┬───────────────────┘
           │ enqueues                 │ persists
┌──────────▼──────────┐   ┌──────────▼──────────────────┐
│   Redis / BullMQ    │   │        Monitor Worker        │
│   "monitor" queue   │   │  executeRun() per job        │
└──────────┬──────────┘   └──────────┬───────────────────┘
           │ picks up                │ calls
           └────────────┬────────────┘
                        │
          ┌─────────────▼─────────────┐
          │     Perplexity API        │  ← search + citations
          │     (sonar model)         │
          └─────────────┬─────────────┘
                        │ finding text
          ┌─────────────▼─────────────┐
          │      Anthropic API        │  ← signal classification
          │  (claude-sonnet-4-6)      │
          └───────────────────────────┘
```

### Monorepo packages

| Package | Purpose |
|---------|---------|
| `packages/ontology` | TypeScript types, Zod schemas, and constants for entities and signals |
| `packages/db` | Prisma schema, migrations, seed data, and DB client |
| `packages/core` | Run engine, signal extractor, queue client |
| `packages/provider-perplexity` | Typed wrapper around the Perplexity search API |
| `apps/web` | Next.js 14 App Router frontend |
| `workers/monitor` | BullMQ worker that processes monitoring jobs |

---

## How the pipeline works

### 1. Discovery runs

An `entity_type_discovery` query template (e.g. "Which frontier AI labs are currently most active in policy?") is run against Perplexity. The response text is parsed with regex to extract entity names — specifically looking for bold names in numbered or bulleted lists, which is the format the query prompt requests. For instance, entity names could look like: "Google Deepmind," "OpenAI," and "Anthropic". Each extracted name is matched against existing entities and aliases; unmatched names are created as new `Entity` records with `approvalState: 'proposed'`.

### 2. Entity approval

The user can review proposed entities at `/entities` and approves or rejects them. Approving an entity automatically enqueues monitoring runs for all active templates matching its entity type.

### 3. Monitoring runs

For each approved entity, `entity_monitoring` templates run against Perplexity — one per objective (`activities`, `positions`, `priorities`). The raw response is stored as a `RunFinding`.

### 4. Signal extraction

Claude classifies each `RunFinding` using a structured `classify_signal` tool call. It populates:
- Common fields: `title`, `summary`, `signalType`, `importance`, `confidence`, `topicTags`, `jurisdictionTags`
- Objective-specific fields (see Signal model below)

The result is stored as a `Signal` row linked to the finding, run, and entity.

### 5. UI

The web app reads `Signal` rows directly. Each page filters by `objective` and re-ranks by a personalization score derived from the user's `UserProfile`.

---

## Signal model

Every signal shares a base set of fields, then carries objective-specific fields:

**Activities** — `changeType`, `eventDate`, `actorsMentioned`

**Positions** — `topic`, `positionLabel`, `stance` (support / oppose / mixed / unclear / monitoring), `strength` (1–5, how explicitly the position is held), `evidenceSnippets`

**Priorities** — `priorityLabel`, `priorityDirection` (rising / stable / falling), `momentum` (1–5, signal strength), `rationale`, `supportingSignalIds`. Priorities are not computed analytically — Claude infers them directly from the raw finding text by looking for patterns in what an entity has been doing and saying recently. The query template explicitly asks what appears to be gaining or losing momentum, and Claude produces a structured priority signal from that.

All signals carry:
- `importance` (0–100) — how significant this is for the dashboard user
- `confidence` (0–100) — how reliable the extraction was

---

## Entity model

Entities are the organizations and bodies being monitored. Each has an `entityType`:

| Type | Examples |
|------|---------|
| `national_legislature` | US Congress, Senate committees |
| `executive_body` | OSTP, OMB, AI task forces |
| `cross_cutting_regulator` | FTC, SEC, DOJ |
| `sectoral_regulator` | FDA, OCC, FAA |
| `court_tribunal` | Federal courts with active AI cases |
| `international_organization` | OECD, UN agencies, Council of Europe |
| `frontier_developer` | Anthropic, OpenAI, Google DeepMind |
| `compute_infra_provider` | NVIDIA, AWS, Microsoft Azure |
| `standards_body` | NIST, ISO/IEC, IEEE |
| `safety_institute` | UK AISI, METR |

Entities have `aliases` (acronyms and alternate names) used for deduplication during discovery — so "OSTP" and "Office of Science and Technology Policy" resolve to the same entity.

10 starter entityTypes were defined to meet the the scope and time constraint of the interview.

---

## Query templates

Templates drive the entire pipeline. Each template specifies:

- **`templateType`**: `entity_type_discovery` or `entity_monitoring`
- **`objective`**: `activities`, `positions`, or `priorities`
- **`entityTypes`**: which entity types this template applies to
- **`queryPattern`**: the query sent to Perplexity, with `{entity}` substituted at run time
- **`cadence`**: `daily`, `weekly`, `monthly`, or `ad_hoc`
- **`domainAllowlist`**: optional list of domains to restrict results to

The current seed includes 40 templates: 10 discovery + 10 activities + 10 positions + 10 priorities.

---

## Personalization

Set your profile at `/settings` (role, entity, entity type, primary remit). The `scoreSignal()` function in `apps/web/src/lib/personalization.ts` computes a relevance score using simple additive heuristics — no ML, no training data, no embeddings. It adds fixed point bonuses based on direct field comparisons:

| Heuristic | Boost |
|-----------|-------|
| Entity name matches your entity (exact, case-insensitive) | +40 |
| Entity type matches your entity type | +20 |
| Primary remit keywords appear in signal topic tags | +20 |
| Signal family aligns with your role/remit (lookup table) | +10 |
| Additional topic token overlap beyond the first match | up to +10 |

The score is added on top of the signal's base `importance` value. Activities are re-ranked within recency buckets (today / this week / earlier). Positions and Priorities are sorted by score across the full result set. With no profile set, ordering falls back to `importance` alone.

Future iterations could incorporate natural-language user settings, but the V1 iteration prioritized structured personalization.

---

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL
- Redis
- Perplexity API key
- Anthropic API key

### Setup

```bash
# Install dependencies
pnpm install

# Copy and fill in environment variables
cp .env.example .env

# Run database migrations
pnpm db:migrate

# Seed query templates
pnpm db:seed

# Start the web app
pnpm dev:web

# In a separate terminal, start the worker
pnpm dev:worker
```

### Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `PPLX_API_KEY` | Perplexity API key (starts with `pplx-`) |
| `PPLX_MODEL` | Perplexity model (default: `sonar`, use `sonar-pro` for higher quality) |
| `ANTHROPIC_API_KEY` | Anthropic API key |

---

## Running the pipeline

1. Go to `/settings/templates` and click **Run** on a discovery template (e.g. "Discovery: Frontier Developer")
2. Go to `/runs` to watch the run complete
3. Go to `/entities` to review proposed entities — approve the ones you want to monitor
4. Approving an entity automatically enqueues activities, positions, and priorities monitoring runs for it
5. Go to `/runs` again to watch those complete
6. Go to `/awareness` to see results across Activities, Positions, and Priorities

---

## Web app pages

| Route | Description |
|-------|-------------|
| `/awareness/activities` | Signal feed grouped by recency, personalized |
| `/awareness/positions` | Extracted entity positions with stance and evidence |
| `/awareness/priorities` | Inferred strategic priorities ranked by momentum |
| `/entities` | Entity registry with approve/reject workflow |
| `/runs` | Monitoring run history and status |
| `/settings/templates` | Query template management |
| `/settings` | User profile for personalization |
| `/report` | Briefing generation |

---

## Key design decisions

**Flat Signal table** — All signal types (activities, positions, priorities) live in a single table with nullable objective-specific columns, rather than polymorphic tables. This keeps queries simple and avoids joins for the common case.

**Claude for extraction, Perplexity for search** — Perplexity's `sonar` model retrieves and synthesizes web content with citations. Claude then classifies the finding into the structured signal schema using tool use with prompt caching.

**Alias-aware entity deduplication** — Discovery runs request "Full Official Name (ACRONYM)" format. The extractor stores both the canonical name and the acronym as aliases, and entity lookup checks both to avoid creating duplicates like "OSTP" and "Office of Science and Technology Policy".

**Personalization refines, never buries** — Scoring adjusts ordering within recency/confidence bands rather than filtering. Lower-scoring signals remain visible; they just appear further down.

**Worker failure is non-fatal** — Signal extraction failure falls back to a prefill-only signal rather than failing the monitoring run. DB-level extraction errors are caught and logged but don't block the run from completing.
