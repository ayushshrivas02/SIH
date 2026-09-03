export interface TextChunk {
  content: string;
  metadata?: Record<string, unknown>;
}

export class RecursiveCharacterTextSplitter {
  private chunkSize: number;
  private chunkOverlap: number;
  private separators: string[];

  constructor(options?: { chunkSize?: number; chunkOverlap?: number; separators?: string[] }) {
    this.chunkSize = options?.chunkSize || 1000;
    this.chunkOverlap = options?.chunkOverlap || 200;
    this.separators = options?.separators || ["\n\n", "\n", " ", ""];
  }

  async splitText(text: string): Promise<string[]> {
    const finalChunks: string[] = [];
    let separator = this.separators[this.separators.length - 1];
    
    for (const s of this.separators) {
      if (s === "") {
        separator = s;
        break;
      }
      if (text.includes(s)) {
        separator = s;
        break;
      }
    }

    const splits = separator ? text.split(separator) : [text];
    
    const currentChunk: string[] = [];
    let currentLength = 0;

    for (const split of splits) {
      const splitLen = split.length;
      
      if (currentLength + splitLen > this.chunkSize && currentChunk.length > 0) {
        finalChunks.push(currentChunk.join(separator));
        
        // Handle overlap
        while (currentLength > this.chunkOverlap && currentChunk.length > 0) {
          const removed = currentChunk.shift() || "";
          currentLength -= removed.length + (separator ? separator.length : 0);
        }
      }
      
      currentChunk.push(split);
      currentLength += splitLen + (separator ? separator.length : 0);
    }
    
    if (currentChunk.length > 0) {
      finalChunks.push(currentChunk.join(separator));
    }

    return finalChunks;
  }

  async createDocuments(texts: string[], metadatas: Record<string, unknown>[] = []): Promise<TextChunk[]> {
    const documents: TextChunk[] = [];
    
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const metadata = metadatas[i] || {};
      const chunks = await this.splitText(text);
      
      chunks.forEach((chunk, chunkIdx) => {
        documents.push({
          content: chunk,
          metadata: { ...metadata, chunkIndex: chunkIdx }
        });
      });
    }
    
    return documents;
  }
}
