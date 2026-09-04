import { AIProvider, ChatMessage, StructuredOutputOptions, ProviderCapability, ProviderHealth } from './provider';

export class OllamaProvider implements AIProvider {
  id = 'ollama';
  name = 'Local Ollama';
  type = 'local';
  capabilities: ProviderCapability = {
    chat: true,
    vision: true,
    embeddings: true,
  };

  private baseUrl: string;
  private model: string;
  private visionModel: string;
  private embeddingModel: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    this.model = process.env.OLLAMA_MODEL || 'qwen2.5:0.5b';
    this.visionModel = process.env.VISION_MODEL || 'qwen2.5vl:7b';
    this.embeddingModel = process.env.EMBEDDING_MODEL || 'nomic-embed-text:latest';
  }

  setModel(modelName: string) {
    this.model = modelName;
  }

  setVisionModel(modelName: string) {
    this.visionModel = modelName;
  }

  setEmbeddingModel(modelName: string) {
    this.embeddingModel = modelName;
  }

  async healthCheck(): Promise<ProviderHealth> {
    try {
      const start = Date.now();
      const res = await fetch(`${this.baseUrl}/api/version`);
      const latency = Date.now() - start;
      if (res.ok) {
        return { status: 'CONNECTED', latency };
      }
      return { status: 'UNAVAILABLE', error: res.statusText };
    } catch (e: any) {
      return { status: 'UNAVAILABLE', error: e.message || 'Connection refused or server offline' };
    }
  }

  async getModels(): Promise<{id: string; name: string}[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models || []).map((m: any) => ({
        id: m.name,
        name: m.name
      }));
    } catch (e: any) {
      console.error('Ollama getModels error:', e.message);
      return [];
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: false,
        keep_alive: '5m',
        options: {
          num_ctx: 2048,
          temperature: 0.1
        }
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama chat error: ${res.statusText}`);
    }

      const data = await res.json();
      return data.message?.content || '';
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<string, void, unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: true,
        keep_alive: '5m',
        options: {
          num_ctx: 2048,
          temperature: 0.1
        }
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Ollama stream error: ${res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      let newlineIdx;
      while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);
        if (line) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              yield parsed.message.content;
            }
          } catch (e) {
            // Incomplete JSON or other issue, ignore
          }
        }
      }
    }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async generateStructuredOutput<T>(options: StructuredOutputOptions<T>): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          prompt: options.prompt + '\nRespond ONLY in valid JSON format.',
          format: 'json',
          stream: false,
          keep_alive: '5m',
          options: {
            num_ctx: 2048,
            num_predict: 1024,
            temperature: 0
          }
        }),
      });

      if (!res.ok) {
        throw new Error(`Ollama JSON generation error: ${res.statusText}`);
      }

      const data = await res.json();
      const cleaned = data.response.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.embeddingModel,
        prompt: text,
        keep_alive: '5m'
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama embedding error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.embedding;
  }

  async analyzeImage(imageBase64: string, prompt: string): Promise<string> {
    // Strip data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.visionModel,
        prompt: prompt,
        images: [base64Data],
        stream: false,
        keep_alive: '5m'
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama vision error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.response;
  }
}
