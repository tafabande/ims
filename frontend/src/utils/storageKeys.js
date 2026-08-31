/**
 * Single source of truth for session and storage keys.
 * Decoupled from authStore and apiClient to eliminate circular dependencies.
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'ims_access_token',
  REFRESH_TOKEN: 'ims_refresh_token',
  USER: 'ims_user',
  SESSION_ID: 'ims_session_id',
};
