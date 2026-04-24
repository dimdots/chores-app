import { fromZonedTime, toZonedTime, format as tzFormat } from "date-fns-tz";
import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";
import { appConfig } from "@/config/app";

/** Return the start of the local day (in APP_TIMEZONE), as a UTC Date. */
export function startOfLocalDay(d: Date = new Date()): Date {
  const zoned = toZonedTime(d, appConfig.timezone);
  const localMidnight = startOfDay(zoned);
  return fromZonedTime(localMidnight, appConfig.timezone);
}

/** Difference in calendar days between two dates (in app timezone). */
export function calendarDaysBetween(a: Date, b: Date): number {
  const za = toZonedTime(a, appConfig.timezone);
  const zb = toZonedTime(b, appConfig.timezone);
  return differenceInCalendarDays(zb, za);
}

/** Weekday number in app timezone. 0=Sunday..6=Saturday. */
export function localWeekday(d: Date = new Date()): number {
  const zoned = toZonedTime(d, appConfig.timezone);
  return zoned.getDay();
}

/** Start of ISO week (Monday) in local tz, returned as a UTC Date. */
export function startOfLocalWeek(d: Date = new Date()): Date {
  const today = startOfLocalDay(d);
  const dow = localWeekday(today); // 0..6, Sun..Sat
  const delta = dow === 0 ? -6 : 1 - dow; // back to Monday
  return addDays(today, delta);
}

/** Format a date for Russian UI (e.g. "18 апр, 14:30"). */
export function formatDateTimeRu(d: Date): string {
  return tzFormat(toZonedTime(d, appConfig.timezone), "d MMM, HH:mm", {
    timeZone: appConfig.timezone,
  });
}

export function formatDateRu(d: Date): string {
  return tzFormat(toZonedTime(d, appConfig.timezone), "d MMM yyyy", {
    timeZone: appConfig.timezone,
  });
}

/** ISO date (yyyy-mm-dd) in app timezone. */
export function isoDateLocal(d: Date): string {
  return tzFormat(toZonedTime(d, appConfig.timezone), "yyyy-MM-dd", {
    timeZone: appConfig.timezone,
  });
}
