# Airtable Setup Guide

This guide explains how to set up Airtable for email capture functionality.

## Overview

The email capture feature directly updates Airtable records when users submit their email on the results page. This replaces the previous Make.com webhook integration for more reliable email capture.

## Prerequisites

- An Airtable account (free or paid)
- An Airtable base with a table for storing listing data

## Required Environment Variables

Add these to your `.env.local` file (or Vercel environment variables):

```bash
AIRTABLE_PERSONAL_ACCESS_TOKEN=pat...  # Your Airtable Personal Access Token
AIRTABLE_BASE_ID=app...                # Your Airtable base ID
AIRTABLE_TABLE_NAME=Listings           # Your table name (default: "Listings")
```

## Step 1: Get Your Airtable Personal Access Token

1. Go to https://airtable.com/create/tokens
2. Click **"Create new token"**
3. Give it a name (e.g., "AirbnbOptimizer Email Capture")
4. Under **Scopes**, add:
   - `data.records:read` - To verify records exist
   - `data.records:write` - To update records with email
5. Under **Access**, select your base
6. Click **Create token**
7. Copy the token (starts with `pat...`) - you won't be able to see it again!
8. Add to `.env.local`:
   ```
   AIRTABLE_PERSONAL_ACCESS_TOKEN=pat...
   ```

## Step 2: Get Your Airtable Base ID

1. Go to https://airtable.com/api
2. Select your base
3. The base ID is in the URL or shown in the API documentation (starts with `app`)
4. Add to `.env.local`:
   ```
   AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
   ```

## Step 3: Configure Your Airtable Table

### Required Fields

Your Airtable table must have these fields:

| Field Name | Field Type | Description |
|------------|------------|-------------|
| `Email` | Single line text or Email | Stores the user's email address |
| `Email Source` | Single line text | Tracks where the email came from (always "Results Page") |
| `Email Captured At` | Date or Date & time | Timestamp when email was captured |

### Creating the Fields

1. Open your Airtable base
2. Go to your table (e.g., "Listings")
3. Click the **+** icon to add a new field
4. For each field:
   - **Email**
     - Field type: "Single line text" or "Email"
     - Field name: `Email`
   - **Email Source**
     - Field type: "Single line text"
     - Field name: `Email Source`
   - **Email Captured At**
     - Field type: "Date" with time
     - Field name: `Email Captured At`
     - Include time: Yes
     - Format: Your preference

## Step 4: Set Table Name (Optional)

If your table is named something other than "Listings":

```bash
AIRTABLE_TABLE_NAME=YourTableName
```

## Step 5: Deploy Environment Variables

### For Local Development

Create or update `.env.local`:

```bash
AIRTABLE_PERSONAL_ACCESS_TOKEN=patXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_TABLE_NAME=Listings
```

Then restart your development server:
```bash
npm run dev
```

### For Vercel Production

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add each variable:
   - `AIRTABLE_PERSONAL_ACCESS_TOKEN`
   - `AIRTABLE_BASE_ID`
   - `AIRTABLE_TABLE_NAME`
4. Redeploy your application

## Testing

1. Go to the results page with a valid recordId
2. Click "Email Me These Results"
3. Enter an email address
4. Click "Send Email"
5. Check your Airtable base - the record should be updated with:
   - Email address in the `Email` field
   - "Results Page" in the `Email Source` field
   - Current timestamp in `Email Captured At` field

## Troubleshooting

### Error: "Airtable API key is not configured"
- Verify `AIRTABLE_PERSONAL_ACCESS_TOKEN` is set in environment variables
- Check the token hasn't expired
- Restart your server after adding the variable

### Error: "Airtable Base ID is not configured"
- Verify `AIRTABLE_BASE_ID` is set in environment variables
- Check the base ID starts with "app"
- Restart your server after adding the variable

### Error: "Record not found"
- The recordId in the URL doesn't exist in Airtable
- Verify the recordId is valid (starts with "rec")
- Check you're using the correct base and table

### Error: "Unknown field name: 'Email'"
- The `Email` field doesn't exist in your Airtable table
- Create the required fields (see Step 3)
- Field names are case-sensitive - must be exactly `Email`, `Email Source`, and `Email Captured At`

### Error: "Insufficient permissions"
- Your Personal Access Token doesn't have the right scopes
- Verify the token has `data.records:read` and `data.records:write` scopes
- Verify the token has access to your base

## Security Notes

- **Never commit** `.env.local` to git - it's in `.gitignore` by default
- Personal Access Tokens are sensitive - treat them like passwords
- Use environment variables in Vercel for production
- The API route validates all inputs before updating Airtable
- Email format is validated using regex
- RecordId format is validated before lookup

## API Endpoint

The email capture uses the following API endpoint:

**POST** `/api/save-email`

**Request Body:**
```json
{
  "email": "user@example.com",
  "recordId": "recXXXXXXXXXXXXXX"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Email saved successfully"
}
```

**Error Response (400/404/500):**
```json
{
  "error": "Error message here"
}
```
