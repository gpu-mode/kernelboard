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

// --- Types ---
export type SubmissionRun = {
  start_time: string;
  end_time: string | null;
  mode: string;
  passed: boolean;
  score: number | null;
  run_info: any | null; // present, but null when passed = true
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
        {runs.map((r, idx) => (
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
            <TableCell>{r.score ?? "N/A"}</TableCell>
            <TableCell>
              {!r.passed && r.run_info ? (
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
                      {JSON.stringify(r.run_info, null, 2)}
                    </Box>
                  }
                >
                  <Typography variant="body2" sx={{ cursor: "pointer" }}>
                    View error details
                  </Typography>
                </Tooltip>
              ) : (
                "—"
              )}
            </TableCell>
          </TableRow>
        ))}
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
