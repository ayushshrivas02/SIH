import { NextResponse, NextRequest } from 'next/server';
import { AIProviderManager } from '@/lib/ai/manager';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/rbac';

export const POST = requireRole('USER', async (req: NextRequest) => {
  try {
    const { imageBase64, prompt, model } = await req.json();

    if (!imageBase64 || !prompt) {
      return NextResponse.json({ error: 'Image and prompt are required.' }, { status: 400 });
    }

    const provider = await AIProviderManager.getProviderForTask('VISION');
    
    let targetModel = model;
    if (provider.getModels) {
      const availableModels = await provider.getModels();
      const modelNames = availableModels.map(m => m.name);
      if (modelNames.length === 0) {
        if (provider.id === 'ollama') {
          return NextResponse.json({ error: 'No models are installed in Ollama. Please download a model first.' }, { status: 400 });
        }
      } else {
        if (targetModel && !modelNames.includes(targetModel)) {
          console.warn(`Requested vision model ${targetModel} not found. Falling back to ${modelNames[0]}`);
          targetModel = modelNames[0];
        } else if (!targetModel) {
          targetModel = modelNames[0];
        }
      }
    }

    if (targetModel && 'setModel' in provider) {
      (provider as any).setVisionModel?.(targetModel);
    }
    
    const finalModel = (provider as any).visionModel || 'unknown';

    const health = await provider.healthCheck();
    if (health.status !== 'CONNECTED') {
      return NextResponse.json({ error: `Vision Provider (${provider.name}) is unavailable: ${health.error || 'Unknown error'}` }, { status: 503 });
    }

    const start = Date.now();
    const result = await provider.analyzeImage(imageBase64, prompt);
    const latency = Date.now() - start;

    await prisma.auditLog.create({
      data: {
        action: 'VISION_ANALYSIS',
        details: `Provider: ${provider.name}, Model: ${finalModel}, Latency: ${latency}ms`,
      }
    });

    return NextResponse.json({ result, provider: provider.name, model: finalModel });
  } catch (error: any) {
    console.error('Vision analysis error:', error);
    
    await prisma.auditLog.create({
      data: {
        action: 'VISION_ERROR',
        details: `Error: ${error.message}`,
      }
    });

    return NextResponse.json({ error: error.message || 'Failed to analyze image' }, { status: 503 });
  }
});
