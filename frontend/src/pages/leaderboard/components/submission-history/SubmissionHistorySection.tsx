import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Alert,
  Tooltip,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Collapse,
  Paper,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { fetchUserSubmissions } from "../../../../api/api";
import { fetcherApiCallback } from "../../../../lib/hooks/useApi";
import SubmissionStatusChip from "./SubmissionStatusChip";
import SubmissionDoneCell from "./SubmissionDoneCell";
import Loading from "../../../../components/common/loading";
import { Fragment } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

// --- Types ---
type Run = {
  start_time: string;
  end_time: string | null;
  mode: string;
  passed: boolean;
  score: number | null;
  meta: any | null; // present, but null when passed = true
};

type Submission = {
  submission_id: number;
  file_name?: string | null;
  submitted_at: string; // ISO
  status?: string | null;
  submission_done: boolean;
  runs?: Run[]; // optional in case backend hasn't added it yet
};

type Props = {
  leaderboardId: number | string;
  leaderboardName: string;
  userId: number | string;
  pageSize?: number; // default 10
};

const styles = {
  root: {
    width: "100%",
    p: 2,
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    mb: 1,
  },
  listWrapper: {
    flex: 1,
    overflowY: "auto",
    mt: 1,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    mt: 1,
  },
} as const;

// --- Helpers ---
function fmt(ts?: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

// --- Child table for runs (rendered inside Collapse) ---
function RunsTable({ runs }: { runs: Run[] }) {
  return (
    <Table size="small" aria-label="runs table">
      <TableHead>
        <TableRow>
          <TableCell>Start</TableCell>
          <TableCell>End</TableCell>
          <TableCell>Mode</TableCell>
          <TableCell>Passed</TableCell>
          <TableCell>Score</TableCell>
          <TableCell>Meta</TableCell>
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
              {/* Show meta only when not passed; meta is null for passed=true */}
              {!r.passed && r.meta ? (
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1,
                    bgcolor: "action.hover",
                    borderRadius: 1,
                    fontSize: 12,
                    maxHeight: 160,
                    overflow: "auto",
                    maxWidth: 640,
                  }}
                >
                  {JSON.stringify(r.meta, null, 2)}
                </Box>
              ) : (
                "—"
              )}
            </TableCell>
          </TableRow>
        ))}
        {runs.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} align="center" sx={{ opacity: 0.7 }}>
              No runs
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export default function SubmissionHistorySection({
  leaderboardId,
  leaderboardName,
  userId,
  pageSize = 10,
}: Props) {
  const [page, setPage] = useState(1);

  // track which rows are expanded (by submission_id)
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});

  const { data, loading, error, errorStatus, call } =
    fetcherApiCallback(fetchUserSubmissions);

  // reset page when inputs affecting the result set change
  useEffect(() => {
    setPage(1);
  }, [leaderboardId, userId, pageSize]);

  // fetch when inputs or page change
  useEffect(() => {
    if (!leaderboardId || !userId) return;
    call(leaderboardId, userId, page, pageSize);
  }, [leaderboardId, userId, page, pageSize, call]);

  let totalPages =
    data?.limit && data?.total ? Math.ceil(data?.total / data?.limit) : 1;
  let items: Submission[] = data?.items ?? [];
  let total: number = data?.total ?? 0;

  console.log("data", items);

  // clamp page if server says there are fewer pages now
  useEffect(() => {
    if (page > totalPages) setPage(totalPages || 1);
  }, [totalPages, page]);

  const showingRange = useMemo(() => {
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    if (total === 0) return "0";
    return `${start}-${end} / ${total}`;
  }, [page, pageSize, total]);

  // toggle handler
  const toggleRow = (id: number, disabled: boolean) => {
    if (disabled) return;
    setOpenMap((m) => ({ ...m, [id]: !m[id] }));
  };

  return (
    <Box sx={styles.root} data-testid="submission-history-section">
      {/* Header */}
      <Box sx={styles.header}>
        <Typography variant="h6">Your submission history</Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton
              onClick={() =>
                leaderboardId &&
                userId &&
                call(leaderboardId, userId, page, pageSize)
              }
              size="small"
              sx={{ mr: 1 }}
              disabled={loading || !leaderboardId || !userId}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Loading / Error */}
      {loading && <Loading />}
      {!loading && error && (
        <Alert severity="error" sx={{ my: 2 }}>
          Failed to load submissions{errorStatus ? ` (${errorStatus})` : ""}:{" "}
          {error}
        </Alert>
      )}

      {/* Table */}
      <Box sx={styles.listWrapper}>
        {!loading && !error && items.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No submissions.
          </Typography>
        )}

        {!loading && !error && items.length > 0 && (
          <TableContainer
            sx={{ maxHeight: 420 }}
            component={Paper}
            variant="outlined"
          >
            <Table stickyHeader size="small" aria-label="submission table">
              <TableHead>
                <TableRow>
                  <TableCell width="44" />
                  <TableCell width="35%">File</TableCell>
                  <TableCell width="25%">Submitted At</TableCell>
                  <TableCell width="20%">Status</TableCell>
                  <TableCell width="15%" align="center">
                    Finished
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((s) => {
                  const runs = s.runs ?? []; // expect backend to include runs; otherwise empty
                  const hasRuns = runs.length > 0;
                  const open = !!openMap[s.submission_id];

                  return (
                    <Fragment key={s.submission_id}>
                      <TableRow hover>
                        {/* Collapse toggle cell */}
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => toggleRow(s.submission_id, !hasRuns)}
                            disabled={!hasRuns}
                            aria-label={hasRuns ? "toggle runs" : "no runs yet"}
                          >
                            {open ? (
                              <KeyboardArrowUpIcon />
                            ) : (
                              <KeyboardArrowDownIcon />
                            )}
                          </IconButton>
                        </TableCell>

                        {/* Main row cells */}
                        <TableCell>
                          {s.file_name || `Submission #${s.submission_id}`}
                        </TableCell>
                        <TableCell>{fmt(s.submitted_at)}</TableCell>
                        <TableCell>
                          <SubmissionStatusChip status={s.status} />
                        </TableCell>
                        <TableCell align="center">
                          <SubmissionDoneCell done={s.submission_done} />
                        </TableCell>
                      </TableRow>

                      {/* Collapsible runs row */}
                      <TableRow>
                        <TableCell colSpan={5} sx={{ p: 0 }}>
                          <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, pt: 1 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                                Runs ({runs.length})
                              </Typography>
                              <RunsTable runs={runs} />
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Footer: pagination + range */}
      <Box sx={styles.footer}>
        <Typography variant="caption" color="text.secondary">
          {showingRange}
        </Typography>
        <TablePagination
          component="div"
          count={total}
          page={page - 1} // TablePagination is 0-based
          onPageChange={(_, p0) => !loading && setPage(p0 + 1)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={() => {}}
          rowsPerPageOptions={[pageSize]}
          showFirstButton
          showLastButton
          disabled={loading || total <= pageSize}
        />
      </Box>
    </Box>
  );
}
