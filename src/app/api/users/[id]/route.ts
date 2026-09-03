import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/rbac';
import bcrypt from 'bcryptjs';

// PATCH /api/users/[id] - Update a user's role or details
export const PATCH = requireRole('ADMIN', async (req: NextRequest, { params }: { params: { id: string } }, session) => {
  try {
    const { name, email, role, password } = await req.json();
    
    // Check if updating self
    const isSelf = (session.user as any).id === params.id;
    if (isSelf && role && role !== (session.user as any).role) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 403 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: 'USER_UPDATED',
        details: `Updated user ${user.email}`
      }
    });

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
});

// DELETE /api/users/[id] - Delete a user
export const DELETE = requireRole('ADMIN', async (req: NextRequest, { params }: { params: { id: string } }, session) => {
  try {
    const isSelf = (session.user as any).id === params.id;
    if (isSelf) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 403 });
    }

    const user = await prisma.user.delete({
      where: { id: params.id },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: 'USER_DELETED',
        details: `Deleted user ${user.email}`
      }
    });

    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
});
