import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AIProviderManager } from '@/lib/ai/manager';

export async function POST(req: Request) {
  try {
    const { documentId, query, type } = await req.json();

    if (!documentId || !query) {
      return NextResponse.json({ error: 'documentId and query are required' }, { status: 400 });
    }

    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Embed query
    const embeddingProvider = await AIProviderManager.getProviderForTask('EMBEDDING');
    // Using embedding provider to generate embedding. (In production, use this to search RAG DB)
    await embeddingProvider.generateEmbedding(query).catch(() => null);

    let contextText = doc.content || '';
    if (contextText.length > 20000) {
      contextText = contextText.substring(0, 20000) + '\\n...[TRUNCATED]';
    }

    // Call LLM
    const ai = await AIProviderManager.getProviderForTask(type === 'image' ? 'VISION' : 'CHAT');
    
    const systemPrompt = `You are a Document Intelligence Agent. You are tasked with answering the user's query based strictly on the provided document context.

Document Name: ${doc.filename}
Document Type: ${doc.fileType}

Context:
${contextText}

If the answer is not in the context, say "I cannot find the answer in the document." Do not hallucinate.`;

    const start = Date.now();
    const response = await ai.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ]);
    const latency = Date.now() - start;

    await prisma.auditLog.create({
      data: {
        action: 'DOCUMENT_INTELLIGENCE_QUERY',
        details: `Doc: ${doc.filename}, Latency: ${latency}ms`,
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ result: response, model: (ai as any).model || 'unknown' });
  } catch (error) {
    console.error('Intelligence Query Error:', error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: (error as any).message || 'Failed to process intelligence query' }, { status: 500 });
  }
}
