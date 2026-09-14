/**
 * Geometry helpers for drawing the routes.
 */

/**
 * Corner-cutting smoothing (Chaikin's algorithm).
 *
 * Unlike a Catmull-Rom spline, Chaikin never leaves the convex hull of the
 * original path, so a smoothed curve cannot wander onto land inside a narrow
 * strait. Endpoints are kept as they are so ports stay in place.
 */
export function smoothPath(points, iterations = 2) {
  let pts = points;
  for (let it = 0; it < iterations; it += 1) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i += 1) {
      const [aLat, aLng] = pts[i];
      const [bLat, bLng] = pts[i + 1];
      out.push([aLat * 0.75 + bLat * 0.25, aLng * 0.75 + bLng * 0.25]);
      out.push([aLat * 0.25 + bLat * 0.75, aLng * 0.25 + bLng * 0.75]);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}

const shift = (path, delta) => path.map(([lat, lng]) => [lat, lng + delta]);

/**
 * Returns the copies of a path needed to keep it visible on both sides of the
 * antimeridian. Trans-Pacific routes are stored with continuous longitudes
 * beyond ±180°; a copy shifted by ∓360° makes them appear in the
 * Atlantic-centred view as well.
 */
export function pathVariants(path) {
  let min = Infinity;
  let max = -Infinity;
  for (const [, lng] of path) {
    if (lng < min) min = lng;
    if (lng > max) max = lng;
  }
  const out = [path];
  if (min < -180) out.push(shift(path, 360));
  if (max > 180) out.push(shift(path, -360));
  return out;
}

/** Wraps a longitude into [-180, 180] for marker placement. */
export const wrapLng = (lng) => ((((lng + 180) % 360) + 360) % 360) - 180;

/** Approximate great-circle length of a path, in nautical miles. */
export function pathLengthNm(points) {
  const R = 3440.065; // Earth radius in nautical miles
  const rad = (d) => (d * Math.PI) / 180;
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [lat1, lng1] = points[i];
    const [lat2, lng2] = points[i + 1];
    const dLat = rad(lat2 - lat1);
    const dLng = rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    total += 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  return total;
}
