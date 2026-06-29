import dayjs from "./dayjs";

const ALWAYS_OPEN_DEADLINE_THRESHOLD_DAYS = 365;

export const toDateUtc = (raw: string) => {
  return dayjs(raw).utc().format("YYYY-MM-DD HH:mm");
};

export const toDateLocal = (raw: string, timeZone?: string) => {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  };

  if (timeZone) {
    options.timeZone = timeZone;
  }

  try {
    return new Intl.DateTimeFormat(undefined, options).format(date);
  } catch {
    return `${toDateUtc(raw)} UTC`;
  }
};

/**
 * Calculate time left until deadline.
 * Returns formatted string if deadline is in the future, otherwise "ended".
 * Matches the Python to_time_left function.
 */
export const getTimeLeft = (deadline: string, time: Date = new Date()): string => {
  const now = dayjs(time).utc();
  const deadlineDate = dayjs(deadline);

  // Check if the deadline is invalid or in the past
  if (
    !deadlineDate.isValid() ||
    deadlineDate.isBefore(now) ||
    deadlineDate.isSame(now)
  ) {
    return "ended";
  }

  const totalSeconds = Math.floor(deadlineDate.diff(now) / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));

  if (days === 0 && hours === 0) {
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;
    const minuteLabel = minutes === 1 ? "minute" : "minutes";
    const secondLabel = seconds === 1 ? "second" : "seconds";

    return `${minutes} ${minuteLabel} ${seconds} ${secondLabel} remaining`;
  }

  const dayLabel = days === 1 ? "day" : "days";
  const hourLabel = hours === 1 ? "hour" : "hours";

  return `${days} ${dayLabel} ${hours} ${hourLabel} remaining`;
};

export const shouldHideTimeRemaining = (deadline: string, time: Date = new Date()): boolean => {
  const now = dayjs(time).utc();
  const deadlineDate = dayjs(deadline);

  if (!deadlineDate.isValid() || deadlineDate.isSame(now) || deadlineDate.isBefore(now)) {
    return false;
  }

  return deadlineDate.diff(now, "day", true) > ALWAYS_OPEN_DEADLINE_THRESHOLD_DAYS;
};

export const isExpired = (
  deadline: string | Date,
  time: Date = new Date(),
): boolean => {
  let d: Date;
  if (typeof deadline === "string") {
    const parsed = new Date(deadline);
    if (isNaN(parsed.getTime())) {
      return true;
    }
    d = parsed;
  } else {
    d = deadline;
  }
  return d.getTime() <= time.getTime();
};
