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
  'Photo Captions': string;
  'Photo URLs'?: string;
}

function toNumber(val: unknown): number | undefined {
  if (val == null || val === '') return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

function parseLeadingNumber(label: unknown): number | undefined {
  if (label == null) return undefined;
  if (typeof label === 'number') return Number.isFinite(label) ? label : undefined;
  if (typeof label !== 'string') return undefined;
  const match = label.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : undefined;
}

interface ScrapedImage {
  url: string;
  caption: string;
  orientation: string;
}

/** Normalize the actor's image list (tolerates a few field-name variants). */
function getImages(item: any): ScrapedImage[] {
  const raw = Array.isArray(item.images) ? item.images : Array.isArray(item.photos) ? item.photos : [];
  return raw
    .map((img: any) => {
      if (typeof img === 'string') return { url: img, caption: '', orientation: '' };
      return {
        url: img?.imageUrl || img?.url || img?.large || img?.baseUrl || '',
        caption: img?.caption || img?.accessibilityLabel || '',
        orientation: img?.orientation || img?.pictureOrientation || '',
      };
    })
    .filter((img: ScrapedImage) => img.url.length > 0);
}

/** "4 guests · 2 bedrooms · 3 beds · 1.5 baths" style overview items. */
function getOverviewItems(item: any): string[] {
  const items = item.subDescription?.items ?? item.overview ?? [];
  if (!Array.isArray(items)) return [];
  return items.map((x: any) => (typeof x === 'string' ? x : x?.title || '')).filter(Boolean);
}

function findOverview(items: string[], pattern: RegExp): number | undefined {
  const hit = items.find((x) => pattern.test(x));
  if (!hit) return undefined;
  if (/studio/i.test(hit)) return 0;
  if (/half/i.test(hit) && !/\d/.test(hit)) return 0.5;
  return parseLeadingNumber(hit);
}

function getAmenities(item: any): string {
  if (!Array.isArray(item.amenities)) return '';
  const names: string[] = [];
  for (const a of item.amenities) {
    if (typeof a === 'string') names.push(a);
    else if (Array.isArray(a?.values)) {
      for (const v of a.values) if (v?.title && v.available !== false) names.push(v.title);
    } else if (a?.title) names.push(a.title);
  }
  return names.join(', ');
}

function stripHtml(text: unknown): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function getCity(item: any): string {
  if (item.city) return item.city;
  if (item.location?.city) return item.location.city;
  const subtitle: string = item.locationSubtitle || item.location?.subtitle || '';
  return subtitle.split(',')[0]?.trim() || '';
}

function getCoordinates(item: any): string {
  const c = item.coordinates || item.location;
  const lat = c?.latitude ?? c?.lat;
  const lng = c?.longitude ?? c?.lng;
  return lat != null && lng != null ? `${lat}, ${lng}` : '';
}

function isSuperhost(item: any): boolean {
  if (item.host?.isSuperHost || item.host?.isSuperhost || item.isSuperhost) return true;
  return Array.isArray(item.highlights) && item.highlights.some((h: any) => h?.type === 'LISTING_SUPER_HOST');
}

/**
 * Map a single tri_angle/airbnb-rooms-urls-scraper result to Airtable fields.
 */
export function mapApifyToAirtable(item: any): AirtableListingFields {
  const images = getImages(item);
  const overview = getOverviewItems(item);
  const rating = item.rating ?? {};

  return {
    Headline: item.title || item.name || '',
    'Property Type': item.propertyType || item.roomType || '',
    'Amenities List': getAmenities(item),
    'Overall Rating': toNumber(rating.guestSatisfaction ?? rating.value ?? item.stars),
    'Latitude, Longitude': getCoordinates(item),
    City: getCity(item),
    'Maximum Guests': toNumber(item.personCapacity) ?? findOverview(overview, /guest/i),
    'Number of Beds': String(findOverview(overview, /\bbeds?\b/i) ?? ''),
    Bathrooms: findOverview(overview, /bath/i),
    Bedrooms: String(findOverview(overview, /bedroom|studio/i) ?? ''),
    'Host Name': item.host?.name || item.host?.firstName || '',
    'Host ID': item.host?.id ? String(item.host.id) : '',
    Description: stripHtml(item.description),
    'Cover Photo URL': images[0]?.url || item.thumbnail || '',
    'Cover Photo Caption': images[0]?.caption || '',
    'Number of Reviews': toNumber(rating.reviewsCount),
    'Accuracy Rating': toNumber(rating.accuracy),
    'Communication Rating': toNumber(rating.communication),
    'Cleanliness Rating': toNumber(rating.cleanliness),
    'Location Rating': toNumber(rating.location),
    'Check In Rating': toNumber(rating.checking ?? rating.checkin),
    'Value Rating': toNumber(rating.value),
    'SEO heading': item.seoTitle || item.metaTitle || '',
    'Superhost Status': isSuperhost(item),
    'Number of Photos': images.length || undefined,
    'Photo Captions': images
      .map((img, i) => {
        const parts: string[] = [];
        if (img.caption) parts.push(img.caption);
        if (img.orientation) parts.push(img.orientation.toLowerCase());
        return `${i + 1}. ${parts.length > 0 ? parts.join(' | ') : '(no caption)'}`;
      })
      .join('\n'),
    'Photo URLs': JSON.stringify(images.map((img) => img.url)),
  };
}

/**
 * Get extra fields from the raw Apify item needed for the AI prompt
 * but not stored in Airtable.
 */
export function getPromptExtras(item: any) {
  return {
    listingId: item.id ? String(item.id) : '',
    hostResponseRate: item.host?.responseRate || item.host?.hostDetails?.responseRate || '',
    hostResponseTime: item.host?.responseTime || item.host?.hostDetails?.responseTime || '',
    photoUrls: getImages(item).map((img) => img.url),
  };
}

/** True when the item looks like a real listing (not an error/#debug record). */
export function hasListingData(item: any): boolean {
  return !!(item?.title || item?.name) || getImages(item ?? {}).length > 0;
}
