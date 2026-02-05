import axios from 'axios';
import { WeatherData, HourlyForecast } from '../types';

export async function getWeather(location: string, lat = 6.9355, lon = 79.8487): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=rain,visibility,temperature_2m,relative_humidity_2m,precipitation_probability&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`;
  console.log(`    🌤️ Fetching Weather for ${location} (${lat}, ${lon})...`);

  try {
    const response = await axios.get(url, { timeout: 10000 });
    const current = response.data.current || {};
    const hourly = response.data.hourly || {};

    const currentHour = new Date().getHours();
    // Safety check for hourly data indices
    const hIdx = (hourly.time && currentHour < hourly.time.length) ? currentHour : 0;

    return {
      temperature: current.temperature_2m ?? 0,
      condition: getConditionFromCode(current.weather_code ?? 0),
      humidity: current.relative_humidity_2m ?? 0,
      windSpeed: (current.wind_speed_10m ?? 0) / 3.6,
      description: getDescriptionFromCode(current.weather_code ?? 0),
      visibility: (hourly.visibility && hourly.visibility[hIdx]) ?? 10000,
      rain: (hourly.rain && hourly.rain[hIdx]) ?? 0,
      precipitationProbability: (hourly.precipitation_probability && hourly.precipitation_probability[hIdx]) ?? 0
    };
  } catch (error: any) {
    console.error('    ❌ Weather API Error:', error.message);
    throw error;
  }
}

export async function getHourlyForecast(lat = 6.9355, lon = 79.8487): Promise<HourlyForecast[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=rain,visibility,temperature_2m,relative_humidity_2m,precipitation_probability&timezone=auto`;

  const response = await axios.get(url, { timeout: 10000 });
  const hourly = response.data.hourly;

  const currentHour = new Date().getHours();
  const forecast: HourlyForecast[] = [];

  for (let i = 0; i < 24; i++) {
    const idx = currentHour + i;
    if (idx < hourly.time.length) {
      forecast.push({
        time: hourly.time[idx],
        temperature: hourly.temperature_2m[idx],
        humidity: hourly.relative_humidity_2m[idx],
        rain: hourly.rain[idx],
        precipitationProbability: hourly.precipitation_probability[idx],
        visibility: hourly.visibility[idx]
      });
    }
  }

  return forecast;
}

function getConditionFromCode(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Clouds';
  if (code <= 49) return 'Fog';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

function getDescriptionFromCode(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Thunderstorm with heavy hail'
  };
  return descriptions[code] || 'Unknown';
}

export function isWeatherSuitable(weather: WeatherData): boolean {
  return (
    weather.temperature >= 10 &&
    weather.temperature <= 35 &&
    weather.windSpeed < 20 &&
    (weather.precipitationProbability || 0) < 50 &&
    !['Rain', 'Thunderstorm', 'Snow'].includes(weather.condition)
  );
}
