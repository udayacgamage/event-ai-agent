import cron from 'node-cron';
import { ToolsAgent } from '../agent/toolsAgent';

export function setupScheduleTrigger(
  cronExpression: string,
  location: string,
  coordinates: { lat: number; lon: number },
  userPhone: string
): void {
  console.log(`⏰ Schedule trigger set: ${cronExpression}\n`);

  cron.schedule(cronExpression, async () => {
    console.log(`\n🔔 Trigger activated at ${new Date().toLocaleString()}\n`);
    
    const agent = new ToolsAgent(location, coordinates, userPhone);
    await agent.execute();
  });
}

export async function manualTrigger(
  location: string,
  coordinates: { lat: number; lon: number },
  userPhone: string
): Promise<void> {
  console.log(`\n🔔 Manual trigger activated at ${new Date().toLocaleString()}\n`);
  
  const agent = new ToolsAgent(location, coordinates, userPhone);
  await agent.execute();
}
