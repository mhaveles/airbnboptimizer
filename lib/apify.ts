const APIFY_BASE_URL = 'https://api.apify.com/v2';
const ACTOR_ID = 'pIyP4eyT6kBUZ2fHe'; // onidivo/airbnb-scraper

function getToken(): string {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error('APIFY_API_TOKEN is not configured');
  }
  return token;
}

export interface ApifyRunResult {
  runId: string;
  datasetId: string;
}

/**
 * Start an Apify actor run for the given Airbnb URL.
 * Returns the run ID and default dataset ID.
 */
export async function startActorRun(airbnbUrl: string): Promise<ApifyRunResult> {
  const token = getToken();

  const response = await fetch(
    `${APIFY_BASE_URL}/acts/${ACTOR_ID}/runs?token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addMoreHostInfo: true,
        calendarMonths: 0,
        currency: 'USD',
        extraData: true,
        maxReviews: 10,
        proxyConfiguration: { useApifyProxy: true },
        startUrls: [{ url: airbnbUrl }],
        maxItems: 1,
        timeoutMs: 60000,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify startActorRun failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return {
    runId: data.data.id,
    datasetId: data.data.defaultDatasetId,
  };
}

/**
 * Get the current status of an Apify run.
 * Returns the status string: READY, RUNNING, SUCCEEDED, FAILED, ABORTED, TIMED-OUT
 */
export async function getRunStatus(runId: string): Promise<string> {
  const token = getToken();

  const response = await fetch(
    `${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify getRunStatus failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.data.status;
}

/**
 * Fetch the dataset items from a completed Apify run.
 * Returns the array of scraped listing objects.
 */
export async function fetchDatasetItems(datasetId: string): Promise<any[]> {
  const token = getToken();

  const response = await fetch(
    `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${token}&format=json`
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify fetchDatasetItems failed (${response.status}): ${text}`);
  }

  return response.json();
}
