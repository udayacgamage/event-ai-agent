import axios from 'axios';
import { HolidayData } from '../types';

export async function getHolidays(year: number, countryCode: string = 'LK'): Promise<HolidayData[]> {
    try {
        const response = await axios.get(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
        return response.data;
    } catch (error) {
        console.warn('Could not fetch holidays, returning empty list');
        return [];
    }
}

export function isHoliday(date: Date, holidays: HolidayData[]): HolidayData | null {
    const dateStr = date.toISOString().split('T')[0];

    // Specific February 2026 Holidays for Colombo
    const colomboHolidays = [
        { date: '2026-02-01', name: 'Navam Full Moon Poya Day' },
        { date: '2026-02-04', name: 'Independence Day' },
        { date: '2026-02-15', name: 'Mahasivarathri Day' }
    ];

    const localHoliday = colomboHolidays.find(h => h.date === dateStr);
    if (localHoliday) {
        return {
            date: localHoliday.date,
            name: localHoliday.name,
            localName: localHoliday.name,
            countryCode: 'LK',
            fixed: true,
            global: false
        };
    }

    return holidays.find(h => h.date === dateStr) || null;
}
