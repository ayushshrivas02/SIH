import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { AgentEngine } from '@/lib/agent/engine';
import { requireRole } from '@/lib/rbac';

export const GET = requireRole('USER', async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        steps: {
          orderBy: { createdAt: 'asc' }
        },
        reports: true
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error: any) {
    console.error('Fetch task error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
});

export const PATCH = requireRole('MANAGER', async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { status } = await req.json();
    
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const task = await prisma.task.update({
      where: { id: params.id },
      data: { status }
    });
    
    await prisma.auditLog.create({
       data: { action: 'TASK_STATUS_UPDATED', details: `Task ${params.id} status changed to ${status}` }
    });

    if (status === 'APPROVED_FOR_IMPACT') {
      // Resume the engine
      // We pass empty input because the engine will pick up the context from the DB
      AgentEngine.runTask(task.id, 'Resume').catch(console.error);
    }

    return NextResponse.json(task);
  } catch (error: any) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
});
