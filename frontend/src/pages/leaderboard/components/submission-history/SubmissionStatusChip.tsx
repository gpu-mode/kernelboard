import { Chip, Tooltip } from "@mui/material";

function SubmissionStatusChip({ status }: { status?: string | null }) {
  const str = typeof status === "string" ? status : ""; // normalize
  const v = str.toLowerCase();

  const color: "default" | "success" | "warning" | "error" = v.includes("run")
    ? "warning"
    : v.includes("ok") || v.includes("succ")
      ? "success"
      : v.includes("fail") || v.includes("err")
        ? "error"
        : "default";

  const showFallback = !str;
  const label = showFallback
    ? "submitted via CLI/Discord bot"
    : v.includes("ok") || v.includes("succ")
      ? "finished"
      : v;

  // When no tooltip needed, pass undefined (not empty string) to avoid disabling issues.
  const title = showFallback
    ? "No job status recorded; likely submitted through the CLI or Discord bot (not the web UI)."
    : undefined;

  return (
    <Tooltip title={title} arrow>
      <Chip
        size="small"
        variant="outlined"
        color={color as any}
        label={label}
      />
    </Tooltip>
  );
}

export default SubmissionStatusChip;
