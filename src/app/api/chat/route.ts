import { NextResponse } from 'next/server';
import { AIProviderManager } from '@/lib/ai/manager';
import { prisma } from '@/lib/db';
import { Orchestrator } from '@/lib/ai/orchestrator';
import { LocalVectorStore } from '@/lib/ai/vector-store';

export async function POST(req: Request) {
  try {
    const { messages, model } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'A message is required.' }, { status: 400 });
    }

    let provider = await AIProviderManager.getProviderForTask('CHAT');
    let targetModel = model;
    let autoRouted = false;
    let orchestratorIntent = 'CHAT';

    // Helper to get a valid model from DB or fallback
    const getValidModel = async (settingKey: string, p: any) => {
      const setting = await prisma.systemSetting.findUnique({ where: { key: settingKey } });
      if (setting && setting.value && setting.value !== 'auto') return setting.value;
      if (p.getModels) {
        const available = await p.getModels();
        if (available && available.length > 0) {
          return available[0].name;
        }
      }
      return undefined;
    };

    if (model === 'auto') {
      // We must configure the main provider BEFORE passing to Orchestrator
      const mainModel = await getValidModel('default_chat_model', provider);
      if (mainModel && 'setModel' in provider) {
        (provider as any).setModel(mainModel);
      }

      const orchestrator = new Orchestrator(provider);
      const lastMessage = messages[messages.length - 1].content;
      const result = await orchestrator.determineTaskIntent(lastMessage);
      orchestratorIntent = result.intent;
      
      // Load the specialized provider based on the orchestrator's decision
      provider = await AIProviderManager.getProviderForTask(orchestratorIntent as any);
      
      // Reset targetModel so it falls back to the database default for that task
      targetModel = undefined; 
      autoRouted = true;
    }

    if (!targetModel) {
      // Find the appropriate default model setting key based on the task intent
      const settingKey = orchestratorIntent === 'VISION' ? 'default_vision_model' : 
                         orchestratorIntent === 'EMBEDDING' ? 'default_embedding_model' :
                         'default_chat_model';
                         
      targetModel = await getValidModel(settingKey, provider);
    }

    if (targetModel && 'setModel' in provider) {
      (provider as any).setModel(targetModel);
      // For Ollama/OpenAI, if we need to set the vision model specifically, we also call setVisionModel
      if (orchestratorIntent === 'VISION' && 'setVisionModel' in provider) {
        (provider as any).setVisionModel(targetModel);
      }
    } else if (!targetModel && provider.id === 'ollama') {
      // If we couldn't find a target model and provider is Ollama, it means no models are installed
      return NextResponse.json({ error: 'No models are installed in Ollama. Please download a model first.' }, { status: 400 });
    }
    
    // Attempt to read the correct model property based on intent
    const finalModel = orchestratorIntent === 'VISION' ? (provider as any).visionModel : (provider as any).model || 'unknown';

    const health = await provider.healthCheck();
    if (health.status !== 'CONNECTED') {
      return NextResponse.json({ error: `AI Provider (${provider.name}) is unavailable: ${health.error || 'Unknown error'}` }, { status: 503 });
    }

    // --- RAG Processing ---
    let ragContext = '';
    if (orchestratorIntent === 'RAG') {
      try {
        const lastMessage = messages[messages.length - 1].content;
        const embeddingProvider = await AIProviderManager.getProviderForTask('EMBEDDING');
        
        // Fetch settings or use defaults
        const settingK = await getValidModel('rag_top_k', { getModels: () => [] });
        const settingThresh = await getValidModel('rag_threshold', { getModels: () => [] });
        
        const k = parseInt(settingK || '4');
        const threshold = parseFloat(settingThresh || '0.7');

        const queryEmbedding = await embeddingProvider.generateEmbedding(lastMessage);
        const results = await LocalVectorStore.similaritySearch(queryEmbedding, k, threshold);

        if (results.length > 0) {
          ragContext = results.map(r => `--- Document: ${r.metadata.filename} (Page/Chunk: ${r.metadata.pageNumber}) ---\n${r.content}`).join('\n\n');
          
          const ragSystemPrompt = `You are a strict Retrieval-Augmented Generation assistant. 
You must answer the user's question using ONLY the provided document context below. 
You must cite the documents using [Document Name - Page X] format at the end of your sentences.
If the context does not contain sufficient information to answer the question, explicitly state: "The provided documents do not contain enough information to answer this question." DO NOT hallucinate or use outside knowledge.

<CONTEXT>
${ragContext}
</CONTEXT>`;
          
          messages.unshift({ role: 'system', content: ragSystemPrompt });
          
          await prisma.auditLog.create({
            data: {
              action: 'RAG_SEARCH',
              details: `Searched for: "${lastMessage.substring(0, 50)}...". Found ${results.length} results above threshold ${threshold}.`
            }
          });
        } else {
          messages.unshift({ role: 'system', content: `The user is asking about documents, but no relevant document chunks were found. Tell the user you couldn't find any relevant documents.`});
        }
      } catch (e) {
        console.error('RAG Error:', e);
      }
    }

    const start = Date.now();
    const providerTag = autoRouted ? `${provider.name} (Auto-Routed to ${orchestratorIntent})` : provider.name;

    // Create a stream from the provider's AsyncGenerator
    const stream = provider.streamChat(messages);
    
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          
          const latency = Date.now() - start;
          await prisma.auditLog.create({
            data: {
              action: autoRouted ? `AUTO_ROUTED_${orchestratorIntent}` : 'CHAT_GENERATION',
              details: `Provider: ${provider.name}, Model: ${finalModel}, Latency: ${latency}ms`,
            }
          });
          controller.close();
        } catch (e: unknown) {
          console.error('Streaming error:', e);
          controller.error(e);
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Provider': providerTag,
        'X-Model': finalModel
      }
    });
  } catch (error: unknown) {
    console.error('Chat error:', error);
    
    const msg = error instanceof Error ? error.message : 'Failed to communicate with AI provider.';
    await prisma.auditLog.create({
      data: {
        action: 'CHAT_ERROR',
        details: `Error: ${msg}`,
      }
    });

    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
