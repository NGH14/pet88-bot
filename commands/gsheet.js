const { SlashCommandBuilder } = require('discord.js');
const { google } = require('googleapis');
const { JWT } = require('google-auth-library');

const serviceAccountKey = require('../sheet-key.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gsheet-test')
    .setDescription('Test connection to Google Sheets'),

  async execute(interaction) {
    await interaction.reply({ content: '🔍 Testing Google Sheets connection...', ephemeral: true });

    try {
      // Create JWT auth (same as your working test)
      const serviceAccountAuth = new JWT({
        email: serviceAccountKey.client_email,
        key: serviceAccountKey.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      // Authorize
      await serviceAccountAuth.authorize();
      console.log('✅ JWT authorization successful');

      // Create Google Sheets API client
      const sheets = google.sheets({ version: 'v4', auth: serviceAccountAuth });

      // Get spreadsheet info
      const response = await sheets.spreadsheets.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
      });

      console.log('✅ Spreadsheet accessed successfully');

      // Get some basic info about sheets
      const sheetInfo = response.data.sheets.map(sheet => ({
        name: sheet.properties.title,
        id: sheet.properties.sheetId,
        rowCount: sheet.properties.gridProperties.rowCount,
        columnCount: sheet.properties.gridProperties.columnCount
      }));

      await interaction.editReply({
        content: '',
        embeds: [{
          color: 0x00ff00,
          title: '✅ Google Sheets Connection Success!',
          fields: [
            { name: 'Spreadsheet Title', value: response.data.properties.title, inline: true },
            { name: 'Total Sheets', value: response.data.sheets.length.toString(), inline: true },
            { name: 'First Sheet', value: sheetInfo[0].name, inline: true },
            { name: 'Service Account', value: serviceAccountKey.client_email, inline: false },
            { name: 'Sheet Details', value: sheetInfo.map(s => `${s.name} (${s.rowCount}x${s.columnCount})`).join('\n'), inline: false }
          ],
          timestamp: new Date().toISOString()
        }]
      });

    } catch (error) {
      console.error('Google Sheets error:', error);

      await interaction.editReply({
        content: '',
        embeds: [{
          color: 0xff0000,
          title: '❌ Connection Failed',
          fields: [
            { name: 'Error', value: error.message, inline: false },
            { name: 'Sheet ID', value: process.env.GOOGLE_SHEET_ID || 'NOT SET', inline: true },
            { name: 'Service Account', value: serviceAccountKey.client_email, inline: true }
          ],
          timestamp: new Date().toISOString()
        }]
      });
    }
  },
};