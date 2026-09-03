import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AgentEngine } from '@/lib/agent/engine';

export async function POST(req: Request) {
  try {
    const { agentId, input } = await req.json();
    
    // 1. Authenticate user from session (assuming auth is in place, defaulting to hardcoded user for now or checking session)
    // Actually, prisma.task requires a userId, let's find the first user for local testing if no session
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({ data: { name: 'Admin', role: 'ADMIN' } });
    }

    // 2. Create the Task in DB
    const task = await prisma.task.create({
      data: {
        title: `Agent Task: ${agentId}`,
        status: 'PENDING',
        userId: user.id
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
}
