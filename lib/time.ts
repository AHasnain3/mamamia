// lib/time.ts
/**
 * Get the time-zone offset (ms) for a given instant in a target IANA time zone
 * using only built-in Intl APIs.
 */
function getTzOffsetMs(date: Date, timeZone: string): number {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  
    const parts = dtf.formatToParts(date);
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    const asUTC = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(map.hour),
      Number(map.minute),
      Number(map.second)
    );
  
    // asUTC - date.getTime() === offset in ms for that zone at that instant
    return asUTC - date.getTime();
  }
  
  /**
   * Convert a local day (YYYY-MM-DD) in `timeZone` to the UTC Date representing
   * that local midnight. Two-pass adjustment handles DST transitions at midnight.
   */
  export function localDayToUTC(ymd: string, timeZone: string): Date {
    const [y, m, d] = ymd.split("-").map(Number);
    const utcGuess = Date.UTC(y, m - 1, d, 0, 0, 0);
  
    const offset1 = getTzOffsetMs(new Date(utcGuess), timeZone);
    let result = new Date(utcGuess - offset1);
  
    const offset2 = getTzOffsetMs(result, timeZone);
    if (offset2 !== offset1) {
      result = new Date(utcGuess - offset2);
    }
    return result;
  }
  