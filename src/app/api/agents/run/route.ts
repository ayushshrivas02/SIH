import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { AgentEngine } from '@/lib/agent/engine';
import { requireRole } from '@/lib/rbac';

export const POST = requireRole('USER', async (req: NextRequest, context, session) => {
  try {
    const { agentId, input } = await req.json();
    
    // 1. Authenticate user from session
    const userId = (session.user as any).id;

    // 2. Create the Task in DB
    // 2. Create the Task in DB
    const task = await prisma.task.create({
      data: {
        title: `Agent Task: ${agentId}`,
        status: 'PENDING',
        userId: userId
      }
    });

    // 3. Trigger Agent Engine asynchronously (Fire and Forget)
    // This allows the route to return immediately so the UI can start polling
    AgentEngine.runTask(task.id, input).catch(console.error);

    // 4. Return Task ID
    return NextResponse.json({ success: true, taskId: task.id });
  } catch (error: any) {
    console.error('Agent route error:', error);
    return NextResponse.json({ error: error.message || 'Failed to start agent' }, { status: 500 });
  }
});
