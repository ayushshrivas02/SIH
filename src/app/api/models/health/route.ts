import { NextResponse, NextRequest } from 'next/server';
import { AIProviderManager } from '@/lib/ai/manager';
import { requireRole } from '@/lib/rbac';

export const GET = requireRole('ADMIN', async (req: NextRequest) => {
  try {
    const textProvider = await AIProviderManager.getProviderForTask('CHAT');
    const visionProvider = await AIProviderManager.getProviderForTask('VISION');
    const embeddingProvider = await AIProviderManager.getProviderForTask('EMBEDDING');
    const imageProvider = await AIProviderManager.getImageProvider();

    const [textHealth, visionHealth, embeddingHealth, imageHealth, textModels, visionModels, embeddingModels] = await Promise.all([
      textProvider.healthCheck(),
      visionProvider.healthCheck(),
      embeddingProvider.healthCheck(),
      imageProvider ? imageProvider.healthCheck() : Promise.resolve({ status: 'NOT CONFIGURED' }),
      textProvider.getModels(),
      visionProvider.getModels(),
      embeddingProvider.getModels()
    ]);

    return NextResponse.json({
      providers: {
        text: {
          id: textProvider.id,
          name: textProvider.name,
          type: textProvider.type,
          capabilities: textProvider.capabilities,
          health: textHealth,
          models: textModels
        },
        vision: {
          id: visionProvider.id,
          name: visionProvider.name,
          type: visionProvider.type,
          capabilities: visionProvider.capabilities,
          health: visionHealth,
          models: visionModels
        },
        embedding: {
          id: embeddingProvider.id,
          name: embeddingProvider.name,
          type: embeddingProvider.type,
          capabilities: embeddingProvider.capabilities,
          health: embeddingHealth,
          models: embeddingModels
        },
        image: imageProvider ? {
          id: imageProvider.id,
          name: imageProvider.name,
          type: imageProvider.type,
          capabilities: imageProvider.capabilities,
          health: imageHealth,
          models: []
        } : null,
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
});
