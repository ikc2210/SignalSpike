# AI Policy Ontology — v1

Core data model for the Perplexity AI policy awareness dashboard.

---

## Design Principles

1. **`entityType` is a product taxonomy, not a theoretical ontology.** Categories are chosen for dashboard utility — ease of filtering, grouping, and prioritization — not academic completeness.
2. **`layer`, `role`, and `importance` are orthogonal to `entityType`.** An entity's type does not determine its layer or role; these are set independently and can vary by policy context.
3. **Compact and extensible.** Thirteen entity types cover v1 scope. Finer-grained `subtype` values can be introduced without schema changes.

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

## Files

```
ontology/
  types.ts      — EntityType, Layer, Role, PriorityTier, Entity interface
  schema.ts     — Zod validation schema, validateEntity helpers
  constants.ts  — DEFAULT_LAYER_BY_TYPE, TYPICAL_ROLES_BY_TYPE, JURISDICTION, SECTOR
  index.ts      — Barrel re-export
```

---

## Extension Points

- **New entity types**: Add to the `ENTITY_TYPES` tuple in `types.ts`; `DEFAULT_LAYER_BY_TYPE` and `TYPICAL_ROLES_BY_TYPE` will surface a TypeScript error as a reminder to fill them in.
- **Subtypes**: Populate `subtype` freely; formalize into a union type later if needed.
- **New layers or roles**: Extend the respective tuples; existing entity records remain valid.
- **Personalization / relevance scoring**: Add fields (`relevanceScore`, `watchlist`, `tags`) at the feature layer without touching this ontology.
