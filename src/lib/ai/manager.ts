import { AIProvider, ImageProvider } from './provider';
import { OllamaProvider } from './ollama';
import { OpenAICompatibleProvider } from './openai-compatible';
import { LocalImageProvider } from './local-image';
import { TransformersEmbeddingProvider } from './transformers';
import { prisma } from '@/lib/db';

export class AIProviderManager {
  static async getProviderForTask(task: 'CHAT' | 'CODE' | 'VISION' | 'EMBEDDING'): Promise<AIProvider> {
    let settingKey = 'default_chat_provider';
    let defaultEnv = process.env.AI_PROVIDER || 'ollama';

    if (task === 'VISION') {
      settingKey = 'default_vision_provider';
      defaultEnv = process.env.VISION_PROVIDER || process.env.AI_PROVIDER || 'ollama';
    } else if (task === 'EMBEDDING') {
      settingKey = 'default_embedding_provider';
      defaultEnv = process.env.EMBEDDING_PROVIDER || 'transformers';
    } else if (task === 'CODE') {
      settingKey = 'default_code_provider';
    }

    let providerName = defaultEnv;
    try {
      const setting = await prisma.systemSetting.findUnique({ where: { key: settingKey } });
      if (setting && setting.value) {
        providerName = setting.value;
      }
    } catch (e) {
      console.error('Failed to fetch provider setting:', e);
    }

    return this.resolveProvider(providerName);
  }

  static async getImageProvider(): Promise<ImageProvider | null> {
    let providerName = process.env.IMAGE_PROVIDER;
    try {
      const setting = await prisma.systemSetting.findUnique({ where: { key: 'default_image_provider' } });
      if (setting && setting.value) {
        providerName = setting.value;
      }
    } catch (e) {
      console.error('Failed to fetch image provider setting:', e);
    }

    if (!providerName) return null;
    
    if (providerName === 'local') {
      return new LocalImageProvider();
    }
    return null;
  }

  static resolveProvider(providerName: string): AIProvider {
    if (providerName === 'transformers') {
      return new TransformersEmbeddingProvider();
    }
    if (providerName === 'openai-compatible') {
      return new OpenAICompatibleProvider();
    }
    return new OllamaProvider();
  }
}
