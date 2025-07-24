import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { type SxProps, type Theme } from "@mui/material";

const medalStyle = (color: string): SxProps<Theme> => ({
  color,
  fontSize: "1.1rem",
  verticalAlign: "middle",
});

/**
 * Returns a medal icon component based on the ranking position.
 *
 * @param rank - The ranking position (1-3)
 * @returns A styled EmojiEventsIcon component for ranks 1-3, or null for other ranks
 *
 * @example
 * ```tsx
 * // Gold medal for 1st place
 * const goldMedal = getMedalIcon(1);
 *
 * // Silver medal for 2nd place
 * const silverMedal = getMedalIcon(2);
 *
 * // Bronze medal for 3rd place
 * const bronzeMedal = getMedalIcon(3);
 *
 * // No medal for other ranks
 * const noMedal = getMedalIcon(4); // returns null
 * ```
 */
export const getMedalIcon = (rank: number) => {
  if (rank === 1) return <EmojiEventsIcon sx={medalStyle("#FFD700")} />;
  if (rank === 2) return <EmojiEventsIcon sx={medalStyle("#C0C0C0")} />;
  if (rank === 3) return <EmojiEventsIcon sx={medalStyle("#CD7F32")} />;
  return null;
};
