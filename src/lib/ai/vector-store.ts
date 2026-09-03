import { prisma } from '@/lib/db';

export interface SearchResult {
  id: string;
  documentId: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export class LocalVectorStore {
  
  // Calculate cosine similarity between two vectors
  private static cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  static async similaritySearch(
    queryEmbedding: number[], 
    k: number = 4, 
    threshold: number = 0.7
  ): Promise<SearchResult[]> {
    // Note: Since we are running on SQLite locally without pgvector, 
    // we fetch chunks and perform highly optimized in-memory exact search.
    // This is blazingly fast for personal knowledge bases (<100,000 chunks).
    
    const allChunks = await prisma.documentChunk.findMany({
      include: {
        document: {
          select: {
            filename: true
          }
        }
      }
    });
    
    const results: SearchResult[] = [];
    
    for (const chunk of allChunks) {
      if (!chunk.embedding) continue;
      
      let vec: number[];
      try {
        vec = JSON.parse(chunk.embedding);
      } catch (_) {
        continue;
      }
      
      if (!Array.isArray(vec) || vec.length !== queryEmbedding.length) continue;
      
      const score = this.cosineSimilarity(queryEmbedding, vec);
      
      if (score >= threshold) {
        results.push({
          id: chunk.id,
          documentId: chunk.documentId,
          content: chunk.content,
          score,
          metadata: {
            filename: chunk.document.filename,
            pageNumber: chunk.pageNumber
          }
        });
      }
    }
    
    // Sort descending by score and take top K
    return results.sort((a, b) => b.score - a.score).slice(0, k);
  }
}
