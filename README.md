# AirbnbOptimizer

Optimize your Airbnb listing to rank higher in search and get more bookings.

## Features

- **Simple Landing Page**: Clean, Airbnb-style interface to submit your listing URL
- **Real-time Progress**: Visual progress bar during analysis (30-60 seconds)
- **Expert Recommendations**: Personalized optimization suggestions via Make.com
- **Flexible Delivery**: View results on-screen or receive them via email
- **Privacy-First**: No data storage, anonymous usage option

## Tech Stack

- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Make.com** - Webhook automation and analysis integration

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
   - Displays optimization recommendations
   - Option to email results (if not already provided)
   - "Optimize Another Listing" button
   - Print functionality

## Make.com Integration

**Webhook URL**: `https://hook.us2.make.com/pveeaemxf16qf49huq98532vegvbu2sn`

**Request Format**:
```json
{
  "airbnbUrl": "https://www.airbnb.com/rooms/...",
  "email": "optional@email.com"
}
```

**Response Format**:
```json
{
  "status": "success",
  "recommendations": "AI-generated text recommendations..."
}
```

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
