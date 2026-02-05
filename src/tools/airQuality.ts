import axios from 'axios';
import { AirQualityData } from '../types';

export async function getAirQuality(lat: number, lon: number): Promise<AirQualityData> {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5,ozone`;
  console.log('    💨 Fetching Air Quality...');

  try {
    const response = await axios.get(url, { timeout: 10000 });
    const current = response.data.current || {};

    const rawAqi = current.us_aqi ?? 0;
    const aqi = Math.ceil(rawAqi / 50) || 1;
    const aqiLevels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];

    return {
      aqi: Math.min(aqi, 5),
      level: aqiLevels[Math.min(aqi - 1, 4)] || 'Unknown',
      pollutants: {
        pm2_5: current.pm2_5 ?? 0,
        pm10: current.pm10 ?? 0,
        o3: current.ozone ?? 0
      }
    };
  } catch (error: any) {
    console.error('    ❌ AQI API Error:', error.message);
    throw error;
  }
}

export function isAirQualitySuitable(airQuality: AirQualityData): boolean {
  return airQuality.aqi <= 2;
}
