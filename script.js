let currentUnit = 'C';
let rawData = null;
const cityInput = document.getElementById('city-input');
const quickCitiesEl = document.getElementById('quick-cities');
const recentSearchesEl = document.getElementById('recent-searches');
const searchWrapperEl = document.querySelector('.search-wrapper');
const recentWrapEl = document.querySelector('.recent-wrap');
let mapInstance = null;
let mapMarker = null;
const SAVED_CITIES_KEY = 'skies_saved_cities_v1';
const RECENT_SEARCHES_KEY = 'skies_recent_searches_v1';
const quickMiniMaps = new WeakMap();

const WMO = {
  0: ['Clear sky', '☀️'], 1: ['Mainly clear', '🌤️'],
  2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
  45: ['Foggy', '☁️'], 48: ['Icy fog', '☁️'],
  51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'],
  55: ['Heavy drizzle', '🌧️'], 61: ['Slight rain', '🌧️'],
  63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
  71: ['Light snow', '❄️'], 73: ['Snow', '❄️'],
  75: ['Heavy snow', '❄️'], 77: ['Snow grains', '❄️'],
  80: ['Showers', '🌦️'], 81: ['Rain showers', '🌧️'],
  82: ['Violent showers', '⛈️'], 85: ['Snow showers', '❄️'],
  86: ['Heavy snow showers', '❄️'], 95: ['Thunderstorm', '⛈️'],
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

function getSavedCities() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_CITIES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function setSavedCities(items) {
  localStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(items));
}

function getRecentSearches() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function setRecentSearches(items) {
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items));
}

function renderRecentSearches() {
  if (!recentSearchesEl) return;
  const items = getRecentSearches();
  recentSearchesEl.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'recent-empty';
    empty.textContent = 'No recent searches yet';
    recentSearchesEl.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'recent-chip';
    chip.textContent = item.label;
    chip.addEventListener('click', () => quickPick(item.query));
    recentSearchesEl.appendChild(chip);
  });
}

function toggleRecentPanel(show) {
  if (!searchWrapperEl) return;
  searchWrapperEl.classList.toggle('show-recent', !!show);
  if (show) alignRecentPanelToInput();
}

function alignRecentPanelToInput() {
  if (!recentWrapEl || !searchWrapperEl || !cityInput) return;
  const wrapperRect = searchWrapperEl.getBoundingClientRect();
  const inputRect = cityInput.getBoundingClientRect();
  recentWrapEl.style.left = `${inputRect.left - wrapperRect.left}px`;
  recentWrapEl.style.width = `${inputRect.width}px`;
}

function pushRecentSearch(city, country) {
  const query = [city, country].filter(Boolean).join(', ');
  const label = city;
  let items = getRecentSearches().filter((x) => x.query.toLowerCase() !== query.toLowerCase());
  items.unshift({ label, query });
  items = items.slice(0, 8);
  setRecentSearches(items);
  renderRecentSearches();
}

function setCityInUrl(cityQuery, mode = 'push') {
  const url = new URL(window.location.href);
  const currentCity = url.searchParams.get('city') || '';
  if (!cityQuery) {
    if (!currentCity) return;
    url.searchParams.delete('city');
    if (mode === 'replace') {
      window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    } else {
      window.history.pushState({}, '', `${url.pathname}${url.search}`);
    }
  } else {
    if (currentCity === cityQuery) return;
    url.searchParams.set('city', cityQuery);
    if (mode === 'replace') {
      window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    } else {
      window.history.pushState({}, '', `${url.pathname}${url.search}`);
    }
  }
}

function startLiveClock() {
  const clockEl = document.getElementById('live-clock');
  if (!clockEl) return;
  const tick = () => {
    clockEl.textContent = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };
  tick();
  setInterval(tick, 1000);
}

function saveCurrentCity() {
  if (!rawData) return;
  const countryOnly = (rawData.country || '').split(',').pop()?.trim() || '';
  const entry = {
    label: rawData.city,
    query: [rawData.city, countryOnly].filter(Boolean).join(', '),
  };
  const savedCities = getSavedCities().filter((c) => c.query.toLowerCase() !== entry.query.toLowerCase());
  savedCities.unshift(entry);
  setSavedCities(savedCities.slice(0, 8));
}

function quickPick(citySource) {
  const cityQuery = typeof citySource === 'string' ? citySource : citySource?.dataset?.query || '';
  if (!cityQuery) return;
  toggleRecentPanel(false);
  cityInput.value = cityQuery;
  fetchWeather();
}

async function fetchQuickCitySnapshot(query) {
  const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
  const geoData = await geoRes.json();
  if (!geoData.results || !geoData.results.length) throw new Error('Not found');
  const { latitude, longitude } = geoData.results[0];

  const wRes = await fetch(
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,weather_code` +
    `&timezone=auto`
  );
  const w = await wRes.json();
  const [cond, icon] = wmoInfo(w.current?.weather_code);
  return {
    temp: Math.round(w.current?.temperature_2m ?? 0),
    cond,
    icon,
    latitude,
    longitude,
  };
}

async function hydrateQuickCities() {
  const cards = Array.from(document.querySelectorAll('.quick-city[data-query]'));
  await Promise.all(cards.map(async (card) => {
    const query = card.dataset.query;
    const tempEl = card.querySelector('.quick-temp');
    const condEl = card.querySelector('.quick-cond');
    const iconEl = card.querySelector('.quick-icon');
    const mapEl = card.querySelector('.quick-mini-map');
    try {
      const snap = await fetchQuickCitySnapshot(query);
      if (tempEl) tempEl.textContent = `${snap.temp}${unitLabel()}`;
      if (condEl) condEl.textContent = snap.cond;
      if (iconEl) iconEl.textContent = snap.icon;
      if (mapEl) {
        let mini = quickMiniMaps.get(mapEl);
        if (!mini && typeof L !== 'undefined') {
          const map = L.map(mapEl, {
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false,
            tap: false,
            touchZoom: false,
          });
          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 18,
          }).addTo(map);
          const marker = L.marker([snap.latitude, snap.longitude]).addTo(map);
          mini = { map, marker };
          quickMiniMaps.set(mapEl, mini);
        }
        if (mini) {
          mini.map.setView([snap.latitude, snap.longitude], 7, { animate: false });
          mini.marker.setLatLng([snap.latitude, snap.longitude]);
          setTimeout(() => mini.map.invalidateSize(), 0);
        }
      }
    } catch (_) {
      if (tempEl) tempEl.textContent = '--°';
      if (condEl) condEl.textContent = 'Unavailable';
      if (iconEl) iconEl.textContent = '☁️';
    }
  }));
}

function initMap() {
  if (mapInstance || typeof L === 'undefined') return;
  mapInstance = L.map('city-map', { worldCopyJump: true }).setView([20, 0], 2);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  }).addTo(mapInstance);
}

function updateMap(lat, lon, label) {
  initMap();
  if (!mapInstance) return;
  mapInstance.setView([lat, lon], 9);
  if (!mapMarker) {
    mapMarker = L.marker([lat, lon]).addTo(mapInstance);
  } else {
    mapMarker.setLatLng([lat, lon]);
  }
  mapMarker.bindPopup(label, { autoPan: false }).openPopup();
  mapInstance.panTo([lat, lon], { animate: false });
  setTimeout(() => mapInstance.invalidateSize(), 0);
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

  document.getElementById('weather-card').style.display = 'grid';
  document.getElementById('error-msg').style.display = 'none';
  if (quickCitiesEl) quickCitiesEl.style.display = 'none';
}

async function fetchWeather(syncUrl = true) {
  const city = cityInput.value.trim();
  if (!city) return;

  const btn = document.getElementById('search-btn');
  btn.textContent = '...';
  btn.disabled = true;

  try {
    async function geocode(name) {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`);
      return res.json();
    }

    let geoData = await geocode(city);
    if (!geoData.results || !geoData.results.length) {
      const fallbacks = [
        city.replace(/tromso/i, 'Tromsø'),
        `${city}, Norway`,
      ];
      for (const fb of fallbacks) {
        if (!fb || fb === city) continue;
        geoData = await geocode(fb);
        if (geoData.results && geoData.results.length) break;
      }
    }

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
    pushRecentSearch(name, country);
    if (syncUrl) setCityInUrl([name, country].filter(Boolean).join(', '), 'push');
    updateMap(latitude, longitude, `${name}, ${country}`);
  } catch (e) {
    document.getElementById('error-msg').style.display = 'block';
    document.getElementById('weather-card').style.display = 'none';
    if (quickCitiesEl) quickCitiesEl.style.display = '';
  } finally {
    btn.textContent = 'Search';
    btn.disabled = false;
  }
}

function clearWeather(skipUrlReset = false) {
  cityInput.value = '';
  document.getElementById('weather-card').style.display = 'none';
  document.getElementById('error-msg').style.display = 'none';
  if (quickCitiesEl) quickCitiesEl.style.display = '';
  rawData = null;
  // Reset URL back to clean start screen (remove ?city=...)
  if (!skipUrlReset) setCityInUrl('', 'push');
}

cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') fetchWeather();
});

cityInput.addEventListener('focus', () => {
  toggleRecentPanel(true);
});

cityInput.addEventListener('blur', () => {
  setTimeout(() => {
    const active = document.activeElement;
    const keepOpen = searchWrapperEl && active && searchWrapperEl.contains(active);
    toggleRecentPanel(!!keepOpen);
  }, 80);
});

const startupCity = new URLSearchParams(window.location.search).get('city');
if (startupCity) {
  cityInput.value = startupCity;
  fetchWeather(false);
}

startLiveClock();
hydrateQuickCities();
renderRecentSearches();
alignRecentPanelToInput();
window.addEventListener('resize', alignRecentPanelToInput);

window.addEventListener('popstate', () => {
  const cityFromUrl = new URLSearchParams(window.location.search).get('city');
  if (cityFromUrl) {
    cityInput.value = cityFromUrl;
    fetchWeather(false);
  } else {
    clearWeather(true);
  }
});
