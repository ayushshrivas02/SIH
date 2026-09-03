import { AIProvider, ChatMessage, StructuredOutputOptions, ProviderCapability, ProviderHealth } from './provider';
import { pipeline } from '@xenova/transformers';

export class TransformersEmbeddingProvider implements AIProvider {
  id = 'transformers';
  name = 'Local Transformers (Xenova)';
  type = 'local';
  capabilities: ProviderCapability = {
    chat: false,
    vision: false,
    embeddings: true,
  };

  private embeddingModel: string;
  private extractorPipeline: any = null;

  constructor() {
    this.embeddingModel = process.env.TRANSFORMERS_EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';
  }

  async healthCheck(): Promise<ProviderHealth> {
    try {
      if (!this.extractorPipeline) {
        await this.initPipeline();
      }
      return { status: 'CONNECTED', latency: 0 };
    } catch (error: any) {
      return { status: 'UNAVAILABLE', error: error.message };
    }
  }

  private async initPipeline() {
    if (!this.extractorPipeline) {
      this.extractorPipeline = await pipeline('feature-extraction', this.embeddingModel);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.extractorPipeline) {
      await this.initPipeline();
    }
    const output = await this.extractorPipeline(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  // Unsupported methods
  async getModels(): Promise<{id: string; name: string}[]> {
    return [{ id: this.embeddingModel, name: this.embeddingModel }];
  }
  
  async chat(_messages: ChatMessage[]): Promise<string> {
    throw new Error('Chat is not supported by TransformersEmbeddingProvider.');
  }

  async *streamChat(_messages: ChatMessage[]): AsyncGenerator<string, void, unknown> {
    throw new Error('Stream Chat is not supported by TransformersEmbeddingProvider.');
  }

  async generateStructuredOutput<T>(_options: StructuredOutputOptions<T>): Promise<T> {
    throw new Error('Structured Output is not supported by TransformersEmbeddingProvider.');
  }

  async analyzeImage(_imageBase64: string, _prompt: string): Promise<string> {
    throw new Error('Vision is not supported by TransformersEmbeddingProvider.');
  }
}
