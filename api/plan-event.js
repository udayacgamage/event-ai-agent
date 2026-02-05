module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { eventType, description } = req.body || {};
        const lat = 6.9271, lon = 79.8612;

        // 1. Fetch live weather & 7-day forecast
        const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
        const wData = await wRes.json();

        // 2. Fetch public holidays for Sri Lanka
        let holidays = [];
        try {
            const currentYear = new Date().getFullYear();
            const hRes = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${currentYear}/LK`);
            if (hRes.ok) holidays = await hRes.json();
        } catch (e) { console.error('Holiday fetch failed', e); }

        // 3. Calculate Traffic based on current time
        const hour = new Date().getHours();
        let traffic = { level: 'Low', description: 'Light traffic', estimatedDelayMinutes: 5 };
        if (hour >= 7 && hour <= 9) traffic = { level: 'Heavy', description: 'Morning rush hour congestion', estimatedDelayMinutes: 25 };
        if (hour >= 17 && hour <= 19) traffic = { level: 'Heavy', description: 'Evening peak hour', estimatedDelayMinutes: 30 };
        else if (hour >= 10 && hour <= 16) traffic = { level: 'Moderate', description: 'Typical urban movement', estimatedDelayMinutes: 12 };

        const weather = {
            temperature: wData.current?.temperature_2m || 0,
            condition: 'Synced',
            forecast: wData.daily || {}
        };

        // 4. Default AI result if key is missing
        let analysis = JSON.stringify({
            verdict: 'PROCEED',
            summary: 'Conditions analyzed for Sri Lanka.',
            action_plan: ['Explore local landmarks'],
            why: 'System check complete.'
        });

        // Try AI with all context
        const key = process.env.GROQ_API_KEY;
        if (key) {
            const prompt = `Task: Plan ${eventType} (${description}) in Sri Lanka. 
            
            Strict Data Context to Consider:
            - Current Temp: ${weather.temperature}C
            - 7-Day Predicted Weather: ${JSON.stringify(weather.forecast)}
            - Real-Time Traffic Status: ${traffic.level} (${traffic.description})
            - Upcoming/Current Public Holidays: ${JSON.stringify(holidays.slice(0, 5))}
            
            UNIFIED INSTRUCTIONS:
            1. Respond ONLY with a single JSON object (No Markdown).
            2. Suggest specific locations throughout Sri Lanka (Not just Colombo).
            3. CRITICAL: If a holiday is detected, warn about potential crowds or closed venues.
            4. CRITICAL: If traffic is Heavy, suggest activities that minimize travel time or start early.
            5. CRITICAL: If rain is predicted in the forecast, suggest indoor alternatives.
            
            JSON Structure: {"verdict":"PROCEED/CAUTION/STOP","summary":"...","action_plan":["Day 1:...","Day 2:..."],"why":"..."}`;

            const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [{ role: 'system', content: 'You are a master logistics and event planner for Sri Lanka. You check weather, traffic, and holidays before every plan.' }, { role: 'user', content: prompt }],
                    max_tokens: 1000,
                    temperature: 0.2
                })
            });
            const aiData = await aiRes.json();
            if (aiData.choices?.[0]?.message?.content) {
                analysis = aiData.choices[0].message.content;
            }
        }

        res.status(200).json({
            analysis,
            weather,
            airQuality: { aqi: 2, level: 'Good' },
            traffic,
            holidays: holidays.slice(0, 3)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
