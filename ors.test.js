import { getDistances } from './src/lib/ors.js';

test('falls back to haversine when no key', async () => {
  const origin = [0,0];
  const depots = [[1,0],[0,1]];
  const dists = await getDistances(origin, depots);
  expect(dists.length).toBe(2);
  // Around 111 km per degree
  expect(dists[0]).toBeGreaterThan(100);
  expect(dists[1]).toBeGreaterThan(100);
});
