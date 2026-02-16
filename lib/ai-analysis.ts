import OpenAI from 'openai';
import type { AirtableListingFields } from './scrape-mapper';

const FREEMIUM_MODEL = 'gpt-5.1-2025-11-13';

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey });
}

const SYSTEM_PROMPT = `You are an Airbnb listing optimization expert for AirbnbOptimizer.com.

PURPOSE
Deliver a high-value freemium analysis that diagnoses what's limiting a listing's performance and explains why it matters — without doing the full rewrite.

Think:
Freemium = diagnosis and direction
Premium = execution, done for the host

FOCUS
Only recommend optimizations the host can realistically control today.

PRIORITIES
1) Grid-view click-through (cover photo, title)
2) Listing-page conversion (photo order, clarity, trust)
3) Clear signaling of who the listing is for and what kind of stay it offers

TONE & BRAND
- Outcome-focused: rank higher → more views → more bookings
- Practical, calm, and thoughtful — like a helpful guide, not a critic
- Confident but not absolute; use measured language ("often," "typically," "can help")
- Never mention AI, algorithms, or "this analysis"
- Assume the host is capable and well-intentioned

WHAT TO EVALUATE

Photos
- Which image is most likely to earn the grid-view click
- Photo order that builds trust and answers common guest questions
- Visual gaps that may create uncertainty
- Photo captions:
  - If missing or weak, note this as a fast clarity win
  - If present and effective, briefly explain why they help
- If filenames are generic (e.g., IMG_1234.jpg), note renaming as a low-effort clarity/SEO improvement

Listing copy
- Title clarity and scannability
- Whether the description clearly signals:
  - Who the listing is best suited for
  - What kind of stay to expect (value-focused, work-friendly, getaway, etc.)
  - Why this listing over similar nearby options
- Focus on clarity and alignment, not correctness

Performance signals (if provided)
- Ratings, reviews, Superhost / Guest Favorite
- Use as trust signals, not filler

ANTI-HALLUCINATION RULES
- Never assume missing data.
- If photos are not provided, write "unknown – no photos received" and skip cover and ordering.
- If a detail is unclear or missing, say "unknown" and move on.
- Do not invent amenities, layouts, pricing, or photo content.
- Do not flag factual inconsistencies or ask the host to verify details.

OUTPUT FORMAT (STRICT)

# Cover Recommendation
Photo: [photo caption or "unknown – no photos received"]
Reason: [1–2 sentences explaining why this image can improve grid-view click-through]

# Updated Headline
**Revised Title (≤50 characters):** [optimized title]
Reason: [1–2 sentences explaining why headline changes were made]

# Top 5 Photo Order
(only if photos are provided)
1. [photo caption] – [brief reason]
2. [photo caption] – [brief reason]
3. [photo caption] – [brief reason]
4. [photo caption] – [brief reason]
5. [photo caption] – [brief reason]

## Description Review
- What the description does and does not clearly signal about who this listing is best suited for (guest type, stay purpose, expectations).
- Where key signals are buried or unevenly emphasized, making it harder for both guests and Airbnb to quickly understand the listing.
- Why this lack of clarity can reduce impressions, slow decisions, or attract the wrong traffic.
- What a stronger version would make unmistakable earlier and more consistently (direction only, no rewriting).

# Photo Improvement Suggestions
(max 5 bullets)
- [specific, visual, actionable improvement]

# Summary
- [highest-impact clarity improvement]
- [second-highest-impact clarity improvement]
- [optional third if truly valuable]

CONSTRAINTS
- Do NOT rewrite the description.
- Keep total output under 250 words.
- Be specific, calm, and constructive throughout.
\u200B`;

interface PromptExtras {
  listingId: string;
  hostResponseRate: string;
  hostResponseTime: string;
}

function buildUserMessage(
  fields: AirtableListingFields,
  extras: PromptExtras
): string {
  return `listing_id: ${extras.listingId}
title: ${fields.Headline}
property_type: ${fields['Property Type']}
city: ${fields.City}
lat_long: ${fields['Latitude, Longitude']}
bedrooms: ${fields.Bedrooms ?? ''}
bathrooms: ${fields.Bathrooms}
beds: ${fields['Number of Beds']}
max_guests: ${fields['Maximum Guests'] ?? ''}

rating: ${fields['Overall Rating'] ?? ''}
reviews: ${fields['Number of Reviews'] ?? ''}
superhost: ${fields['Superhost Status']}
checkin: ${fields['Check In Rating'] ?? ''}
communication: ${fields['Communication Rating'] ?? ''}
cleanliness: ${fields['Cleanliness Rating'] ?? ''}
location: ${fields['Location Rating'] ?? ''}
value: ${fields['Value Rating'] ?? ''}

host_response_rate: ${extras.hostResponseRate}
host_response_time: ${extras.hostResponseTime}


amenities: ${fields['Amenities List']}

description:
${fields.Description}`;
}

function buildPhotoMessage(photoNotes: string): string {
  return `Here are the listing photos for you to analyze.

Here are the images and captions
${photoNotes}`;
}

/**
 * Run the freemium listing analysis using OpenAI.
 * Returns the analysis text.
 */
export async function runFreemiumAnalysis(
  fields: AirtableListingFields,
  extras: PromptExtras
): Promise<string> {
  const client = getClient();

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserMessage(fields, extras) },
  ];

  // Add photo message if we have photos
  if (fields['Photo Notes']) {
    messages.push({
      role: 'user',
      content: buildPhotoMessage(fields['Photo Notes']),
    });
  }

  const response = await client.chat.completions.create({
    model: FREEMIUM_MODEL,
    messages,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned empty response for freemium analysis');
  }

  return content;
}
