import { AIProviderManager } from '@/lib/ai/manager';

export type AgentPlanStep = {
  id: string;
  goal: string;
  description: string;
  requiredTool?: string;
  inputArguments?: Record<string, any>;
  expectedOutput: string;
  dependencies: string[];
};

export type AgentPlan = {
  taskClassification: string; // CHAT, CODE, DOCUMENT, RAG, DATA, VISION, REPORT, AGENT
  taskDescription: string;
  steps: AgentPlanStep[];
};

export class AgentPlanner {
  static async createPlan(prompt: string): Promise<AgentPlan> {
    const ai = await AIProviderManager.getProviderForTask('AGENT' as any);
    
    const systemPrompt = `You are the master planner for an autonomous Agentic AI system.
Your goal is to break down the EXACT user's request into a series of logical, executable steps.
CRITICAL: Do NOT invent your own task. You MUST solve the exact problem the user provides.

Classify the overall task into ONE of these categories: CHAT, CODE, DOCUMENT, RAG, DATA, VISION, REPORT, AGENT.

Available Tools:
- Calculate: Evaluate math expressions safely (args: { expression: string })
- ReadFile: Read a file from sandbox (args: { filename: string })
- WriteFile: Write a file to sandbox (args: { filename: string, content: string })
- ExecuteCode: Run JS code in a secure sandbox. Must be synchronous. Assign result to \`global.output\`. (args: { code: string })
- GenerateDocument: Generate a final Markdown report (args: { title: string, content: string })
- VisionAnalysis: Analyze an image (args: { imageBase64: string, prompt: string })
- OCR: Extract text from image (args: { imageBase64: string })
- PDFReader: Extract text from PDF (args: { filename: string })
- CSVAnalysis: Parse CSV and return JSON (args: { filename: string })
- RAGSearch: Semantic search over local documents (args: { query: string })

CRITICAL: The "requiredTool" field MUST be exactly one of the tool names listed above, or null if no tool is needed. DO NOT invent tools like "Python" or "Bash". If you need to run code, use "ExecuteCode".

Respond ONLY with a valid JSON object matching this schema:
{
  "taskClassification": "AGENT",
  "taskDescription": "A summary of the overall task",
  "steps": [
    {
      "id": "step-1",
      "goal": "What must be achieved",
      "description": "How to achieve it",
      "requiredTool": "The name of the tool to use, or null if none",
      "inputArguments": { "key": "value" },
      "expectedOutput": "What output is expected",
      "dependencies": ["List of step IDs this step depends on"]
    }
  ]
}

No other text. Just JSON.`;

    try {
      const response = await ai.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]);
      
      const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned) as AgentPlan;
    } catch (error: any) {
      console.error('Failed to parse plan:', error);
      return {
        taskClassification: 'AGENT',
        taskDescription: prompt,
        steps: [
          {
            id: 'step-1',
            goal: 'Execute user request',
            description: prompt,
            expectedOutput: 'Completed request',
            dependencies: []
          }
        ]
      };
    }
  }
}
