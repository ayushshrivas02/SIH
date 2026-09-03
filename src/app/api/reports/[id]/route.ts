import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { requireRole } from '@/lib/rbac';

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

    return NextResponse.json(report);
  } catch (error) {
    console.error('Report update error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
});
