import express from 'express';
import cors from 'cors';
import { getWeather, getHourlyForecast, isWeatherSuitable } from '../tools/weather';
import { getAirQuality, isAirQualitySuitable } from '../tools/airQuality';
import { checkCalendar, createEvent, findFreeSlot, deleteEvent } from '../tools/calendar';
import { analyzeConditions } from '../tools/openai';
import { AgentContext } from '../types';
import { getHolidays } from '../tools/holidays';
import { getTrafficStatus } from '../tools/traffic';

export const app = express();
app.use(cors());
app.use(express.json());

let currentConfig = {
  location: 'Colombo',
  coordinates: { lat: 6.9271, lon: 79.8612 }
};

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

// Get hourly forecast
app.get('/api/forecast', async (req, res) => {
  try {
    const { lat, lon } = currentConfig.coordinates;
    const forecast = await getHourlyForecast(lat, lon);
    res.json(forecast);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get air quality
app.get('/api/air-quality', async (req, res) => {
  try {
    const { lat, lon } = currentConfig.coordinates;
    const airQuality = await getAirQuality(lat, lon);
    res.json({ ...airQuality, suitable: isAirQualitySuitable(airQuality) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DEPRECATED: Resources list is now handled dynamically by AI knowledge

// Get calendar events
app.get('/api/calendar', (req, res) => {
  const dateStr = req.query.date as string;
  const date = dateStr ? new Date(dateStr) : new Date();
  const events = checkCalendar(date);
  const freeSlot = findFreeSlot(date, 2);
  res.json({ events, freeSlot });
});

// Create calendar event
app.post('/api/calendar', (req, res) => {
  const { title, start, end } = req.body;
  const event = createEvent(title, new Date(start), new Date(end));
  res.json(event);
});

// Delete calendar event
app.delete('/api/calendar/:id', (req, res) => {
  const { id } = req.params;
  const success = deleteEvent(id);
  res.json({ success });
});

// Get AI recommendation
app.get('/api/recommendation', async (req, res) => {
  try {
    console.log('📡 /api/recommendation called');

    const { lat, lon } = currentConfig.coordinates;
    console.log('  📍 Location:', currentConfig.location, lat, lon);

    const weather = await getWeather(currentConfig.location, lat, lon);
    console.log('  🌤️ Weather:', weather.temperature + '°C');

    const airQuality = await getAirQuality(lat, lon);
    console.log('  💨 AQI:', airQuality.aqi);

    const calendar = checkCalendar(new Date());
    const holidays = await getHolidays(new Date().getFullYear());
    const traffic = getTrafficStatus(new Date().getHours());

    const context: AgentContext = { weather, airQuality, calendar, holidays, traffic };

    const weatherOk = isWeatherSuitable(weather);
    const airOk = isAirQualitySuitable(airQuality);
    const freeSlot = findFreeSlot(new Date(), 2);

    console.log('  ✅ Weather OK:', weatherOk);
    console.log('  ✅ Air OK:', airOk);

    let recommendation;
    if (weatherOk && airOk && freeSlot) {
      console.log('  🧠 Getting AI analysis...');
      const analysis = await analyzeConditions(context, 'outdoor hiking');
      console.log('  📝 AI response:', analysis.substring(0, 50) + '...');

      recommendation = {
        recommended: true,
        reason: analysis,
        suggestedTime: `${freeSlot.start.getHours()}:${String(freeSlot.start.getMinutes()).padStart(2, '0')}`
      };
    } else {
      const reasons = [];
      if (!weatherOk) reasons.push('Weather not suitable');
      if (!airOk) reasons.push('Air quality poor');
      if (!freeSlot) reasons.push('No free time slot');
      recommendation = {
        recommended: false,
        reason: reasons.join('. ')
      };
    }

    console.log('  ✅ Sending response');
    res.json({ weather, airQuality, recommendation, freeSlot, traffic, holidays });
  } catch (error: any) {
    console.error('  ❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Plan a specific event
app.post('/api/plan-event', async (req, res) => {
  try {
    const { eventType, description } = req.body;
    console.log(`📡 /api/plan-event called for: ${eventType}`);

    const { lat, lon } = currentConfig.coordinates;

    // Gather context
    const [weather, airQuality, holidays] = await Promise.all([
      getWeather(currentConfig.location, lat, lon),
      getAirQuality(lat, lon),
      getHolidays(new Date().getFullYear())
    ]);

    // Fetch relevant resources based on event type
    // const resources = getResources(eventType); // Removed as per instruction
    const calendar = checkCalendar(new Date());
    const traffic = getTrafficStatus(new Date().getHours());

    // Context is now purely external factors (weather/traffic/schedule)
    // AI is instructed to use its own knowledge for location suggestions
    const context: AgentContext = { weather, airQuality, calendar, holidays, traffic };

    console.log('  🧠 Getting AI analysis with Real-World Knowledge...');
    const analysis = await analyzeConditions(context, `${eventType} (${description})`);

    res.json({
      analysis,
      weather,
      airQuality,
      traffic,
      holidays
    });
  } catch (error: any) {
    console.error('  ❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export function startServer(port = 3001) {
  app.listen(port, () => {
    console.log(`🌐 API Server running at http://localhost:${port}`);
  });
}
