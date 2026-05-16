import type {
  PerplexityRequest,
  PerplexityResponse,
  SearchResult,
  SearchOptions,
  ProviderClient,
} from './types.js';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

const DEFAULT_SYSTEM_PROMPT = `You are a research assistant specializing in AI policy and regulation.
Provide accurate, factual summaries with specific details about entities, actions, dates, and policy positions.
Be concise and cite your sources.`;

export class PerplexityClient implements ProviderClient {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model = 'sonar') {
    if (!apiKey) throw new Error('PPLX_API_KEY is required');
    this.apiKey = apiKey;
    this.model = model;
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    const body: PerplexityRequest = {
      model: this.model,
      messages: [
        { role: 'system', content: options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT },
        { role: 'user', content: query },
      ],
      return_citations: true,
      max_tokens: options.maxTokens ?? 1024,
    };

    if (options.domainAllowlist && options.domainAllowlist.length > 0) {
      body.search_domain_filter = options.domainAllowlist;
    }

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Perplexity API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as PerplexityResponse;

    const content = data.choices[0]?.message.content ?? '';
    const citations = data.citations ?? [];

    return { content, citations, rawResponse: data };
  }
}

export function createPerplexityClient(): PerplexityClient {
  const apiKey = process.env['PPLX_API_KEY'] ?? '';
  const model = process.env['PPLX_MODEL'] ?? 'sonar';
  return new PerplexityClient(apiKey, model);
}
