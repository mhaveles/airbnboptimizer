/**
 * UTM Parameter Tracking Utility
 *
 * Captures and persists UTM parameters throughout the user's session.
 * UTM parameters are stored in sessionStorage when first detected and
 * retrieved for webhook calls.
 */

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const STORAGE_KEY = 'airbnb_optimizer_utm_params';

export type UTMParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

/**
 * Captures UTM parameters from URL search params and stores them in sessionStorage.
 * Only stores if at least one UTM parameter is present.
 * Does not overwrite existing stored UTMs unless new ones are provided.
 */
export function captureUTMParams(searchParams: URLSearchParams): void {
  if (typeof window === 'undefined') return;

  const utmParams: UTMParams = {};
  let hasUTM = false;

  UTM_KEYS.forEach(key => {
    const value = searchParams.get(key);
    if (value) {
      utmParams[key] = value;
      hasUTM = true;
    }
  });

  // Only store if we found at least one UTM parameter
  if (hasUTM) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utmParams));
      console.log('[UTM] Captured and stored:', utmParams);
    } catch (error) {
      console.error('[UTM] Failed to store UTM params:', error);
    }
  }
}

/**
 * Retrieves stored UTM parameters from sessionStorage.
 * Returns empty object if no UTM parameters are stored.
 */
export function getStoredUTMParams(): UTMParams {
  if (typeof window === 'undefined') return {};

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const params = JSON.parse(stored);
      console.log('[UTM] Retrieved stored params:', params);
      return params;
    }
  } catch (error) {
    console.error('[UTM] Failed to retrieve UTM params:', error);
  }

  return {};
}

/**
 * Clears stored UTM parameters from sessionStorage.
 * Useful for testing or manual cleanup.
 */
export function clearUTMParams(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(STORAGE_KEY);
    console.log('[UTM] Cleared stored params');
  } catch (error) {
    console.error('[UTM] Failed to clear UTM params:', error);
  }
}

/**
 * Builds a URL query string with UTM parameters appended.
 * Merges stored UTM params with any additional params provided.
 */
export function buildURLWithUTMs(baseUrl: string, additionalParams?: Record<string, string>): string {
  const utmParams = getStoredUTMParams();
  const params = new URLSearchParams();

  // Add additional params first
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
  }

  // Add UTM params
  Object.entries(utmParams).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}
