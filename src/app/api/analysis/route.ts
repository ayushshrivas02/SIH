import { NextResponse, NextRequest } from 'next/server';
import { AIProviderManager } from '@/lib/ai/manager';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/rbac';

export const POST = requireRole('USER', async (req: NextRequest) => {
  try {
    const { datasetSummary, prompt } = await req.json();
    if (!datasetSummary || !prompt) {
      return NextResponse.json({ error: 'Data summary and prompt required' }, { status: 400 });
    }

    const provider = await AIProviderManager.getProviderForTask('CHAT');
    const finalModel = (provider as any).model || 'unknown';
    
    const health = await provider.healthCheck();
    if (health.status !== 'CONNECTED') {
      return NextResponse.json({ error: `Data Analysis Provider (${provider.name}) is unavailable: ${health.error || 'Unknown error'}` }, { status: 503 });
    }

    const systemPrompt = `You are an expert industrial data analyst. 
You are analyzing deterministic statistics calculated from a CSV/Excel file.
Do not invent or hallucinate numbers. Rely ONLY on the statistics provided in the dataset summary below.

DATASET SUMMARY:
${datasetSummary}`;

    const start = Date.now();
    const result = await provider.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ]);
    const latency = Date.now() - start;

    await prisma.auditLog.create({
      data: {
        action: 'DATA_ANALYSIS',
        details: `Provider: ${provider.name}, Model: ${finalModel}, Latency: ${latency}ms`,
      }
    });

    return NextResponse.json({ result, provider: provider.name, model: finalModel });
  } catch (error: any) {
    console.error('Data analysis error:', error);
    await prisma.auditLog.create({
      data: {
        action: 'DATA_ANALYSIS_ERROR',
        details: `Error: ${error.message}`,
      }
    });
    return NextResponse.json({ error: error.message || 'Failed to analyze data.' }, { status: 503 });
  }
});
