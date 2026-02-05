export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { eventType, description } = req.body || {};
        const lat = 6.9271, lon = 79.8612;

        // Get weather
        const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`);
        const wData = await wRes.json();
        const weather = { temperature: wData.current?.temperature_2m || 0, condition: 'Clear' };

        // Get AI
        const key = process.env.GROQ_API_KEY;
        let analysis = JSON.stringify({ verdict: 'PROCEED', summary: 'Good conditions for your activity.', action_plan: ['Visit Viharamahadevi Park', 'Explore Dutch Hospital', 'Walk along Galle Face'], why: 'Weather is suitable.' });

        if (key) {
            const prompt = `Plan ${eventType} (${description}) in Colombo. Weather: ${weather.temperature}C. Respond ONLY JSON: {"verdict":"PROCEED","summary":"...","action_plan":["..."],"why":"..."}`;
            const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }], max_tokens: 600 })
            });
            const aiData = await aiRes.json();
            analysis = aiData.choices?.[0]?.message?.content || analysis;
        }

        res.status(200).json({ analysis, weather, airQuality: { aqi: 2, level: 'Good' }, traffic: { level: 'Moderate' } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
