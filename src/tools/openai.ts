import axios from 'axios';
import { AgentContext } from '../types';

async function callGroq(prompt: string): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    console.log('    ⚠️ No GROQ_API_KEY set');
    return 'AI analysis unavailable - no API key configured.';
  }

  try {
    console.log('    🤖 Calling Groq AI...');
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are a strict JSON-only API. You never provide conversational text outside the JSON object. You are an expert event planner for Sri Lanka.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.2
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    console.log('    ✅ Groq AI responded');
    return response.data.choices[0].message.content;
  } catch (error: any) {
    console.log('    ❌ Groq AI error:', error.response?.data?.error?.message || error.message);
    return 'AI analysis failed. Please check your API key.';
  }
}

export async function analyzeConditions(context: AgentContext, eventType: string = 'outdoor activity'): Promise<string> {
  console.log('    🤖 Using Groq AI Real-Time Knowledge for', eventType);

  const holiday = context.holidays && context.holidays.length > 0
    ? `\nNote: Today is a public holiday (${context.holidays[0].name}).`
    : '';

  const traffic = context.traffic
    ? `\nTraffic Level: ${context.traffic.level} (${context.traffic.description}, ~${context.traffic.estimatedDelayMinutes}m delay)`
    : '';

  const prompt = `Plan a ${eventType}. 

CRITICAL LOCATION RULE: You are currently located in ${context.weather ? 'Colombo / detected coordinates' : 'Colombo, Sri Lanka'}. 
DO NOT suggest anything in Ella, Haputale, Nuwara Eliya, or any location more than 30km away. 
Sugestions MUST be local to Colombo urban area (e.g., National Museum, Planetarium, Viharamahadevi Park, Dutch Hospital, Galle Face).

Current Environment:
- Weather: ${JSON.stringify(context.weather)}
- Air Quality: ${JSON.stringify(context.airQuality)}
- My Schedule: ${JSON.stringify(context.calendar)}${holiday}${traffic}

Instructions:
1. Respond ONLY with a single JSON object.
2. NO MARKDOWN: Never use **bold**, _italics_, or [links] in values.
3. SCHOOL TRIP RULE: Suggest high-capacity, educational, and safe Colombo landmarks.
4. If weather is bad (Rain/Thunder), only suggest INDOOR locations.

Structure:
{
  "verdict": "PROCEED",
  "summary": "1-sentence summary (plain text).",
  "action_plan": ["Specific Item 1", "Specific Item 2", "Specific Item 3"],
  "why": "2-3 plain text paragraphs explaining the choice based on weather/traffic."
}
`;

  console.log('    📝 FULL PROMPT SENT TO AI:\n', prompt);
  return callGroq(prompt);
}
