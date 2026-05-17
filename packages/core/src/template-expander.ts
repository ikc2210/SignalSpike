import type { Entity, QueryTemplate } from '@perplexity/db';

// Appended to every entity_type_discovery query so Perplexity consistently
// returns "Full Official Name (ACRONYM)" — makes alias extraction reliable.
const DISCOVERY_FORMAT_SUFFIX =
  '\n\nFor each entity, write its name as: Full Official Name (ACRONYM) — ' +
  'for example "Federal Trade Commission (FTC)" or ' +
  '"Office of Science and Technology Policy (OSTP)". ' +
  'Always use the full official name first; include the acronym in parentheses ' +
  'if one exists. Do not use the acronym alone as the primary identifier.';

export function expandQueryPattern(
  template: QueryTemplate,
  entity?: Entity | null,
): string {
  let query = template.queryPattern;

  if (entity) {
    query = query
      .replace(/\{entity\}/g, entity.name)
      .replace(/\{entityType\}/g, entity.entityType)
      .replace(/\{jurisdiction\}/g, entity.jurisdictions[0] ?? 'the United States');
  }

  const topic = template.topics[0];
  if (topic) {
    query = query.replace(/\{topic\}/g, topic);
  }

  if (template.templateType === 'entity_type_discovery') {
    query += DISCOVERY_FORMAT_SUFFIX;
  }

  return query;
}
