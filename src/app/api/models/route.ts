import { NextResponse, NextRequest } from 'next/server';
import { AIProviderManager } from '@/lib/ai/manager';
import { requireRole } from '@/lib/rbac';

export const GET = requireRole('USER', async (req: NextRequest) => {
  try {
    const provider = await AIProviderManager.getProviderForTask('CHAT');
    const allModels = await provider.getModels();
    
    // Filter out embedding-only models that cannot handle chat
    const EMBEDDING_ONLY_PATTERNS = [
      'nomic-embed', 'all-minilm', 'mxbai-embed', 'snowflake-arctic-embed', 'bge-'
    ];
    const models = allModels.filter(m => 
      !EMBEDDING_ONLY_PATTERNS.some(pattern => m.name.toLowerCase().includes(pattern))
    );
    
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return NextResponse.json({ models: [] });
  }
});
