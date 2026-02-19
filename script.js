let currentUnit = 'C';
let rawData = null;
const cityInput = document.getElementById('city-input');

const WMO = {
  0: ['Clear sky', '☀️'], 1: ['Mainly clear', '🌤️'],
  2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
  45: ['Foggy', '🌫️'], 48: ['Icy fog', '🌫️'],
  51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'],
  55: ['Heavy drizzle', '🌧️'], 61: ['Slight rain', '🌧️'],
  63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
  71: ['Light snow', '❄️'], 73: ['Snow', '❄️'],
  75: ['Heavy snow', '❄️'], 77: ['Snow grains', '🌨️'],
  80: ['Showers', '🌦️'], 81: ['Rain showers', '🌧️'],
  82: ['Violent showers', '⛈️'], 85: ['Snow showers', '🌨️'],
  86: ['Heavy snow showers', '🌨️'], 95: ['Thunderstorm', '⛈️'],
  96: ['Thunderstorm', '⛈️'], 99: ['Thunderstorm', '⛈️'],
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function wmoInfo(code) {
  const n = Number(code);
  return WMO[n] || ['Unknown', '☁️'];
}
function toF(c) { return Math.round(c * 9 / 5 + 32); }
function displayTemp(c) { return currentUnit === 'C' ? Math.round(c) : toF(c); }
function unitLabel() { return '°' + currentUnit; }
function formatClock(unixSec, offsetSec = 0) {
  if (!Number.isFinite(unixSec)) return '-';
  const d = new Date((unixSec + offsetSec) * 1000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
function daylightInfo(nowSec, sunriseSec, sunsetSec) {
  if (!Number.isFinite(nowSec) || !Number.isFinite(sunriseSec) || !Number.isFinite(sunsetSec) || sunsetSec <= sunriseSec) {
    return { pct: 0, text: '-' };
  }
  const pct = Math.max(0, Math.min(100, ((nowSec - sunriseSec) / (sunsetSec - sunriseSec)) * 100));
  if (nowSec < sunriseSec) return { pct: 0, text: 'Before sunrise' };
  if (nowSec > sunsetSec) return { pct: 100, text: 'After sunset' };
  return { pct, text: `${Math.round(pct)}% of daylight passed` };
}


function switchUnit(u) {
  currentUnit = u;
  document.getElementById('btn-c').classList.toggle('active', u === 'C');
  document.getElementById('btn-f').classList.toggle('active', u === 'F');
  if (rawData) renderData(rawData);
}

function renderData(d) {
  rawData = d;
  document.getElementById('w-city').textContent = d.city;
  document.getElementById('w-country').textContent = d.country;
  document.getElementById('w-icon').textContent = d.icon;
  document.getElementById('w-temp').textContent = displayTemp(d.tempC);
  document.getElementById('w-unit').textContent = unitLabel();
  document.getElementById('w-condition').textContent = d.condition;
  document.getElementById('w-feels').textContent = displayTemp(d.feelsC) + unitLabel();
  document.getElementById('w-humidity').textContent = d.humidity + '%';
  document.getElementById('w-wind').textContent = d.wind + ' km/h';
  document.getElementById('w-uv').textContent = d.uv;
  document.getElementById('w-time').textContent = formatClock(d.nowUnix, d.utcOffsetSec);
  document.getElementById('w-sunrise').textContent = formatClock(d.sunriseUnix, d.utcOffsetSec);
  document.getElementById('w-sunset').textContent = formatClock(d.sunsetUnix, d.utcOffsetSec);
  const day = daylightInfo(d.nowUnix, d.sunriseUnix, d.sunsetUnix);
  const visiblePct = day.pct > 0 ? day.pct : 3;
  document.getElementById('w-day-progress').style.width = `${visiblePct}%`;
  document.getElementById('w-day-meta').textContent = day.text;

  const row = document.getElementById('forecast-row');
  row.innerHTML = '';
  d.forecast.forEach((f) => {
    const el = document.createElement('div');
    el.className = 'forecast-day';
    el.innerHTML = `
      <div class="fc-day">${f.day}</div>
      <div class="fc-icon">${f.icon}</div>
      <div class="fc-high">${displayTemp(f.highC)}${unitLabel()}</div>
      <div class="fc-low">${displayTemp(f.lowC)}${unitLabel()}</div>
    `;
    row.appendChild(el);
  });

  document.getElementById('weather-card').style.display = 'block';
  document.getElementById('error-msg').style.display = 'none';
}

async function fetchWeather() {
  const city = cityInput.value.trim();
  if (!city) return;

  const btn = document.getElementById('search-btn');
  btn.textContent = '...';
  btn.disabled = true;

  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const geoData = await geoRes.json();

    if (!geoData.results || !geoData.results.length) throw new Error('Not found');

    const { latitude, longitude, name, country, admin1 } = geoData.results[0];
    const locationLabel = [admin1, country].filter(Boolean).join(', ');

    const wRes = await fetch(
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,uv_index` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset` +
      `&timezone=auto&forecast_days=5&timeformat=unixtime`
    );
    const w = await wRes.json();

    const cur = w.current;
    const daily = w.daily;
    const [condition, icon] = wmoInfo(cur.weather_code);

    const forecast = daily.time.map((dayUnix, i) => {
      const d = new Date(dayUnix * 1000);
      const [, fIcon] = wmoInfo(daily.weather_code?.[i]);
      return { day: DAYS[d.getDay()], icon: fIcon, highC: daily.temperature_2m_max[i], lowC: daily.temperature_2m_min[i] };
    });

    renderData({
      city: name,
      country: locationLabel,
      tempC: cur.temperature_2m,
      feelsC: cur.apparent_temperature,
      condition,
      icon,
      humidity: cur.relative_humidity_2m,
      wind: Math.round(cur.wind_speed_10m),
      uv: cur.uv_index ?? '-',
      nowUnix: cur.time,
      sunriseUnix: daily.sunrise?.[0],
      sunsetUnix: daily.sunset?.[0],
      utcOffsetSec: w.utc_offset_seconds ?? 0,
      forecast,
    });
  } catch (e) {
    document.getElementById('error-msg').style.display = 'block';
    document.getElementById('weather-card').style.display = 'none';
  } finally {
    btn.textContent = 'Search';
    btn.disabled = false;
  }
}

function clearWeather() {
  cityInput.value = '';
  document.getElementById('weather-card').style.display = 'none';
  document.getElementById('error-msg').style.display = 'none';
  rawData = null;
}

cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') fetchWeather();
});
