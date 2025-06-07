export async function getDistances(origin, depots){
  const key = (typeof window !== 'undefined' && window.ORS_KEY) || process.env.ORS_KEY;
  if(!key) throw new Error('Missing ORS key');
  const body = {
    locations: [origin, ...depots],
    sources: [0],
    destinations: depots.map((_, i) => i + 1),
    metrics: ['distance'],
    units: 'km'
  };

  const res = await fetch('https://api.openrouteservice.org/v2/matrix/driving-car', {
    method: 'POST',
    headers: {
      'Authorization': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if(!res.ok){
    const err = new Error('ORS request failed');
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const dists = data.distances && data.distances[0];
  return Array.isArray(dists) ? dists : [];
}
// Matrix endpoint has 3500 element quota per request
