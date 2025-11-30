require('dotenv').config({ path: '.env.local' });
const Airtable = require('airtable');

const base = new Airtable({
  apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
}).base(process.env.AIRTABLE_BASE_ID);

const tableName = process.env.AIRTABLE_TABLE_NAME || 'Scraped Listings';

base(tableName).select({
  maxRecords: 3,
}).firstPage((err, records) => {
  if (err) {
    console.error('Error fetching records:', err);
    return;
  }

  console.log(`Found ${records.length} records in your "${tableName}" table:\n`);

  records.forEach((record, index) => {
    console.log(`Record ${index + 1}: ${record.id}`);
    console.log(`Test URL: http://localhost:3000/results?recordId=${record.id}&recommendations=Test+recommendations+here\n`);
  });

  if (records.length === 0) {
    console.log(`No records found in "${tableName}". You need at least one record to test.`);
  }
});
