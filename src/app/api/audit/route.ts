import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit for MVP
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
