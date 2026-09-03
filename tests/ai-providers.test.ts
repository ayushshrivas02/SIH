import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaProvider } from '../src/lib/ai/ollama';
import { OpenAICompatibleProvider } from '../src/lib/ai/openai-compatible';

// Mock fetch globally
global.fetch = vi.fn();

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    provider = new OllamaProvider();
    vi.clearAllMocks();
  });

  it('validates capabilities', () => {
    expect(provider.capabilities).toEqual({
      chat: true,
      vision: true,
      embeddings: true
    });
  });

  it('healthCheck returns CONNECTED when API is reachable', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true
    });
    
    const health = await provider.healthCheck();
    expect(health.status).toBe('CONNECTED');
    expect(health.latency).toBeDefined();
  });

  it('healthCheck returns UNAVAILABLE when API fails', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      statusText: 'Not Found'
    });
    
    const health = await provider.healthCheck();
    expect(health.status).toBe('UNAVAILABLE');
    expect(health.error).toBe('Not Found');
  });

  it('getModels discovers models', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'qwen2.5' }, { name: 'llava' }] })
    });

    const models = await provider.getModels();
    expect(models).toHaveLength(2);
    expect(models[0].name).toBe('qwen2.5');
  });

  it('chat sends correct payload with overridden model', async () => {
    provider.setModel('llama3');
    
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'Hello' } })
    });

    const reply = await provider.chat([{ role: 'user', content: 'Hi' }]);
    expect(reply).toBe('Hello');
    
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/chat'), expect.objectContaining({
      body: expect.stringContaining('"model":"llama3"')
    }));
  });
});

describe('OpenAICompatibleProvider', () => {
  let provider: OpenAICompatibleProvider;

  beforeEach(() => {
    provider = new OpenAICompatibleProvider();
    // Simulate API key existing for tests
    (provider as any).apiKey = 'test-key';
    vi.clearAllMocks();
  });

  it('healthCheck returns NOT CONFIGURED if no key', async () => {
    (provider as any).apiKey = '';
    const health = await provider.healthCheck();
    expect(health.status).toBe('NOT CONFIGURED');
  });

  it('healthCheck returns CONNECTED if reachable', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true
    });
    const health = await provider.healthCheck();
    expect(health.status).toBe('CONNECTED');
  });

  it('handles provider errors in chat', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      statusText: 'Service Unavailable'
    });

    await expect(provider.chat([{ role: 'user', content: 'hi' }])).rejects.toThrow('OpenAI chat error: Service Unavailable');
  });
});
