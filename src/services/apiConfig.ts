import { Capacitor } from '@capacitor/core';

/**
 * Returns the base URL for API requests.
 * In native Capacitor on Android/iOS, routes to local reverse-forwarded bridge (http://127.0.0.1:3000).
 * In web browser, relative endpoints (/api/...) are proxied seamlessly by Vite.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    return 'http://127.0.0.1:3000';
  }
  return '';
}

/**
 * Normalizes an API path to include base URL if needed.
 */
export function apiUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://') || endpoint.startsWith('blob:')) {
    return endpoint;
  }
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
}
