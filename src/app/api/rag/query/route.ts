import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { AIProviderManager } from '@/lib/ai/manager';
import { searchKnowledgeBase } from '@/lib/ai/rag';
import { executeSqlRagQuery } from '@/lib/ai/sql-rag';
import { prisma } from '@/lib/db';

export const POST = requireRole('USER', async (req: NextRequest) => {
  try {
    const { query, databaseId } = await req.json();
    if (typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'A query is required.' }, { status: 400 });
    }

    // If an external database is selected, route to Text-to-SQL RAG
    if (databaseId && databaseId !== 'local') {
      const dbConnection = await prisma.databaseConnection.findUnique({ where: { id: databaseId }});
      if (!dbConnection) {
        return NextResponse.json({ error: 'Database connection not found.' }, { status: 404 });
      }
      
      if (dbConnection.type !== 'SQLITE') {
        return NextResponse.json({ error: 'Currently, only SQLite databases are supported for dynamic SQL RAG.' }, { status: 400 });
      }

      await prisma.auditLog.create({ data: { action: 'SQL_RAG_QUERY', details: `Text-to-SQL executed against ${dbConnection.name}` } });
      
      const sqlResult = await executeSqlRagQuery(query.trim(), dbConnection.uri, dbConnection.name);
      return NextResponse.json(sqlResult);
    }

    // Default: Local Document Index (Vector RAG)
    const sources = await searchKnowledgeBase(query.trim());
    if (!sources.length) {
      return NextResponse.json({
        answer: 'No relevant information was found in the local knowledge base.',
        sources: [],
        grounded: false,
      });
    }

    const llm = await AIProviderManager.getProviderForTask('CHAT');
    const health = await llm.healthCheck();
    if (health.status !== 'CONNECTED') {
      return NextResponse.json({ error: `Local LLM is unavailable: ${health.error || 'unknown error'}` }, { status: 503 });
    }
    
    const context = sources.map((source) => `[${source.documentName} | Page ${source.pageNumber} | ${source.section}]\n${source.content}`).join('\n\n');
    const answer = await llm.chat([
      { role: 'system', content: `You are a local industrial maintenance RAG assistant. Answer only from the supplied context. If the context is insufficient, answer exactly: "The local knowledge base does not contain enough information to answer this question." Do not use outside knowledge. Cite every factual statement with [Document Name | Page N | Section].\n\nCONTEXT:\n${context}` },
      { role: 'user', content: query.trim() },
    ]);
    
    await prisma.auditLog.create({ data: { action: 'LOCAL_RAG_QUERY', details: `Local SQLite RAG query returned ${sources.length} chunks.` } });
    
    return NextResponse.json({ answer, sources, grounded: true });
  } catch (error) {
    console.error('RAG query error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Local RAG query failed.' }, { status: 500 });
  }
});
