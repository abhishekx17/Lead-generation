# Task 1: Gmail OAuth to SMTP Pipeline for Cold Outreach

**Owner:** Abhishek
**Module:** Email Outreach / Authentication

## 1. Objective

Let a user connect their Gmail account through OAuth2, store the resulting tokens securely, and use those tokens to send cold outreach emails through Gmail's SMTP relay (XOAUTH2), tied to specific campaigns and leads.

## 2. Flow Overview

```
User clicks "Connect Gmail"
  -> GET /api/auth/google/connect (generate state, redirect to Google consent)
  -> Google consent screen
  -> GET /api/auth/google/callback (exchange code for tokens)
  -> encrypt + store tokens in EmailAccount
  -> Campaign outreach job picks EmailAccount
  -> refresh access token if expired
  -> Nodemailer + XOAUTH2 sends via smtp.gmail.com:587
  -> EmailLog written per send
```

## 3. Data Models (MongoDB, existing stack)

```typescript
interface EmailAccount {
  _id: ObjectId;
  organizationId: string;
  userId: string;
  provider: 'gmail';
  email: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  tokenExpiry: Date;
  scope: string[];
  status: 'connected' | 'revoked' | 'error';
  dailySendCount: number;
  dailySendResetAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface EmailLog {
  _id: ObjectId;
  campaignId: ObjectId;
  emailAccountId: ObjectId;
  leadId: ObjectId;
  subject: string;
  status: 'queued' | 'sent' | 'failed' | 'bounced';
  errorMessage?: string;
  sentAt?: Date;
  createdAt: Date;
}
```

Unique index: `{ organizationId: 1, email: 1 }` on EmailAccount to prevent duplicate connections.

## 4. OAuth Token Pipeline

1. Frontend calls `GET /api/auth/google/connect`. Backend generates a random state token, stores it server side with a short TTL (Redis or session), and redirects to Google's consent screen requesting scope `https://mail.google.com/`.
2. Google redirects back to `GET /api/auth/google/callback?code=...&state=...`.
3. Backend validates state against the stored value, then exchanges `code` for tokens via `POST https://oauth2.googleapis.com/token` with `grant_type=authorization_code`.
4. Response contains `access_token`, `refresh_token`, `expires_in`, `scope`. Encrypt `refresh_token` and `access_token` with AES-256-GCM using a server-held key, write to a new or existing EmailAccount document, set `status: 'connected'`.
5. Before every send, check `tokenExpiry`. If expired, call the token endpoint again with `grant_type=refresh_token`, get a new `access_token`, update `tokenExpiry`.
6. On disconnect, call `POST https://oauth2.googleapis.com/revoke` with the stored token, then set `status: 'revoked'` and clear the encrypted fields.

## 5. SMTP Send Pipeline

Transporter factory:

```typescript
function buildTransporter(account: EmailAccount, decrypted: { accessToken: string; refreshToken: string }) {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: account.email,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: decrypted.refreshToken,
      accessToken: decrypted.accessToken,
    },
  });
}
```

Send flow runs as a Bull job on the `email-send` queue with payload `{ campaignId, leadId, emailAccountId }`. Worker steps:

1. Load EmailAccount, refresh token if needed.
2. Build transporter.
3. Render subject/body template with lead fields (business name, contact name if present).
4. Send message.
5. Write EmailLog with result.
6. Increment `dailySendCount`; if it reaches the configured cap, mark the account paused until `dailySendResetAt`.

## 6. API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/google/connect` | Start OAuth flow, redirect to Google |
| GET | `/api/auth/google/callback` | Exchange code, store encrypted tokens |
| GET | `/api/email-accounts` | List connected accounts for the org/user |
| DELETE | `/api/email-accounts/:id` | Revoke token at Google, mark disconnected |
| POST | `/api/campaigns/:id/outreach/send` | Queue outreach send using a selected account |
| GET | `/api/email-accounts/:id/logs` | Fetch EmailLog entries for an account |

## 7. Security Requirements

- CSRF protection on the OAuth flow via the `state` parameter.
- Encrypt `accessToken` and `refreshToken` at rest with AES-256-GCM; never log raw tokens.
- Request the minimum scope needed for SMTP send.
- HTTPS-only redirect URI, exact match with the URI registered in Google Cloud Console.
- Revoke tokens at Google on disconnect, not just locally.

## 8. Rate Limits and Quota Handling

- Regular Gmail account: 500 sends/day. Google Workspace account: 2000 sends/day.
- Set `GMAIL_DAILY_SEND_LIMIT` with a safety buffer below the real cap (for example 450 / 1900).
- Throttle sends to one every 3 to 5 seconds per account to avoid spam flags.
- Reset `dailySendCount` at midnight in the account's local timezone.

## 9. Environment Variables

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
TOKEN_ENCRYPTION_KEY=
GMAIL_DAILY_SEND_LIMIT=450
```

## 10. Implementation Checklist

- [ ] Google Cloud project with OAuth consent screen and credentials created
- [ ] `/connect` and `/callback` routes implemented
- [ ] Token encryption utility (AES-256-GCM)
- [ ] EmailAccount and EmailLog Mongoose models
- [ ] Token refresh utility invoked before every send
- [ ] Nodemailer OAuth2 transporter factory
- [ ] Bull worker for `email-send` queue
- [ ] Daily send counter and pause logic
- [ ] Disconnect flow with Google-side revoke
- [ ] Frontend "Connect Gmail" button and connected-account list

## 11. Guide: Step by Step

1. In Google Cloud Console, create a project, enable the Gmail API, configure the OAuth consent screen (External), and create an OAuth 2.0 Client ID of type Web application. Set the authorized redirect URI to your backend callback URL.
2. Add the environment variables listed above to `.env`.
3. Implement `/api/auth/google/connect` and `/api/auth/google/callback` using `googleapis` or `google-auth-library`.
4. Build the token encryption/decryption utility using Node's `crypto` module.
5. Add the EmailAccount and EmailLog models.
6. Implement the token refresh check, called at the top of the send worker.
7. Implement the Nodemailer transporter factory with OAuth2 auth.
8. Implement the `email-send` Bull queue and its worker.
9. Wire the frontend "Connect Gmail" button to hit `/api/auth/google/connect`.
10. Test end to end with a real Gmail test account: connect, trigger a campaign outreach send, confirm the EmailLog entry and inbox delivery.
11. Test disconnect: revoke, confirm the token no longer works and further sends are blocked.

## 12. Acceptance Criteria

- A user can connect and disconnect a Gmail account without server restarts or manual token handling.
- Access tokens refresh automatically without failed sends due to expiry.
- Every send produces exactly one EmailLog entry with an accurate status.
- Daily send limits are enforced per account.
- No raw token value appears in logs, error messages, or API responses.
