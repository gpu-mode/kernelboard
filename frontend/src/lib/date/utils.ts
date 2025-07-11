import dayjs from "./dayjs";

export const toDateUtc = (raw: string) => {
  return dayjs(raw).utc().format("YYYY-MM-DD HH:mm");
};
