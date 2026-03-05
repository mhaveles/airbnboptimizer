/**
 * Maps raw Apify scraper output to Airtable field names.
 * Field mappings are derived from the decoded Make.com blueprint.
 */

export interface AirtableListingFields {
  Headline: string;
  'Property Type': string;
  'Amenities List': string;
  'Overall Rating': number | undefined;
  'Latitude, Longitude': string;
  City: string;
  'Maximum Guests': number | undefined;
  'Number of Beds': string;
  Bathrooms: number | undefined;
  Bedrooms: string;
  'Host Name': string;
  'Host ID': string;
  Description: string;
  'Cover Photo URL': string;
  'Cover Photo Caption': string;
  'Number of Reviews': number | undefined;
  'Accuracy Rating': number | undefined;
  'Communication Rating': number | undefined;
  'Cleanliness Rating': number | undefined;
  'Location Rating': number | undefined;
  'Check In Rating': number | undefined;
  'Value Rating': number | undefined;
  'SEO heading': string;
  'Superhost Status': boolean;
  'Number of Photos': number | undefined;
}

function getRatingByIndex(
  reviewSummary: Array<{ localizedRating?: number }> | undefined,
  index: number
): number | undefined {
  if (!reviewSummary || !reviewSummary[index]) return undefined;
  return reviewSummary[index].localizedRating;
}

function toNumber(val: unknown): number | undefined {
  if (val == null) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

function parseLeadingInt(label: unknown): number | undefined {
  if (label == null) return undefined;
  if (typeof label === 'number') return Number.isFinite(label) ? label : undefined;
  if (typeof label !== 'string') return undefined;
  const match = label.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Map a single Apify listing result to Airtable fields.
 */
export function mapApifyToAirtable(item: any): AirtableListingFields {
  const reviewSummary = item.reviewDetailsInterface?.reviewSummary;
  const seoDescription = item.sectionedDescription?.description || '';
  const seoHeading = item.seoHeading || item.sectionedDescription?.heading || '';

  return {
    Headline: item.name || '',
    'Property Type': item.roomType || '',
    'Amenities List': Array.isArray(item.amenities) ? item.amenities.join(', ') : '',
    'Overall Rating': toNumber(item.stars),
    'Latitude, Longitude': item.location
      ? `${item.location.lat}, ${item.location.lng}`
      : '',
    City: item.city || '',
    'Maximum Guests': toNumber(item.numberOfGuests),
    'Number of Beds': parseLeadingInt(item.bedLabel) != null ? String(parseLeadingInt(item.bedLabel)) : '',
    Bathrooms: parseLeadingInt(item.bathroomLabel),
    Bedrooms: item.bedrooms != null ? String(item.bedrooms) : '',
    'Host Name': item.primaryHost?.firstName || '',
    'Host ID': item.primaryHost?.id ? String(item.primaryHost.id) : '',
    Description: seoDescription,
    'Cover Photo URL': item.photos?.[0]?.large || '',
    'Cover Photo Caption': item.photos?.[0]?.caption || '',
    'Number of Reviews': toNumber(item.reviews?.reviewsCount),
    'Accuracy Rating': toNumber(getRatingByIndex(reviewSummary, 0)),
    'Communication Rating': toNumber(getRatingByIndex(reviewSummary, 1)),
    'Cleanliness Rating': toNumber(getRatingByIndex(reviewSummary, 2)),
    'Location Rating': toNumber(getRatingByIndex(reviewSummary, 3)),
    'Check In Rating': toNumber(getRatingByIndex(reviewSummary, 4)),
    'Value Rating': toNumber(getRatingByIndex(reviewSummary, 5)),
    'SEO heading': seoHeading,
    'Superhost Status': !!item.primaryHost?.isSuperhost,
    'Number of Photos': Array.isArray(item.photos) ? item.photos.length : undefined,
  };
}

/**
 * Get extra fields from the raw Apify item needed for the AI prompt
 * but not stored in Airtable.
 */
export function getPromptExtras(item: any) {
  return {
    listingId: item.id || '',
    hostResponseRate: item.primaryHost?.responseRateWithoutNa || '',
    hostResponseTime: item.primaryHost?.responseTimeWithoutNa || '',
  };
}
