import { TrafficData } from '../types';

export function getTrafficStatus(hour: number): TrafficData {
    // Simple simulation based on typical rush hours
    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
        return {
            level: 'Heavy',
            description: 'Peak hour rush. Expect significant delays on main arteries.',
            estimatedDelayMinutes: 25
        };
    } else if (hour >= 23 || hour <= 5) {
        return {
            level: 'Low',
            description: 'Clear roads. Smooth travel expected.',
            estimatedDelayMinutes: 0
        };
    } else {
        return {
            level: 'Moderate',
            description: 'Steady traffic. Some congestion at intersections.',
            estimatedDelayMinutes: 10
        };
    }
}
