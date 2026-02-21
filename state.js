const SAVED_CITIES_KEY = 'skies_saved_cities_v1';
const RECENT_SEARCHES_KEY = 'skies_recent_searches_v1';

export const state = {
  currentUnit: 'C',
  rawData: null,
  mapInstance: null,
  mapMarker: null,
  quickMiniMaps: new WeakMap(),
};

export function getSavedCities() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_CITIES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

export function setSavedCities(items) {
  localStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(items));
}

export function getRecentSearches() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

export function setRecentSearches(items) {
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items));
}
