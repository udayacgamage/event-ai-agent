import { getWeather, isWeatherSuitable } from '../tools/weather';
import { getAirQuality, isAirQualitySuitable } from '../tools/airQuality';
import { checkCalendar, createEvent, findFreeSlot } from '../tools/calendar';
import { getTrailList, recommendTrail } from '../tools/trails';
import { sendMessage, formatRecommendationMessage } from '../tools/messaging';
import { analyzeConditions } from '../tools/openai';
import { AgentContext, ActivityRecommendation } from '../types';

export class ToolsAgent {
  private location: string;
  private userPhone: string;
  private coordinates: { lat: number; lon: number };

  constructor(location: string, coordinates: { lat: number; lon: number }, userPhone: string) {
    this.location = location;
    this.coordinates = coordinates;
    this.userPhone = userPhone;
  }

  async execute(): Promise<void> {
    console.log('🤖 Tools Agent activated...\n');

    try {
      // Step 1: Gather all context
      const context = await this.gatherContext();
      console.log('📊 Context gathered successfully\n');

      // Step 2: Analyze and make recommendation
      const recommendation = await this.makeRecommendation(context);
      console.log('🎯 Recommendation generated\n');

      // Step 3: If recommended, create calendar event
      if (recommendation.recommended && recommendation.suggestedTime) {
        const today = new Date();
        const [hours, minutes] = recommendation.suggestedTime.split(':').map(Number);
        const start = new Date(today.setHours(hours, minutes, 0, 0));
        const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 hour hike
        
        createEvent(`Hiking: ${recommendation.trail?.name}`, start, end);
        console.log('📅 Calendar event created\n');
      }

      // Step 4: Send notification
      const message = formatRecommendationMessage(recommendation);
      await sendMessage(this.userPhone, message);
      console.log('✅ Agent execution complete\n');

    } catch (error) {
      console.error('❌ Agent execution failed:', error);
      throw error;
    }
  }

  private async gatherContext(): Promise<AgentContext> {
    console.log('  📍 Fetching weather data...');
    const weather = await getWeather(this.location);

    console.log('  🌬️ Fetching air quality...');
    const airQuality = await getAirQuality(this.coordinates.lat, this.coordinates.lon);

    console.log('  📅 Checking calendar...');
    const calendar = checkCalendar(new Date());

    console.log('  🥾 Loading trail options...');
    const trails = getTrailList();

    return { weather, airQuality, calendar, trails };
  }

  private async makeRecommendation(context: AgentContext): Promise<ActivityRecommendation> {
    const weatherOk = context.weather && isWeatherSuitable(context.weather);
    const airOk = context.airQuality && isAirQualitySuitable(context.airQuality);

    if (!weatherOk || !airOk) {
      const reasons: string[] = [];
      if (!weatherOk) reasons.push(`Weather: ${context.weather?.condition}, ${context.weather?.temperature}°C`);
      if (!airOk) reasons.push(`Air quality: ${context.airQuality?.level}`);

      return {
        recommended: false,
        reason: `Conditions not ideal. ${reasons.join('. ')}`,
        weather: context.weather!,
        airQuality: context.airQuality!
      };
    }

    // Find available time slot
    const freeSlot = findFreeSlot(new Date(), 2);
    if (!freeSlot) {
      return {
        recommended: false,
        reason: 'No available time slot found in your calendar today.',
        weather: context.weather!,
        airQuality: context.airQuality!
      };
    }

    // Get AI analysis
    const analysis = await analyzeConditions(context);

    // Recommend a trail
    const trail = recommendTrail(10, 'moderate');

    return {
      recommended: true,
      trail: trail || undefined,
      reason: analysis,
      weather: context.weather!,
      airQuality: context.airQuality!,
      suggestedTime: `${freeSlot.start.getHours()}:${String(freeSlot.start.getMinutes()).padStart(2, '0')}`
    };
  }
}
