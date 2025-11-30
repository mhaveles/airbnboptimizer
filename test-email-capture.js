require('dotenv').config({ path: '.env.local' });
const Airtable = require('airtable');

console.log('=== Testing Airtable Connection ===\n');

// Show config
console.log('Configuration:');
console.log('- API Key:', process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN ? 'Set (length: ' + process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN.length + ')' : 'NOT SET');
console.log('- Base ID:', process.env.AIRTABLE_BASE_ID || 'NOT SET');
console.log('- Table Name:', process.env.AIRTABLE_TABLE_NAME || 'NOT SET');
console.log('');

if (!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN || !process.env.AIRTABLE_BASE_ID) {
  console.error('ERROR: Environment variables not set!');
  process.exit(1);
}

const base = new Airtable({
  apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
}).base(process.env.AIRTABLE_BASE_ID);

const tableName = process.env.AIRTABLE_TABLE_NAME || 'Scraped Listings';
const testRecordId = 'recqDjI7Sj9fLocn6'; // From the URL you provided

console.log(`Testing record lookup: ${testRecordId}\n`);

// Test 1: Check if record exists
base(tableName).find(testRecordId, (err, record) => {
  if (err) {
    console.error('❌ Record NOT found:');
    console.error(err.message);
    console.error('\nPossible issues:');
    console.error('- RecordId does not exist in your table');
    console.error('- Table name is incorrect');
    console.error('- API key does not have access to this base');
    return;
  }

  console.log('✅ Record found:', record.id);
  console.log('\nCurrent field values:');
  console.log('- Email:', record.get('Email') || '(empty)');
  console.log('- Email Source:', record.get('Email Source') || '(empty)');
  console.log('- Email Captured At:', record.get('Email Captured At') || '(empty)');
  console.log('\nAll fields in this record:');
  console.log(Object.keys(record.fields).join(', '));

  console.log('\n=== Testing Update ===\n');

  // Test 2: Try to update the record
  base(tableName).update(testRecordId, {
    'Email': 'test@test.com',
    'Email Source': 'Results Page',
    'Email Captured At': new Date().toISOString(),
  }, (updateErr, updatedRecord) => {
    if (updateErr) {
      console.error('❌ Update FAILED:');
      console.error(updateErr.message);
      console.error('\nPossible issues:');
      console.error('- Field names do not match exactly (case-sensitive)');
      console.error('- Fields do not exist in Airtable');
      console.error('- API key does not have write permissions');

      // Check if it's a field error
      if (updateErr.message.includes('Unknown field')) {
        console.error('\n⚠️  FIELD NAME MISMATCH!');
        console.error('The API is trying to update fields that don\'t exist.');
        console.error('Check that your Airtable table has these exact fields:');
        console.error('  - Email');
        console.error('  - Email Source');
        console.error('  - Email Captured At');
      }
      return;
    }

    console.log('✅ Update SUCCESS!');
    console.log('Record updated:', updatedRecord.id);
    console.log('- Email:', updatedRecord.get('Email'));
    console.log('- Email Source:', updatedRecord.get('Email Source'));
    console.log('- Email Captured At:', updatedRecord.get('Email Captured At'));
  });
});
