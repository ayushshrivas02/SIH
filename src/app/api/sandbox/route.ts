import { NextResponse, NextRequest } from 'next/server';
import vm from 'vm';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/db';

export const POST = requireRole('USER', async (req: NextRequest) => {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ success: false, error: 'No code provided.' }, { status: 400 });
    }

    // Extremely restricted sandbox environment
    const sandbox = { 
      global: {} as any,
      console: {
        log: (...args: any[]) => {
          if (!sandbox.global.logs) sandbox.global.logs = [];
          sandbox.global.logs.push(args.join(' '));
        },
        error: (...args: any[]) => {
          if (!sandbox.global.logs) sandbox.global.logs = [];
          sandbox.global.logs.push(`[ERROR] ${args.join(' ')}`);
        }
      }
    };
    
    const context = vm.createContext(sandbox);
    
    const start = Date.now();
    let result = null;
    let success = true;
    let logs = [];

    try {
      const script = new vm.Script(code);
      script.runInContext(context, { timeout: 3000 });
      
      result = sandbox.global.output !== undefined 
        ? String(sandbox.global.output) 
        : 'Code executed successfully, but `global.output` was not explicitly set.';
        
      logs = sandbox.global.logs || [];
    } catch (e: any) {
      success = false;
      result = e.message;
    }

    const latency = Date.now() - start;

    await prisma.auditLog.create({
      data: {
        action: 'CODE_SANDBOX_EXECUTION',
        details: `Latency: ${latency}ms, Success: ${success}`,
      }
    });

    return NextResponse.json({ success, result, logs, latency });
  } catch (error: any) {
    console.error('Sandbox error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Sandbox execution failed' }, { status: 500 });
  }
});
