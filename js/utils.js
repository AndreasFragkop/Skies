// WMO weather code mapping returned by Open-Meteo:
// code -> [display label, icon].
const WMO = {
  0: ['Clear sky', '☀️'],
  1: ['Mainly clear', '🌤️'],
  2: ['Partly cloudy', '⛅'],
  3: ['Overcast', '☁️'],
  45: ['Foggy', '☁️'],
  48: ['Icy fog', '☁️'],
  51: ['Light drizzle', '🌦️'],
  53: ['Drizzle', '🌦️'],
  55: ['Heavy drizzle', '🌧️'],
  61: ['Slight rain', '🌧️'],
  63: ['Rain', '🌧️'],
  65: ['Heavy rain', '🌧️'],
  71: ['Light snow', '❄️'],
  73: ['Snow', '❄️'],
  75: ['Heavy snow', '❄️'],
  77: ['Snow grains', '❄️'],
  80: ['Showers', '🌦️'],
  81: ['Rain showers', '🌧️'],
  82: ['Violent showers', '⛈️'],
  85: ['Snow showers', '❄️'],
  86: ['Heavy snow showers', '❄️'],
  95: ['Thunderstorm', '⛈️'],
  96: ['Thunderstorm', '⛈️'],
  99: ['Thunderstorm', '⛈️'],
};

// Day labels used when rendering forecast tiles.
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Return [label, icon] for a WMO code, with a safe fallback.
export function wmoInfo(code) {
  return WMO[Number(code)] || ['Unknown', '☁️'];
}

// Convert Celsius to the active display unit and round for UI readability.
export function displayTemp(celsius, currentUnit) {
  if (currentUnit === 'C') return Math.round(celsius);
  return Math.round((celsius * 9) / 5 + 32);
}

// Produce the degree unit marker for current unit.
export function unitLabel(currentUnit) {
  return `°${currentUnit}`;
}

// Format unix seconds (plus location UTC offset) to HH:MM.
export function formatClock(unixSec, offsetSec = 0) {
  if (!Number.isFinite(unixSec)) return '-';
  const d = new Date((unixSec + offsetSec) * 1000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

// Return daylight progress metadata for the sunrise->sunset segment.
export function daylightInfo(nowSec, sunriseSec, sunsetSec) {
  if (!Number.isFinite(nowSec) || !Number.isFinite(sunriseSec) || !Number.isFinite(sunsetSec) || sunsetSec <= sunriseSec) {
    return { pct: 0, text: '-' };
  }
  if (nowSec < sunriseSec) return { pct: 0, text: 'Before sunrise' };
  if (nowSec > sunsetSec) return { pct: 100, text: 'After sunset' };
  const pct = Math.max(0, Math.min(100, ((nowSec - sunriseSec) / (sunsetSec - sunriseSec)) * 100));
  return { pct, text: `${Math.round(pct)}% of daylight passed` };
}
