import { Tooltip } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";

function SubmissionDoneCell({ done }: { done: boolean }) {
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
