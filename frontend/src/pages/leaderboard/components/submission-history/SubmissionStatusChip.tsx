import { Chip, Tooltip } from "@mui/material";

function SubmissionStatusChip({ status }: { status?: string | null }) {
  const str = typeof status === "string" ? status : ""; // normalize
  const v = str.toLowerCase();
  const isSuccess = v.includes("ok") || v.includes("succ");
  const isRunning = v.includes("run");
  const isError =
    v.includes("fail") ||
    v.includes("err") ||
    v.includes("hack") ||
    v.includes("timed") ||
    v.includes("timeout");

  const color: "default" | "success" | "warning" | "error" = isRunning
    ? "warning"
    : isSuccess
      ? "success"
      : isError
        ? "error"
        : "default";

  const showFallback = !str;
  const label = showFallback
    ? "via CLI/Discord bot"
    : isSuccess
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
        color={color}
        label={label}
      />
    </Tooltip>
  );
}

export default SubmissionStatusChip;
