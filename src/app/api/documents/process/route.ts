import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { DocumentProcessor } from '@/lib/ai/document-processor';
import { RecursiveCharacterTextSplitter } from '@/lib/ai/text-splitter';
import { AIProviderManager } from '@/lib/ai/manager';

export async function POST(req: Request) {
  try {
    const { documentId, filePath } = await req.json();
    
    if (!documentId || !filePath) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');

    // 1. EXTRACTING
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'EXTRACTING' }
    });

    let extractedText = '';
    try {
      extractedText = await DocumentProcessor.extractText(filePath, doc.fileType);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'ERROR', content: `Extraction failed: ${msg}` }
      });
      return NextResponse.json({ error: 'Extraction failed' }, { status: 500 });
    }

    // Save extracted text
    await prisma.document.update({
      where: { id: documentId },
      data: { content: extractedText }
    });

    // 2. INDEXING (Chunking and Embeddings)
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'INDEXING' }
    });

    // Get settings
    const getSetting = async (key: string, def: string) => {
      const s = await prisma.systemSetting.findUnique({ where: { key } });
      return s?.value || def;
    };

    const chunkSize = parseInt(await getSetting('rag_chunk_size', '1000'));
    const chunkOverlap = parseInt(await getSetting('rag_chunk_overlap', '200'));

    const splitter = new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap });
    const chunks = await splitter.splitText(extractedText);

    // Get Embeddings Provider
    const embeddingProvider = await AIProviderManager.getProviderForTask('EMBEDDING');
    
    // We process chunks in sequence to avoid rate limits / overwhelming local LLM
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      let embeddingStr = null;
      
      try {
        const embedding = await embeddingProvider.generateEmbedding(chunkText);
        embeddingStr = JSON.stringify(embedding);
      } catch (e) {
        console.error(`Failed to embed chunk ${i}:`, e);
        // Continue, we just won't have an embedding for this chunk
      }

      await prisma.documentChunk.create({
        data: {
          documentId,
          content: chunkText,
          embedding: embeddingStr,
          pageNumber: i + 1, // rough approximation for chunk index
        }
      });
    }

    // 3. READY
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'READY' }
    });

    // Log to Audit
    await prisma.auditLog.create({
      data: {
        action: 'DOCUMENT_INDEXED',
        details: `Indexed ${doc.filename}: ${chunks.length} chunks generated.`
      }
    });

    return NextResponse.json({ success: true, chunks: chunks.length });
  } catch (error: unknown) {
    console.error('Process error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
