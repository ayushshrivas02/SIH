import { AIProviderManager } from './manager';

export const getAIProvider = () => AIProviderManager.getProviderForTask('CHAT');
export const getVisionProvider = () => AIProviderManager.getProviderForTask('VISION');
export const getEmbeddingProvider = () => AIProviderManager.getProviderForTask('EMBEDDING');
export const getImageProvider = () => AIProviderManager.getImageProvider();
