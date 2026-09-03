import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';

export type Role = 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';

export const ROLE_HIERARCHY: Record<Role, number> = {
  ADMIN: 4,
  MANAGER: 3,
  USER: 2,
  VIEWER: 1,
};

/**
 * Checks if a user role has the required permission level.
 * @param userRole The role of the current user
 * @param requiredRole The minimum required role
 */
export function hasPermission(userRole: string | undefined | null, requiredRole: Role): boolean {
  if (!userRole) return false;
  
  const normalizedUserRole = userRole.toUpperCase() as Role;
  
  const userLevel = ROLE_HIERARCHY[normalizedUserRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
}

/**
 * Higher-order function to protect API routes with RBAC.
 * @param requiredRole Minimum role required to access the endpoint
 * @param handler The actual route handler
 */
export function requireRole(
  requiredRole: Role, 
  handler: (req: NextRequest, context: any, session: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: any) => {
    try {
      const session = await auth();
      
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
      }
      
      const userRole = (session.user as any).role;
      
      if (!hasPermission(userRole, requiredRole)) {
        return NextResponse.json({ 
          error: `Forbidden. Requires ${requiredRole} privileges.` 
        }, { status: 403 });
      }
      
      return await handler(req, context, session);
    } catch (error: any) {
      console.error('[RBAC Error]', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  };
}

/**
 * Deny by default API wrapper. Only allows explicitly defined methods.
 */
export function createProtectedApiHandler(handlers: {
  GET?: (req: NextRequest, context: any) => Promise<NextResponse>,
  POST?: (req: NextRequest, context: any) => Promise<NextResponse>,
  PUT?: (req: NextRequest, context: any) => Promise<NextResponse>,
  DELETE?: (req: NextRequest, context: any) => Promise<NextResponse>,
}) {
  return {
    GET: handlers.GET || (async () => NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })),
    POST: handlers.POST || (async () => NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })),
    PUT: handlers.PUT || (async () => NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })),
    DELETE: handlers.DELETE || (async () => NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })),
  };
}
