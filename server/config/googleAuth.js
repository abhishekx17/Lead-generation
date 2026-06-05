const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const getCredentialsPath = () => {
  const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH;

  if (!credentialsPath) {
    throw new Error('GOOGLE_CREDENTIALS_PATH is not set in environment variables');
  }

  const resolved = path.isAbsolute(credentialsPath)
    ? credentialsPath
    : path.resolve(__dirname, '..', credentialsPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Google credentials file not found at: ${resolved}`);
  }

  return resolved;
};

const getGoogleAuth = () => {
  const keyFile = getCredentialsPath();

  return new google.auth.GoogleAuth({
    keyFile,
    scopes: SCOPES,
  });
};

const getSheetsClient = async () => {
  const auth = getGoogleAuth();
  const authClient = await auth.getClient();

  return google.sheets({ version: 'v4', auth: authClient });
};

module.exports = { getGoogleAuth, getSheetsClient, getCredentialsPath };
