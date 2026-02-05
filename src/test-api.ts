import 'dotenv/config';
import axios from 'axios';

async function testAPIs() {
  console.log('🔑 API Tester\n');
  console.log('='.repeat(50));

  // Test Groq
  console.log('\n1️⃣ Testing GROQ API...');
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: 'Say "API working" in 3 words' }],
          max_tokens: 20
        },
        { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` } }
      );
      console.log('   ✅ GROQ: Working!');
      console.log(`   Response: "${res.data.choices[0].message.content}"`);
    } catch (e: any) {
      console.log('   ❌ GROQ: Failed -', e.response?.data?.error?.message || e.message);
    }
  } else {
    console.log('   ⚠️ GROQ: No API key set');
  }

  // Test Open-Meteo Weather (FREE - No API key needed)
  console.log('\n2️⃣ Testing WEATHER API (Open-Meteo)...');
  try {
    const res = await axios.get(
      'https://api.open-meteo.com/v1/forecast?latitude=6.9355&longitude=79.8487&hourly=rain,visibility,temperature_2m,relative_humidity_2m,precipitation_probability,precipitation&timezone=auto&current=temperature_2m,weather_code'
    );
    const current = res.data.current;
    const hourly = res.data.hourly;
    console.log('   ✅ WEATHER: Working!');
    console.log(`   Colombo: ${current.temperature_2m}°C`);
    console.log(`   Hourly data points: ${hourly.time.length}`);
    console.log(`   Rain chance (now): ${hourly.precipitation_probability[new Date().getHours()]}%`);
  } catch (e: any) {
    console.log('   ❌ WEATHER: Failed -', e.message);
  }

  // Test Open-Meteo Air Quality (FREE - No API key needed)
  console.log('\n3️⃣ Testing AIR QUALITY API (Open-Meteo)...');
  try {
    const res = await axios.get(
      'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=6.9355&longitude=79.8487&current=us_aqi,pm10,pm2_5,ozone'
    );
    const current = res.data.current;
    const levels = ['', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
    const aqiLevel = Math.min(Math.ceil(current.us_aqi / 50), 5);
    console.log('   ✅ AIR QUALITY: Working!');
    console.log(`   Colombo AQI: ${current.us_aqi} (${levels[aqiLevel]})`);
    console.log(`   PM2.5: ${current.pm2_5} µg/m³`);
    console.log(`   PM10: ${current.pm10} µg/m³`);
  } catch (e: any) {
    console.log('   ❌ AIR QUALITY: Failed -', e.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ All APIs are FREE - No API keys needed for weather!\n');
}

testAPIs();
