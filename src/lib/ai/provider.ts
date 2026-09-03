export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StructuredOutputOptions<T> {
  schema: any; // Zod schema
  prompt: string;
}

export interface ProviderCapability {
  chat: boolean;
  vision: boolean;
  embeddings: boolean;
}

export interface ProviderHealth {
  status: 'CONNECTED' | 'UNAVAILABLE' | 'NOT CONFIGURED' | 'CHECKING' | 'ERROR';
  latency?: number;
  error?: string;
}

export interface AIProvider {
  id: string;
  name: string;
  type: string;
  capabilities: ProviderCapability;

  getModels(): Promise<{id: string; name: string}[]>;
  chat(messages: ChatMessage[]): Promise<string>;
  streamChat(messages: ChatMessage[]): AsyncGenerator<string, void, unknown>;
  generateStructuredOutput<T>(options: StructuredOutputOptions<T>): Promise<T>;
  generateEmbedding(text: string): Promise<number[]>;
  analyzeImage(imageBase64: string, prompt: string): Promise<string>;
  healthCheck(): Promise<ProviderHealth>;
}

export interface ImageProvider {
  id: string;
  name: string;
  type: string;
  capabilities: { generate: boolean; edit: boolean };

  generateImage(prompt: string): Promise<string>;
  editImage(imageBase64: string, prompt: string): Promise<string>;
  healthCheck(): Promise<ProviderHealth>;
}
