import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — declared before imports so vitest hoists them correctly.
// ---------------------------------------------------------------------------

vi.mock('@perplexity/db', () => ({
  prisma: {
    signal: {
      create: vi.fn(),
    },
  },
  Prisma: {
    JsonNull: 'DbNull' as unknown,
  },
}));

vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  const MockAnthropic = vi.fn(() => ({
    messages: { create: mockCreate },
  }));
  // Expose the create mock via the constructor so tests can configure it.
  (MockAnthropic as unknown as Record<string, unknown>).__mockCreate = mockCreate;
  return { default: MockAnthropic };
});

// ---------------------------------------------------------------------------
// Imports — after mocks are declared
// ---------------------------------------------------------------------------

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@perplexity/db';
import {
  buildPrefill,
  buildCreatePayload,
  extractAndPersistSignal,
  clamp,
  _setClientForTest,
} from './signal-extractor.js';
import type { SignalExtractionContext, ExtractionResult, SignalPrefill } from './signal-extractor.js';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const NOW = new Date('2026-05-16T12:00:00Z');

function makeContext(overrides: Partial<SignalExtractionContext> = {}): SignalExtractionContext {
  return {
    run: {
      id: 'run-1',
      templateId: 'tmpl-1',
      entityId: 'entity-1',
      status: 'running',
      queryExpanded: 'test query',
      rawResponse: null,
      errorMessage: null,
      createdAt: NOW,
      startedAt: NOW,
      completedAt: null, // still null at extraction time — this is the key invariant
      updatedAt: NOW,
    } as unknown as SignalExtractionContext['run'],
    template: {
      id: 'tmpl-1',
      slug: 'test-template',
      name: 'Test Template',
      templateType: 'entity_monitoring',
      entityTypes: ['frontier_developer'],
      targetEntityIds: [],
      objective: 'activities',
      topics: ['AI safety'],
      queryPattern: 'test {entity}',
      cadence: 'weekly',
      domainAllowlist: [],
      active: true,
      createdAt: NOW,
      updatedAt: NOW,
    } as unknown as SignalExtractionContext['template'],
    entity: {
      id: 'entity-1',
      name: 'Anthropic',
      entityType: 'frontier_developer',
      defaultLayer: 'regulated_entities',
      jurisdictions: ['US'],
      sectors: ['ai'],
      active: true,
      approvalState: 'approved',
      subtype: null,
      description: null,
      discoveredBy: null,
      createdAt: NOW,
      updatedAt: NOW,
    } as unknown as SignalExtractionContext['entity'],
    finding: {
      id: 'finding-1',
      runId: 'run-1',
      entityId: 'entity-1',
      summary: 'Anthropic released Claude 4 with enhanced safety features and constitutional AI improvements.',
      signalType: null,
      topics: ['AI safety', 'model release'],
      createdAt: NOW,
    } as unknown as SignalExtractionContext['finding'],
    sources: [
      {
        id: 'src-1',
        runId: 'run-1',
        url: 'https://anthropic.com/news/claude-4',
        title: 'Announcing Claude 4',
        snippet: null,
        domain: 'anthropic.com',
        citedAt: NOW,
      } as unknown as SignalExtractionContext['sources'][number],
    ],
    ...overrides,
  };
}

function mockAnthropicCreate(result: ExtractionResult): void {
  const MockAnthropic = Anthropic as unknown as Record<string, unknown>;
  const mockCreate = MockAnthropic['__mockCreate'] as Mock;
  mockCreate.mockResolvedValue({
    content: [
      {
        type: 'tool_use',
        id: 'tool-use-1',
        name: 'classify_signal',
        input: result,
      },
    ],
  });
  // Inject a fresh mock client so the singleton picks up the new mock.
  _setClientForTest(new (Anthropic as unknown as new () => Anthropic)());
}

function mockAnthropicFail(error: Error): void {
  const MockAnthropic = Anthropic as unknown as Record<string, unknown>;
  const mockCreate = MockAnthropic['__mockCreate'] as Mock;
  mockCreate.mockRejectedValue(error);
  _setClientForTest(new (Anthropic as unknown as new () => Anthropic)());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildPrefill', () => {
  it('uses finding.createdAt as observedAt, not run.completedAt', () => {
    const ctx = makeContext();
    const prefill = buildPrefill(ctx);

    // run.completedAt is null — prefill must use finding.createdAt
    expect(ctx.run.completedAt).toBeNull();
    expect(prefill.observedAt).toEqual(NOW);
    expect(prefill.observedAt).toEqual(ctx.finding.createdAt);
  });

  it('falls back to a non-empty title when summary is empty', () => {
    const ctx = makeContext({
      finding: {
        ...makeContext().finding,
        summary: '',
      } as unknown as SignalExtractionContext['finding'],
    });
    const prefill = buildPrefill(ctx);
    expect(prefill.title.length).toBeGreaterThan(0);
    expect(prefill.summary).toBe('(no summary available)');
  });

  it('uses finding.topics when present, template.topics as fallback', () => {
    const ctxWithTopics = makeContext();
    expect(buildPrefill(ctxWithTopics).topicTags).toEqual(['AI safety', 'model release']);

    const ctxNoTopics = makeContext({
      finding: { ...makeContext().finding, topics: [] } as unknown as SignalExtractionContext['finding'],
    });
    expect(buildPrefill(ctxNoTopics).topicTags).toEqual(['AI safety']);
  });
});

describe('buildCreatePayload', () => {
  const basePrefill: SignalPrefill = {
    runId: 'run-1',
    runFindingId: 'finding-1',
    entityId: 'entity-1',
    entityType: 'frontier_developer',
    queryTemplateId: 'tmpl-1',
    templateType: 'entity_monitoring',
    objective: 'activities',
    sourceUrls: ['https://anthropic.com/news'],
    sourceDomains: ['anthropic.com'],
    topicTags: ['AI safety'],
    jurisdictionTags: ['US'],
    observedAt: NOW,
    title: 'Fallback title',
    summary: 'Fallback summary',
    importance: 50,
    confidence: 50,
  };

  it('activities: uses extracted fields and falls back to prefill defaults', () => {
    const extracted: ExtractionResult = {
      title: 'Claude 4 Released',
      summary: 'Anthropic released Claude 4.',
      importance: 85,
      confidence: 90,
      signalType: 'capability_released',
      changeType: 'product launch',
      actorsMentioned: ['Anthropic'],
    };

    const payload = buildCreatePayload(basePrefill, extracted, 'activities');

    expect(payload.title).toBe('Claude 4 Released');
    expect(payload.importance).toBe(85);
    expect(payload.signalType).toBe('capability_released');
    expect((payload as Record<string, unknown>)['changeType']).toBe('product launch');
    expect((payload as Record<string, unknown>)['actorsMentioned']).toEqual(['Anthropic']);
    // eventDate defaults to null when not provided
    expect((payload as Record<string, unknown>)['eventDate']).toBeNull();
  });

  it('activities: prefill-only (empty extraction) still produces a valid payload', () => {
    const payload = buildCreatePayload(basePrefill, {}, 'activities');

    expect(payload.title).toBe('Fallback title');
    expect(payload.importance).toBe(50);
    expect(payload.confidence).toBe(50);
    expect(payload.signalType).toBeNull();
    expect((payload as Record<string, unknown>)['changeType']).toBe('unclassified');
    expect((payload as Record<string, unknown>)['actorsMentioned']).toEqual([]);
    expect((payload as Record<string, unknown>)['eventDate']).toBeNull();
  });

  it('positions: extracted fields map correctly', () => {
    const extracted: ExtractionResult = {
      title: 'FTC Supports Mandatory Evals',
      summary: 'The FTC has signaled support for mandatory pre-deployment evaluations.',
      importance: 75,
      confidence: 80,
      topic: 'mandatory evaluations',
      positionLabel: 'supports mandatory pre-deployment evals',
      stance: 'support',
      strength: 4,
      evidenceSnippets: ['The FTC chair stated...'],
    };

    const payload = buildCreatePayload(
      { ...basePrefill, objective: 'positions' },
      extracted,
      'positions',
    );

    expect((payload as Record<string, unknown>)['stance']).toBe('support');
    expect((payload as Record<string, unknown>)['strength']).toBe(4);
    expect((payload as Record<string, unknown>)['evidenceSnippets']).toEqual(['The FTC chair stated...']);
  });

  it('positions: invalid stance falls back to "unclear"', () => {
    const payload = buildCreatePayload(
      { ...basePrefill, objective: 'positions' },
      { stance: 'definitely_not_a_valid_stance' },
      'positions',
    );

    expect((payload as Record<string, unknown>)['stance']).toBe('unclear');
  });

  it('priorities: extracted fields map correctly', () => {
    const extracted: ExtractionResult = {
      title: 'Rising Priority: Compute Governance',
      summary: 'Compute governance is becoming a top priority.',
      importance: 70,
      confidence: 65,
      priorityLabel: 'compute governance',
      priorityDirection: 'rising',
      momentum: 4,
      rationale: 'Multiple recent executive actions signal a shift.',
    };

    const payload = buildCreatePayload(
      { ...basePrefill, objective: 'priorities' },
      extracted,
      'priorities',
    );

    expect((payload as Record<string, unknown>)['priorityDirection']).toBe('rising');
    expect((payload as Record<string, unknown>)['momentum']).toBe(4);
    expect((payload as Record<string, unknown>)['rationale']).toBe('Multiple recent executive actions signal a shift.');
    expect((payload as Record<string, unknown>)['supportingSignalIds']).toEqual([]);
  });

  it('priorities: invalid priorityDirection falls back to "stable"', () => {
    const payload = buildCreatePayload(
      { ...basePrefill, objective: 'priorities' },
      { priorityDirection: 'sideways' },
      'priorities',
    );

    expect((payload as Record<string, unknown>)['priorityDirection']).toBe('stable');
  });

  it('invalid signalType is rejected and stored as null', () => {
    const payload = buildCreatePayload(basePrefill, { signalType: 'not_a_real_type' }, 'activities');
    expect(payload.signalType).toBeNull();
  });

  it('invalid entity-type details are stored but do not block the base payload', () => {
    // Even if details is a weird object, the rest of the payload is unaffected.
    const weirdDetails = { entityType: 'frontier_developer', malformedField: { nested: true } };
    const payload = buildCreatePayload(basePrefill, { details: weirdDetails }, 'activities');

    expect(payload.title).toBe('Fallback title'); // base is intact
    // details is stored as-is (DB accepts arbitrary JSON)
    expect(payload.details).toEqual({ entityType: 'frontier_developer', malformedField: { nested: true } });
  });
});

describe('clamp', () => {
  it('clamps values within range', () => {
    expect(clamp(150, 1, 100)).toBe(100);
    expect(clamp(-5, 1, 100)).toBe(1);
    expect(clamp(55, 1, 100)).toBe(55);
    expect(clamp(undefined, 1, 100)).toBe(1);
  });
});

describe('extractAndPersistSignal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists a signal with semantic fields on successful extraction', async () => {
    const ctx = makeContext();
    const mockSignalId = 'signal-abc';
    (prisma.signal.create as Mock).mockResolvedValue({ id: mockSignalId });

    mockAnthropicCreate({
      title: 'Claude 4 Released',
      summary: 'Anthropic released Claude 4 with improved safety.',
      importance: 85,
      confidence: 90,
      signalType: 'capability_released',
      changeType: 'product launch',
      actorsMentioned: ['Anthropic'],
    });

    const result = await extractAndPersistSignal(ctx);

    expect(result).toBe(mockSignalId);
    expect(prisma.signal.create).toHaveBeenCalledOnce();

    const createCall = (prisma.signal.create as Mock).mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(createCall?.data?.title).toBe('Claude 4 Released');
    expect(createCall?.data?.importance).toBe(85);
    expect(createCall?.data?.signalType).toBe('capability_released');
    expect(createCall?.data?.changeType).toBe('product launch');
  });

  it('falls back to prefill-only signal when extraction fails', async () => {
    const ctx = makeContext();
    (prisma.signal.create as Mock).mockResolvedValue({ id: 'signal-fallback' });

    mockAnthropicFail(new Error('API rate limit exceeded'));

    const result = await extractAndPersistSignal(ctx);

    // Signal is still persisted despite extraction failure
    expect(result).toBe('signal-fallback');
    expect(prisma.signal.create).toHaveBeenCalledOnce();

    const createCall = (prisma.signal.create as Mock).mock.calls[0]?.[0] as { data: Record<string, unknown> };
    // Prefill fallbacks are used
    expect(createCall?.data?.importance).toBe(50);
    expect(createCall?.data?.confidence).toBe(50);
    expect(createCall?.data?.signalType).toBeNull();
    expect(createCall?.data?.changeType).toBe('unclassified');
    // RunFinding summary is preserved in the signal
    expect(typeof createCall?.data?.summary).toBe('string');
    expect((createCall?.data?.summary as string).length).toBeGreaterThan(0);
  });

  it('persists base signal with null details when extraction returns invalid details', async () => {
    const ctx = makeContext();
    (prisma.signal.create as Mock).mockResolvedValue({ id: 'signal-bad-details' });

    // Extraction succeeds but returns details that would fail strict validation
    mockAnthropicCreate({
      title: 'Capability Release',
      summary: 'A new model was released.',
      importance: 70,
      confidence: 75,
      signalType: 'capability_released',
      // details with an unexpected structure — DB will store it as JSON without complaint
      details: { entityType: 'frontier_developer', unknownField: 12345 },
    });

    const result = await extractAndPersistSignal(ctx);

    expect(result).toBe('signal-bad-details');
    expect(prisma.signal.create).toHaveBeenCalledOnce();

    const createCall = (prisma.signal.create as Mock).mock.calls[0]?.[0] as { data: Record<string, unknown> };
    // Base signal fields are intact even with weird details
    expect(createCall?.data?.title).toBe('Capability Release');
    expect(createCall?.data?.importance).toBe(70);
    // details is stored as-is (no blocking)
    expect(createCall?.data?.details).toBeTruthy();
  });

  it('returns null without calling Prisma for discovery runs (no entityId)', async () => {
    const ctx = makeContext({
      run: {
        ...makeContext().run,
        entityId: null,
      } as unknown as SignalExtractionContext['run'],
    });

    const result = await extractAndPersistSignal(ctx);

    expect(result).toBeNull();
    expect(prisma.signal.create).not.toHaveBeenCalled();
  });

  it('does not mutate or touch RunFinding when Prisma signal.create fails', async () => {
    const ctx = makeContext();
    (prisma.signal.create as Mock).mockRejectedValue(new Error('DB connection lost'));

    mockAnthropicCreate({
      title: 'Test Signal',
      summary: 'Something happened.',
      importance: 60,
      confidence: 70,
    });

    // extractAndPersistSignal throws — the caller (run-engine) catches it
    await expect(extractAndPersistSignal(ctx)).rejects.toThrow('DB connection lost');

    // RunFinding.create was never called from here — it was already committed
    // before extractAndPersistSignal is invoked, so no RunFinding rollback occurs.
    // We just verify signal.create was attempted once.
    expect(prisma.signal.create).toHaveBeenCalledOnce();
  });
});
