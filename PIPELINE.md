# Analysis Pipeline

How a listing URL becomes an analysis. This replaced the Make.com workflows. The Make.com section in README.md is out of date.

## Flow

1. `POST /api/analyze`: creates the Airtable record and starts an Apify run (`lib/apify.ts`).
2. `GET /api/poll-status` (the client polls every ~5s):
   - Apify `RUNNING` → `scraping`
   - Apify `SUCCEEDED` → fetch the dataset, map it to Airtable fields (`lib/scrape-mapper.ts`), save, and run the freemium analysis
   - Record already has scraped data but no AI response → retry the AI only
3. `/api/generate-description` (paid): analyzer brief → writer description.

## Services

| Step | Service | Notes |
|---|---|---|
| Scrape | Apify `tri_angle/airbnb-rooms-urls-scraper` (`OIYrZy1OpUEgIMYmh`) | Input: `startUrls`, `locale`, `currency`. About $0.005/listing |
| Freemium analysis | Claude `claude-opus-5-5` | Up to 30 photos sent as image URLs |
| Paid analyzer | Claude `claude-opus-5-5` | Produces the JSON brief |
| Paid writer | Claude `claude-sonnet-5-5` | Follows the analyzer's brief |
| Storage | Airtable base "Airbnb Listing improver", table "Scraped Listings" | |

Model tiers are defined in `lib/anthropic.ts`: `REASONING_MODEL` for thinking and recommendations, `EXECUTION_MODEL` for carrying out a plan. All calls go through `runClaudeText()`, which turns on the server-side refusal fallback and logs a `[claude] <label>` line with token usage.

Env vars: `ANTHROPIC_API_KEY`, `APIFY_API_TOKEN`, `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`.

## Scraper output quirks (rooms-urls-scraper)

- `location` is a plain string (the city); `coordinates` is `{latitude, longitude}`.
- Beds, bedrooms and baths come from `subDescription.items` (e.g. "2 beds", "Studio", "1 bath").
- **Hotel listings** (`propertyType: "Room in hotel"`) have `title: null`, an empty `description` and no bed/bath items.
  - The mapper falls back to `sharingConfigTitle` for the headline and to `metaDescription` (shortened) for the description.
- Airbnb auto-labels uncaptioned photos ("Overview image 3", "Living area image 1"). The mapper treats these as empty captions.
- If the actor changes its output format, compare a raw item from the Apify run's Dataset tab against `lib/scrape-mapper.ts`.

## Debugging

- `vercel logs --environment production --since 30m --no-branch --expand --json` (this folder is linked to the project).
  - The non-JSON view shows only one message per request, so use `--json` and filter on `message`.
- `[apify] dataset item received` logs the raw item's keys and a preview.
  - If the item has no listing data (e.g. Apify `#debug` error items), poll-status returns 502 "Scraper returned no listing data" instead of saving blanks.
- The `url.parse()` DeprecationWarning logged as "error" comes from a library and is harmless.

## History

- **~Sept 9, 2026:** the old actor `onidivo/airbnb-scraper` broke. It ignored `startUrls`, ran its default "Malaga, Spain" search against a dead Airbnb v2 API, and returned only `#debug` items. Every scrape after that saved empty data.
- **Nov 11, 2026:** OpenAI credits ran out (429), which exposed the problem. Switched to Claude, replaced the actor and rewrote the mapper.
