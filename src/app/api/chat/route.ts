import { NextResponse, NextRequest } from 'next/server';
import { AIProviderManager } from '@/lib/ai/manager';
import { prisma } from '@/lib/db';
import { Orchestrator } from '@/lib/ai/orchestrator';
import { searchDemoRag } from '@/lib/ai/demo-rag';
import { requireRole } from '@/lib/rbac';

export const POST = requireRole('USER', async (req: NextRequest) => {
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

    // Validate the target model (whether from client or DB) against actual installed models
    if (provider.getModels) {
      const availableModels = await provider.getModels();
      const modelNames = availableModels.map(m => m.name);
      if (modelNames.length === 0) {
        if (provider.id === 'ollama') {
          return NextResponse.json({ error: 'No models are installed in Ollama. Please download a model first.' }, { status: 400 });
        }
      } else {
        if (targetModel && !modelNames.includes(targetModel)) {
          console.warn(`Requested model ${targetModel} not found. Falling back to ${modelNames[0]}`);
          targetModel = modelNames[0];
        } else if (!targetModel) {
          targetModel = modelNames[0];
        }
      }
    }

    if (targetModel && 'setModel' in provider) {
      (provider as any).setModel(targetModel);
      // For Ollama/OpenAI, if we need to set the vision model specifically, we also call setVisionModel
      if (orchestratorIntent === 'VISION' && 'setVisionModel' in provider) {
        (provider as any).setVisionModel(targetModel);
      }
    }
    
    // Attempt to read the correct model property based on intent
    const finalModel = orchestratorIntent === 'VISION' ? (provider as any).visionModel : (provider as any).model || 'unknown';

    const health = await provider.healthCheck();
    if (health.status !== 'CONNECTED') {
      return NextResponse.json({ error: `AI Provider (${provider.name}) is unavailable: ${health.error || 'Unknown error'}` }, { status: 503 });
    }

    // --- RAG Processing ---
    let ragContext = '';
    let ragSourcesHeader: string | undefined;
    if (orchestratorIntent === 'RAG') {
      try {
        const lastMessage = messages[messages.length - 1].content;
        // Fetch settings or use defaults
        const settingK = await getValidModel('rag_top_k', { getModels: () => [] });
        const settingThresh = await getValidModel('rag_threshold', { getModels: () => [] });
        
        const k = parseInt(settingK || '4');
        const threshold = parseFloat(settingThresh || '0.35');

        // Phase 7 uses the local demo_rag.db as the source of truth. Its vector
        // entries are keyed by knowledge_chunks.id and are searched in memory.
        const results = await searchDemoRag(lastMessage, k, threshold);

        if (results.length > 0) {
          ragContext = results.map(r => `--- Document: ${r.documentName} (Page ${r.pageNumber}, Section: ${r.section}) ---\n${r.content}`).join('\n\n');
          ragSourcesHeader = JSON.stringify(results.map((r) => ({ documentName: r.documentName, pageNumber: r.pageNumber, section: r.section, score: r.score })));
          
          const ragSystemPrompt = `You are a strict Retrieval-Augmented Generation assistant. 
You must answer the user's question using ONLY the provided document context below. 
You must cite the documents using [Document Name | Page X | Section] format at the end of your sentences.
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
        'X-Model': finalModel,
        ...(ragSourcesHeader ? { 'X-RAG-Sources': encodeURIComponent(ragSourcesHeader) } : {})
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
});
