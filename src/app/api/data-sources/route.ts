import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const connections = await prisma.databaseConnection.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    // Mask URIs for security before returning to client
    const safeConnections = connections.map(c => ({
      ...c,
      uri: c.uri.replace(/(:\/\/[^:]+:)[^@]+(@)/, '$1***$2'),
    }));
    
    return NextResponse.json(safeConnections);
  } catch (error: any) {
    console.error('Failed to fetch database connections:', error);
    return NextResponse.json({ error: 'Failed to fetch database connections' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, type, uri } = await req.json();
    
    if (!name || !type || !uri) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const connection = await prisma.databaseConnection.create({
      data: {
        name,
        type,
        uri,
        status: 'ACTIVE',
      }
    });
    
    return NextResponse.json(connection);
  } catch (error: any) {
    console.error('Failed to create database connection:', error);
    return NextResponse.json({ error: 'Failed to create database connection' }, { status: 500 });
  }
}
