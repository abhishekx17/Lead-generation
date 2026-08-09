import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { nanoid } from 'nanoid';
import { eq, and, desc, count, gte, lte, sql, SQL } from 'drizzle-orm';
import { db } from '../db';
import {
  organizations,
  members,
  invitations,
  users,
  auditLogs,
} from '../db/schema';
import { requireAuth, requireOrgRole } from '../auth/middleware';
import { withAudit } from '../audit/middleware';
// @ts-ignore
import validate from '../../middleware/validate';

const router = Router();

// Helper to build a WHERE clause from optional conditions
function buildWhere(conditions: SQL<unknown>[]) {
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...(conditions as [SQL<unknown>, ...SQL<unknown>[]]));
}

// ─── POST / — Create organization ────────────────────────────────────────────
router.post(
  '/',
  requireAuth,
  [
    body('name').trim().notEmpty().withMessage('Organization name is required'),
    body('slug')
      .trim()
      .notEmpty()
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Slug must be lowercase letters, numbers and hyphens'),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, slug } = req.body;

      const existing = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, slug))
        .limit(1);

      if (existing.length > 0) {
        return res.status(409).json({ error: 'An organization with this slug already exists' });
      }

      const orgId = nanoid();
      const [org] = await db
        .insert(organizations)
        .values({ id: orgId, name, slug })
        .returning();

      // Creator becomes owner
      await db.insert(members).values({
        id: nanoid(),
        organizationId: orgId,
        userId: req.ctx.userId,
        role: 'owner',
      });

      res.status(201).json(org);
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /:id/members — List members ─────────────────────────────────────────
router.get(
  '/:id/members',
  requireAuth,
  requireOrgRole(['owner', 'admin', 'member']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.params.id;
      const rows = await db
        .select({
          memberId: members.id,
          role: members.role,
          joinedAt: members.createdAt,
          userId: users.id,
          email: users.email,
          name: users.name,
        })
        .from(members)
        .innerJoin(users, eq(members.userId, users.id))
        .where(sql`${members.organizationId} = ${orgId}`);

      res.json(rows);
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /:id/invite — Invite member ────────────────────────────────────────
router.post(
  '/:id/invite',
  requireAuth,
  requireOrgRole(['owner', 'admin']),
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('role')
      .isIn(['admin', 'member'])
      .withMessage('Role must be admin or member'),
  ],
  validate,
  withAudit('member.invite', 'member'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.params.id;
      const { email, role } = req.body;

      const [org] = await db
        .select()
        .from(organizations)
        .where(sql`${organizations.id} = ${orgId}`)
        .limit(1);

      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const inviteId = nanoid();

      await db.insert(invitations).values({
        id: inviteId,
        organizationId: orgId,
        email,
        role: role as typeof invitations.$inferInsert['role'],
        status: 'pending' as const,
        expiresAt,
        inviterId: req.ctx.userId,
      } as typeof invitations.$inferInsert);

      const inviteLink = `${process.env.BETTER_AUTH_URL}/accept-invite/${inviteId}`;
      console.log(`[Invite] ${email} → ${org.name} (${role}) — ${inviteLink}`);

      res.status(201).json({
        id: inviteId,
        email,
        role,
        organizationId: orgId,
        inviteLink,
        expiresAt,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── POST /:id/members/:memberId/role — Change role ──────────────────────────
router.post(
  '/:id/members/:memberId/role',
  requireAuth,
  requireOrgRole(['owner', 'admin']),
  [
    body('role')
      .isIn(['owner', 'admin', 'member'])
      .withMessage('Role must be owner, admin or member'),
  ],
  validate,
  withAudit('member.role_change', 'member'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { memberId } = req.params;
      const { role } = req.body;

      const [updated] = await db
        .update(members)
        .set({ role: role as 'owner' | 'admin' | 'member' })
        .where(
          sql`${members.id} = ${memberId} AND ${members.organizationId} = ${req.params.id}`
        )
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Member not found in this organization' });
      }

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// ─── GET /:id/audit-logs — Org-scoped audit feed ─────────────────────────────
router.get(
  '/:id/audit-logs',
  requireAuth,
  requireOrgRole(['owner', 'admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.params.id;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 200);
      const action = req.query.action as string | undefined;
      const userId = req.query.userId as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;

      const conditions: SQL<unknown>[] = [sql`${auditLogs.organizationId} = ${orgId}`];
      if (action) conditions.push(sql`${auditLogs.action} = ${action}`);
      if (userId) conditions.push(sql`${auditLogs.userId} = ${userId}`);
      if (from) conditions.push(sql`${auditLogs.createdAt} >= ${new Date(from)}`);
      if (to) conditions.push(sql`${auditLogs.createdAt} <= ${new Date(to)}`);

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
          createdAt: auditLogs.createdAt,
          userId: users.id,
          userEmail: users.email,
          userName: users.name,
        })
        .from(auditLogs)
        .innerJoin(users, eq(auditLogs.userId, users.id))
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
