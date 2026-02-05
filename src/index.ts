import 'dotenv/config';
import { startServer } from './server/api';
import { setupScheduleTrigger, manualTrigger } from './scheduler/trigger';

const CONFIG = {
  location: 'Colombo', // Change to your city
  coordinates: { lat: 6.9271, lon: 79.8612 }, // Your city's coordinates
  userPhone: process.env.USER_PHONE_NUMBER || '+1234567890',
  // Run daily at 7:00 AM
  schedule: '0 7 * * *'
};

async function main() {
  console.log('🚀 Weather AI Agent Starting...\n');

  // Start API server for web dashboard
  startServer(3001);

  // Setup scheduled trigger (runs daily at 7 AM)
  setupScheduleTrigger(
    CONFIG.schedule,
    CONFIG.location,
    CONFIG.coordinates,
    CONFIG.userPhone
  );

  console.log('\n✅ Agent ready!');
  console.log('📊 Dashboard: http://localhost:3000');
  console.log('🔌 API: http://localhost:3001\n');
}

export { app } from './server/api';
import { app } from './server/api';
export default app;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  main().catch(console.error);
}
