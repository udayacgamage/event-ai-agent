export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  description: string;
  visibility: number;
  rain: number;
  precipitationProbability: number;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  humidity: number;
  rain: number;
  precipitationProbability: number;
  visibility: number;
}

export interface AirQualityData {
  aqi: number;
  level: string;
  pollutants: Record<string, number>;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

export interface ActivityRecommendation {
  recommended: boolean;
  reason: string;
  weather: WeatherData;
  airQuality: AirQualityData;
  suggestedTime?: string;
}

export interface HolidayData {
  date: string;
  name: string;
  localName: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
}

export interface TrafficData {
  level: 'Low' | 'Moderate' | 'Heavy' | 'Gridlock';
  description: string;
  estimatedDelayMinutes: number;
}

export interface AgentContext {
  weather?: WeatherData;
  airQuality?: AirQualityData;
  calendar?: CalendarEvent[];
  holidays?: HolidayData[];
  traffic?: TrafficData;
}
