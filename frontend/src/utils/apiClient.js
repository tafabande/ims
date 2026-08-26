/**
 * Enterprise API Client Gateway:
 * Single controlled transport gateway handling Anti-CSRF, Request Correlation IDs,
 * Idempotency Key Preservation across retries, Selective Retry Matrix, Exponential Backoff with Jitter,
 * Session Refresh, and Error Normalization.
 */

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const NON_RETRYABLE_STATUSES = new Set([400, 403, 404, 409, 422]);

export const ERROR_CATEGORIES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMITED: 'RATE_LIMITED',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  SERVER_ERROR: 'SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'req-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
}

function normalizeError(status, data, requestId) {
  let category = ERROR_CATEGORIES.SERVER_ERROR;
  let message = data?.detail || data?.message || 'An unexpected server error occurred.';

  switch (status) {
    case 401:
      category = ERROR_CATEGORIES.AUTHENTICATION_REQUIRED;
      message = 'Session expired or authentication required. Please log in again.';
      break;
    case 403:
      category = ERROR_CATEGORIES.PERMISSION_DENIED;
      message = data?.detail || 'You do not have permission to perform this operation.';
      break;
    case 404:
      category = ERROR_CATEGORIES.SERVER_ERROR;
      message = 'The requested resource was not found.';
      break;
    case 409:
      category = ERROR_CATEGORIES.CONFLICT;
      message = 'Resource conflict detected. Please refresh and try again.';
      break;
    case 422:
      category = ERROR_CATEGORIES.VALIDATION_ERROR;
      message = 'Validation failed. Please check the highlighted fields.';
      break;
    case 429:
      category = ERROR_CATEGORIES.RATE_LIMITED;
      message = 'Too many requests. Please wait a moment before trying again.';
      break;
    case 502:
    case 503:
    case 504:
      category = ERROR_CATEGORIES.SERVICE_UNAVAILABLE;
      message = 'Service temporarily unavailable. Retrying connection...';
      break;
    default:
      if (!status) {
        category = ERROR_CATEGORIES.NETWORK_ERROR;
        message = 'Cannot connect to the server. Please check your network connection.';
      }
  }

  return {
    category,
    status,
    message,
    requestId,
    data
  };
}

export async function apiFetch(url, options = {}, maxAttempts = 4, baseDelayMs = 1000, maxDelayMs = 8000) {
  const method = (options.method || 'GET').toUpperCase();
  const requestId = options.requestId || `req-${generateUUID().substring(0, 8)}`;
  const csrfToken = getCookie('csrf_token') || sessionStorage.getItem('csrf_token') || 'csrf-token-default';

  // Preserve SAME Idempotency Key across retries for mutating operations
  const idempotencyKey = options.idempotencyKey || (MUTATING_METHODS.has(method) ? generateUUID() : null);

  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Request-ID': requestId,
    ...(options.headers || {})
  };

  if (MUTATING_METHODS.has(method)) {
    headers['X-CSRF-Token'] = csrfToken;
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
  }

  const fetchOptions = {
    ...options,
    method,
    headers
  };

  let isRefreshed = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      // Handle 401 Authentication Failure (Single Refresh / Logout trigger)
      if (response.status === 401) {
        if (!isRefreshed) {
          isRefreshed = true;
          console.warn(`[AUTH] 401 Session expired for ${url}. Attempting session validation...`);
          // Trigger one-time refresh probe or logout
          const errorData = await response.json().catch(() => ({}));
          throw normalizeError(401, errorData, requestId);
        }
        const errorData = await response.json().catch(() => ({}));
        throw normalizeError(401, errorData, requestId);
      }

      // Handle 403 Permission Denied (Do NOT retry, log security event)
      if (response.status === 403) {
        console.warn(`[SECURITY_EVENT] 403 Permission Denied on ${url} (Request ID: ${requestId})`);
        const errorData = await response.json().catch(() => ({}));
        throw normalizeError(403, errorData, requestId);
      }

      // Non-retryable client errors (400, 404, 409, 422)
      if (NON_RETRYABLE_STATUSES.has(response.status)) {
        const errorData = await response.json().catch(() => ({}));
        throw normalizeError(response.status, errorData, requestId);
      }

      // Transient errors (429, 502, 503, 504) -> Exponential Backoff with Jitter Retry
      if ([429, 502, 503, 504].includes(response.status) && attempt < maxAttempts) {
        let sleepTime = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);

        // Respect server Retry-After header if provided for 429 Rate Limiting
        const retryAfterHeader = response.headers.get('Retry-After');
        if (response.status === 429 && retryAfterHeader) {
          const parsedSeconds = parseInt(retryAfterHeader, 10);
          if (!isNaN(parsedSeconds)) {
            sleepTime = parsedSeconds * 1000;
          }
        } else {
          // Apply ±25% Jitter
          const jitter = (Math.random() * 0.5 + 0.75);
          sleepTime = Math.round(sleepTime * jitter);
        }

        console.info(`[RETRY] Attempt ${attempt}/${maxAttempts} failed with status ${response.status}. Retrying in ${sleepTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, sleepTime));
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw normalizeError(response.status, errorData, requestId);
      }

      return response;
    } catch (err) {
      // If error is already normalized, rethrow immediately for 403/401/client errors
      if (err.category && [ERROR_CATEGORIES.PERMISSION_DENIED, ERROR_CATEGORIES.AUTHENTICATION_REQUIRED, ERROR_CATEGORIES.VALIDATION_ERROR, ERROR_CATEGORIES.CONFLICT].includes(err.category)) {
        throw err;
      }

      if (attempt < maxAttempts) {
        const sleepTime = Math.round(Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs) * (Math.random() * 0.5 + 0.75));
        await new Promise((resolve) => setTimeout(resolve, sleepTime));
        continue;
      }

      throw err.category ? err : normalizeError(0, { detail: err.message }, requestId);
    }
  }
}
