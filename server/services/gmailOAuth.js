const { google } = require('googleapis');
const logger = require('../utils/logger');

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI) are not configured in the environment.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate authorization URL for Google Consent screen.
 * @param {string} state - CSRF state token
 */
function getAuthUrl(state) {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Offline access requests a refresh token
    prompt: 'consent',     // Forces consent prompt to ensure refresh token is returned
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://mail.google.com/',
    ],
    state,
  });
}

/**
 * Exchange auth code for access and refresh tokens.
 * @param {string} code - Authorization code from callback
 * @returns {Promise<{email: string, tokens: object}>}
 */
async function getTokensFromCode(code) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  
  oauth2Client.setCredentials(tokens);
  
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  
  const email = userInfo.data.email;
  if (!email) {
    throw new Error('Unable to retrieve email from Google UserInfo endpoint.');
  }

  const expiryDate = tokens.expiry_date 
    ? new Date(tokens.expiry_date) 
    : new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

  return {
    email,
    tokens: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate,
      scope: tokens.scope ? tokens.scope.split(' ') : [],
    },
  };
}

/**
 * Refresh an expired access token using the refresh token.
 * @param {string} refreshToken - The stored refresh token
 * @returns {Promise<{accessToken: string, expiryDate: Date}>}
 */
async function refreshAccessToken(refreshToken) {
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    const expiryDate = credentials.expiry_date 
      ? new Date(credentials.expiry_date) 
      : new Date(Date.now() + (credentials.expires_in || 3600) * 1000);

    return {
      accessToken: credentials.access_token,
      expiryDate,
    };
  } catch (error) {
    logger.error(`Failed to refresh Google OAuth access token: ${error.message}`);
    throw error;
  }
}

/**
 * Revoke the credentials at Google.
 * @param {string} token - The refresh token or access token to revoke
 */
async function revokeToken(token) {
  try {
    const oauth2Client = getOAuth2Client();
    await oauth2Client.revokeToken(token);
    logger.info('Successfully revoked token at Google OAuth server');
  } catch (error) {
    logger.warn(`Failed to revoke token at Google (token may already be invalid/expired): ${error.message}`);
    // Do not throw, as we want to disconnect locally even if Google revoke fails
  }
}

module.exports = {
  getAuthUrl,
  getTokensFromCode,
  refreshAccessToken,
  revokeToken,
};
