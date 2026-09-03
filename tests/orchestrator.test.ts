import { describe, it, expect, vi } from 'vitest';
import { Orchestrator } from '../src/lib/ai/orchestrator';
import { AIProvider } from '../src/lib/ai/provider';

describe('Orchestrator', () => {
  it('determines CHAT intent correctly', async () => {
    const mockProvider = {
      generateStructuredOutput: vi.fn().mockResolvedValue({
        intent: 'CHAT',
        confidence: 0.9,
        reasoning: 'Standard greeting'
      })
    } as unknown as AIProvider;

    const orchestrator = new Orchestrator(mockProvider);
    const result = await orchestrator.determineTaskIntent('Hello, how are you?');

    expect(result.intent).toBe('CHAT');
    expect(mockProvider.generateStructuredOutput).toHaveBeenCalled();
  });

  it('determines VISION intent correctly', async () => {
    const mockProvider = {
      generateStructuredOutput: vi.fn().mockResolvedValue({
        intent: 'VISION',
        confidence: 0.95,
        reasoning: 'Mentions an image'
      })
    } as unknown as AIProvider;

    const orchestrator = new Orchestrator(mockProvider);
    const result = await orchestrator.determineTaskIntent('Describe the objects in this photo.');

    expect(result.intent).toBe('VISION');
  });

  it('determines CODE intent correctly', async () => {
    const mockProvider = {
      generateStructuredOutput: vi.fn().mockResolvedValue({
        intent: 'CODE',
        confidence: 0.85,
        reasoning: 'Asking to write a react component'
      })
    } as unknown as AIProvider;

    const orchestrator = new Orchestrator(mockProvider);
    const result = await orchestrator.determineTaskIntent('Write a React component for a dropdown.');

    expect(result.intent).toBe('CODE');
  });

  it('falls back to CHAT if JSON parsing fails', async () => {
    const mockProvider = {
      generateStructuredOutput: vi.fn().mockRejectedValue(new Error('Parse error'))
    } as unknown as AIProvider;

    const orchestrator = new Orchestrator(mockProvider);
    const result = await orchestrator.determineTaskIntent('Some prompt');

    expect(result.intent).toBe('CHAT');
    expect(result.confidence).toBe(0);
    expect(result.reasoning).toBe('JSON parse error.');
  });
});
