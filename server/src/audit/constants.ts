export const AUDIT_ACTIONS = [
  'campaign.create',
  'campaign.delete',
  'campaign.scrape_trigger',
  'email_account.connect',
  'email_account.disconnect',
  'outreach.send',
  'chat.query',
  'lead.export',
  'member.invite',
  'member.role_change',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
