import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/rbac';
import bcrypt from 'bcryptjs';

// GET /api/users - List all users
export const GET = requireRole('ADMIN', async (req: NextRequest) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
});

// POST /api/users - Create a new user
export const POST = requireRole('ADMIN', async (req: NextRequest, context, session) => {
  try {
    const { name, email, password, role } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'USER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: 'USER_CREATED',
        details: `Created user ${email} with role ${role || 'USER'}`
      }
    });

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
});
