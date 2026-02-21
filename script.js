import { geocodeWithFallback, fetchForecastByCoords, fetchQuickCitySnapshot } from './api.js';
import { state, getSavedCities, setSavedCities, getRecentSearches, setRecentSearches } from './state.js';
import { DAYS, wmoInfo, displayTemp, unitLabel } from './utils.js';
import {
  dom,
  renderRecentSearches,
  toggleRecentPanel,
  alignRecentPanelToInput,
  startLiveClock,
  hydrateQuickCities,
  setUnitButtons,
  renderData,
  showErrorState,
  showStartState,
  updateMap,
} from './ui.js';

const display = (c) => displayTemp(c, state.currentUnit);
const unit = () => unitLabel(state.currentUnit);
const DEFAULT_ERROR_TEXT = 'City not found. Try a different spelling.';

function pushRecentSearch(city, country) {
  const query = [city, country].filter(Boolean).join(', ');
  const label = city;
  let items = getRecentSearches().filter((x) => x.query.toLowerCase() !== query.toLowerCase());
  items.unshift({ label, query });
  items = items.slice(0, 8);
  setRecentSearches(items);
  renderRecentSearches(items, quickPick);
}

function setCityInUrl(cityQuery, mode = 'push') {
  const url = new URL(window.location.href);
  const currentCity = url.searchParams.get('city') || '';
  if (!cityQuery) {
    if (!currentCity) return;
    url.searchParams.delete('city');
  } else {
    if (currentCity === cityQuery) return;
    url.searchParams.set('city', cityQuery);
  }

  if (mode === 'replace') {
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  } else {
    window.history.pushState({}, '', `${url.pathname}${url.search}`);
  }
}

function saveCurrentCity() {
  if (!state.rawData) return;
  const countryOnly = (state.rawData.country || '').split(',').pop()?.trim() || '';
  const entry = {
    label: state.rawData.city,
    query: [state.rawData.city, countryOnly].filter(Boolean).join(', '),
  };
  const savedCities = getSavedCities().filter((c) => c.query.toLowerCase() !== entry.query.toLowerCase());
  savedCities.unshift(entry);
  setSavedCities(savedCities.slice(0, 8));
}

function setErrorMessage(message) {
  const errorEl = document.getElementById('error-msg');
  if (!errorEl) return;
  errorEl.textContent = message;
}

async function renderWeatherForLocation(latitude, longitude, geoMeta) {
  const weather = await fetchForecastByCoords(latitude, longitude);
  const cur = weather.current;
  const daily = weather.daily;
  const [condition, icon] = wmoInfo(cur.weather_code);

  const forecast = daily.time.map((dayUnix, i) => {
    const dayDate = new Date(dayUnix * 1000);
    const [, forecastIcon] = wmoInfo(daily.weather_code?.[i]);
    return {
      day: DAYS[dayDate.getDay()],
      icon: forecastIcon,
      highC: daily.temperature_2m_max[i],
      lowC: daily.temperature_2m_min[i],
    };
  });

  const resolvedName = geoMeta?.name || 'Your location';
  const country = geoMeta?.country || '';
  const admin1 = geoMeta?.admin1 || '';
  const locationLabel = [admin1, country].filter(Boolean).join(', ') || 'Current position';

  state.rawData = {
    city: resolvedName,
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
    utcOffsetSec: weather.utc_offset_seconds ?? 0,
    forecast,
  };

  renderData(state.rawData, display, unit, dom.quickCitiesEl);
  updateMap(state, latitude, longitude, `${resolvedName}${country ? `, ${country}` : ''}`);
  return { resolvedName, country };
}

function switchUnit(nextUnit) {
  state.currentUnit = nextUnit;
  setUnitButtons(nextUnit);
  if (state.rawData) {
    renderData(state.rawData, display, unit, dom.quickCitiesEl);
  }
}

async function fetchWeather(syncUrl = true) {
  const city = dom.cityInput?.value.trim();
  if (!city || !dom.searchBtn) return;
  toggleRecentPanel(false, dom.searchWrapperEl);
  dom.cityInput?.blur();

  dom.searchBtn.textContent = '...';
  dom.searchBtn.disabled = true;
  if (dom.cityInput) dom.cityInput.disabled = true;

  try {
    const geoResult = await geocodeWithFallback(city);
    const { latitude, longitude, name, country, admin1 } = geoResult;

    await renderWeatherForLocation(latitude, longitude, { name, country, admin1 });
    setErrorMessage(DEFAULT_ERROR_TEXT);
    pushRecentSearch(name, country);
    if (syncUrl) setCityInUrl([name, country].filter(Boolean).join(', '), 'push');
  } catch (_) {
    setErrorMessage(DEFAULT_ERROR_TEXT);
    showErrorState(dom.quickCitiesEl);
  } finally {
    dom.searchBtn.textContent = 'Search';
    dom.searchBtn.disabled = false;
    if (dom.cityInput) dom.cityInput.disabled = false;
  }
}

function clearWeather(skipUrlReset = false) {
  if (dom.cityInput) dom.cityInput.value = '';
  showStartState(dom.quickCitiesEl);
  state.rawData = null;
  if (!skipUrlReset) setCityInUrl('', 'push');
}

function quickPick(citySource) {
  const cityQuery = typeof citySource === 'string' ? citySource : citySource?.dataset?.query || '';
  if (!cityQuery || !dom.cityInput) return;
  toggleRecentPanel(false, dom.searchWrapperEl);
  dom.cityInput.value = cityQuery;
  fetchWeather();
}

function bindEvents() {
  if (!dom.cityInput) return;
  dom.cityInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') fetchWeather();
  });
  dom.cityInput.addEventListener('focus', () => {
    toggleRecentPanel(true, dom.searchWrapperEl);
  });
  dom.cityInput.addEventListener('blur', () => {
    setTimeout(() => {
      const active = document.activeElement;
      const keepOpen = dom.recentWrapEl && active && dom.recentWrapEl.contains(active);
      toggleRecentPanel(!!keepOpen, dom.searchWrapperEl);
    }, 80);
  });

  window.addEventListener('resize', () => {
    alignRecentPanelToInput(dom.recentWrapEl, dom.searchWrapperEl, dom.cityInput);
  });
  window.addEventListener('popstate', () => {
    const cityFromUrl = new URLSearchParams(window.location.search).get('city');
    if (cityFromUrl && dom.cityInput) {
      dom.cityInput.value = cityFromUrl;
      fetchWeather(false);
    } else {
      clearWeather(true);
    }
  });
}

function init() {
  setUnitButtons(state.currentUnit);
  startLiveClock();
  renderRecentSearches(getRecentSearches(), quickPick);
  alignRecentPanelToInput(dom.recentWrapEl, dom.searchWrapperEl, dom.cityInput);
  hydrateQuickCities(fetchQuickCitySnapshot, unit, state);
  bindEvents();

  const startupCity = new URLSearchParams(window.location.search).get('city');
  if (startupCity && dom.cityInput) {
    dom.cityInput.value = startupCity;
    fetchWeather(false);
  }
}

window.fetchWeather = fetchWeather;
window.clearWeather = clearWeather;
window.saveCurrentCity = saveCurrentCity;
window.quickPick = quickPick;
window.switchUnit = switchUnit;

init();
