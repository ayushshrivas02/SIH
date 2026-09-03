import { NextResponse } from 'next/server';
import { AIProviderManager } from '@/lib/ai/manager';

export async function GET() {
  try {
    const provider = await AIProviderManager.getProviderForTask('CHAT');
    const models = await provider.getModels();
    
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return NextResponse.json({ models: [] });
  }
}
