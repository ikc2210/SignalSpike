import type { Entity, QueryTemplate } from '@perplexity/db';

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

  return query;
}
