export async function getDistances(origin, depots){
  const key = (typeof window !== 'undefined' && window.ORS_KEY) || process.env.ORS_KEY;
  if(!key){
    // Fallback to a simple haversine calculation when no API key is provided
    const R = 6371; // km
    function haversine(o,d){
      const [lon1,lat1] = o;
      const [lon2,lat2] = d;
      const p = Math.PI/180;
      const dLat = (lat2-lat1)*p;
      const dLon = (lon2-lon1)*p;
      const a = Math.sin(dLat/2)**2 + Math.cos(lat1*p)*Math.cos(lat2*p)*Math.sin(dLon/2)**2;
      return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
    }
    return depots.map(d=>haversine(origin,d));
  }
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
