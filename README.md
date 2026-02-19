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

## Project Structure

- `index.html`: markup and app layout
- `styles.css`: full visual styling and animations
- `script.js`: weather fetching, unit switching, sunrise/sunset progress logic, and rendering

## Run Locally

1. Open `index.html` directly in your browser
2. Type a city name and press `Search` (or Enter)
3. Use `Clear` to reset input and hide weather results

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
