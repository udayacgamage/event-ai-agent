import express from 'express';
import cors from 'cors';
import { getWeather, getHourlyForecast, isWeatherSuitable } from './tools/weather';
import { getAirQuality, isAirQualitySuitable } from './tools/airQuality';
import { checkCalendar, createEvent, findFreeSlot, deleteEvent } from './tools/calendar';
import { analyzeConditions } from './tools/openai';
import { AgentContext } from './types';
import { getHolidays } from './tools/holidays';
import { getTrafficStatus } from './tools/traffic';

export const app = express();
app.use(cors());
app.use(express.json());

let currentConfig = {
  location: 'Colombo',
  coordinates: { lat: 6.9271, lon: 79.8612 }
};

// Health Check
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), env: process.env.NODE_ENV });
});

// Get current config
app.get('/api/config', (req, res) => {
  res.json(currentConfig);
});

// Update config
app.post('/api/config', (req, res) => {
  currentConfig = { ...currentConfig, ...req.body };
  res.json(currentConfig);
});

// Get weather data
app.get('/api/weather', async (req, res) => {
  try {
    const { lat, lon } = currentConfig.coordinates;
    const weather = await getWeather(currentConfig.location, lat, lon);
    const traffic = getTrafficStatus(new Date().getHours());
    const holidays = await getHolidays(new Date().getFullYear());

    res.json({
      ...weather,
      suitable: isWeatherSuitable(weather),
      traffic,
      holidays
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get AI recommendation
app.get('/api/recommendation', async (req, res) => {
  try {
    const { lat, lon } = currentConfig.coordinates;
    const weather = await getWeather(currentConfig.location, lat, lon);
    const airQuality = await getAirQuality(lat, lon);
    const calendar = checkCalendar(new Date());
    const holidays = await getHolidays(new Date().getFullYear());
    const traffic = getTrafficStatus(new Date().getHours());

    const context: AgentContext = { weather, airQuality, calendar, holidays, traffic };

    const weatherOk = isWeatherSuitable(weather);
    const airOk = isAirQualitySuitable(airQuality);
    const freeSlot = findFreeSlot(new Date(), 2);

    let recommendation;
    if (weatherOk && airOk && freeSlot) {
      const analysis = await analyzeConditions(context, 'outdoor hiking');
      recommendation = {
        recommended: true,
        reason: analysis,
        suggestedTime: `${freeSlot.start.getHours()}:${String(freeSlot.start.getMinutes()).padStart(2, '0')}`
      };
    } else {
      recommendation = { recommended: false, reason: 'Conditions not suitable' };
    }

    res.json({ weather, airQuality, recommendation, freeSlot, traffic, holidays });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Plan a specific event
app.post('/api/plan-event', async (req, res) => {
  try {
    const { eventType, description } = req.body;
    const { lat, lon } = currentConfig.coordinates;

    const [weather, airQuality, holidays] = await Promise.all([
      getWeather(currentConfig.location, lat, lon),
      getAirQuality(lat, lon),
      getHolidays(new Date().getFullYear())
    ]);

    const calendar = checkCalendar(new Date());
    const traffic = getTrafficStatus(new Date().getHours());
    const context: AgentContext = { weather, airQuality, calendar, holidays, traffic };

    const analysis = await analyzeConditions(context, `${eventType} (${description})`);

    res.json({ analysis, weather, airQuality, traffic, holidays });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
