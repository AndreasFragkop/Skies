# Skies

Modern weather web app with a cinematic sky-themed UI.

## Overview

Skies is a vanilla HTML/CSS/JavaScript weather app that:
- searches cities using Open-Meteo geocoding
- fetches current weather + 5-day forecast from Open-Meteo
- supports Celsius and Fahrenheit toggle
- shows condition icons mapped from WMO weather codes
- includes sunrise/sunset times with daylight progress
- includes a `Clear` button to reset the current view
- includes a live clock in the header
- includes popular city cards with quick weather snapshots
- includes mini maps in each popular city card
- includes a separate Favorites page
- includes recent searches dropdown in the search area

## Project Structure

- `index.html`: markup and app layout
- `styles.css`: full visual styling and animations
- `script.js`: weather fetching, unit switching, URL/history sync, quick city snapshots, sunrise/sunset progress logic, and rendering
- `favorites.html`: dedicated page for saved cities
- `favorites.js`: favorites list rendering, open/remove/clear actions

## Run Locally

1. Open `index.html` directly in your browser
2. Type a city name and press `Search` (or Enter)
3. Use `Clear` to reset input and hide weather results
4. Click `Save` to store current city in Favorites
5. Click `Favorites` to open saved cities page
6. Click a popular city card to open full detailed weather

No build step or API key is required.

## Data Source

- Geocoding: `https://geocoding-api.open-meteo.com/v1/search`
- Forecast: `https://api.open-meteo.com/v1/forecast`

## Notes

- Uses `timeformat=unixtime` from Open-Meteo for timezone-safe sunrise/sunset progress calculations across countries.
- Daylight bar behavior:
  - before sunrise: near empty (`Before sunrise`)
  - between sunrise and sunset: proportional progress
  - after sunset: full (`After sunset`)
- URL sync:
  - successful searches update URL with `?city=...`
  - browser back/forward restores city/start-state views
- Recent searches:
  - appears when search input is focused
  - clicking a recent item reopens that city quickly
