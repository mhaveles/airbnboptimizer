# AirbnbOptimizer

An AI-powered tool to optimize Airbnb listings with personalized recommendations.

## Features

- **Simple Landing Page**: Clean, Airbnb-style interface to submit your listing URL
- **Real-time Progress**: Visual progress bar during AI analysis (30-60 seconds)
- **AI Recommendations**: Personalized suggestions powered by GPT via Make.com
- **Flexible Delivery**: View results on-screen or receive them via email
- **Privacy-First**: No data storage, anonymous usage option

## Tech Stack

- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Make.com** - Webhook automation and AI integration

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## User Flow

1. **Landing Page** (`/`)
   - Enter Airbnb listing URL
   - Optionally provide email for results delivery
   - Click "Optimize My Listing"

2. **Waiting Page** (`/waiting`)
   - Shows animated progress bar
   - Makes POST request to Make.com webhook
   - Displays analysis progress (30-60 seconds)

3. **Results Page** (`/results`)
   - Displays AI-generated recommendations
   - Option to email results (if not already provided) - uses separate email capture webhook
   - "Optimize Another Listing" button
   - Share with a friend functionality (copy link, Facebook, Twitter, Email)

## Make.com Integration

### Primary Analysis Webhook

**Webhook URL**: `https://hook.us2.make.com/pveeaemxf16qf49huq98532vegvbu2sn`

Used on the waiting page to analyze the Airbnb listing and generate recommendations.

**Request Format**:
```json
{
  "airbnbUrl": "https://www.airbnb.com/rooms/...",
  "email": "optional@email.com",
  "email_source": "Home Page"
}
```

**Response Format**:
```json
{
  "status": "success",
  "recommendations": "AI-generated text recommendations...",
  "recordId": "rec123abc"
}
```

### Email Capture Webhook

**Webhook URL**: `https://hook.us2.make.com/mb8e6o5jacmce62htobb7e81how1ltcu`

Used on the results page when a user who didn't provide an email initially wants to receive their recommendations via email. Updates the existing Airtable record with the email address.

**Request Format**:
```json
{
  "email": "user@email.com",
  "recordId": "rec123abc",
  "email_source": "Results Page"
}
```

**Response**: HTTP 200 on success

## Design

- Airbnb color scheme (primary: `#FF5A5F`)
- Clean, minimal interface
- Mobile-responsive design
- Smooth transitions and animations

## Future Enhancements (V2)

- [ ] Animated loading text variations
- [ ] Multiple language support
- [ ] Comparison with similar listings
- [ ] Historical optimization tracking
- [ ] A/B testing recommendations

## License

Private project
