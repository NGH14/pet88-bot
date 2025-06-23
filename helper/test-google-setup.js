const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const serviceAccountKey = require('../sheet-key.json');

async function testRawAPI() {
  try {
    const auth = new JWT({
      email: serviceAccountKey.client_email,
      key: serviceAccountKey.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    await auth.authorize();
    console.log('✅ Auth successful');

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
    });

    console.log('✅ API call successful!');
    console.log('Sheet title:', response.data.properties.title);

  } catch (error) {
    console.error('❌ API call failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testRawAPI();