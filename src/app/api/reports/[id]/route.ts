import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { requireRole } from '@/lib/rbac';
import { AgentEngine } from '@/lib/agent/engine';

export const PATCH = requireRole('MANAGER', async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { status } = await req.json();

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return new NextResponse('Invalid status', { status: 400 });
    }

    const report = await prisma.report.update({
      where: { id: params.id },
      data: { status },
    });

    // If report is approved, mark the task step as complete and resume the engine
    if (status === 'APPROVED' || status === 'REJECTED') {
      const task = await prisma.task.findUnique({ where: { id: report.taskId }, include: { steps: true } });
      if (task) {
        // Mark the waiting step as completed/failed
        const waitingStep = task.steps.find(s => s.action === 'Waiting for Human Approval' && s.status === 'PENDING');
        if (waitingStep) {
          await prisma.taskStep.update({
             where: { id: waitingStep.id },
             data: { status: status === 'APPROVED' ? 'COMPLETED' : 'FAILED', result: `Human ${status} the report.` }
          });
        }
        
        // Resume the engine
        AgentEngine.runTask(report.taskId, '').catch(console.error);
      }
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Report update error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
});
