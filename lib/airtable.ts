import Airtable from 'airtable';

export function getBase() {
  const apiKey = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey) {
    throw new Error('Airtable API key is not configured');
  }

  if (!baseId) {
    throw new Error('Airtable Base ID is not configured');
  }

  return new Airtable({ apiKey }).base(baseId);
}

export function getTable() {
  const tableName = process.env.AIRTABLE_TABLE_NAME || 'Listings';
  return getBase()(tableName);
}
