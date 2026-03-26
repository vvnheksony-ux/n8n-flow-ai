/**
 * Fetch wrapper — plain fetch that works on both Node.js and edge runtimes (Cloudflare Workers).
 */
export async function n8nFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, options);
}
