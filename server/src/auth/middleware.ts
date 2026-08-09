import { Request, Response, NextFunction } from 'express';
import { auth } from './auth';
import { db } from '../db';
import { users, members } from '../db/schema';
import { eq } from 'drizzle-orm';

// Extend Express Request to carry auth context
declare global {
  namespace Express {
    interface Request {
      ctx: {
        userId: string;
        organizationId: string;
        role: 'owner' | 'admin' | 'member';
        isSuperAdmin: boolean;
        sessionId: string;
      };
    }
  }
}

/**
 * Resolves the better-auth session from the incoming request and attaches
 * { userId, organizationId, role, isSuperAdmin } to req.ctx.
 * Calls next() on success, returns 401 if no valid session.
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // better-auth expects a web-standard Request; adapt from Express
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    });

    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const webReq = new globalThis.Request(url, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    const session = await auth.api.getSession({ headers: webReq.headers });

    if (!session?.session || !session.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Fetch isSuperAdmin from our users table (better-auth admin plugin)
    const [dbUser] = await db
      .select({ isSuperAdmin: users.isSuperAdmin })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    let activeOrgId =
      (session.session as any).activeOrganizationId ??
      (req.headers['x-organization-id'] as string) ??
      '';
    let role: 'owner' | 'admin' | 'member' = 'member';

    // Fall back to (and read the role from) the user's own membership —
    // fresh sessions have no activeOrganizationId until the client calls setActive.
    const [membership] = await db
      .select({ organizationId: members.organizationId, role: members.role })
      .from(members)
      .where(eq(members.userId, session.user.id))
      .limit(1);
    if (!activeOrgId && membership) activeOrgId = membership.organizationId;
    if (membership && membership.organizationId === activeOrgId) {
      role = membership.role as typeof role;
    }

    req.ctx = {
      userId: session.user.id,
      organizationId: activeOrgId,
      role,
      isSuperAdmin: dbUser?.isSuperAdmin ?? false,
      sessionId: session.session.id,
    };

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Guard: requires a valid session (any role).
 */
export const requireAuth = authMiddleware;

/**
 * Guard: requires the user to be a member of the active org with one of the given roles,
 * OR to be a super admin (who bypasses all role checks).
 */
export const requireOrgRole = (roles: Array<'owner' | 'admin' | 'member'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.ctx) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (req.ctx.isSuperAdmin) {
      next();
      return;
    }
    if (!req.ctx.organizationId) {
      res.status(403).json({ error: 'No active organization. Set X-Organization-Id header.' });
      return;
    }
    if (!roles.includes(req.ctx.role)) {
      res.status(403).json({ error: `Requires one of roles: ${roles.join(', ')}` });
      return;
    }
    next();
  };
};

/**
 * Guard: requires isSuperAdmin === true.
 */
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.ctx?.isSuperAdmin) {
    res.status(403).json({ error: 'Super admin access required' });
    return;
  }
  next();
};
