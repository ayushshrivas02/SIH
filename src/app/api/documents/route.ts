import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_STORAGE || './uploads';

export async function GET() {
  try {
    const documents = await prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { chunks: true }
        }
      }
    });
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new NextResponse('No file provided', { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Ensure upload directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    
    const filePath = path.join(UPLOAD_DIR, file.name);

    // Check for duplicates
    const existingDoc = await prisma.document.findFirst({
      where: { filename: file.name }
    });

    if (existingDoc) {
      return new NextResponse('A document with this filename already exists', { status: 409 });
    }
    
    await fs.writeFile(filePath, buffer);

    const document = await prisma.document.create({
      data: {
        filename: file.name,
        fileType: file.type || 'application/octet-stream',
        size: file.size,
        status: 'UPLOADED',
      },
    });

    // Trigger async extraction and indexing job here
    fetch(`http://127.0.0.1:${process.env.PORT || 3000}/api/documents/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: document.id, filePath })
    }).catch(e => console.error('Failed to trigger background processing', e));

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Upload error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
