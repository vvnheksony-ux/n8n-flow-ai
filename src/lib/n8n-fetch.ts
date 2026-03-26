/**
 * Fetch wrapper that handles HTTP→HTTPS redirects properly.
 *
 * Many n8n instances behind nginx redirect HTTP to HTTPS (301).
 * Standard fetch doesn't re-send POST body after a redirect.
 * This wrapper detects the redirect and retries with the new URL.
 */
export async function n8nFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, { ...options, redirect: 'manual' });

  // If we get a redirect (301/302/307/308), retry with the new URL
  if ([301, 302, 307, 308].includes(res.status)) {
    const location = res.headers.get('location');
    if (location) {
      return fetch(location, options);
    }
  }

  return res;
}
