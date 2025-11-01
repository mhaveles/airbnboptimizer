import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Normalize the URL
    const normalizedUrl = await normalizeAirbnbUrl(url);

    if (!normalizedUrl) {
      return NextResponse.json(
        { error: 'Unable to normalize URL. Please check the link and try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ normalizedUrl });

  } catch (error) {
    console.error('URL normalization error:', error);
    return NextResponse.json(
      { error: 'Failed to normalize URL' },
      { status: 500 }
    );
  }
}

async function normalizeAirbnbUrl(url: string): Promise<string | null> {
  try {
    // Ensure URL has a protocol
    let normalizedUrl = url.trim();
    if (!normalizedUrl.match(/^https?:\/\//i)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    // Check if it's a short link or vanity URL that needs resolution
    const needsResolution =
      normalizedUrl.includes('abnb.me') ||
      normalizedUrl.includes('airbnb.app.link') ||
      normalizedUrl.includes('airbnb.page.link') ||
      normalizedUrl.match(/airbnb\.[a-z.]+\/h\//i);

    let finalUrl = normalizedUrl;

    if (needsResolution) {
      // Follow redirects to get the final URL
      try {
        const response = await fetch(normalizedUrl, {
          method: 'HEAD',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AirbnbOptimizer/1.0)',
          },
        });
        finalUrl = response.url;
        console.log('Followed redirect:', normalizedUrl, '->', finalUrl);
      } catch (fetchError) {
        console.error('Error following redirect:', fetchError);
        // If HEAD fails, try GET
        try {
          const response = await fetch(normalizedUrl, {
            method: 'GET',
            redirect: 'follow',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; AirbnbOptimizer/1.0)',
            },
          });
          finalUrl = response.url;
          console.log('Followed redirect with GET:', normalizedUrl, '->', finalUrl);
        } catch (getError) {
          console.error('Both HEAD and GET failed:', getError);
          // Continue with original URL
        }
      }
    }

    // Extract room ID from the final URL
    const roomIdMatch = finalUrl.match(/\/rooms\/(\d+)/i);

    if (!roomIdMatch) {
      console.error('No room ID found in URL:', finalUrl);
      return null;
    }

    const roomId = roomIdMatch[1];

    // Check if this is an invalid path (search, wishlists, etc.)
    if (
      finalUrl.match(/\/s\//i) ||
      finalUrl.match(/\/wishlists/i) ||
      finalUrl.match(/\/experiences/i)
    ) {
      console.error('Invalid Airbnb URL type:', finalUrl);
      return null;
    }

    // Return normalized URL without query params or fragments
    return `https://www.airbnb.com/rooms/${roomId}`;

  } catch (error) {
    console.error('Error in normalizeAirbnbUrl:', error);
    return null;
  }
}
