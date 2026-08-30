/**
 * Enterprise API Client Gateway
 *
 * Security & Reliability Features:
 * - Auto-attaches Authorization: Bearer <token> from sessionStorage on every request
 * - Anti-CSRF via X-CSRF-Token header
 * - Request Correlation IDs (X-Request-ID) for observability
 * - Idempotency Key preservation across retries for mutating operations
 * - Exponential backoff with jitter for transient errors (429, 502, 503, 504)
 * - Single automatic token refresh on 401, then logout if still 401
 * - 403 events are logged as security events and never retried
 * - Role is NEVER sent as a client header — it lives in the JWT only
 */

import { STORAGE_KEYS_REF } from './authStore.js';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

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
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
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

function getStoredToken() {
  return sessionStorage.getItem('ims_access_token');
}

function getStoredRefreshToken() {
  return sessionStorage.getItem('ims_refresh_token');
}

function updateStoredToken(token) {
  sessionStorage.setItem('ims_access_token', token);
}

function clearAllStorage() {
  ['ims_access_token', 'ims_refresh_token', 'ims_user', 'ims_session_id'].forEach((k) =>
    sessionStorage.removeItem(k)
  );
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
      message = data?.detail || 'Validation failed. Please check the highlighted fields.';
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

  return { category, status, message, requestId, data };
}

// Single-flight refresh promise to prevent multiple simultaneous refresh calls
let refreshPromise = null;

export async function attemptTokenRefresh() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      clearAllStorage();
      window.dispatchEvent(new CustomEvent('ims:auth:logout'));
      return null;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        clearAllStorage();
        window.dispatchEvent(new CustomEvent('ims:auth:logout'));
        return null;
      }

      const data = await response.json();
      updateStoredToken(data.access_token);
      window.dispatchEvent(new CustomEvent('ims:auth:token-refreshed', { detail: { token: data.access_token } }));
      return data.access_token;
    } catch {
      clearAllStorage();
      window.dispatchEvent(new CustomEvent('ims:auth:logout'));
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Core API fetch with automatic auth, retry, and error normalization.
 *
 * @param {string} path - API path (e.g. '/products') — base URL is auto-prepended
 * @param {object} options - fetch options (method, body, headers, etc.)
 * @param {number} maxAttempts - max retry attempts for transient errors
 */
export async function apiFetch(path, options = {}, maxAttempts = 4, baseDelayMs = 1000, maxDelayMs = 8000) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const method = (options.method || 'GET').toUpperCase();
  const requestId = options.requestId || `req-${generateUUID().substring(0, 8)}`;
  const csrfToken = getCookie('csrf_token') || sessionStorage.getItem('csrf_token') || '';

  // Preserve SAME idempotency key across retries for mutating operations
  const idempotencyKey = options.idempotencyKey || (MUTATING_METHODS.has(method) ? generateUUID() : null);

  let currentToken = getStoredToken();

  function buildHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Request-ID': requestId,
      ...(options.headers || {}),
    };

    // Attach Bearer token from sessionStorage — role is encoded in the JWT, not sent separately
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    if (MUTATING_METHODS.has(method)) {
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
      if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    }

    return headers;
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, { ...options, method, headers: buildHeaders() });

      // 401 — attempt single token refresh, then retry
      if (response.status === 401) {
        if (attempt === 1) {
          console.warn(`[AUTH] 401 on ${url}. Attempting token refresh...`);
          const newToken = await attemptTokenRefresh();
          if (newToken) {
            currentToken = newToken;
            continue; // retry with new token
          }
        }
        const errorData = await response.json().catch(() => ({}));
        throw normalizeError(401, errorData, requestId);
      }

      // 403 — security event, never retry
      if (response.status === 403) {
        console.warn(`[SECURITY_EVENT] 403 Permission Denied: ${method} ${url} (Request-ID: ${requestId})`);
        const errorData = await response.json().catch(() => ({}));
        throw normalizeError(403, errorData, requestId);
      }

      // Non-retryable client errors
      if (NON_RETRYABLE_STATUSES.has(response.status)) {
        const errorData = await response.json().catch(() => ({}));
        throw normalizeError(response.status, errorData, requestId);
      }

      // Transient errors — exponential backoff + jitter
      if ([429, 502, 503, 504].includes(response.status) && attempt < maxAttempts) {
        let sleepTime = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        const retryAfter = response.headers.get('Retry-After');
        if (response.status === 429 && retryAfter) {
          const parsed = parseInt(retryAfter, 10);
          if (!isNaN(parsed)) sleepTime = parsed * 1000;
        } else {
          sleepTime = Math.round(sleepTime * (Math.random() * 0.5 + 0.75));
        }
        console.info(`[RETRY] Attempt ${attempt}/${maxAttempts} → status ${response.status}. Retrying in ${sleepTime}ms...`);
        await new Promise((r) => setTimeout(r, sleepTime));
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw normalizeError(response.status, errorData, requestId);
      }

      return response;
    } catch (err) {
      // Rethrow immediately for non-retryable classified errors
      if (
        err.category &&
        [
          ERROR_CATEGORIES.PERMISSION_DENIED,
          ERROR_CATEGORIES.AUTHENTICATION_REQUIRED,
          ERROR_CATEGORIES.VALIDATION_ERROR,
          ERROR_CATEGORIES.CONFLICT,
        ].includes(err.category)
      ) {
        throw err;
      }

      if (attempt < maxAttempts) {
        const sleepTime = Math.round(
          Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs) * (Math.random() * 0.5 + 0.75)
        );
        await new Promise((r) => setTimeout(r, sleepTime));
        continue;
      }

      throw err.category ? err : normalizeError(0, { detail: err.message }, requestId);
    }
  }
}

/**
 * Convenience helpers with automatic JSON parsing
 */
export async function apiGet(path, options = {}) {
  const res = await apiFetch(path, { ...options, method: 'GET' });
  return res.json();
}

export async function apiPost(path, body, options = {}) {
  const res = await apiFetch(path, { ...options, method: 'POST', body: JSON.stringify(body) });
  return res.json();
}

export async function apiPut(path, body, options = {}) {
  const res = await apiFetch(path, { ...options, method: 'PUT', body: JSON.stringify(body) });
  return res.json();
}

export async function apiPatch(path, body, options = {}) {
  const res = await apiFetch(path, { ...options, method: 'PATCH', body: JSON.stringify(body) });
  return res.json();
}

export async function apiDelete(path, options = {}) {
  const res = await apiFetch(path, { ...options, method: 'DELETE' });
  if (res.status === 204) return null;
  return res.json();
}
