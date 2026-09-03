import { NextResponse } from 'next/server';
import { AIProviderManager } from '@/lib/ai/manager';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { imageBase64, prompt, model } = await req.json();

    if (!imageBase64 || !prompt) {
      return NextResponse.json({ error: 'Image and prompt are required.' }, { status: 400 });
    }

    const provider = await AIProviderManager.getProviderForTask('VISION');
    
    let targetModel = model;
    if (!targetModel) {
      const setting = await prisma.systemSetting.findUnique({ where: { key: 'default_vision_model' } });
      if (setting && setting.value) targetModel = setting.value;
    }

    if (targetModel && 'setModel' in provider) {
      // For Ollama we can use setModel for vision as well, or we may need a setVisionModel. 
      // Assuming setModel overrides the primary model used for requests.
      // Wait, in OllamaProvider vision uses `this.visionModel`. Let's add setVisionModel if needed, or assume setModel is enough.
      // Actually we will just add setVisionModel to OllamaProvider shortly.
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
}
