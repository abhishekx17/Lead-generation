import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { admin } from 'better-auth/plugins';
import { db } from '../db';
import * as schema from '../db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      organization: schema.organizations,
      member: schema.members,
      invitation: schema.invitations,
    },
  }),

  // Email + password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set true in production with email provider
  },

  // Organization multi-tenancy plugin
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 5,
      creatorRole: 'owner',
      invitationExpiresIn: 60 * 60 * 24 * 7, // 7 days
      // Email sending stub — wire real provider via sendInvitationEmail
      sendInvitationEmail: async (data) => {
        // TODO: plug in SMTP (nodemailer, Resend, etc.)
        const link = (data as any).inviteLink ?? `${process.env.BETTER_AUTH_URL}/accept-invite/${data.invitation.id}`;
        console.log(`[Invite] ${data.invitation.email} invited to org ${data.organization.name} — link: ${link}`);
      },
    }),

    // Admin plugin — enables isSuperAdmin flag checks
    admin({
      adminRoles: ['admin'],
      defaultBanDuration: 0, // Never ban by default
    }),
  ],

  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret-change-in-production',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:5000',
  basePath: '/api/auth',
  trustedOrigins: [
    process.env.CLIENT_URL ?? 'http://localhost:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ],

  // Trust the X-Forwarded-* headers from a reverse proxy
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    crossSubDomainCookies: {
      enabled: false,
    },
  },
});

export type Auth = typeof auth;
