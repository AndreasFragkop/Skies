import { wmoInfo } from './utils.js';

async function geocode(name) {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`
  );
  return res.json();
}

export async function geocodeWithFallback(city) {
  let geoData = await geocode(city);
  if (!geoData.results || !geoData.results.length) {
    const fallbacks = [city.replace(/tromso/i, 'Tromsø'), `${city}, Norway`];
    for (const fallback of fallbacks) {
      if (!fallback || fallback === city) continue;
      geoData = await geocode(fallback);
      if (geoData.results && geoData.results.length) break;
    }
  }
  if (!geoData.results || !geoData.results.length) throw new Error('Not found');
  return geoData.results[0];
}

export async function fetchForecastByCoords(latitude, longitude) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,uv_index` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset` +
      `&timezone=auto&forecast_days=5&timeformat=unixtime`
  );
  return res.json();
}

export async function fetchQuickCitySnapshot(query) {
  const geo = await geocodeWithFallback(query);
  const weather = await fetch(
    `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${geo.latitude}&longitude=${geo.longitude}` +
      `&current=temperature_2m,weather_code` +
      `&timezone=auto`
  ).then((res) => res.json());

  const [cond, icon] = wmoInfo(weather.current?.weather_code);
  return {
    temp: Math.round(weather.current?.temperature_2m ?? 0),
    cond,
    icon,
    latitude: geo.latitude,
    longitude: geo.longitude,
  };
}
