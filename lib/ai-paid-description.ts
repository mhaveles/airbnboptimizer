import OpenAI from 'openai';

const ANALYZER_MODEL = 'gpt-5.1-2025-11-13';
const WRITER_MODEL = 'gpt-5-mini-2025-08-07';

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey });
}

const ANALYZER_SYSTEM_PROMPT = `You are the Listing Analyzer for AirbnbOptimizer.com.

GOAL
Turn raw listing data into a short, structured brief plus a "writer_prompt" that a description writer can follow to create a ~250-word premium Airbnb description.

INPUT
You will receive a JSON object with listing data: title, host_description, host_seo_heading, ao_freemium_recommendation, stats (ratings), city, latitude_longitude, property_type, guest_capacity, num_beds, num_bathrooms, num_bedrooms.

OUTPUT
Return ONLY valid JSON with these fields:
{
  "target_guest": "One sentence describing the ideal guest for this listing",
  "positioning": "One sentence on how this listing should be positioned vs. competitors",
  "top_hooks": ["hook1", "hook2", "hook3"],
  "risks_or_weaknesses": ["risk1", "risk2"],
  "tone": "The recommended tone for the description (e.g., warm and inviting, modern and sleek)",
  "seo_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "seo_keywords_instructions": "How to naturally incorporate the SEO keywords into the description",
  "seo_keyword_rules": "Never stuff keywords. Weave them naturally into sentences. Each keyword should appear at most once.",
  "writer_prompt": "A detailed prompt for the description writer, including what to emphasize, what tone to use, what structure to follow, and what to avoid."
}

RULES
- Be specific to this listing, not generic.
- top_hooks should be unique selling points that differentiate this listing.
- risks_or_weaknesses should be things the description can preemptively address or reframe.
- writer_prompt should be detailed enough that a copywriter can produce a great description without seeing the original listing.
- Return ONLY the JSON object, no markdown, no explanation.`;

const WRITER_SYSTEM_PROMPT = `You are a professional Airbnb listing copywriter.

GOAL
Write a ~250-word listing description that helps the host attract more clicks and bookings, fits Airbnb's vibe, and uses the strategy defined in the analyzer JSON.

INPUT
You will receive:
1. A JSON brief from the listing analyzer with target_guest, positioning, top_hooks, risks_or_weaknesses, tone, seo_keywords, writer_prompt.
2. Basic property details (beds, bedrooms, bathrooms, property_type, guest_capacity, city).

OUTPUT RULES
- 230-270 words.
- Short paragraphs (2-4 sentences each).
- No bullet points or lists.
- No mention of JSON, AI, keywords, SEO, or the analysis process.
- End with a warm call-to-action encouraging booking.
- Write in second person ("you", "your").
- Sound natural, warm, and human — like a great host wrote it.
- Naturally weave in the SEO keywords without stuffing.
- Address potential concerns proactively through positive framing.

Return ONLY the final description text. No titles, no headers, no quotes around it.`;

interface ListingRecord {
  Headline?: string;
  Description?: string;
  'SEO heading'?: string;
  'Freemium AI Response'?: string;
  'Overall Rating'?: number;
  'Accuracy Rating'?: number;
  'Communication Rating'?: number;
  'Cleanliness Rating'?: number;
  'Location Rating'?: number;
  'Check In Rating'?: number;
  'Value Rating'?: number;
  City?: string;
  'Latitude, Longitude'?: string;
  'Property Type'?: string;
  'Maximum Guests'?: number;
  'Number of Beds'?: string;
  Bathrooms?: string;
  Bedrooms?: number;
}

function buildAnalyzerUserMessage(record: ListingRecord): string {
  return JSON.stringify({
    title: record.Headline || '',
    host_description: record.Description || '',
    host_seo_heading: record['SEO heading'] || '',
    ao_freemium_recommendation: record['Freemium AI Response'] || '',
    stats: {
      overall_rating: record['Overall Rating'] ?? null,
      accuracy_rating: record['Accuracy Rating'] ?? null,
      communication_rating: record['Communication Rating'] ?? null,
      cleanliness_rating: record['Cleanliness Rating'] ?? null,
      location_rating: record['Location Rating'] ?? null,
      checkin_rating: record['Check In Rating'] ?? null,
      value_rating: record['Value Rating'] ?? null,
    },
    city: record.City || '',
    latitude_longitude: record['Latitude, Longitude'] || '',
    property_type: record['Property Type'] || '',
    guest_capacity: record['Maximum Guests'] ?? null,
    num_beds: record['Number of Beds'] || '',
    num_bathrooms: record.Bathrooms || '',
    num_bedrooms: record.Bedrooms ?? null,
  });
}

function buildWriterPropertyMessage(record: ListingRecord): string {
  return JSON.stringify({
    beds: record['Number of Beds'] || '',
    bedrooms: record.Bedrooms ?? '',
    bathrooms: record.Bathrooms || '',
    property_type: record['Property Type'] || '',
    guest_capacity: record['Maximum Guests'] ?? '',
    city: record.City || '',
  });
}

export interface PaidDescriptionResult {
  analyzerOutput: string;
  description: string;
}

/**
 * Run the two-step paid description pipeline:
 * 1. Analyzer (GPT-5.1) → structured JSON brief
 * 2. Writer (GPT-5-mini) → ~250-word description
 */
export async function runPaidDescriptionPipeline(
  record: ListingRecord
): Promise<PaidDescriptionResult> {
  const client = getClient();

  // Step 1: Analyzer
  const analyzerResponse = await client.chat.completions.create({
    model: ANALYZER_MODEL,
    messages: [
      { role: 'system', content: ANALYZER_SYSTEM_PROMPT },
      { role: 'user', content: buildAnalyzerUserMessage(record) },
    ],
  });

  const analyzerOutput = analyzerResponse.choices[0]?.message?.content;
  if (!analyzerOutput) {
    throw new Error('OpenAI returned empty response for paid analyzer');
  }

  // Step 2: Writer
  const writerResponse = await client.chat.completions.create({
    model: WRITER_MODEL,
    messages: [
      { role: 'system', content: WRITER_SYSTEM_PROMPT },
      { role: 'user', content: analyzerOutput },
      { role: 'user', content: buildWriterPropertyMessage(record) },
    ],
  });

  const description = writerResponse.choices[0]?.message?.content;
  if (!description) {
    throw new Error('OpenAI returned empty response for paid writer');
  }

  return { analyzerOutput, description };
}
