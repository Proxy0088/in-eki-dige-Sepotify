import { Capacitor } from '@capacitor/core';

const CANDIDATE_HOSTS = [
  'http://127.0.0.1:3000',
  'http://192.168.1.57:3000',
];

let activeBaseUrl: string = 'http://127.0.0.1:3000';
let isProbing = false;
let hasProbed = false;

/**
 * Probes candidate backend hosts to detect whether adb reverse (127.0.0.1)
 * or local Wi-Fi (192.168.1.57) is currently active.
 */
export async function probeBackendHost(): Promise<string> {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
    return '';
  }
  if (hasProbed) {
    return activeBaseUrl;
  }
  if (isProbing) {
    return activeBaseUrl;
  }

  isProbing = true;
  for (const host of CANDIDATE_HOSTS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${host}/api/health`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timer);
      if (res.ok) {
        activeBaseUrl = host;
        hasProbed = true;
        isProbing = false;
        console.log('[API] Connected to active backend host:', host);
        return host;
      }
    } catch {
      // Host not reachable, try next
    }
  }

  isProbing = false;
  hasProbed = true;
  return activeBaseUrl;
}

// Start probing early on native platforms
if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
  probeBackendHost().catch(() => {});
}

/**
 * Returns the base URL for API requests.
 * In native Capacitor on Android/iOS, routes to active backend host.
 * In web browser, relative endpoints (/api/...) are proxied seamlessly by Vite.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    return activeBaseUrl;
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
