import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
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
}

export async function POST(req: Request) {
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
}
