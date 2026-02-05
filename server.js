// Backend server for Render.com deployment
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const config = { location: 'Colombo', coordinates: { lat: 6.9271, lon: 79.8612 } };

// Helper functions
async function getWeather(lat, lon) {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m&timezone=auto`);
    const data = await res.json();
    const c = data.current || {};
    return {
        temperature: c.temperature_2m || 0,
        humidity: c.relative_humidity_2m || 0,
        condition: c.weather_code < 3 ? 'Clear' : 'Cloudy',
        description: c.weather_code < 3 ? 'Clear sky' : 'Overcast',
        suitable: c.weather_code < 50
    };
}

async function getAirQuality(lat, lon) {
    const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`);
    const data = await res.json();
    const aqi = Math.ceil((data.current?.us_aqi || 50) / 50);
    return { aqi: Math.min(aqi, 5), level: ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'][aqi - 1], suitable: aqi <= 2 };
}

function getTraffic(hour) {
    if (hour >= 7 && hour <= 9) return { level: 'Heavy', description: 'Morning rush', estimatedDelayMinutes: 25 };
    if (hour >= 17 && hour <= 19) return { level: 'Heavy', description: 'Evening rush', estimatedDelayMinutes: 30 };
    return { level: 'Moderate', description: 'Normal traffic', estimatedDelayMinutes: 10 };
}

async function callAI(weather, eventType) {
    const key = process.env.GROQ_API_KEY;
    if (!key) return JSON.stringify({ verdict: 'NO_KEY', summary: 'Configure GROQ_API_KEY', action_plan: [], why: '' });

    const prompt = `Plan ${eventType} in Colombo. Weather: ${weather.temperature}C. JSON only: {"verdict":"PROCEED","summary":"...","action_plan":["..."],"why":"..."}`;
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }], max_tokens: 600 })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '{"verdict":"ERROR"}';
}

// Routes
app.get('/api/ping', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.get('/api/config', (req, res) => res.json(config));

app.get('/api/weather', async (req, res) => {
    try {
        const weather = await getWeather(config.coordinates.lat, config.coordinates.lon);
        const traffic = getTraffic(new Date().getHours());
        res.json({ ...weather, traffic, holidays: [] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/air-quality', async (req, res) => {
    try {
        res.json(await getAirQuality(config.coordinates.lat, config.coordinates.lon));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/calendar', (req, res) => res.json({ events: [], freeSlot: null }));

app.post('/api/plan-event', async (req, res) => {
    try {
        const { eventType, description } = req.body;
        const weather = await getWeather(config.coordinates.lat, config.coordinates.lon);
        const airQuality = await getAirQuality(config.coordinates.lat, config.coordinates.lon);
        const traffic = getTraffic(new Date().getHours());
        const analysis = await callAI(weather, `${eventType} (${description})`);
        res.json({ analysis, weather, airQuality, traffic });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
