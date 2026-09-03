import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password) {
      return new NextResponse('Missing email or password', { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return new NextResponse('User already exists', { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // First user is ADMIN, others are ENGINEER
    const count = await prisma.user.count();
    const role = count === 0 ? 'ADMIN' : 'ENGINEER';

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as any,
      },
    });

    return NextResponse.json({ id: user.id, email: user.email, role: user.role });
  } catch (error) {
    console.error('Registration error', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
