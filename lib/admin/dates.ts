const amsterdamTimeZone = "Europe/Amsterdam";

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);

  const valueByType = new Map(parts.map((part) => [part.type, part.value]));
  const zonedTimeAsUtc = Date.UTC(
    Number(valueByType.get("year")),
    Number(valueByType.get("month")) - 1,
    Number(valueByType.get("day")),
    Number(valueByType.get("hour")),
    Number(valueByType.get("minute")),
    Number(valueByType.get("second")),
  );

  return Math.round((zonedTimeAsUtc - date.getTime()) / 60000);
}

function formatOffset(minutes: number) {
  const sign = minutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(minutes);
  const hours = Math.floor(absoluteMinutes / 60)
    .toString()
    .padStart(2, "0");
  const remainingMinutes = (absoluteMinutes % 60).toString().padStart(2, "0");

  return `${sign}${hours}:${remainingMinutes}`;
}

export function amsterdamLocalDateTimeToIso(dateKey: string, time: string) {
  const [yearText, monthText, dayText] = dateKey.split("-");
  const [hourText, minuteText] = time.split(":");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);

  let offsetMinutes = getTimeZoneOffsetMinutes(
    new Date(Date.UTC(year, month - 1, day, hour, minute, 0)),
    amsterdamTimeZone,
  );
  offsetMinutes = getTimeZoneOffsetMinutes(
    new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - offsetMinutes * 60 * 1000),
    amsterdamTimeZone,
  );

  return `${dateKey}T${time}:00${formatOffset(offsetMinutes)}`;
}

export function getAmsterdamTodayKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: amsterdamTimeZone,
    year: "numeric",
  }).formatToParts(now);
  const valueByType = new Map(parts.map((part) => [part.type, part.value]));

  return `${valueByType.get("year")}-${valueByType.get("month")}-${valueByType.get("day")}`;
}
