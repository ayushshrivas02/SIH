import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const doc = await prisma.document.findUnique({
      where: { id: params.id },
    });

    if (!doc) {
      return new NextResponse('Not found', { status: 404 });
    }

    // Use extracted content from DB if available
    let content = doc.content;
    if (!content) {
      try {
        const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
        const filePath = path.join(uploadDir, doc.filename);
        if (doc.filename.endsWith('.txt') || doc.filename.endsWith('.csv')) {
           content = await fs.readFile(filePath, 'utf-8');
        } else {
           content = 'Document content has not been extracted yet or is a binary file.';
        }
      } catch (e) {
        content = 'Document content could not be loaded.';
      }
    }

    return NextResponse.json({ ...doc, content });
  } catch (error) {
    console.error('Document fetch error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) return new NextResponse('Unauthorized', { status: 401 });

    const doc = await prisma.document.findUnique({
      where: { id: params.id },
    });

    if (!doc) {
      return new NextResponse('Not found', { status: 404 });
    }

    // Try to delete from disk
    try {
      const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
      const filePath = path.join(uploadDir, doc.filename);
      await fs.unlink(filePath);
    } catch (e) {
      console.warn('Could not delete file from disk, it might not exist:', e);
    }

    await prisma.document.delete({
      where: { id: params.id },
    });

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Document delete error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
