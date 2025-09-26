// Lightweight IP geolocation helper with zero-config public APIs.
// Strategy: Try ipapi.co first (good accuracy, HTTPS, no key needed for light usage),
// fall back to ipwho.is if it fails. Includes a small in-memory cache.

interface GeoResult {
  city?: string;
  region?: string;
  country?: string;
  source?: string;
}

const cache = new Map<string, { data: GeoResult; expires: number }>();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

function isPrivate(ip?: string | null) {
  if (!ip) return true;
  return (
    ip.startsWith("10.") ||
    ip.startsWith("127.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("::1") ||
    ip.startsWith("172.") && (() => { const second = parseInt(ip.split(".")[1] || ""); return second >= 16 && second <= 31; })()
  );
}

export async function lookupGeo(ip?: string | null): Promise<GeoResult | undefined> {
  if (!ip || isPrivate(ip)) {
    return { city: undefined, region: undefined, country: undefined, source: isPrivate(ip) ? "private" : undefined };
  }
  const now = Date.now();
  const cached = cache.get(ip);
  if (cached && cached.expires > now) return cached.data;

  // Helper to safely fetch JSON
  async function safeFetch(url: string): Promise<any | undefined> {
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
      if (!res.ok) return undefined;
      return await res.json();
    } catch {
      return undefined;
    }
  }

  // Primary: ipapi.co
  const primary = await safeFetch(`https://ipapi.co/${ip}/json/`);
  if (primary && !primary.error) {
    const data: GeoResult = {
      city: primary.city || undefined,
      region: primary.region || primary.region_code || undefined,
      country: primary.country_name || primary.country || undefined,
      source: 'ipapi.co'
    };
    cache.set(ip, { data, expires: now + TTL_MS });
    return data;
  }

  // Fallback: ipwho.is
  const fallback = await safeFetch(`https://ipwho.is/${ip}`);
  if (fallback && fallback.success !== false) {
    const data: GeoResult = {
      city: fallback.city || undefined,
      region: fallback.region || fallback.region_code || undefined,
      country: fallback.country || undefined,
      source: 'ipwho.is'
    };
    cache.set(ip, { data, expires: now + TTL_MS });
    return data;
  }

  return undefined;
}
