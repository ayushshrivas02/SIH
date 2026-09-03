import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export const POST = requireRole('ADMIN', async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;

    if (!file || !name) {
      return NextResponse.json({ error: 'Database name and file are required.' }, { status: 400 });
    }

    if (!file.name.endsWith('.sqlite') && !file.name.endsWith('.db')) {
      return NextResponse.json({ error: 'Only .sqlite or .db files are supported for upload.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dbDir = path.join(process.cwd(), 'data', 'databases');
    
    if (!existsSync(dbDir)) {
      await mkdir(dbDir, { recursive: true });
    }

    const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(dbDir, safeFilename);

    await writeFile(filePath, buffer);

    const connection = await prisma.databaseConnection.create({
      data: {
        name: name,
        type: 'SQLITE',
        uri: `file:${filePath}`,
        status: 'ACTIVE',
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPLOAD_DATABASE',
        details: `Uploaded SQLite database: ${name}`,
      }
    });

    return NextResponse.json(connection);
  } catch (error: any) {
    console.error('Error uploading database:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload database.' }, { status: 500 });
  }
});
