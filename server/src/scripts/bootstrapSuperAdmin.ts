/**
 * Bootstrap Super Admin
 *
 * Promotes the user identified by SUPER_ADMIN_BOOTSTRAP_EMAIL to isSuperAdmin = true.
 * Idempotent — safe to run on every deploy.
 *
 * Usage:
 *   npm run bootstrap
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';

async function bootstrap() {
  const email = process.env.SUPER_ADMIN_BOOTSTRAP_EMAIL;

  if (!email) {
    console.error('SUPER_ADMIN_BOOTSTRAP_EMAIL is not set. Skipping bootstrap.');
    process.exit(0);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    console.warn(
      `[bootstrap] No user found with email "${email}". ` +
      `Create the account first by signing up, then re-run this script.`
    );
    process.exit(0);
  }

  if (user.isSuperAdmin) {
    console.log(`[bootstrap] ${email} is already a super admin. No changes made.`);
    process.exit(0);
  }

  await db
    .update(users)
    .set({ isSuperAdmin: true })
    .where(eq(users.id, user.id));

  console.log(`[bootstrap] ✅ ${email} promoted to super admin.`);
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('[bootstrap] Fatal error:', err);
  process.exit(1);
});
