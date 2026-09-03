import { AIProvider } from './provider';

export type TaskIntent = 'CHAT' | 'CODE' | 'VISION' | 'DATA_ANALYSIS' | 'EMBEDDING' | 'RAG';

export interface OrchestratorResult {
  intent: TaskIntent;
  confidence: number;
  reasoning: string;
}

export class Orchestrator {
  private mainProvider: AIProvider;

  constructor(mainProvider: AIProvider) {
    this.mainProvider = mainProvider;
  }

  /**
   * Analyzes the user's prompt using the main LLM to determine the best task intent.
   * We use generateStructuredOutput if available, otherwise fallback to standard chat parsing.
   */
  async determineTaskIntent(prompt: string): Promise<OrchestratorResult> {
    const systemPrompt = `You are an intelligent orchestrator managing a suite of specialized AI models.
Your job is to analyze the user's prompt and determine the best category for routing.

Categories:
- CHAT: General conversation, greetings, standard questions, writing, summarization.
- CODE: Writing code, debugging, explaining code, architecture design.
- VISION: The prompt explicitly mentions an image, picture, photo, or visual analysis.
- DATA_ANALYSIS: The prompt asks to analyze data, datasets, spreadsheets, CSVs, or statistics.
- EMBEDDING: The prompt is specifically asking to index documents or create embeddings.
- RAG: The prompt explicitly asks about documents, knowledge base, uploaded files, or requests retrieval of specific local information.

Return your analysis in valid JSON format with three fields:
{
  "intent": "CHAT" | "CODE" | "VISION" | "DATA_ANALYSIS" | "EMBEDDING" | "RAG",
  "confidence": <number 0-1>,
  "reasoning": "<short explanation>"
}

User Prompt: "${prompt}"`;

    try {
      const result = await this.mainProvider.generateStructuredOutput<OrchestratorResult>({
        schema: null, // Depending on the provider, schema might be unused if we prompt well
        prompt: systemPrompt
      });

      // Simple validation
      if (['CHAT', 'CODE', 'VISION', 'DATA_ANALYSIS', 'EMBEDDING', 'RAG'].includes(result.intent)) {
        return result;
      }
      
      // Fallback if the LLM hallucinated the intent
      return { intent: 'CHAT', confidence: 0.5, reasoning: 'Fallback due to invalid intent output.' };
    } catch (e) {
      console.error('Orchestrator failed to parse JSON, falling back to CHAT:', e);
      return { intent: 'CHAT', confidence: 0, reasoning: 'JSON parse error.' };
    }
  }
}
