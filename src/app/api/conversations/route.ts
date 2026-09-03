import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/rbac';
import { auth } from '@/lib/auth';

export const GET = requireRole('USER', async (req: NextRequest, context, session) => {
  try {
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId: userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const POST = requireRole('USER', async (req: NextRequest, context, session) => {
  try {
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, initialMessages } = await req.json();

    const conversation = await prisma.conversation.create({
      data: {
        userId: userId,
        title: title || 'New Conversation',
        messages: {
          create: initialMessages?.map((msg: any) => ({
            role: msg.role,
            content: msg.content
          })) || []
        }
      },
      include: {
        messages: true
      }
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
