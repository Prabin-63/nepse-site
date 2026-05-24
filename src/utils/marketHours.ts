export function getMarketStatus(): 'OPEN' | 'PRE_OPEN' | 'CLOSED' {
  // Nepal is UTC+5:45
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const nepal = new Date(utc + 5 * 3600000 + 45 * 60000);

  const day = nepal.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const hour = nepal.getHours();
  const minute = nepal.getMinutes();
  const timeMinutes = hour * 60 + minute;

  // NEPSE trading days: Mon (1) to Fri (5)
  const tradingDays = [1, 2, 3, 4, 5]; 
  if (!tradingDays.includes(day)) return 'CLOSED';

  // Pre-Open: 10:30 AM (630) to 11:00 AM (660)
  if (timeMinutes >= 630 && timeMinutes < 660) return 'PRE_OPEN';
  
  // Continuous: 11:00 AM (660) to 3:00 PM (900)
  if (timeMinutes >= 660 && timeMinutes < 900) return 'OPEN';

  return 'CLOSED';
}

export function isNepalMarketOpen(): boolean {
  return getMarketStatus() === 'OPEN';
}

export function timeToMarketEvent(): { label: string; seconds: number; nextEvent: string } {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const nepal = new Date(utc + 5 * 3600000 + 45 * 60000);

  const day = nepal.getDay();
  const hour = nepal.getHours();
  const minute = nepal.getMinutes();
  const second = nepal.getSeconds();
  
  const status = getMarketStatus();

  if (status === 'OPEN') {
    const closeSeconds = (15 * 3600) - (hour * 3600 + minute * 60 + second);
    return { label: "Market closes in", seconds: closeSeconds, nextEvent: "close" };
  } else if (status === 'PRE_OPEN') {
    const openSeconds = (11 * 3600) - (hour * 3600 + minute * 60 + second);
    return { label: "Market opens in", seconds: openSeconds, nextEvent: "open" };
  } else {
    // If it's closed, figure out time until next 10:30 AM (Pre-Open)
    let openSeconds = (10.5 * 3600) - (hour * 3600 + minute * 60 + second);
    
    let daysToAdd = 0;
    if (openSeconds < 0) {
      daysToAdd = 1; // It's past 10:30 AM today, next is tomorrow
    }

    // Now calculate effective target day
    let targetDay = (day + daysToAdd) % 7;
    
    // Skip weekends (Sat=6, Sun=0)
    if (targetDay === 6) daysToAdd += 2; // Jump to Monday
    else if (targetDay === 0) daysToAdd += 1; // Jump to Monday

    if (daysToAdd > 0) {
      // Recalculate openSeconds properly by adding full days
      openSeconds = ((10.5 * 3600) + (daysToAdd * 24 * 3600)) - (hour * 3600 + minute * 60 + second);
    }
    
    return { label: "Market pre-opens in", seconds: openSeconds, nextEvent: "pre-open" };
  }
}
