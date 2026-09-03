import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/rbac';

export const GET = requireRole('ADMIN', async (req: NextRequest) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const result: Record<string, string> = {};
    settings.forEach((s: any) => {
      result[s.key] = s.value;
    });
    return NextResponse.json({ settings: result });
  } catch (error) {
    console.error('Failed to get settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
});

export const POST = requireRole('ADMIN', async (req: NextRequest) => {
  try {
    const { key, value } = await req.json();
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value required' }, { status: 400 });
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json({ success: true, setting });
  } catch (error) {
    console.error('Failed to save setting:', error);
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 });
  }
});
