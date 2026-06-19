/**
 * Craftify Emergency — Geolocation Utilities
 *
 * Haversine formula for calculating distance between two lat/lng coordinates.
 * Used for filtering workers within a 15km radius.
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians.
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate the distance between two coordinates using the Haversine formula.
 * Returns distance in kilometers.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Default search radius in km.
 */
export const DEFAULT_SEARCH_RADIUS_KM = 15;
