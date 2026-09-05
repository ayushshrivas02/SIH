import { NextResponse, NextRequest } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { AIProviderManager } from '@/lib/ai/manager';

export const POST = requireRole('USER', async (req: NextRequest) => {
  try {
    const { prompt, model } = await req.json();

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'No prompt provided.' }, { status: 400 });
    }

    const provider = await AIProviderManager.getProviderForTask('CODE');
    
    // Attempt to set the requested model if the provider supports it
    if (model && model !== 'auto' && 'setModel' in provider) {
       (provider as any).setModel(model);
    }

    const health = await provider.healthCheck();
    if (health.status !== 'CONNECTED') {
      return NextResponse.json({ error: `AI Provider (${provider.name}) is unavailable: ${health.error || 'Unknown error'}` }, { status: 503 });
    }

    const systemMessage = "You are an expert software engineer. Provide the requested code. Use markdown code blocks to format the code.";
    
    // Call the AI model
    const responseText = await provider.chat([
       { role: 'system', content: systemMessage },
       { role: 'user', content: prompt }
    ]);

    return NextResponse.json({ success: true, response: responseText });
  } catch (error: any) {
    console.error('Code Generation error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Generation failed' }, { status: 500 });
  }
});
