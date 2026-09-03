import { prisma } from '../db';
import { AIProviderManager } from './manager';

export type RagSource = {
  chunkId: string;
  documentName: string;
  pageNumber: number;
  section: string;
  content: string;
  score: number;
};

function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  for (let index = 0; index < a.length; index++) {
    dot += a[index] * b[index];
    aNorm += a[index] * a[index];
    bNorm += b[index] * b[index];
  }
  return aNorm && bNorm ? dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm)) : 0;
}

export async function searchKnowledgeBase(query: string, limit = 4, threshold = 0.25): Promise<RagSource[]> {
  const embeddingProvider = await AIProviderManager.getProviderForTask('EMBEDDING');
  const queryEmbedding = await embeddingProvider.generateEmbedding(query);
  
  // Fetch all chunks from the actual database
  const chunks = await prisma.documentChunk.findMany({
    include: {
      document: true
    }
  });

  const scoredChunks = chunks.map((chunk) => {
    let embeddingArray: number[] = [];
    try {
      if (chunk.embedding) {
        embeddingArray = JSON.parse(chunk.embedding);
      }
    } catch (e) {
      // Ignore parse errors for badly formatted embeddings
    }

    return {
      chunkId: chunk.id,
      documentName: chunk.document.filename,
      pageNumber: chunk.pageNumber || 1,
      section: 'Document Body', // we didn't parse section headers
      content: chunk.content,
      score: cosineSimilarity(queryEmbedding, embeddingArray),
    };
  });

  return scoredChunks
    .filter((source) => source.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
