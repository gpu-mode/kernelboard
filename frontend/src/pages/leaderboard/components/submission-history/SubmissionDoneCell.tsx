import { Tooltip } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";

function SubmissionDoneCell({
  done,
  status,
}: {
  done: boolean;
  status?: string | null;
}) {
  const v = typeof status === "string" ? status.toLowerCase() : "";
  const hasErrorStatus =
    v.includes("fail") ||
    v.includes("err") ||
    v.includes("hack") ||
    v.includes("timed") ||
    v.includes("timeout");

  if (!done) {
    return (
      <Tooltip title="In progress">
        <HourglassEmptyIcon fontSize="small" />
      </Tooltip>
    );
  }

  if (hasErrorStatus) {
    return (
      <Tooltip title={`Completed with status: ${v}`}>
        <ErrorOutlineIcon color="error" fontSize="small" />
      </Tooltip>
    );
  }

  return done ? (
    <Tooltip title="Completed">
      <CheckCircleOutlineIcon fontSize="small" />
    </Tooltip>
  ) : (
    <Tooltip title="In progress">
      <HourglassEmptyIcon fontSize="small" />
    </Tooltip>
  );
}

export default SubmissionDoneCell;
