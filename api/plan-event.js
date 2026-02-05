module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { eventType, description } = req.body || {};

        // Get live weather and 7-day forecast
        const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=6.9271&longitude=79.8612&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
        const wData = await wRes.json();

        const weather = {
            temperature: wData.current?.temperature_2m || 0,
            condition: 'Clear',
            forecast: wData.daily || {}
        };

        // Default response
        let analysis = JSON.stringify({
            verdict: 'PROCEED',
            summary: 'Good conditions for your activity across Sri Lanka.',
            action_plan: ['Explore Kandy Temple of the Tooth', 'Visit Ella Nine Arch Bridge', 'Hike Little Adam\'s Peak'],
            why: 'Weather looks promising for island-wide travel.'
        });

        // Try AI if key exists
        const key = process.env.GROQ_API_KEY;
        if (key) {
            const prompt = `Plan ${eventType} (${description}) in Sri Lanka. 
            
            Current Weather (Colombo/Detected): ${weather.temperature}C.
            7-Day Forecast Data: ${JSON.stringify(weather.forecast)}
            
            UNIFIED INSTRUCTIONS:
            1. Respond ONLY with a single JSON object.
            2. DO NOT limit suggestions to Colombo. You are encouraged to suggest island-wide destinations (e.g., Kandy, Ella, Nuwara Eliya, Jaffna, Galle, Sigiriya) if they suit the trip.
            3. For multi-day trips, each day MUST be a SEPARATE item in the action_plan array (e.g., ["Day 1: ...", "Day 2: ..."]).
            4. Consider the 7-day forecast provided when planning.
            
            JSON Structure: {"verdict":"PROCEED","summary":"...","action_plan":["Day 1:...","Day 2:..."],"why":"..."}`;

            const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }], max_tokens: 800 })
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
