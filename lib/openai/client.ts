import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

let _openai: OpenAI | null = null;

/**
 * Get OpenAI client instance (lazy initialization)
 * Throws if API key is not configured
 */
export function getOpenAIClient(): OpenAI {
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not configured. Please set the environment variable.'
    );
  }

  if (!_openai) {
    _openai = new OpenAI({ apiKey });
  }

  return _openai;
}

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!apiKey;
}

// Export for backward compatibility (lazy proxy)
export const openai = new Proxy({} as OpenAI, {
  get(_, prop) {
    const client = getOpenAIClient();
    const value = client[prop as keyof OpenAI];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export const CHAT_MODEL = 'gpt-4o';
export const EMBEDDING_MODEL = 'text-embedding-3-small';
