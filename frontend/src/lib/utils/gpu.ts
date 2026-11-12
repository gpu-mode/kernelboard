// Keep GPU displays consistent with the leaderboard summary priority.
const GPU_ORDER = ["B200", "H100", "MI300", "A100", "L4", "T4"];

export function compareGpuTypes(a: string, b: string): number {
  const aIndex = GPU_ORDER.indexOf(a.trim().toUpperCase());
  const bIndex = GPU_ORDER.indexOf(b.trim().toUpperCase());
  const aPriority = aIndex === -1 ? GPU_ORDER.length : aIndex;
  const bPriority = bIndex === -1 ? GPU_ORDER.length : bIndex;

  return aPriority - bPriority || a.localeCompare(b);
}
