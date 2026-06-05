const { getSheetsClient } = require('../config/googleAuth');

const HEADERS = ['Business Name', 'Email', 'Phone', 'Website', 'Address', 'Industry'];

const sanitizeSheetTitle = (title) =>
  String(title)
    .replace(/[:\\/?*[\]]/g, '-')
    .trim()
    .slice(0, 100) || 'Campaign Leads';

const escapeSheetTitle = (title) => `'${title.replace(/'/g, "''")}'`;

const getSpreadsheetId = (spreadsheetId) => {
  const id = spreadsheetId || process.env.SPREADSHEET_ID;
  if (!id) {
    throw new Error('SPREADSHEET_ID is not set in environment variables');
  }
  return id;
};

const findSheetByTitle = async (sheets, spreadsheetId, sheetTitle) => {
  const { data } = await sheets.spreadsheets.get({ spreadsheetId });
  const match = data.sheets?.find((sheet) => sheet.properties?.title === sheetTitle);

  if (!match) {
    throw new Error(`Sheet tab "${sheetTitle}" not found in spreadsheet`);
  }

  return match.properties;
};

/**
 * Create a new sheet tab inside the target spreadsheet.
 * @returns {Promise<string>} Direct URL to the new sheet tab
 */
const createSheet = async (spreadsheetId, sheetTitle) => {
  const id = getSpreadsheetId(spreadsheetId);
  const title = sanitizeSheetTitle(sheetTitle);
  const sheets = await getSheetsClient();

  try {
    const { data } = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: id,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title },
            },
          },
        ],
      },
    });

    const sheetId = data.replies?.[0]?.addSheet?.properties?.sheetId;
    if (sheetId === undefined) {
      throw new Error('Failed to create sheet tab');
    }

    return getSheetUrl(id, sheetId);
  } catch (error) {
    if (error.code === 404) {
      throw new Error(`Spreadsheet not found. Check SPREADSHEET_ID and service account access.`);
    }
    if (error.code === 403) {
      throw new Error('Permission denied. Share the spreadsheet with the service account email as Editor.');
    }
    throw error;
  }
};

/**
 * Write header row and all lead rows to a sheet tab.
 */
const appendLeads = async (spreadsheetId, sheetTitle, leads) => {
  const id = getSpreadsheetId(spreadsheetId);
  const title = sanitizeSheetTitle(sheetTitle);
  const sheets = await getSheetsClient();

  const rows = (leads || []).map((lead) => [
    lead.businessName || '',
    lead.email || '',
    lead.phone || '',
    lead.website || '',
    lead.address || '',
    lead.industry || '',
  ]);

  const values = [HEADERS, ...rows];
  const range = `${escapeSheetTitle(title)}!A1`;

  try {
    const sheetProperties = await findSheetByTitle(sheets, id, title);

    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range,
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: id,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: sheetProperties.sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true },
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                },
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor)',
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: sheetProperties.sheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: HEADERS.length,
              },
            },
          },
        ],
      },
    });
  } catch (error) {
    if (error.code === 400) {
      throw new Error(`Invalid sheet range or title "${title}". Create the sheet tab first.`);
    }
    throw error;
  }

  return values.length - 1;
};

/**
 * Return the direct URL to a specific sheet tab by title or gid.
 */
const getSheetUrl = async (spreadsheetId, sheetTitleOrGid) => {
  const id = getSpreadsheetId(spreadsheetId);

  if (typeof sheetTitleOrGid === 'number') {
    return `https://docs.google.com/spreadsheets/d/${id}/edit#gid=${sheetTitleOrGid}`;
  }

  const sheets = await getSheetsClient();
  const properties = await findSheetByTitle(sheets, id, sanitizeSheetTitle(sheetTitleOrGid));

  return `https://docs.google.com/spreadsheets/d/${id}/edit#gid=${properties.sheetId}`;
};

/**
 * Create a sheet tab and export leads in one step.
 */
const exportLeadsToSheet = async (spreadsheetId, sheetTitle, leads) => {
  const title = sanitizeSheetTitle(sheetTitle);
  const url = await createSheet(spreadsheetId, title);
  const count = await appendLeads(spreadsheetId, title, leads);
  return { sheetUrl: url, sheetTitle: title, leadCount: count };
};

module.exports = {
  createSheet,
  appendLeads,
  getSheetUrl,
  exportLeadsToSheet,
  HEADERS,
};

/*
// Example usage (requires valid GOOGLE_CREDENTIALS_PATH and SPREADSHEET_ID):

const { exportLeadsToSheet } = require('./sheets');

(async () => {
  const leads = [
    {
      businessName: 'Spice Garden',
      email: 'contact@spicegarden.in',
      phone: '9876543210',
      website: 'https://spicegarden.in',
      address: 'Connaught Place, Delhi',
      industry: 'Restaurants',
    },
  ];

  const result = await exportLeadsToSheet(
    process.env.SPREADSHEET_ID,
    'Delhi Restaurants - Test',
    leads
  );

  console.log('Exported to:', result.sheetUrl);
})();
*/
