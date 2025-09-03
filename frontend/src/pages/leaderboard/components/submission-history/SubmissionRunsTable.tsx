import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { fmt } from "../../../../lib/utils/date";
import { formatMicroseconds } from "../../../../lib/utils/ranking";
import { getExitCodeMessage } from "../../../../lib/types/exit_code";

// --- Types ---
export type SubmissionRun = {
  start_time: string;
  end_time: string | null;
  mode: string;
  passed: boolean;
  score: number | null;
  meta: any | null; // present, but null when passed = true
};

// --- Child table for runs (rendered inside Collapse) ---
export function SubmissionRunsTable({ runs }: { runs: SubmissionRun[] }) {
  return (
    <Table size="small" aria-label="runs table">
      <TableHead>
        <TableRow>
          <TableCell>Start</TableCell>
          <TableCell>End</TableCell>
          <TableCell>Mode</TableCell>
          <TableCell>Passed</TableCell>
          <TableCell>Score</TableCell>
          <TableCell>Debug Info</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {runs.map((r, idx) => {
          const debug_info = {
            stderr: r.meta?.stderr,
            success: r.meta?.success,
            exit_code: r.meta?.exit_code,
            exit_code_info: r.meta?.exit_code
              ? getExitCodeMessage(r.meta?.exit_code)
              : null,
            duration: r.meta?.duration,
          };

          return (
            <TableRow key={`${r.start_time}-${idx}`}>
              <TableCell>{fmt(r.start_time)}</TableCell>
              <TableCell>{fmt(r.end_time)}</TableCell>
              <TableCell>{r.mode}</TableCell>
              <TableCell>
                {" "}
                {r.passed ? (
                  <CheckCircleIcon color="success" fontSize="small" />
                ) : (
                  <CancelIcon color="error" fontSize="small" />
                )}
              </TableCell>
              <TableCell>
                {r.score ? formatMicroseconds(r.score) : "N/A"}
              </TableCell>
              <TableCell>
                {r.meta ? (
                  <Tooltip
                    title={
                      <Box
                        component="pre"
                        sx={{
                          m: 0,
                          p: 1,
                          fontSize: 12,
                          maxWidth: 480,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        <span>{JSON.stringify(debug_info, null, 2)}</span>
                      </Box>
                    }
                  >
                    <Typography variant="body2" sx={{ cursor: "pointer" }}>
                      details
                    </Typography>
                  </Tooltip>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          );
        })}
        {!runs ||
          (runs.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ opacity: 0.7 }}>
                No runs detected, please refresh the table if submission signal
                is not final. If this is a bug, please report it.
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}
