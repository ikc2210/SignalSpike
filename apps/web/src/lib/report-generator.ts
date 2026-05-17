import Anthropic from '@anthropic-ai/sdk';

export interface SignalForReport {
  id: string;
  title: string;
  summary: string;
  entityName: string;
  entityType: string;
  signalType: string | null;
  objective: string;
  importance: number;
  confidence: number;
  topicTags: string[];
  // objective-specific
  stance?: string | null;
  positionLabel?: string | null;
  priorityDirection?: string | null;
  rationale?: string | null;
  changeType?: string | null;
}

export interface UserContextForReport {
  role?: string | null;
  entity?: string | null;
  entityType?: string | null;
  primaryRemit?: string | null;
}

export interface SignalInsight {
  signalId: string;
  reasoning: string;
  actionItem: string | null;
}

export async function generateReportInsights(
  signals: SignalForReport[],
  user: UserContextForReport,
): Promise<SignalInsight[]> {
  if (signals.length === 0) return [];

  const client = new Anthropic();

  const userContext = [
    user.role && `Role: ${user.role}`,
    user.entity && `Organization: ${user.entity}${user.entityType ? ` (${user.entityType})` : ''}`,
    user.primaryRemit && `Primary remit: ${user.primaryRemit}`,
  ]
    .filter(Boolean)
    .join('\n');

  const signalsText = signals
    .map((s, i) => {
      const lines = [
        `Signal ${i + 1} (ID: ${s.id})`,
        `  Title: ${s.title}`,
        `  Entity: ${s.entityName} (${s.entityType})`,
        `  Objective: ${s.objective} | Type: ${s.signalType ?? 'unclassified'}`,
        `  Importance: ${s.importance}/100 | Topics: ${s.topicTags.join(', ') || 'none'}`,
        `  Summary: ${s.summary}`,
      ];
      if (s.stance && s.stance !== 'unclear') lines.push(`  Stance: ${s.stance}`);
      if (s.positionLabel) lines.push(`  Position: ${s.positionLabel}`);
      if (s.priorityDirection) lines.push(`  Direction: ${s.priorityDirection}`);
      if (s.rationale) lines.push(`  Rationale: ${s.rationale}`);
      if (s.changeType && s.changeType !== 'unclassified') lines.push(`  Change type: ${s.changeType}`);
      return lines.join('\n');
    })
    .join('\n\n');

  const systemPrompt = `You are an intelligence analyst writing a personalized briefing for a policy/regulatory professional.

User profile:
${userContext || '(no profile set)'}

For each signal, produce exactly two fields:
- reasoning: 1-2 sentences explaining WHY this development matters to this specific user given their role, organization, and remit. Be concrete — reference their entity type, sector, or remit keywords where relevant.
- actionItem: One specific, actionable recommendation if a response is warranted. Return null for purely informational signals or those with low urgency. Good actions are concrete ("Review the draft rulemaking and assess compliance timelines") not vague ("Stay informed").

Action guidance by signal type:
- Regulatory proposals / new rules → review and assess compliance or comment-filing implications
- Positions / stances from monitored entities → consider stakeholder outreach or internal positioning brief
- Rising organizational priorities → flag for strategic planning or leadership briefing
- Personnel changes → assess relationship implications
- Informational / low-importance signals → null`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    tools: [
      {
        name: 'generate_insights',
        description: 'Produce reasoning and action items for each signal in the briefing',
        input_schema: {
          type: 'object' as const,
          properties: {
            insights: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  signalId: { type: 'string', description: 'Exact signal ID from the input' },
                  reasoning: { type: 'string', description: 'Why this matters to the user' },
                  actionItem: {
                    type: ['string', 'null'],
                    description: 'Recommended action or null if none needed',
                  },
                },
                required: ['signalId', 'reasoning', 'actionItem'],
              },
            },
          },
          required: ['insights'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'generate_insights' },
    messages: [
      {
        role: 'user',
        content: `Generate insights for these ${signals.length} signals:\n\n${signalsText}`,
      },
    ],
  });

  const toolBlock = response.content.find((b) => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') return [];

  const result = toolBlock.input as { insights?: SignalInsight[] };
  return result.insights ?? [];
}
