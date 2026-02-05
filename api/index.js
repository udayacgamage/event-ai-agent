// Simple Vercel API - No TypeScript, No Dependencies

let currentConfig = {
    location: 'Colombo',
    coordinates: { lat: 6.9271, lon: 79.8612 }
};

async function getWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`;
    const response = await fetch(url);
    const data = await response.json();
    const current = data.current || {};
    const conditions = { 0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast' };
    return {
        temperature: current.temperature_2m || 0,
        condition: conditions[current.weather_code] || 'Unknown',
        humidity: current.relative_humidity_2m || 0,
        windSpeed: (current.wind_speed_10m || 0) / 3.6,
        description: conditions[current.weather_code] || 'Unknown',
        precipitationProbability: 0,
        suitable: (current.weather_code || 0) < 50
    };
}

async function getAirQuality(lat, lon) {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`;
    const response = await fetch(url);
    const data = await response.json();
    const rawAqi = data.current?.us_aqi || 50;
    const aqi = Math.ceil(rawAqi / 50) || 1;
    const levels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
    return { aqi: Math.min(aqi, 5), level: levels[Math.min(aqi - 1, 4)], suitable: aqi <= 2 };
}

function getTraffic(hour) {
    if (hour >= 7 && hour <= 9) return { level: 'Heavy', description: 'Morning rush', estimatedDelayMinutes: 25 };
    if (hour >= 17 && hour <= 19) return { level: 'Heavy', description: 'Evening rush', estimatedDelayMinutes: 30 };
    return { level: 'Moderate', description: 'Normal traffic', estimatedDelayMinutes: 10 };
}

async function callAI(context, eventType) {
    const key = process.env.GROQ_API_KEY;
    if (!key) return JSON.stringify({ verdict: 'NO_KEY', summary: 'API key missing', action_plan: [], why: 'Configure GROQ_API_KEY' });

    const prompt = `Plan ${eventType} in Colombo. Weather: ${JSON.stringify(context.weather)}. Respond ONLY JSON: {"verdict":"PROCEED","summary":"...","action_plan":["..."],"why":"..."}`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }], max_tokens: 600 })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '{"verdict":"ERROR"}';
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const path = req.url.split('?')[0];

    try {
        if (path === '/api/ping') return res.json({ status: 'ok', time: new Date().toISOString() });

        if (path === '/api/config') {
            if (req.method === 'POST') currentConfig = { ...currentConfig, ...req.body };
            return res.json(currentConfig);
        }

        if (path === '/api/weather') {
            const { lat, lon } = currentConfig.coordinates;
            const weather = await getWeather(lat, lon);
            const traffic = getTraffic(new Date().getHours());
            return res.json({ ...weather, traffic, holidays: [] });
        }

        if (path === '/api/air-quality') {
            const { lat, lon } = currentConfig.coordinates;
            return res.json(await getAirQuality(lat, lon));
        }

        if (path === '/api/calendar') return res.json({ events: [], freeSlot: null });

        if (path === '/api/plan-event') {
            const { eventType, description } = req.body || {};
            const { lat, lon } = currentConfig.coordinates;
            const weather = await getWeather(lat, lon);
            const airQuality = await getAirQuality(lat, lon);
            const traffic = getTraffic(new Date().getHours());
            const analysis = await callAI({ weather, traffic }, `${eventType} (${description})`);
            return res.json({ analysis, weather, airQuality, traffic });
        }

        return res.status(404).json({ error: 'Not found' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
