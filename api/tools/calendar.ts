import { CalendarEvent } from '../types';

let calendarEvents: CalendarEvent[] = [
  {
    id: 'evt_1',
    title: 'Kala Pola 2026 (Open-Air Art Fair)',
    start: new Date('2026-02-08T09:00:00'),
    end: new Date('2026-02-08T18:00:00')
  },
  {
    id: 'evt_2',
    title: "India vs Pakistan T20 World Cup",
    start: new Date('2026-02-15T19:00:00'),
    end: new Date('2026-02-15T23:00:00')
  },
  {
    id: 'evt_3',
    title: "The Hunger Concert @ Nelum Pokuna",
    start: new Date('2026-02-14T18:30:00'),
    end: new Date('2026-02-14T22:30:00')
  }
];

export function checkCalendar(date: Date): CalendarEvent[] {
  const checkDate = new Date(date);
  return calendarEvents.filter(event => {
    const eventDate = new Date(event.start);
    return eventDate.toDateString() === checkDate.toDateString();
  });
}

export function createEvent(title: string, start: Date, end: Date): CalendarEvent {
  const event: CalendarEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    title,
    start,
    end
  };
  calendarEvents.push(event);
  return event;
}

export function deleteEvent(id: string): boolean {
  const initialLength = calendarEvents.length;
  calendarEvents = calendarEvents.filter(evt => evt.id !== id);
  return calendarEvents.length < initialLength;
}

export function findFreeSlot(date: Date, durationHours: number): { start: Date; end: Date } | null {
  const events = checkCalendar(date);
  const dayStart = new Date(date);
  dayStart.setHours(8, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(18, 0, 0, 0);

  let currentTime = dayStart;

  for (const event of events.sort((a, b) => a.start.getTime() - b.start.getTime())) {
    const gapHours = (event.start.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
    if (gapHours >= durationHours) {
      return {
        start: new Date(currentTime),
        end: new Date(currentTime.getTime() + durationHours * 60 * 60 * 1000)
      };
    }
    currentTime = new Date(event.end);
  }

  const remainingHours = (dayEnd.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
  if (remainingHours >= durationHours) {
    return {
      start: new Date(currentTime),
      end: new Date(currentTime.getTime() + durationHours * 60 * 60 * 1000)
    };
  }

  return null;
}
