import { nanoid } from 'nanoid';
import { db } from '../db';
import { auditLogs } from '../db/schema';
import { AuditAction } from './constants';

export interface AuditEntry {
  organizationId: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Writes a single audit log record to Postgres.
 * Always called server-side after a successful operation — never from the client.
 * Fire-and-forget with error swallowed so audit failures never break the main flow.
 */
export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: nanoid(),
      ...entry,
    });
  } catch (err) {
    // Audit write failures must never crash the main request
    console.error('[audit] Failed to write audit log:', err);
  }
}
