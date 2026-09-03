import { AIProvider, ChatMessage, StructuredOutputOptions, ProviderCapability, ProviderHealth } from './provider';

export class OpenAICompatibleProvider implements AIProvider {
  id = 'openai-compatible';
  name = 'OpenAI Compatible';
  type = 'remote-compatible';
  capabilities: ProviderCapability = {
    chat: true,
    vision: true,
    embeddings: true,
  };

  private baseUrl: string;
  private model: string;
  private visionModel: string;
  private embeddingModel: string;
  private apiKey: string;

  constructor() {
    // Assuming environment variables like OPENAI_BASE_URL or similar are configured
    // Since the prompt said "Use environment/configuration values", we'll default to standard vars
    // But allowing fallback if standard vars are missing for testing.
    this.baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
    this.visionModel = process.env.OPENAI_VISION_MODEL || 'gpt-4o';
    this.embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    this.apiKey = process.env.OPENAI_API_KEY || '';
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

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return { status: 'NOT CONFIGURED', error: 'API key not configured' };
    }
    
    try {
      const start = Date.now();
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: this.getHeaders()
      });
      const latency = Date.now() - start;
      if (res.ok) {
        return { status: 'CONNECTED', latency };
      }
      return { status: 'UNAVAILABLE', error: res.statusText };
    } catch (e: any) {
      return { status: 'UNAVAILABLE', error: e.message };
    }
  }

  async getModels(): Promise<{id: string; name: string}[]> {
    if (!this.apiKey) return [];
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: this.getHeaders()
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data || []).map((m: any) => ({
        id: m.id,
        name: m.id
      }));
    } catch (e) {
      console.error('OpenAI getModels error:', e);
      return [];
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI chat error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content || '';
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<string, void, unknown> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`OpenAI stream error: ${res.statusText}`);
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
        let line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);

        if (line.startsWith('data: ')) {
          line = line.slice(6); // remove "data: "
        }

        if (line === '[DONE]') {
          return;
        }

        if (line) {
          try {
            const parsed = JSON.parse(line);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch (e) {
            // ignore partial json
          }
        }
      }
    }
  }

  async generateStructuredOutput<T>(options: StructuredOutputOptions<T>): Promise<T> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: options.prompt + '\nRespond ONLY in valid JSON format.' }],
        response_format: { type: 'json_object' },
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI JSON generation error: ${res.statusText}`);
    }

    const data = await res.json();
    return JSON.parse(data.choices[0]?.message?.content) as T;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.embeddingModel,
        input: text,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI embedding error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.data[0]?.embedding;
  }

  async analyzeImage(imageBase64: string, prompt: string): Promise<string> {
    const base64Data = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.visionModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: base64Data } }
            ]
          }
        ],
        max_tokens: 1000
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI vision error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content || '';
  }
}
