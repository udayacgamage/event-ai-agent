import { ActivityRecommendation } from '../types';

export async function sendMessage(to: string, message: string): Promise<boolean> {
  // In production, integrate with Twilio, SendGrid, or similar
  console.log(`📱 Sending message to ${to}:`);
  console.log(`   "${message}"`);
  
  // Simulated send - replace with actual API call
  // Example with Twilio:
  // const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await client.messages.create({ body: message, from: process.env.TWILIO_PHONE_NUMBER, to });
  
  return true;
}

export function formatRecommendationMessage(rec: ActivityRecommendation): string {
  if (!rec.recommended) {
    return `🌤️ Weather Update: Not ideal for outdoor activities today. ${rec.reason}`;
  }
  
  return `🥾 Hiking Recommendation!
  
📍 Trail: ${rec.trail?.name}
📏 Length: ${rec.trail?.length} km (${rec.trail?.difficulty})
🌡️ Weather: ${rec.weather.temperature}°C, ${rec.weather.description}
💨 Air Quality: ${rec.airQuality.level}
⏰ Suggested Time: ${rec.suggestedTime}

${rec.reason}

Have a great hike! 🌲`;
}
