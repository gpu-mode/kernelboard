import dayjs from "./dayjs";

export const toDateUtc = (raw: string) => {
  return dayjs(raw).utc().format("YYYY-MM-DD HH:mm");
};

/**
 * Calculate time left until deadline.
 * Returns formatted string if deadline is in the future, otherwise "ended".
 * Matches the Python to_time_left function.
 */
export const getTimeLeft = (deadline: string): string => {
  const now = dayjs().utc();
  const deadlineDate = dayjs(deadline);

  // Check if the deadline is invalid or in the past
  if (!deadlineDate.isValid() || deadlineDate.isBefore(now) || deadlineDate.isSame(now)) {
    return "ended";
  }

  const diff = deadlineDate.diff(now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const dayLabel = days === 1 ? "day" : "days";
  const hourLabel = hours === 1 ? "hour" : "hours";

  return `${days} ${dayLabel} ${hours} ${hourLabel} remaining`;
};
