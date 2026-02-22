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
  'Number of Beds': number | undefined;
  Bathrooms: number | undefined;
  Bedrooms: number | undefined;
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
  'Superhost Status': string;
  'Photo Notes': string;
}

function getRatingByIndex(
  reviewSummary: Array<{ localizedRating?: number }> | undefined,
  index: number
): number | undefined {
  if (!reviewSummary || !reviewSummary[index]) return undefined;
  return reviewSummary[index].localizedRating;
}

function parseLeadingInt(label: string | undefined): number | undefined {
  if (!label) return undefined;
  const match = label.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Build photo notes string from photos array.
 * Format: "1. {caption} - {url}\n2. ..."
 */
function buildPhotoNotes(photos: Array<{ caption?: string; large?: string }> | undefined): string {
  if (!photos || photos.length === 0) return '';

  return photos
    .map((photo, i) => {
      const caption = photo.caption || 'No caption';
      const url = photo.large || '';
      return `${i + 1}. ${caption} - ${url}`;
    })
    .join('\n');
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
    'Overall Rating': item.stars,
    'Latitude, Longitude': item.location
      ? `${item.location.lat}, ${item.location.lng}`
      : '',
    City: item.city || '',
    'Maximum Guests': item.numberOfGuests,
    'Number of Beds': parseLeadingInt(item.bedLabel),
    Bathrooms: parseLeadingInt(item.bathroomLabel),
    Bedrooms: item.bedrooms,
    'Host Name': item.primaryHost?.firstName || '',
    'Host ID': item.primaryHost?.id ? String(item.primaryHost.id) : '',
    Description: seoDescription,
    'Cover Photo URL': item.photos?.[0]?.large || '',
    'Cover Photo Caption': item.photos?.[0]?.caption || '',
    'Number of Reviews': item.reviews?.reviewsCount,
    'Accuracy Rating': getRatingByIndex(reviewSummary, 0),
    'Communication Rating': getRatingByIndex(reviewSummary, 1),
    'Cleanliness Rating': getRatingByIndex(reviewSummary, 2),
    'Location Rating': getRatingByIndex(reviewSummary, 3),
    'Check In Rating': getRatingByIndex(reviewSummary, 4),
    'Value Rating': getRatingByIndex(reviewSummary, 5),
    'SEO heading': seoHeading,
    'Superhost Status': item.primaryHost?.isSuperhost ? 'Yes' : 'No',
    'Photo Notes': buildPhotoNotes(item.photos),
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
