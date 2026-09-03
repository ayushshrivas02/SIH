import * as fs from 'fs';
import * as path from 'path';
import vm from 'vm';
import { prisma } from '@/lib/db';
import { AIProviderManager } from '@/lib/ai/manager';

import csvParser from 'csv-parser';
import Tesseract from 'tesseract.js';

const SANDBOX_DIR = path.join(process.cwd(), 'agent-workspace');

// Ensure sandbox directory exists
if (!fs.existsSync(SANDBOX_DIR)) {
  fs.mkdirSync(SANDBOX_DIR, { recursive: true });
}

export type ToolResponse = {
  success: boolean;
  result: string;
};

export class AgentTools {
  static getAvailableTools() {
    return [
      {
        name: 'Calculate',
        description: 'Evaluates mathematical expressions safely. Input should be a mathematical string (e.g. "5 * 10 + 2").',
        parameters: { expression: 'string' }
      },
      {
        name: 'ReadFile',
        description: 'Reads the contents of a file from the agent sandbox directory. Provide only the filename.',
        parameters: { filename: 'string' }
      },
      {
        name: 'WriteFile',
        description: 'Writes content to a file in the agent sandbox directory. Provide the filename and the content.',
        parameters: { filename: 'string', content: 'string' }
      },
      {
        name: 'ExecuteCode',
        description: 'Executes Javascript code in a strict secure sandbox (no fs, no network). Must be synchronous and assign result to `global.output`. Example: `global.output = 5 * 5;`',
        parameters: { code: 'string' }
      },
      {
        name: 'GenerateDocument',
        description: 'Generates a final Markdown report and attaches it to the current task. Provide a title and the markdown content.',
        parameters: { title: 'string', content: 'string' }
      },
      {
        name: 'PDFReader',
        description: 'Extract text from a PDF file located in the sandbox.',
        parameters: { filename: 'string' }
      },
      {
        name: 'OCR',
        description: 'Extract text from an image file in the sandbox using Tesseract.js.',
        parameters: { imageBase64: 'string' } // Or filename if preferred
      },
      {
        name: 'CSVAnalysis',
        description: 'Parse a CSV file in the sandbox and return it as JSON string.',
        parameters: { filename: 'string' }
      },
      {
        name: 'RAGSearch',
        description: 'Search the local knowledge base (vector store) for relevant document chunks.',
        parameters: { query: 'string' }
      },
      {
        name: 'VisionAnalysis',
        description: 'Analyze an image using the Vision AI model.',
        parameters: { imageBase64: 'string', prompt: 'string' }
      }
    ];
  }

  static async executeTool(name: string, params: Record<string, any>, taskId: string): Promise<ToolResponse> {
    try {
      switch (name) {
        case 'Calculate':
          return this.calculate(params.expression);
        case 'ReadFile':
          return await this.readFile(params.filename);
        case 'WriteFile':
          return await this.writeFile(params.filename, params.content);
        case 'ExecuteCode':
          return this.executeCode(params.code);
        case 'GenerateDocument':
          return await this.generateDocument(params.title, params.content, taskId);
        case 'PDFReader':
          return await this.readPDF(params.filename);
        case 'OCR':
          return await this.runOCR(params.imageBase64);
        case 'CSVAnalysis':
          return await this.analyzeCSV(params.filename);
        case 'RAGSearch':
          return await this.ragSearch(params.query);
        case 'VisionAnalysis':
          return await this.visionAnalysis(params.imageBase64, params.prompt);
        default:
          return { success: false, result: `Tool ${name} is not recognized.` };
      }
    } catch (e: any) {
      return { success: false, result: `Tool execution failed: ${e.message}` };
    }
  }

  private static calculate(expression: string): ToolResponse {
    if (!expression) return { success: false, result: 'No expression provided.' };
    
    if (/[^0-9+\-*/().\s]/.test(expression)) {
       return { success: false, result: 'Invalid characters in expression. Only basic math is supported.' };
    }

    try {
      const result = new Function(`return (${expression})`)();
      return { success: true, result: String(result) };
    } catch (e: any) {
      return { success: false, result: `Math error: ${e.message}` };
    }
  }

  private static getSafePath(filename: string) {
    const safePath = path.normalize(filename).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(SANDBOX_DIR, safePath);
    if (!filePath.startsWith(SANDBOX_DIR)) throw new Error('Access denied outside sandbox.');
    return filePath;
  }

  private static async readFile(filename: string): Promise<ToolResponse> {
    if (!filename) return { success: false, result: 'Filename is required.' };
    try {
      const filePath = this.getSafePath(filename);
      if (!fs.existsSync(filePath)) return { success: false, result: 'File does not exist.' };
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return { success: true, result: content };
    } catch (e: any) {
      return { success: false, result: `Failed to read file: ${e.message}` };
    }
  }

  private static async writeFile(filename: string, content: string): Promise<ToolResponse> {
    if (!filename) return { success: false, result: 'Filename is required.' };
    try {
      const filePath = this.getSafePath(filename);
      await fs.promises.writeFile(filePath, content, 'utf-8');
      return { success: true, result: `File ${filename} written successfully.` };
    } catch (e: any) {
      return { success: false, result: `Failed to write file: ${e.message}` };
    }
  }

  private static executeCode(code: string): ToolResponse {
    if (!code) return { success: false, result: 'No code provided.' };
    try {
      // Extremely restricted sandbox environment
      const sandbox = { global: {} as any };
      const context = vm.createContext(sandbox);
      
      const script = new vm.Script(code);
      script.runInContext(context, { timeout: 2000 });
      
      return { 
        success: true, 
        result: sandbox.global.output !== undefined 
          ? String(sandbox.global.output) 
          : 'Code executed successfully, but `global.output` was not set.' 
      };
    } catch (e: any) {
      return { success: false, result: `Execution error: ${e.message}` };
    }
  }

  private static async generateDocument(title: string, content: string, taskId: string): Promise<ToolResponse> {
    if (!title || !content) return { success: false, result: 'Title and content are required.' };
    try {
      await prisma.report.create({
        data: {
          taskId,
          title,
          content,
          status: 'DRAFT' // Drafts can be approved by humans
        }
      });
      return { success: true, result: `Document '${title}' generated and saved as a Task Report for approval.` };
    } catch (e: any) {
      return { success: false, result: `Failed to generate document: ${e.message}` };
    }
  }

  private static async readPDF(filename: string): Promise<ToolResponse> {
    if (!filename) return { success: false, result: 'Filename is required.' };
    try {
      const filePath = this.getSafePath(filename);
      if (!fs.existsSync(filePath)) return { success: false, result: 'File does not exist.' };
      const { DocumentProcessor } = await import('@/lib/ai/document-processor');
      const text = await DocumentProcessor.extractText(filePath, 'pdf');
      return { success: true, result: text.slice(0, 15000) }; // Limit text
    } catch (e: any) {
      return { success: false, result: `PDF parsing error: ${e.message}` };
    }
  }

  private static async runOCR(imageBase64: string): Promise<ToolResponse> {
    if (!imageBase64) return { success: false, result: 'Image Base64 is required.' };
    try {
      const base64Data = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
      const result = await Tesseract.recognize(base64Data, 'eng');
      return { success: true, result: result.data.text };
    } catch (e: any) {
      return { success: false, result: `OCR error: ${e.message}` };
    }
  }

  private static async analyzeCSV(filename: string): Promise<ToolResponse> {
    if (!filename) return { success: false, result: 'Filename is required.' };
    try {
      const filePath = this.getSafePath(filename);
      if (!fs.existsSync(filePath)) return { success: false, result: 'File does not exist.' };
      
      const results: any[] = [];
      return new Promise((resolve) => {
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve({ success: true, result: JSON.stringify(results.slice(0, 100)) }))
          .on('error', (e) => resolve({ success: false, result: e.message }));
      });
    } catch (e: any) {
      return { success: false, result: `CSV error: ${e.message}` };
    }
  }

  private static async ragSearch(query: string): Promise<ToolResponse> {
    if (!query) return { success: false, result: 'Query is required.' };
    try {
      const provider = await AIProviderManager.getProviderForTask('EMBEDDING' as any);
      const embedding = await provider.generateEmbedding(query);
      const { LocalVectorStore } = await import('@/lib/ai/vector-store');
      const results = await LocalVectorStore.similaritySearch(embedding, 3);
      const combined = results.map((r: any) => r.content).join('\\n---\\n');
      return { success: true, result: combined || 'No relevant documents found.' };
    } catch (e: any) {
      return { success: false, result: `RAG search error: ${e.message}` };
    }
  }

  private static async visionAnalysis(imageBase64: string, prompt: string): Promise<ToolResponse> {
    if (!imageBase64 || !prompt) return { success: false, result: 'Image and prompt are required.' };
    try {
      const provider = await AIProviderManager.getProviderForTask('VISION');
      const result = await provider.analyzeImage(imageBase64, prompt);
      return { success: true, result };
    } catch (e: any) {
      return { success: false, result: `Vision analysis error: ${e.message}` };
    }
  }
}

