const SAVED_CITIES_KEY = 'skies_saved_cities_v1';
const listEl = document.getElementById('fav-list');
const clearAllBtn = document.getElementById('clear-all');

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

function render() {
  const cities = getSavedCities();
  listEl.innerHTML = '';
  if (!cities.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No saved cities yet.';
    listEl.appendChild(empty);
    return;
  }

  cities.forEach((city) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="name">${city.label}</div>
      <div class="row">
        <a class="btn" href="index.html?city=${encodeURIComponent(city.query)}">Open</a>
        <button class="btn remove" type="button">Remove</button>
      </div>
    `;
    card.querySelector('.remove').addEventListener('click', () => {
      const next = getSavedCities().filter((c) => c.query.toLowerCase() !== city.query.toLowerCase());
      setSavedCities(next);
      render();
    });
    listEl.appendChild(card);
  });
}

clearAllBtn.addEventListener('click', () => {
  setSavedCities([]);
  render();
});

render();
