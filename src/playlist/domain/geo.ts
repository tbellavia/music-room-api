export type Coordinates = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

// Haversine formula: great-circle distance between two points on the Earth
export function distanceInMeters(a: Coordinates, b: Coordinates): number {
  const deltaLatitude = toRadians(b.latitude - a.latitude);
  const deltaLongitude = toRadians(b.longitude - a.longitude);

  const h =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}
