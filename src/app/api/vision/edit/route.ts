import { NextResponse, NextRequest } from 'next/server';
import { AIProviderManager } from '@/lib/ai/manager';
import { Storage } from '@/lib/storage';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import crypto from 'crypto';
import { requireRole } from '@/lib/rbac';

export const POST = requireRole('USER', async (req: NextRequest) => {
  try {
    const session = await auth();
    const userId = session?.user?.id || 'anonymous'; // Fallback if auth is not strictly required in some configs

    const { imageBase64, prompt } = await req.json();

    if (!imageBase64 || !prompt) {
      return new NextResponse('Missing image or prompt', { status: 400 });
    }

    const imageProvider = await AIProviderManager.getImageProvider();

    if (!imageProvider) {
      return NextResponse.json({ error: 'Image editing is not configured.' }, { status: 503 });
    }

    const health = await imageProvider.healthCheck();
    if (health.status !== 'CONNECTED') {
      return NextResponse.json({ error: 'Configured image provider is unavailable.' }, { status: 503 });
    }

    const editedBase64 = await imageProvider.editImage(imageBase64, prompt);
    
    // Save to local storage for persistence
    const filename = `edited_${crypto.randomBytes(8).toString('hex')}.png`;
    const savedUrl = await Storage.saveImage(editedBase64, filename);

    // Audit log
    if (userId !== 'anonymous') {
      await prisma.auditLog.create({
        data: {
          userId: userId,
          action: 'IMAGE_EDIT',
          details: `Provider: ${imageProvider.name}`,
        }
      });
    }

    return NextResponse.json({ result: `data:image/png;base64,${editedBase64}`, url: savedUrl });
  } catch (error: any) {
    console.error('Vision edit error:', error);
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
});
