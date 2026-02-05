module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const lat = 6.9271, lon = 79.8612;
        // Added daily forecast to the request
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
        const data = await response.json();
        const c = data.current || {};
        const d = data.daily || {};

        const hour = new Date().getHours();
        let traffic = { level: 'Moderate', description: 'Normal', estimatedDelayMinutes: 10 };
        if (hour >= 7 && hour <= 9) traffic = { level: 'Heavy', description: 'Morning rush', estimatedDelayMinutes: 25 };
        if (hour >= 17 && hour <= 19) traffic = { level: 'Heavy', description: 'Evening rush', estimatedDelayMinutes: 30 };

        res.status(200).json({
            temperature: c.temperature_2m || 0,
            humidity: c.relative_humidity_2m || 0,
            condition: c.weather_code < 3 ? 'Clear' : 'Cloudy',
            description: c.weather_code < 3 ? 'Clear sky' : 'Overcast',
            suitable: c.weather_code < 50,
            forecast: d,
            traffic,
            holidays: []
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
