module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { eventType, description } = req.body || {};

        // Get weather
        const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=6.9271&longitude=79.8612&current=temperature_2m,weather_code&timezone=auto`);
        const wData = await wRes.json();
        const weather = { temperature: wData.current?.temperature_2m || 0, condition: 'Clear' };

        // Default response
        let analysis = JSON.stringify({
            verdict: 'PROCEED',
            summary: 'Good conditions for your activity in Colombo.',
            action_plan: ['Visit Viharamahadevi Park', 'Explore Independence Square', 'Walk along Galle Face Green'],
            why: 'Current weather is suitable for outdoor activities.'
        });

        // Try AI if key exists
        const key = process.env.GROQ_API_KEY;
        if (key) {
            const prompt = `Plan ${eventType} (${description}) in Colombo, Sri Lanka. Weather: ${weather.temperature}C. Respond ONLY with JSON: {"verdict":"PROCEED","summary":"...","action_plan":["..."],"why":"..."}`;
            const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }], max_tokens: 600 })
            });
            const aiData = await aiRes.json();
            if (aiData.choices?.[0]?.message?.content) {
                analysis = aiData.choices[0].message.content;
            }
        }

        const hour = new Date().getHours();
        let traffic = { level: 'Moderate', description: 'Normal', estimatedDelayMinutes: 10 };
        if (hour >= 7 && hour <= 9) traffic = { level: 'Heavy', description: 'Morning rush', estimatedDelayMinutes: 25 };

        res.status(200).json({ analysis, weather, airQuality: { aqi: 2, level: 'Good', suitable: true }, traffic });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
