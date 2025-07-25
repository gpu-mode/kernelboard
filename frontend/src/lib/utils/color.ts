/**
 * Convert name to a color using a hash.
 */

import MurmurHash3 from "imurmurhash";

const colors = [
  "#FF6B6B", // coral
  "#4ECDC4", // turquoise
  "#45B7D1", // sky blue
  "#96CEB4", // gray aquamarine
  "#FFEEAD", // pale yellow
  "#D4A5A5", // dusky rose
  "#9B5DE5", // purple
  "#F15BB5", // medium pink
  "#00BBF9", // bright blue
  "#00F5D4", // aquamarine
];

export function toColor(name: string): string {
  const hash = Math.abs(MurmurHash3(name).result());
  return colors[hash % colors.length];
}
