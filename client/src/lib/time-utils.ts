export function formatCurrentTime(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    }).format(date);
  } catch (error) {
    // Fallback to UTC if timezone is invalid
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    }).format(date);
  }
}

export function formatDueDate(date: Date, timeZone: string): string {
  try {
    const now = new Date();
    const targetDate = new Date(date);
    
    // Check if it's today
    const isToday = targetDate.toDateString() === now.toDateString();
    
    // Check if it's tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = targetDate.toDateString() === tomorrow.toDateString();
    
    if (isToday) {
      return `Today, ${new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      }).format(targetDate)}`;
    } else if (isTomorrow) {
      return `Tomorrow, ${new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      }).format(targetDate)}`;
    } else {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      }).format(targetDate);
    }
  } catch (error) {
    // Fallback format
    return date.toISOString().split('T')[0];
  }
}

export function createDueDate(days: number, timeZone: string): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  
  // Set to a reasonable business hour (2 PM)
  date.setHours(14, 0, 0, 0);
  
  return date;
}

export function getTimeZoneOffset(timeZone: string): string {
  try {
    const date = new Date();
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const targetTime = new Date(utc + (getTimezoneOffsetInMs(timeZone)));
    
    return targetTime.toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}

function getTimezoneOffsetInMs(timeZone: string): number {
  const date = new Date();
  const utcDate = new Date(date.toLocaleString("en-US", {timeZone: "UTC"}));
  const targetDate = new Date(date.toLocaleString("en-US", {timeZone}));
  
  return targetDate.getTime() - utcDate.getTime();
}
