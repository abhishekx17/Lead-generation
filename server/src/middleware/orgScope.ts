import { Request } from 'express';

/**
 * Returns a MongoDB filter object with organizationId injected.
 *
 * - Regular users always get their org scoped.
 * - Super admins bypass the filter unless ?organizationId= is explicitly provided.
 *
 * Usage inside a route handler:
 *   const filter = withOrgFilter({ campaignId }, req);
 *   const leads = await Lead.find(filter);
 */
export function withOrgFilter(
  baseFilter: Record<string, unknown>,
  req: Request
): Record<string, unknown> {
  const ctx = req.ctx;

  // Super admin: allow cross-org view unless they explicitly scope to one org
  if (ctx.isSuperAdmin) {
    const explicitOrg = req.query.organizationId as string | undefined;
    if (explicitOrg) {
      return { ...baseFilter, organizationId: explicitOrg };
    }
    return baseFilter; // No org filter — full cross-org view
  }

  // Regular users: always scope to their active organization
  return { ...baseFilter, organizationId: ctx.organizationId };
}

/**
 * Asserts the organizationId is set (non-super-admin calls).
 * Use before any write operation to prevent org-less records.
 */
export function assertOrgContext(req: Request): string {
  if (!req.ctx.isSuperAdmin && !req.ctx.organizationId) {
    throw Object.assign(new Error('No active organization'), { status: 403 });
  }
  return req.ctx.organizationId;
}
