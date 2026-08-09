import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';
import { adminClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000',
  plugins: [organizationClient(), adminClient()],
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  organization,
} = authClient;
