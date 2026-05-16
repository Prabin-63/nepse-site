export function isNepalMarketOpen(): boolean {
  // Nepal is UTC+5:45
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const nepal = new Date(utc + 5 * 3600000 + 45 * 60000);

  const day = nepal.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const hour = nepal.getHours();
  const minute = nepal.getMinutes();
  const timeMinutes = hour * 60 + minute;

  // NEPSE: Sunday(0) through Thursday(4) — note JS getDay() Sun=0
  const tradingDays = [0, 1, 2, 3, 4]; // Sun, Mon, Tue, Wed, Thu
  if (!tradingDays.includes(day)) return false;

  const marketOpen = 10 * 60;   // 10:00 AM
  const marketClose = 15 * 60;  // 3:00 PM
  return timeMinutes >= marketOpen && timeMinutes < marketClose;
}

export function timeToMarketEvent(): { label: string; seconds: number } {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const nepal = new Date(utc + 5 * 3600000 + 45 * 60000);

  const hour = nepal.getHours();
  const minute = nepal.getMinutes();
  const second = nepal.getSeconds();

  if (isNepalMarketOpen()) {
    const closeSeconds = (15 * 3600) - (hour * 3600 + minute * 60 + second);
    return { label: "Market closes in", seconds: closeSeconds };
  } else {
    // Next 10:00 AM Nepal time
    let openSeconds = (10 * 3600) - (hour * 3600 + minute * 60 + second);
    if (openSeconds < 0) openSeconds += 24 * 3600; // next day
    return { label: "Market opens in", seconds: openSeconds };
  }
}
