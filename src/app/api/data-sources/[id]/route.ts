import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/rbac';
import fs from 'fs';

export const DELETE = requireRole('MANAGER', async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Database ID is required' }, { status: 400 });
    }

    const connection = await prisma.databaseConnection.findUnique({
      where: { id }
    });

    if (!connection) {
      return NextResponse.json({ error: 'Database not found' }, { status: 404 });
    }

    // If it is a local uploaded file, delete the file from the filesystem
    if (connection.type === 'SQLITE' && connection.uri.startsWith('file:')) {
      const filePath = connection.uri.replace('file:', '');
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fsError) {
        console.error('Failed to delete file from filesystem:', fsError);
      }
    }

    await prisma.databaseConnection.delete({
      where: { id }
    });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE_DATABASE',
        details: `Deleted database connection: ${connection.name}`
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete database connection:', error);
    return NextResponse.json({ error: 'Failed to delete database connection' }, { status: 500 });
  }
});
