export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const lat = 6.9271, lon = 79.8612;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m&timezone=auto`;
        const response = await fetch(url);
        const data = await response.json();
        const current = data.current || {};

        const hour = new Date().getHours();
        let traffic = { level: 'Moderate', description: 'Normal', estimatedDelayMinutes: 10 };
        if (hour >= 7 && hour <= 9) traffic = { level: 'Heavy', description: 'Morning rush', estimatedDelayMinutes: 25 };
        if (hour >= 17 && hour <= 19) traffic = { level: 'Heavy', description: 'Evening rush', estimatedDelayMinutes: 30 };

        res.status(200).json({
            temperature: current.temperature_2m || 0,
            humidity: current.relative_humidity_2m || 0,
            condition: current.weather_code < 3 ? 'Clear' : 'Cloudy',
            description: current.weather_code < 3 ? 'Clear sky' : 'Overcast',
            suitable: current.weather_code < 50,
            traffic,
            holidays: []
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
