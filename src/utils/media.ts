const API_ORIGIN = (() => {
  try {
    return new URL(import.meta.env.VITE_API_URL || 'http://localhost:5001/api').origin;
  } catch {
    return 'http://localhost:5001';
  }
})();

/**
 * Uploaded media can be stored with a host that only resolves on the device that
 * uploaded it (e.g. Android emulator's 10.0.2.2 loopback alias). Since uploads are
 * always served by the same backend as the API, swap in the API's origin so the
 * admin panel can render the file regardless of which host it was recorded with.
 */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return `${API_ORIGIN}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}
