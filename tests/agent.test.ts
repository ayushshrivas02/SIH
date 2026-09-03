import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentTools } from '../src/lib/agent/tools';
import { AgentEngine } from '../src/lib/agent/engine';
import { prisma } from '../src/lib/db';
import { AIProviderManager } from '../src/lib/ai/manager';

// Mock DB
vi.mock('../src/lib/db', () => ({
  prisma: {
    task: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    taskStep: {
      create: vi.fn().mockResolvedValue({ id: 'step-id' }),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    report: {
      create: vi.fn(),
    }
  }
}));

// Mock AI Provider
const mockAiChat = vi.fn();
vi.mock('../src/lib/ai/manager', () => ({
  AIProviderManager: {
    getProviderForTask: vi.fn().mockResolvedValue({
      model: 'mock-model',
      chat: (...args: any[]) => mockAiChat(...args)
    })
  }
}));

describe('AgentTools Sandbox Restrictions', () => {
  it('ExecuteCode should evaluate math correctly', () => {
    const res = (AgentTools as any).executeCode('global.output = 10 * 10;');
    expect(res.success).toBe(true);
    expect(res.result).toBe('100');
  });

  it('ExecuteCode should block access to fs module', () => {
    const res = (AgentTools as any).executeCode('const fs = require("fs"); global.output = fs.readFileSync("test");');
    expect(res.success).toBe(false);
    expect(res.result).toContain('require is not defined');
  });

  it('ExecuteCode should prevent infinite loops (timeout)', () => {
    const res = (AgentTools as any).executeCode('while(true) {}');
    expect(res.success).toBe(false);
    expect(res.result).toContain('Execution error');
  });
});

describe('Agent Engine multi-step workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should cancel execution if task status is CANCELED', async () => {
    (prisma.task.findUnique as any).mockResolvedValue({ status: 'CANCELED', steps: [] });
    await AgentEngine.runTask('task-1', 'Do something');
    expect(prisma.taskStep.create).not.toHaveBeenCalled();
  });

  it('should pause and wait for approval on high impact tool', async () => {
    (prisma.task.findUnique as any).mockResolvedValue({ status: 'PENDING', steps: [] });
    
    // Mock planner
    mockAiChat.mockResolvedValueOnce(JSON.stringify({
      taskClassification: 'AGENT',
      taskDescription: 'Generate a report',
      steps: [{
        id: '1', goal: 'Write report', description: 'Write', requiredTool: 'GenerateDocument', expectedOutput: 'Report', dependencies: []
      }]
    }));

    await AgentEngine.runTask('task-2', 'Generate a report');
    
    // It should update task to WAITING_APPROVAL
    expect(prisma.task.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: 'WAITING_APPROVAL' }
    }));
  });
});

describe('End-to-End Scenarios (Mocked)', () => {
  it('E2E: Code generation and execution', async () => {
    // This simulates the user asking for code -> agent plans -> executes -> verifies
    (prisma.task.findUnique as any).mockResolvedValue({ status: 'IN_PROGRESS', steps: [] });
    
    // 1. Planner response
    mockAiChat.mockResolvedValueOnce(JSON.stringify({
      taskClassification: 'CODE',
      taskDescription: 'Calculate fibonacci',
      steps: [{
        id: '1', goal: 'Calculate', description: 'Run JS', requiredTool: 'ExecuteCode', expectedOutput: 'Result', dependencies: []
      }]
    }));

    // 2. Tool parameter selection
    mockAiChat.mockResolvedValueOnce(JSON.stringify({
      tool: 'ExecuteCode',
      parameters: { code: 'global.output = 5;' },
      reasoning: 'Need to run code'
    }));

    // 3. Observation decision
    mockAiChat.mockResolvedValueOnce(JSON.stringify({
      status: 'CONTINUE',
      reason: 'Output is 5, looks good'
    }));

    // 4. Verification
    mockAiChat.mockResolvedValueOnce(JSON.stringify({
      verified: true,
      summary: 'Task completed successfully'
    }));

    await AgentEngine.runTask('task-3', 'Calculate something');

    // Should reach the end and update to COMPLETED
    expect(prisma.task.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'COMPLETED' })
    }));
  });
});
