import { formatClock, daylightInfo } from './utils.js';

// Centralized DOM references used across UI rendering functions.
export const dom = {
  cityInput: document.getElementById('city-input'),
  searchBtn: document.getElementById('search-btn'),
  quickCitiesEl: document.getElementById('quick-cities'),
  recentSearchesEl: document.getElementById('recent-searches'),
  searchWrapperEl: document.querySelector('.search-wrapper'),
  recentWrapEl: document.querySelector('.recent-wrap'),
};

// Render recent search chips under the search input.
export function renderRecentSearches(items, onPick) {
  if (!dom.recentSearchesEl) return;
  dom.recentSearchesEl.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'recent-empty';
    empty.textContent = 'No recent searches yet';
    dom.recentSearchesEl.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'recent-chip';
    chip.textContent = item.label;
    chip.addEventListener('click', () => onPick(item.query));
    dom.recentSearchesEl.appendChild(chip);
  });
}

// Show/hide the recent search panel and keep alignment in sync.
export function toggleRecentPanel(show, searchWrapperEl) {
  if (!searchWrapperEl) return;
  searchWrapperEl.classList.toggle('show-recent', !!show);
  if (show) alignRecentPanelToInput(dom.recentWrapEl, searchWrapperEl, dom.cityInput);
}

// Position recent panel directly under the text input even in responsive layouts.
export function alignRecentPanelToInput(recentWrapEl, searchWrapperEl, cityInput) {
  if (!recentWrapEl || !searchWrapperEl || !cityInput) return;
  const wrapperRect = searchWrapperEl.getBoundingClientRect();
  const inputRect = cityInput.getBoundingClientRect();
  recentWrapEl.style.left = `${inputRect.left - wrapperRect.left}px`;
  recentWrapEl.style.width = `${inputRect.width}px`;
}

// Start the header live clock that updates every second.
export function startLiveClock() {
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

// Keep °C/°F toggle button styles in sync with current state.
export function setUnitButtons(unit) {
  document.getElementById('btn-c')?.classList.toggle('active', unit === 'C');
  document.getElementById('btn-f')?.classList.toggle('active', unit === 'F');
}

// Render full weather result card from normalized state data.
export function renderData(data, displayTemp, unitLabel, quickCitiesEl) {
  document.getElementById('w-city').textContent = data.city;
  document.getElementById('w-country').textContent = data.country;
  document.getElementById('w-icon').textContent = data.icon;
  document.getElementById('w-temp').textContent = displayTemp(data.tempC);
  document.getElementById('w-unit').textContent = unitLabel();
  document.getElementById('w-condition').textContent = data.condition;
  document.getElementById('w-feels').textContent = displayTemp(data.feelsC) + unitLabel();
  document.getElementById('w-humidity').textContent = data.humidity + '%';
  document.getElementById('w-wind').textContent = data.wind + ' km/h';
  document.getElementById('w-uv').textContent = data.uv;
  document.getElementById('w-time').textContent = formatClock(data.nowUnix, data.utcOffsetSec);
  document.getElementById('w-sunrise').textContent = formatClock(data.sunriseUnix, data.utcOffsetSec);
  document.getElementById('w-sunset').textContent = formatClock(data.sunsetUnix, data.utcOffsetSec);

  // Update daylight progress meter.
  const day = daylightInfo(data.nowUnix, data.sunriseUnix, data.sunsetUnix);
  const visiblePct = day.pct > 0 ? day.pct : 3;
  document.getElementById('w-day-progress').style.width = `${visiblePct}%`;
  document.getElementById('w-day-meta').textContent = day.text;

  // Rebuild the forecast strip from scratch each render.
  const row = document.getElementById('forecast-row');
  row.innerHTML = '';
  data.forecast.forEach((f) => {
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

  // Show primary result UI and hide quick-start/error states.
  document.getElementById('weather-card').style.display = 'grid';
  document.getElementById('error-msg').style.display = 'none';
  if (quickCitiesEl) quickCitiesEl.style.display = 'none';
}

// Show explicit error and fallback quick-city cards.
export function showErrorState(quickCitiesEl) {
  document.getElementById('error-msg').style.display = 'block';
  document.getElementById('weather-card').style.display = 'none';
  if (quickCitiesEl) quickCitiesEl.style.display = '';
}

// Show initial page state: quick cards visible, weather and error hidden.
export function showStartState(quickCitiesEl) {
  document.getElementById('weather-card').style.display = 'none';
  document.getElementById('error-msg').style.display = 'none';
  if (quickCitiesEl) quickCitiesEl.style.display = '';
}

// Lazy-initialize the main Leaflet map only when first needed.
function initMap(state) {
  if (state.mapInstance || typeof L === 'undefined') return;
  state.mapInstance = L.map('city-map', { worldCopyJump: true }).setView([20, 0], 2);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  }).addTo(state.mapInstance);
}

// Move/create a single city marker and center the map for current search result.
export function updateMap(state, lat, lon, label) {
  initMap(state);
  if (!state.mapInstance) return;

  state.mapInstance.setView([lat, lon], 9);
  if (!state.mapMarker) {
    state.mapMarker = L.marker([lat, lon]).addTo(state.mapInstance);
  } else {
    state.mapMarker.setLatLng([lat, lon]);
  }
  state.mapMarker.bindPopup(label, { autoPan: false }).openPopup();
  state.mapInstance.panTo([lat, lon], { animate: false });

  // Ensure correct sizing when map container appears/changes.
  setTimeout(() => state.mapInstance.invalidateSize(), 0);
}

// Hydrate all "Popular Cities" cards with quick weather snapshots + mini maps.
export async function hydrateQuickCities(getSnapshot, unitLabel, state) {
  const cards = Array.from(document.querySelectorAll('.quick-city[data-query]'));
  await Promise.all(
    cards.map(async (card) => {
      const query = card.dataset.query;
      const tempEl = card.querySelector('.quick-temp');
      const condEl = card.querySelector('.quick-cond');
      const iconEl = card.querySelector('.quick-icon');
      const mapEl = card.querySelector('.quick-mini-map');

      try {
        const snap = await getSnapshot(query);
        if (tempEl) tempEl.textContent = `${snap.temp}${unitLabel()}`;
        if (condEl) condEl.textContent = snap.cond;
        if (iconEl) iconEl.textContent = snap.icon;

        // Reuse cached mini-map instances per card element.
        if (mapEl) {
          let mini = state.quickMiniMaps.get(mapEl);
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
            state.quickMiniMaps.set(mapEl, mini);
          }

          if (mini) {
            mini.map.setView([snap.latitude, snap.longitude], 7, { animate: false });
            mini.marker.setLatLng([snap.latitude, snap.longitude]);
            setTimeout(() => mini.map.invalidateSize(), 0);
          }
        }
      } catch (_) {
        // Fail-soft UI for cards when snapshot request fails.
        if (tempEl) tempEl.textContent = '--°';
        if (condEl) condEl.textContent = 'Unavailable';
        if (iconEl) iconEl.textContent = '☁️';
      }
    })
  );
}
