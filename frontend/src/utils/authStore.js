/**
 * Centralized Authentication Store for IMS
 *
 * Architecture:
 * - React Context + useReducer for predictable state transitions
 * - sessionStorage (NOT localStorage) to prevent cross-tab token leakage
 * - Full state wipe on logout via sessionKey increment (forces full remount)
 * - Role and permissions are ALWAYS sourced from the server-issued JWT
 * - No client-side role selection is permitted
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'ims_access_token',
  REFRESH_TOKEN: 'ims_refresh_token',
  USER: 'ims_user',
  SESSION_ID: 'ims_session_id',
};

// Exported reference so apiClient.js can read tokens without importing the context
export const STORAGE_KEYS_REF = STORAGE_KEYS;

// ─── Initial State ────────────────────────────────────────────────────────────
function getInitialState() {
  try {
    const token = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const userJson = sessionStorage.getItem(STORAGE_KEYS.USER);
    const sessionId = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
    const user = userJson ? JSON.parse(userJson) : null;

    if (token && user) {
      return {
        isAuthenticated: true,
        isLoading: false,
        token,
        refreshToken,
        user,
        sessionId,
        sessionKey: 1,
        error: null,
      };
    }
  } catch {
    // Corrupt storage — start fresh
    clearStorage();
  }

  return {
    isAuthenticated: false,
    isLoading: false,
    token: null,
    refreshToken: null,
    user: null,
    sessionId: null,
    sessionKey: 1,
    error: null,
  };
}

function clearStorage() {
  Object.values(STORAGE_KEYS).forEach((key) => sessionStorage.removeItem(key));
}

function persistSession(token, refreshToken, user, sessionId) {
  sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  if (sessionId) sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
}

// ─── Reducer ─────────────────────────────────────────────────────────────────
function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        user: action.payload.user,
        sessionId: action.payload.sessionId,
        sessionKey: state.sessionKey, // keep current key — user is fresh
        error: null,
      };
    case 'LOGIN_FAILURE':
      return { ...state, isLoading: false, error: action.payload.error };
    case 'LOGOUT':
      // Increment sessionKey to force FULL remount of entire app — zero data bleed
      return {
        ...getInitialState(),
        isAuthenticated: false,
        sessionKey: state.sessionKey + 1,
        error: null,
      };
    case 'TOKEN_REFRESHED':
      sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, action.payload.token);
      return { ...state, token: action.payload.token };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, undefined, getInitialState);

  /**
   * Login: POST /auth/login
   * Role is determined EXCLUSIVELY by the server from credentials.
   * The login UI provides username+password only — no role selection.
   */
  const login = useCallback(async (usernameOrEmail, password) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameOrEmail.trim(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed. Check your credentials.');
      }

      const user = {
        id: data.user_id,
        userCode: data.user_code,
        fullName: data.full_name,
        email: data.email,
        role: data.role,
        permissions: data.permissions || [],
      };

      persistSession(data.access_token, data.refresh_token, user, data.session_id);

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          user,
          sessionId: data.session_id,
        },
      });

      return { success: true, user };
    } catch (err) {
      dispatch({ type: 'LOGIN_FAILURE', payload: { error: err.message } });
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Logout: POST /auth/logout → wipe ALL state → force full app remount
   * This is the ONLY safe way to switch users — no data from previous session survives.
   */
  const logout = useCallback(async () => {
    const token = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const sessionId = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);

    // Best-effort server-side session invalidation (don't block on failure)
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch {
      // Ignore network errors on logout — local wipe always happens
    }

    // 1. Wipe all sessionStorage
    clearStorage();

    // 2. Dispatch LOGOUT → sessionKey increments → root <App key={sessionKey}> remounts
    dispatch({ type: 'LOGOUT' });
  }, []);

  // Listen for single-flight token refresh events from apiClient
  useEffect(() => {
    const handleTokenRefreshed = (e) => {
      if (e.detail?.token) {
        dispatch({ type: 'TOKEN_REFRESHED', payload: { token: e.detail.token } });
      }
    };
    window.addEventListener('ims:auth:token-refreshed', handleTokenRefreshed);
    return () => window.removeEventListener('ims:auth:token-refreshed', handleTokenRefreshed);
  }, []);

  /**
   * Refresh access token using single-flight coalesced attemptTokenRefresh from apiClient
   * Returns new access token string, or null if refresh fails (triggers logout)
   */
  const refreshAccessToken = useCallback(async () => {
    const newToken = await attemptTokenRefresh();
    if (newToken) {
      dispatch({ type: 'TOKEN_REFRESHED', payload: { token: newToken } });
    } else {
      await logout();
    }
    return newToken;
  }, [logout]);

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  const value = {
    ...state,
    login,
    logout,
    refreshAccessToken,
    clearError,
  };

  return React.createElement(AuthContext.Provider, { value }, children);

}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

/**
 * Capability check using SERVER-ISSUED permissions (from JWT, stored in user object).
 * This is the authoritative check — it uses the permissions array returned by the server,
 * NOT the local ROLE_PERMISSIONS map.
 *
 * Falls back to local map if no server permissions available (degraded mode).
 */
export function usePermission(permission) {
  const { user } = useAuth();
  if (!user) return false;
  return user.permissions?.includes(permission) ?? false;
}
