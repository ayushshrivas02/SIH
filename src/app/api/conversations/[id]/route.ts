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

    const { id } = context.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id: id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Failed to fetch conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const PUT = requireRole('USER', async (req: NextRequest, context, session) => {
  try {
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = context.params;
    const { message, title } = await req.json();

    const existing = await prisma.conversation.findUnique({
      where: { id: id }
    });

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let updatedTitle = existing.title;
    if (title && !existing.title) {
        updatedTitle = title;
    }

    // Add new message
    const updatedConversation = await prisma.conversation.update({
      where: { id: id },
      data: {
        title: updatedTitle,
        messages: {
          create: {
            role: message.role,
            content: message.content
          }
        }
      },
      include: {
        messages: true
      }
    });

    return NextResponse.json(updatedConversation);
  } catch (error) {
    console.error('Failed to update conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = requireRole('USER', async (req: NextRequest, context, session) => {
  try {
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = context.params;

    const existing = await prisma.conversation.findUnique({
      where: { id: id }
    });

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.conversation.delete({
      where: { id: id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
