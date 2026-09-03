import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        task: true
      }
    });
    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
