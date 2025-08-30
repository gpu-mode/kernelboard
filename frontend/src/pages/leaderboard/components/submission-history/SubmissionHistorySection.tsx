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
  Skeleton,
  Button,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { fetchUserSubmissions } from "../../../../api/api";
import { fetcherApiCallback } from "../../../../lib/hooks/useApi";
import SubmissionStatusChip from "./SubmissionStatusChip";
import SubmissionDoneCell from "./SubmissionDoneCell";
import { Fragment } from "react";
import { fmt } from "../../../../lib/utils/date";
import { SubmissionRunsTable, type SubmissionRun } from "./SubmissionRunsTable";

type Submission = {
  submission_id: number;
  file_name?: string | null;
  submitted_at: string; // ISO
  status?: string | null;
  submission_done: boolean;
  runs?: SubmissionRun[]; // optional in case backend hasn't added it yet
};

type Props = {
  leaderboardId: number | string;
  leaderboardName: string;
  userId: number | string;
  pageSize?: number; // default 10
  refreshFlag?: boolean; // default false
};

const styles = {
  reportButton: {
    textTransform: "none",
    borderRadius: 2,
    bgcolor: "#F472B6",
    color: "#fff",
    "&:hover": { bgcolor: "#EC4899" },
  },
  reportButtonOpen: {
    textTransform: "none",
    borderRadius: 2,
    bgcolor: "#A78BFA",
    color: "#fff",
    "&:hover": { bgcolor: "#8B5CF6" },
  },
  refreshSection: {
    display: "flex",
    alignItems: "center",
  },
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

export default function SubmissionHistorySection({
  leaderboardId,
  leaderboardName,
  userId,
  pageSize = 10,
  refreshFlag,
}: Props) {
  const [page, setPage] = useState(1);

  // track which rows are expanded (by submission_id)
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});

  // track last refresh time
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());

  const { data, loading, error, errorStatus, call } =
    fetcherApiCallback(fetchUserSubmissions);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // reset page when inputs affecting the result set change
  useEffect(() => {
    setPage(1);
  }, [leaderboardId, userId, pageSize]);

  useEffect(() => {
    refresh();
  }, [refreshFlag]);

  // fetch when inputs or page change
  useEffect(() => {
    if (!leaderboardId || !userId) return;
    call(leaderboardId, userId, page, pageSize);
    setLastRefresh(new Date());
  }, [leaderboardId, userId, page, pageSize, call]);

  let totalPages =
    data?.limit && data?.total ? Math.ceil(data?.total / data?.limit) : 1;
  let items: Submission[] = data?.items ?? [];
  let total: number = data?.total ?? 0;

  const tooOld = lastRefresh && now - lastRefresh.getTime() > 10 * 60 * 1000;

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
  const toggleRow = (id: number) => {
    setOpenMap((m) => ({ ...m, [id]: !m[id] }));
  };

  const refresh = () => {
    if (!leaderboardId || !userId) return;
    call(leaderboardId, userId, page, pageSize);
    setLastRefresh(new Date());
  };

  const stabelItems = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(b.submitted_at).getTime() -
          new Date(a.submitted_at).getTime(),
      ),
    [items],
  );

  const SKELETON_ROWS = 8;
  const hasData = items.length > 0;
  const isRefreshing = loading && hasData;
  const isEmpty = !loading && !error && items.length === 0;

  return (
    <Box sx={styles.root} data-testid="submission-history-section">
      {/* Header */}
      <Box sx={styles.header}>
        <Typography variant="h6">Your submission history</Typography>
        <Box sx={styles.refreshSection}>
          {lastRefresh && (
            <Typography variant="body2">
              Last refreshed at {lastRefresh.toLocaleTimeString()}{" "}
              {tooOld && <span>(&gt; 10 mins ago)</span>}
            </Typography>
          )}
          <Tooltip title="Refresh">
            <IconButton
              onClick={() => refresh()}
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
      {!loading && error && (
        <Alert severity="error" sx={{ my: 2 }}>
          Failed to load submissions{errorStatus ? ` (${errorStatus})` : ""}:{" "}
          {error}
        </Alert>
      )}

      {/* Table */}
      <Box sx={styles.listWrapper}>
        {!error && isEmpty && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            No submissions.
          </Typography>
        )}
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            height: 500,
            overflowY: "scroll",
            transition: "opacity .2s",
            opacity: isRefreshing ? 0.7 : 1,
          }}
        >
          <Table
            stickyHeader
            size="small"
            aria-label="submission table"
            sx={{
              tableLayout: "fixed",
              width: "100%",
              minWidth: 500,
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell width="15%">File</TableCell>
                <TableCell width="15%">Submitted At</TableCell>
                <TableCell width="10%">Submission Signal</TableCell>
                <TableCell width="10%" align="center">
                  Finished
                </TableCell>
                <TableCell width="10%">Run Reports</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* loading to keep the same skeleton to make sure ui does not jump*/}
              {loading && (
                <>
                  {Array.from({
                    length: Math.max(SKELETON_ROWS, hasData ? items.length : 0),
                  }).map((_, i) => (
                    <TableRow key={`sk-${i}`} sx={{ height: 44 }}>
                      <TableCell colSpan={5}>
                        <Box
                          sx={{ display: "flex", gap: 1, alignItems: "center" }}
                        >
                          <Skeleton variant="circular" width={20} height={20} />
                          <Skeleton variant="text" sx={{ flex: 1 }} />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!hasData &&
                    Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                      <TableRow key={`sk2-${i}`} sx={{ height: 44 }}>
                        <TableCell colSpan={5}>
                          <Skeleton variant="rectangular" height={24} />
                        </TableCell>
                      </TableRow>
                    ))}
                </>
              )}
              {/* render item as normal */}
              {!loading &&
                !error &&
                hasData &&
                stabelItems.map((s) => {
                  const runs = s.runs ?? [];
                  const hasRuns = runs.length > 0;
                  const open = !!openMap[s.submission_id];
                  return (
                    <Fragment key={s.submission_id}>
                      <TableRow hover sx={{ height: 44 }}>
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
                        <TableCell>
                          {hasRuns ? (
                            <Button
                              size="small"
                              onClick={() => toggleRow(s.submission_id)}
                              sx={
                                open
                                  ? styles.reportButtonOpen
                                  : styles.reportButton
                              }
                            >
                              <Typography variant="body2">
                                {open ? "hide" : `open(${runs.length})`}
                              </Typography>
                            </Button>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={5} sx={{ p: 0 }}>
                          <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, pt: 1 }}>
                              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                                Runs ({runs.length})
                              </Typography>
                              <SubmissionRunsTable runs={runs} />
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })}

              {/* non loading but still keep this for skeleton */}
              {!loading && !error && !hasData && (
                <TableRow sx={{ height: 44 }}>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary">
                      No data.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {!loading && error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Failed to load submissions{errorStatus ? ` (${errorStatus})` : ""}:{" "}
            {error}
          </Alert>
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
