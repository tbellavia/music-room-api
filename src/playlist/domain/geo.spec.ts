import { distanceInMeters } from './geo';

describe('distanceInMeters', () => {
  it('returns 0 for the same point', () => {
    const point = { latitude: 48.8566, longitude: 2.3522 };

    expect(distanceInMeters(point, point)).toBe(0);
  });

  it('returns ~111 km for one degree of latitude', () => {
    const distance = distanceInMeters(
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 0 },
    );

    expect(distance).toBeCloseTo(111_195, -1);
  });

  it('returns ~391.5 km between Paris and Lyon', () => {
    const paris = { latitude: 48.8566, longitude: 2.3522 };
    const lyon = { latitude: 45.764, longitude: 4.8357 };

    expect(distanceInMeters(paris, lyon) / 1000).toBeCloseTo(391.5, 0);
  });

  it('is symmetric', () => {
    const a = { latitude: 48.8966, longitude: 2.3184 };
    const b = { latitude: 48.8566, longitude: 2.3522 };

    expect(distanceInMeters(a, b)).toBeCloseTo(distanceInMeters(b, a), 6);
  });
});
