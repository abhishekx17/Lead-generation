import { Router, Request, Response, NextFunction } from 'express';
import { eq, desc, count, gte, lte, and, sql, SQL } from 'drizzle-orm';

// Helper to build a WHERE clause from optional conditions
function buildWhere(conditions: SQL<unknown>[]) {
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...(conditions as [SQL<unknown>, ...SQL<unknown>[]]));
}
import { db } from '../db';
import { organizations, members, users, auditLogs } from '../db/schema';
import { requireAuth, requireSuperAdmin } from '../auth/middleware';

const router = Router();

// All admin routes require auth AND super admin flag
router.use(requireAuth, requireSuperAdmin);

// ─── GET /organizations — List all organizations ──────────────────────────────
router.get(
  '/organizations',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);

      // Get orgs with member count and last audit activity
      const orgs = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          createdAt: organizations.createdAt,
          memberCount: count(members.id),
        })
        .from(organizations)
        .leftJoin(members, eq(organizations.id, members.organizationId))
        .groupBy(organizations.id)
        .orderBy(desc(organizations.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      // Get last activity per org
      const lastActivityRows = await db
        .select({
          organizationId: auditLogs.organizationId,
          lastActivity: sql<Date>`MAX(${auditLogs.createdAt})`,
        })
        .from(auditLogs)
        .groupBy(auditLogs.organizationId);

      const lastActivityMap = Object.fromEntries(
        lastActivityRows.map((r) => [r.organizationId, r.lastActivity])
      );

      const result = orgs.map((org) => ({
        ...org,
        lastActivity: lastActivityMap[org.id] ?? null,
      }));

      const [{ total }] = await db.select({ total: count() }).from(organizations);

      res.json({
        organizations: result,
        pagination: {
          page,
          limit,
          total: Number(total),
          pages: Math.ceil(Number(total) / limit) || 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /audit-logs — Full cross-org audit feed ──────────────────────────────
router.get(
  '/audit-logs',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 200);
      const action = req.query.action as string | undefined;
      const userId = req.query.userId as string | undefined;
      const orgId = req.query.organizationId as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;

      const conditions: SQL<unknown>[] = [];
      if (action) conditions.push(eq(auditLogs.action, action));
      if (userId) conditions.push(eq(auditLogs.userId, userId));
      if (orgId) conditions.push(eq(auditLogs.organizationId, orgId));
      if (from) conditions.push(gte(auditLogs.createdAt, new Date(from)));
      if (to) conditions.push(lte(auditLogs.createdAt, new Date(to)));

      const where = buildWhere(conditions);

      const [{ total }] = await db
        .select({ total: count() })
        .from(auditLogs)
        .where(where);

      const logs = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          metadata: auditLogs.metadata,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          createdAt: auditLogs.createdAt,
          userId: users.id,
          userEmail: users.email,
          userName: users.name,
          organizationId: organizations.id,
          organizationName: organizations.name,
        })
        .from(auditLogs)
        .innerJoin(users, eq(auditLogs.userId, users.id))
        .innerJoin(organizations, eq(auditLogs.organizationId, organizations.id))
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      res.json({
        logs,
        pagination: {
          page,
          limit,
          total: Number(total),
          pages: Math.ceil(Number(total) / limit) || 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
