export interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
  search_domain_filter?: string[];
  return_citations?: boolean;
  max_tokens?: number;
  temperature?: number;
}

export interface PerplexityChoice {
  index: number;
  message: { role: string; content: string };
  finish_reason: string;
}

export interface PerplexityResponse {
  id: string;
  model: string;
  choices: PerplexityChoice[];
  citations?: string[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface SearchResult {
  content: string;
  citations: string[];
  rawResponse: PerplexityResponse;
}

export interface ProviderClient {
  search(query: string, options?: SearchOptions): Promise<SearchResult>;
}

export interface SearchOptions {
  domainAllowlist?: string[];
  maxTokens?: number;
  systemPrompt?: string;
}
