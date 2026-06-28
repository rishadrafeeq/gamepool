export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function filterByRadius<T extends { latitude?: number | null; longitude?: number | null }>(
  items: T[],
  origin: { lat: number; lng: number },
  radiusKm: number,
): Array<T & { distanceKm: number }> {
  return items
    .map((item) => {
      const lat = item.latitude != null ? Number(item.latitude) : null;
      const lng = item.longitude != null ? Number(item.longitude) : null;
      if (lat == null || lng == null) return null;
      const distanceKm = haversineKm(origin.lat, origin.lng, lat, lng);
      if (distanceKm > radiusKm) return null;
      return { ...item, distanceKm: Math.round(distanceKm * 10) / 10 };
    })
    .filter((item): item is T & { distanceKm: number } => item !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
