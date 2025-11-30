// TypeScript types for webhook responses and validation

export interface WebhookResponse {
  status: string;
  recommendations?: string;
  record_id?: string;
  recordId?: string;
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ErrorInfo {
  userMessage: string;
  technicalMessage: string;
  action: 'retry' | 'redirect' | 'contact';
}

// Error message constants
export const ERROR_MESSAGES = {
  MISSING_RECORD_ID: {
    userMessage: 'We couldn\'t find your analysis session. Please try analyzing your listing again.',
    technicalMessage: 'recordId missing from URL params',
    action: 'redirect' as const,
  },
  INVALID_RECORD_ID: {
    userMessage: 'The analysis session appears to be invalid. Please start a new analysis.',
    technicalMessage: 'recordId format invalid (should start with "rec")',
    action: 'redirect' as const,
  },
  WEBHOOK_FAILED: {
    userMessage: 'We couldn\'t process your request. Please check your connection and try again.',
    technicalMessage: 'Webhook request failed',
    action: 'retry' as const,
  },
  WEBHOOK_INVALID_RESPONSE: {
    userMessage: 'We received an unexpected response. Please try again in a moment.',
    technicalMessage: 'Webhook response missing required fields',
    action: 'retry' as const,
  },
  TIMEOUT: {
    userMessage: 'The analysis is taking longer than expected. Please try again.',
    technicalMessage: 'Request timed out',
    action: 'retry' as const,
  },
  NETWORK_ERROR: {
    userMessage: 'Connection error. Please check your internet and try again.',
    technicalMessage: 'Network request failed',
    action: 'retry' as const,
  },
  MISSING_RECOMMENDATIONS: {
    userMessage: 'No recommendations found. Please try analyzing your listing again.',
    technicalMessage: 'recommendations field missing from response',
    action: 'redirect' as const,
  },
};

/**
 * Validates that a recordId is present and properly formatted
 */
export function validateRecordId(recordId: string | null | undefined): ValidationResult {
  if (!recordId) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.MISSING_RECORD_ID.technicalMessage,
    };
  }

  // Airtable record IDs start with "rec" followed by alphanumeric characters
  if (!recordId.startsWith('rec') || recordId.length < 10) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.INVALID_RECORD_ID.technicalMessage,
    };
  }

  return { isValid: true };
}

/**
 * Validates webhook response has all required fields
 * Note: Recommendations are now fetched from Airtable, not the webhook response
 */
export function validateWebhookResponse(data: any): ValidationResult {
  if (!data) {
    return {
      isValid: false,
      error: 'Response data is null or undefined',
    };
  }

  // Check status
  if (data.status !== 'success') {
    return {
      isValid: false,
      error: `Webhook returned status: ${data.status || 'undefined'}`,
    };
  }

  // Check for recordId (support both formats)
  const recordId = data.recordId || data.record_id;
  if (!recordId) {
    return {
      isValid: false,
      error: 'recordId missing from webhook response',
    };
  }

  // Validate recordId format
  const recordIdValidation = validateRecordId(recordId);
  if (!recordIdValidation.isValid) {
    return recordIdValidation;
  }

  // Recommendations are no longer required in webhook response
  // They will be fetched from Airtable on the results page

  return { isValid: true };
}

/**
 * Track errors to GA4 for monitoring
 */
export function trackError(
  errorType: string,
  errorMessage: string,
  additionalParams?: Record<string, any>
) {
  try {
    // Console logging for debugging
    console.error(`[Error] ${errorType}:`, errorMessage, additionalParams || {});

    // GA4 tracking
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'error_occurred', {
        error_type: errorType,
        error_message: errorMessage,
        ...additionalParams,
      });
    }
  } catch (e) {
    console.error('Failed to track error:', e);
  }
}

/**
 * Get user-friendly error info based on error type
 */
export function getErrorInfo(errorType: keyof typeof ERROR_MESSAGES): ErrorInfo {
  return ERROR_MESSAGES[errorType];
}
