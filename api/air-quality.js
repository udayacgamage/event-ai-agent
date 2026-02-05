export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const lat = 6.9271, lon = 79.8612;
        const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`;
        const response = await fetch(url);
        const data = await response.json();
        const rawAqi = data.current?.us_aqi || 50;
        const aqi = Math.ceil(rawAqi / 50) || 1;
        const levels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];

        res.status(200).json({ aqi: Math.min(aqi, 5), level: levels[Math.min(aqi - 1, 4)], suitable: aqi <= 2 });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
