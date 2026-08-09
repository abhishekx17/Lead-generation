import { Request, Response, NextFunction } from 'express';
import { auditLog } from './helper';
import { AuditAction } from './constants';

/**
 * Route-level audit middleware factory.
 *
 * Wraps res.json so that when the handler sends a successful response
 * (statusCode < 400) an audit log entry is written automatically.
 *
 * Usage:
 *   router.post('/', requireAuth, withAudit('campaign.create', 'campaign'), handler)
 */
export function withAudit(action: AuditAction, entityType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      // Write audit log asynchronously for successful responses
      if (res.statusCode < 400 && req.ctx) {
        auditLog({
          organizationId: req.ctx.organizationId,
          userId: req.ctx.userId,
          action,
          entityType,
          entityId:
            (body as any)?.id ??
            (body as any)?._id?.toString() ??
            req.params.id ??
            req.params.campaignId ??
            undefined,
          metadata: {
            path: req.originalUrl,
            method: req.method,
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }
      return originalJson(body);
    };

    next();
  };
}
