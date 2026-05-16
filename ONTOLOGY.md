# AI Policy Ontology — v1

Core data model for the Perplexity AI policy awareness dashboard.

---

## Design Principles

1. **`entityType` is a product taxonomy, not a theoretical ontology.** Categories are chosen for dashboard utility — ease of filtering, grouping, and prioritization — not academic completeness.
2. **`layer`, `role`, and `importance` are orthogonal to `entityType`.** An entity's type does not determine its layer or role; these are set independently and can vary by policy context.
3. **Compact and extensible.** Thirteen entity types cover v1 scope. Finer-grained `subtype` values can be introduced without schema changes.
4. **Positions, priorities, and activities are explicitly modeled.** Position data lives on `SignalPosition`. Priority data lives on `PriorityEvidence`. Activity data lives on `Signal`. These are separate because they answer different questions.

---

## Core Concepts

### Positions

An entity's stated or inferred stance on a policy topic. Positions must be explicitly represented — not reconstructed from signal frequency — because the same entity may generate many signals on a topic without taking a clear position, or may take a strong position with minimal public output.

**Query:** "What does entity X say about topic Y?" → `Signal.positions[]` → `SignalPosition`

### Priorities

What an entity actually cares about, as revealed by structural indicators: staffing allocation, budget, org structure, lobbying spend, hiring focus. Priorities must not collapse into signal volume alone — an entity that files many comments on a topic is not necessarily prioritizing it more than one that hires a dedicated team and says little publicly.

**Query:** "What does entity X seem to prioritize?" → `PriorityEvidence` + weighted `Signal` analysis

### Activities

The discrete actions an entity takes: publishing documents, advancing legislation, hiring executives, releasing capabilities, accepting government contracts. Activities are represented as `Signal` records. Multiple entities can participate in a single signal via `SignalActor`.

**Query:** "What has entity X been doing?" → `Signal` + `SignalActor`
**Query:** "What changed over time?" → dated `Signal` and `PriorityEvidence` records

---

## Entity Types

| Type | Covers |
|------|--------|
| `legislative_actor` | Legislatures, parliaments, congressional committees |
| `executive_body` | Ministries, executive offices, departments, advisory bodies, task forces |
| `regulator` | Both cross-cutting regulators (FTC, ICO) and sectoral regulators (OCC, FCA) |
| `court_tribunal` | Courts, appellate bodies, arbitration panels |
| `subnational_government` | States, provinces, cities acting in a policy-making capacity |
| `international_public_body` | Foreign governments **and** international organizations (OECD, UN bodies, ITU) |
| `frontier_developer` | Labs whose primary focus is advancing AI capabilities toward AGI |
| `ai_company` | AI product and service companies not on the capability frontier |
| `compute_infra_provider` | Cloud hyperscalers, chip designers, data-center operators |
| `standards_or_evaluator` | Standards bodies (ISO, IEEE, NIST) and safety/evaluation institutes (METR, UK AISI) |
| `research_policy_org` | Think tanks and academic research labs that produce policy-relevant work |
| `civil_society_or_professional_group` | NGOs, advocacy organizations, professional associations |
| `industry_or_investor_group` | Trade associations, industry coalitions, major investors with policy positions |

---

## Layers

Layers describe where an entity sits relative to the regulatory process. A single entity may occupy different layers in different policy contexts; `defaultLayer` captures the most common position.

| Layer | Meaning |
|-------|---------|
| `rule_setters` | Create or set binding rules (legislatures, regulators, courts) |
| `regulated_entities` | Primary targets of regulation (developers, deployers, infrastructure) |
| `implementers` | Carry out or operationalize rules without being primary targets |
| `standards_agenda` | Shape norms, standards, and discourse without direct enforcement authority |

---

## Roles

Roles are context-specific and can be held simultaneously. One entity may be a `proposer` (lobbying for rules), a `target` (subject to those same rules), and a `monitor` (publishing compliance reports).

| Role | Meaning |
|------|---------|
| `proposer` | Initiates legislation, regulation, or standards |
| `target` | Subject of regulation or enforcement action |
| `enforcer` | Applies or enforces rules |
| `monitor` | Observes, audits, or reports on compliance and risk |

---

## Priority Tiers

Editorial signal for dashboard prominence. Set per entity.

| Tier | Meaning |
|------|---------|
| `1` | Watch closely — highest regulatory salience or public attention |
| `2` | Active participant — significant but not tier-1 urgency |
| `3` | Background awareness — relevant but lower immediate priority |

---

## Entity Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `string` | ✓ | Stable kebab-case slug: `"ftc"`, `"eu-ai-office"` |
| `name` | `string` | ✓ | Full canonical name |
| `entityType` | `EntityType` | ✓ | One of the 13 types above |
| `defaultLayer` | `Layer` | ✓ | Most common layer for this entity |
| `jurisdictions` | `string[]` | ✓ | ISO 3166 codes, `"EU"`, or `"global"`; min 1 |
| `sectors` | `string[]` | ✓ | e.g. `["ai", "finance"]`; min 1 |
| `priorityTier` | `1 \| 2 \| 3` | ✓ | Editorial priority |
| `active` | `boolean` | ✓ | `false` if dissolved, merged, or inactive |
| `aliases` | `string[]` | — | Acronyms, former names, alternate spellings |
| `description` | `string` | — | 1–3 sentence prose summary |
| `subtype` | `string` | — | Free-form; e.g. `"independent-agency"`, `"safety-institute"` |

---

## Signal

The atomic unit of policy activity. One signal = one observable action by one primary entity.

### Signal Families

Signals are grouped into six families. The full `signalType` is always stored; families are a filtering dimension.

#### `publication` — Artifacts and written outputs

| Type | Description |
|------|-------------|
| `strategy_published` | National or organizational AI strategy document released |
| `guidance_issued` | Regulatory or policy guidance issued |
| `standard_published` | Technical or governance standard finalized |
| `benchmark_released` | Evaluation benchmark or test suite published |
| `company_policy_updated` | Internal AI use or safety policy updated |
| `report_published` | Research, audit, or monitoring report published |
| `transparency_report_published` | Transparency, safety, or accountability report published |

#### `process` — Formal regulatory and legislative actions

| Type | Description |
|------|-------------|
| `bill_introduced` | Legislation introduced in a legislative body |
| `bill_advanced` | Bill passes committee or procedural milestone |
| `bill_enacted` | Bill signed into law |
| `executive_action_issued` | Executive order, directive, or memorandum issued |
| `rule_proposed` | Notice of proposed rulemaking (NPRM) or equivalent published |
| `rule_finalized` | Final rule published |
| `consultation_opened` | Public consultation or comment period opened |
| `consultation_closed` | Consultation or comment period closed |
| `hearing_scheduled` | Legislative or regulatory hearing announced |
| `hearing_held` | Hearing takes place |
| `court_decision_issued` | Court or tribunal issues a decision |

#### `participation` — Engagement in external processes

| Type | Description |
|------|-------------|
| `testimony_submitted` | Written testimony filed with a legislative or regulatory body |
| `witness_testified` | Spokesperson or executive testified in person |
| `comment_letter_submitted` | Comment letter submitted in response to a rulemaking or consultation |
| `coalition_letter_signed` | Entity signed a multi-party open letter or coalition statement |
| `advisory_member_appointed` | Person appointed to an external advisory body |

#### `disclosure` — Mandatory or voluntary filings

**Personnel and operational signals distinguish entities that are actually investing in AI policy from those that merely comment on it.** A frontier developer that hires a head of government AI policy, creates a dedicated policy team, and signs a government contract is signaling different priorities than one that publishes white papers alone.

| Type | Description |
|------|-------------|
| `lobbying_filing_submitted` | Lobbying disclosure report filed |
| `contributions_report_filed` | Political contributions or PAC report filed |
| `incident_disclosed` | Safety incident, breach, or misuse event disclosed |

#### `personnel` — Who an entity hires, promotes, and organizes

Personnel signals are first-order priority indicators. Hiring a senior policy executive, creating a safety team, or a revolving-door move between a regulator and a covered entity all reveal organizational intent that publications may not.

| Type | Description |
|------|-------------|
| `hire` | Significant hire for a policy- or AI-relevant role |
| `departure` | Significant departure from a policy- or AI-relevant role |
| `promotion` | Internal promotion to a policy- or AI-relevant role |
| `board_appointment` | Board member appointment or resignation |
| `revolving_door_move` | Person moves between regulator/government and covered entity |
| `team_created` | New team, division, or office created |
| `team_reorganized` | Existing team restructured, merged, or disbanded |

#### `operational` — Deployment and product decisions

Operational signals capture what entities actually do with AI, not what they say. A deployment restriction reversed, a government contract accepted, or a jurisdiction withdrawal reveals risk appetite and strategic direction.

| Type | Description |
|------|-------------|
| `capability_released` | New capability, model, or product publicly released |
| `model_release_decision` | Decision made about whether/how to release a model |
| `deployment_restriction_changed` | Access or usage restriction added, removed, or modified |
| `access_policy_changed` | Who can use a system or capability changed |
| `terms_changed` | Terms of service or acceptable-use policy changed |
| `jurisdiction_launch` | Service or product launched in a new jurisdiction |
| `jurisdiction_withdrawal` | Service or product withdrawn from a jurisdiction |
| `government_contract_accepted` | Government contract or procurement agreement accepted |
| `government_contract_declined` | Government contract or procurement agreement declined |
| `compliance_program_changed` | Internal compliance or audit program changed |

### Signal Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `string` | ✓ | Stable kebab-case slug |
| `title` | `string` | ✓ | Short descriptive title |
| `summary` | `string` | ✓ | 1–5 sentence summary |
| `signalType` | `SignalType` | ✓ | One of the 43 types above |
| `dateObserved` | `string` | ✓ | ISO 8601: when the signal was collected |
| `eventDate` | `string` | — | ISO 8601: when the event actually occurred |
| `effectiveDate` | `string` | — | ISO 8601: when the action becomes legally effective |
| `jurisdiction` | `string` | ✓ | ISO code, `"EU"`, or `"global"` |
| `sectors` | `string[]` | ✓ | min 1 |
| `topics` | `string[]` | ✓ | min 1 |
| `layers` | `Layer[]` | ✓ | min 1; layer(s) this signal pertains to |
| `roles` | `Role[]` | ✓ | min 1; role(s) the primary entity is playing |
| `sourceIds` | `string[]` | ✓ | min 1; citation record IDs |
| `primaryEntityId` | `string` | ✓ | Single most responsible / most affected entity |
| `relatedEntityIds` | `string[]` | ✓ | May be empty; for richer data use `SignalActor` |
| `legalStatus` | `LegalStatus` | — | See table below |
| `importanceScore` | `number` | ✓ | 0.0–1.0 editorial importance |
| `effortLevel` | `1–5` | ✓ | Commitment proxy; see below |
| `confidenceScore` | `number` | ✓ | 0.0–1.0 source reliability |
| `dedupeKey` | `string` | ✓ | Deterministic deduplication key |
| `positions` | `SignalPosition[]` | — | Extracted entity positions |

### Effort Level

`effortLevel` is a coarse proxy for the commitment or resource investment behind a signal. It exists to prevent a press release from being weighted the same as a major regulatory filing.

| Level | Meaning | Examples |
|-------|---------|---------|
| `1` | Lightweight / low-effort update | Social post, brief statement, minor policy tweak |
| `2` | Normal update | Standard report, routine filing, comment letter |
| `3` | Substantive artifact or action | Detailed white paper, formal testimony, capability release |
| `4` | Major filing / policy / deployment action | Major rulemaking, large procurement contract, significant model release |
| `5` | Very high-effort / high-commitment action | National AI strategy, landmark legislation, frontier model deployment |

### Legal Status

Applies primarily to process signals (rules, bills, orders).

| Status | Meaning |
|--------|---------|
| `draft` | Circulating but not formally published |
| `proposed` | Published for comment (NPRM or equivalent) |
| `final` | Finalized but not yet in effect |
| `effective` | In force |
| `litigation` | Subject to legal challenge |
| `voluntary` | Non-binding commitment or pledge |

---

## SignalPosition

An entity's stance on a policy topic, explicitly extracted from a signal. Exists so positional data is queryable without parsing prose summaries.

**Why separate from Signal?** A signal (e.g. a comment letter) may contain multiple positions on multiple topics. Embedding positions as a structured array on the signal keeps them linked to evidence while making them independently queryable.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `topic` | `string` | ✓ | Policy concept: "frontier model thresholds", "mandatory incident reporting" |
| `stance` | `Stance` | ✓ | See table below |
| `evidence` | `"explicit" \| "implicit"` | ✓ | How the position was determined |
| `quoteOrParaphrase` | `string` | — | Direct quote or close paraphrase from source |

### Stance Values

| Stance | Meaning |
|--------|---------|
| `support` | Entity advocates for or endorses this position |
| `oppose` | Entity argues against or seeks to block this position |
| `mixed` | Entity has expressed both supportive and opposing views |
| `unclear` | Public record exists but position is ambiguous |
| `monitoring` | Entity is watching or studying but has not taken a position |

### Evidence Values

| Value | Meaning |
|-------|---------|
| `explicit` | Source directly states the entity's position (quote, testimony, official statement) |
| `implicit` | Position inferred from operational behavior, voting record, or pattern of actions |

---

## SignalActor

A join record connecting an entity to a signal with explicit role and layer context.

**Why not just `relatedEntityIds`?** A signal may involve multiple entities playing materially different roles — a regulator (enforcer), a company (target), and an advocacy group (proposer) may all appear in a single rulemaking. `relatedEntityIds` is a lightweight reference list; `SignalActor` is the full relational record needed for role-sensitive queries.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `signalId` | `string` | ✓ | |
| `entityId` | `string` | ✓ | |
| `role` | `Role` | ✓ | Role this entity is playing in this signal |
| `layer` | `Layer` | ✓ | Layer this entity occupies in this signal's context |
| `actorWeight` | `1–5` | — | Relative centrality; 5 = primary driver of the signal |

---

## PriorityEvidence

Structural indicators of what an entity actually prioritizes. **Not a Signal.**

**Why separate from Signal?** Signals are discrete events. Priority evidence is structural state: how many staff are dedicated to AI policy, how much is being spent on AI-related lobbying, whether a new office was created. These reveal priorities without necessarily generating any observable policy event. If priorities were inferred from signal frequency alone, entities that act quietly but invest heavily would be systematically underrepresented.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `string` | ✓ | Stable kebab-case slug |
| `entityId` | `string` | ✓ | |
| `topic` | `string` | — | Policy topic, if specific |
| `type` | `PriorityEvidenceType` | ✓ | See table below |
| `summary` | `string` | ✓ | What the evidence shows |
| `valueText` | `string` | — | Human-readable value: "$4.2M", "12 FTEs", "↑ 40% YoY" |
| `direction` | `string` | — | `increase`, `decrease`, `stable`, or `new` |
| `dateObserved` | `string` | ✓ | ISO 8601 |
| `sourceIds` | `string[]` | ✓ | min 1 |
| `confidenceScore` | `number` | ✓ | 0.0–1.0 |

### Priority Evidence Types

| Type | Covers |
|------|--------|
| `staffing` | Headcount, FTEs, team size dedicated to AI or policy |
| `spending` | Budget allocation, operational expenditure |
| `hiring_focus` | Open roles, recruiting patterns, stated hiring priorities |
| `org_structure` | Reporting lines, new offices, centralization vs. distribution |
| `training_investment` | Internal training programs, upskilling, AI literacy initiatives |
| `procurement_capacity` | Contracts, vendor relationships, infrastructure investment |
| `lobbying_spend` | Aggregate lobbying expenditure (complements individual filing signals) |
| `external_advisory_capacity` | Advisory board composition, external expert engagements |

---

## Files

```
ontology/
  types.ts          — EntityType, Layer, Role, PriorityTier, Entity interface
  schema.ts         — Entity Zod schema, validateEntity helpers
  constants.ts      — DEFAULT_LAYER_BY_TYPE, TYPICAL_ROLES_BY_TYPE, JURISDICTION, SECTOR
  signal.types.ts   — Signal, SignalPosition, SignalActor, PriorityEvidence interfaces;
                      SignalType, Stance, LegalStatus, EffortLevel, PriorityEvidenceType
  signal.schema.ts  — Signal/PriorityEvidence Zod schemas and validators
  index.ts          — Barrel re-export of all above
```

---

## Key Queries This Model Supports

| Question | Primary model |
|----------|--------------|
| What did entity X say about topic Y? | `Signal.positions[]` → `SignalPosition.stance` |
| What does entity X seem to prioritize? | `PriorityEvidence` by `entityId` + weighted signals |
| What has entity X been doing? | `Signal` by `primaryEntityId`; `SignalActor` by `entityId` |
| Who else was involved in signal Z? | `SignalActor` by `signalId` |
| What changed for entity X over time? | Dated `Signal` and `PriorityEvidence` records |
| How seriously did entity X commit to action A? | `Signal.effortLevel` |
| Is entity X's stated position backed by action? | Compare `SignalPosition.stance` vs. operational signals |

---

## Extension Points

- **New entity types**: Add to `ENTITY_TYPES` in `types.ts`; `DEFAULT_LAYER_BY_TYPE` and `TYPICAL_ROLES_BY_TYPE` will surface a TypeScript error as a reminder.
- **New signal types**: Add to the appropriate family array in `signal.types.ts`; `SIGNAL_TYPE_FAMILY` will surface a TypeScript error.
- **New priority evidence types**: Add to `PRIORITY_EVIDENCE_TYPES` in `signal.types.ts`.
- **Subtypes**: Populate `subtype` freely on Entity; formalize into a union type later if needed.
- **Personalization / relevance scoring**: Add fields (`relevanceScore`, `watchlist`, `tags`) at the feature layer without touching this ontology.
- **Source model**: `sourceIds` references an external source/citation record model, not yet defined in v1.
