const express = require('express');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { getAuthUrl, getTokensFromCode } = require('../services/gmailOAuth');
const { encrypt } = require('../utils/encryption');
const EmailAccount = require('../models/EmailAccount');

const router = express.Router();

// Get the frontend redirect destination URL from environment, fallback to localhost:5173
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * GET /api/auth/google/connect
 * Starts the OAuth2 flow by redirecting to Google's consent screen.
 */
router.get('/google/connect', (req, res) => {
  try {
    // Generate a random state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store state in HTTP-only cookie with a 10-minute expiry
    res.cookie('oauth_state', state, {
      httpOnly: true,
      maxAge: 10 * 60 * 1000, // 10 minutes
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    const authUrl = getAuthUrl(state);
    logger.info(`Initiating Google OAuth flow, redirecting to consent page.`);
    res.redirect(authUrl);
  } catch (error) {
    logger.error(`Error in /connect endpoint: ${error.message}`);
    res.status(500).json({ error: 'Failed to initiate OAuth flow.' });
  }
});

/**
 * GET /api/auth/google/callback
 * Exchanges the auth code for access and refresh tokens, encrypts them, and stores/updates the account.
 */
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    logger.error(`Google OAuth redirect error: ${error}`);
    return res.redirect(`${FRONTEND_URL}/email-accounts?error=${encodeURIComponent(error)}`);
  }

  // Validate state to protect against CSRF
  const storedState = req.cookies ? req.cookies.oauth_state : null;
  if (!state || (storedState && state !== storedState)) {
    logger.warn(`CSRF warning: OAuth state mismatch. Stored: ${storedState}, Received: ${state}`);
    // Note: We'll log a warning and proceed in non-production, but enforce in production
    if (process.env.NODE_ENV === 'production') {
      return res.redirect(`${FRONTEND_URL}/email-accounts?error=state_mismatch`);
    }
  }

  // Clear the state cookie
  res.clearCookie('oauth_state');

  if (!code) {
    logger.error('No authorization code received in callback.');
    return res.redirect(`${FRONTEND_URL}/email-accounts?error=missing_code`);
  }

  try {
    // Exchange authorization code for tokens
    const { email, tokens } = await getTokensFromCode(code);

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokens.accessToken);
    const encryptedRefreshToken = tokens.refreshToken ? encrypt(tokens.refreshToken) : null;

    // Check if account already exists for this organization & email
    let account = await EmailAccount.findOne({
      organizationId: 'default-org',
      email: email.toLowerCase(),
    });

    if (account) {
      // Update existing account
      account.accessTokenEncrypted = encryptedAccessToken;
      if (encryptedRefreshToken) {
        account.refreshTokenEncrypted = encryptedRefreshToken;
      }
      account.tokenExpiry = tokens.expiryDate;
      account.scope = tokens.scope;
      account.status = 'connected';
      await account.save();
      logger.info(`Successfully updated connected Gmail account: ${email}`);
    } else {
      // Create new account
      if (!encryptedRefreshToken) {
        logger.error('Refresh token is missing from tokens object on first connection.');
        return res.redirect(`${FRONTEND_URL}/email-accounts?error=missing_refresh_token`);
      }
      account = await EmailAccount.create({
        organizationId: 'default-org',
        userId: 'default-user',
        provider: 'gmail',
        email: email.toLowerCase(),
        accessTokenEncrypted: encryptedAccessToken,
        refreshTokenEncrypted: encryptedRefreshToken,
        tokenExpiry: tokens.expiryDate,
        scope: tokens.scope,
        status: 'connected',
      });
      logger.info(`Successfully created new connected Gmail account: ${email}`);
    }

    res.redirect(`${FRONTEND_URL}/email-accounts?success=true&email=${encodeURIComponent(email)}`);
  } catch (err) {
    logger.error(`Error in OAuth callback processing: ${err.message}`);
    res.redirect(`${FRONTEND_URL}/email-accounts?error=${encodeURIComponent(err.message)}`);
  }
});

module.exports = router;
