# Replace Make.com webhook with direct Airtable integration and clean URLs

## Summary

This PR replaces the unreliable Make.com webhook for email capture with a direct Airtable integration, and implements clean URLs by fetching recommendations from Airtable instead of passing them in URL parameters.

## Key Changes

### 1. Direct Airtable Email Capture
- **New API Route**: `/api/save-email` - Directly updates Airtable records with user emails
- **Replaced**: Make.com webhook for email capture with direct Airtable API calls
- **Benefits**: More reliable, faster, no external dependency

### 2. Clean URLs (Fetch Recommendations from Airtable)
- **New API Route**: `/api/get-record` - Fetches record data including recommendations from Airtable
- **Before**: `/results?recordId=recXXX&recommendations=<1000+ characters>`
- **After**: `/results?recordId=recXXX` (clean and shareable!)
- **How it works**: Recommendations are already stored in Airtable's `Freemium AI Response` field by Make.com, so we fetch them on page load instead of passing in URL

### 3. Increased Webhook Timeout
- **Timeout**: Increased from 60s to 120s to accommodate Make.com webhook (~25 seconds)
- **Progress Bar**: Adjusted timing to better match actual webhook duration
- **UX**: Updated estimated time message to 45-60 seconds

### 4. Simplified Webhook Response
- **Removed**: `recommendations` field from webhook response validation
- **New Format**: Webhook only needs to return `{"status": "success", "record_id": "recXXX"}`
- **Benefits**: Smaller response, faster processing, single source of truth

## Technical Details

### New Dependencies
- `airtable` - Official Airtable SDK for API interactions
- `dotenv` - For loading environment variables in test scripts

### New Files
- `app/api/save-email/route.ts` - Email capture API endpoint
- `app/api/get-record/route.ts` - Fetch recommendations from Airtable
- `test-airtable.js` - Helper script to test Airtable connection
- `test-email-capture.js` - Comprehensive email capture testing
- `.env.example` - Template for required environment variables
- `AIRTABLE_SETUP.md` - Complete setup guide

### Modified Files
- `app/results/page.tsx` - Fetch recommendations from Airtable on load, new email capture form with loading states
- `app/waiting/page.tsx` - Increased timeout, removed recommendations from URL redirect
- `lib/validation.ts` - Updated webhook validation to only require status and recordId

## Environment Variables Required

```bash
AIRTABLE_PERSONAL_ACCESS_TOKEN=pat...  # From https://airtable.com/create/tokens
AIRTABLE_BASE_ID=appl8aXCpxWpIBmQz
AIRTABLE_TABLE_NAME=Scraped Listings
```

## Airtable Requirements

### Required Fields in "Scraped Listings" Table
- `Email` - Single line text (for email capture)
- `Email Source` - Single line text (tracks "Results Page")
- `Email Captured At` - Date with time (timestamp)
- `Freemium AI Response` - Long text (stores recommendations from Make.com)

## Testing

### Email Capture
1. Visit results page with valid recordId
2. Click "Email Me These Results"
3. Enter email and submit
4. Verify email is saved to Airtable record
5. Confirm success message appears

### Clean URLs
1. Submit a new listing
2. Wait for Make.com webhook to complete
3. Verify redirect URL is clean: `/results?recordId=recXXX`
4. Confirm recommendations load from Airtable
5. Check that formatting is preserved

### Webhook Timeout
1. Submit listing
2. Verify webhook completes within 120s timeout
3. Confirm progress bar matches timing

## Security Notes

- Personal Access Token stored in environment variables (never committed)
- All inputs validated (email format, recordId format)
- Record existence verified before updates
- Server-side only - no credentials exposed to client

## Make.com Webhook Update

The webhook response can now be simplified to:

```json
{
  "status": "success",
  "record_id": "{{44.airtable_id}}"
}
```

The `recommendations` field is no longer needed in the response.

## Rollback Plan

If issues arise:
1. Revert to previous webhook email capture
2. Pass recommendations in URL again
3. Remove new API routes

## Performance Impact

- **Email Capture**: Faster (direct API vs webhook chain)
- **URLs**: Dramatically shorter (from 1000+ chars to ~50 chars)
- **Page Load**: Slightly slower (fetch from Airtable on load, but negligible ~200ms)
- **Overall**: Net positive - cleaner, more maintainable, more reliable

## Related Documentation

- See `AIRTABLE_SETUP.md` for complete setup instructions
- See `.env.example` for environment variable template
