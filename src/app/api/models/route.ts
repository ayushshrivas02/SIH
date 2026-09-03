import { NextResponse, NextRequest } from 'next/server';
import { AIProviderManager } from '@/lib/ai/manager';
import { requireRole } from '@/lib/rbac';

export const GET = requireRole('USER', async (req: NextRequest) => {
  try {
    const provider = await AIProviderManager.getProviderForTask('CHAT');
    const models = await provider.getModels();
    
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return NextResponse.json({ models: [] });
  }
});
