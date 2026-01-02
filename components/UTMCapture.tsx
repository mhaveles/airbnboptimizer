'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { captureUTMParams } from '@/lib/utm';

/**
 * Client component that captures UTM parameters from URL on page load
 * and stores them in sessionStorage for persistence across navigation.
 *
 * Use this component in layouts or pages where users might land with UTM parameters.
 */
export default function UTMCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    captureUTMParams(searchParams);
  }, [searchParams]);

  // This component doesn't render anything
  return null;
}
