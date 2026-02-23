// LocalStorage keys are versioned to allow safe schema updates later.
const SAVED_CITIES_KEY = 'skies_saved_cities_v1';
const RECENT_SEARCHES_KEY = 'skies_recent_searches_v1';

// Shared runtime state used by the main weather page.
export const state = {
  currentUnit: 'C',
  rawData: null,
  mapInstance: null,
  mapMarker: null,
  quickMiniMaps: new WeakMap(),
};

// Read and sanitize saved-city records from localStorage.
export function getSavedCities() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_CITIES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

// Persist saved-city records.
export function setSavedCities(items) {
  localStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(items));
}

// Read and sanitize recent-search records from localStorage.
export function getRecentSearches() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

// Persist recent-search records.
export function setRecentSearches(items) {
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items));
}
