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
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { fetchUserSubmissions } from "../../../../api/api";
import { fetcherApiCallback } from "../../../../lib/hooks/useApi";
import SubmissionStatusChip from "./SubmissionStatusChip";
import SubmissionDoneCell from "./SubmissionDoneCell";
import Loading from "../../../../components/common/loading";

type Submission = {
  submission_id: number;
  file_name?: string | null;
  submitted_at: string; // ISO
  status?: string | null;
  submission_done: boolean;
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
};

export default function ListSubmissionSidePanel({
  leaderboardId,
  userId,
  pageSize = 10,
}: Props) {
  const [page, setPage] = useState(1);

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

  return (
    <Box sx={styles.root}>
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
      {loading && <Loading message="Submitting" />}
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
          <TableContainer sx={{ maxHeight: 420 }}>
            <Table stickyHeader size="small" aria-label="submission table">
              <TableHead>
                <TableRow>
                  <TableCell width="40%">File</TableCell>
                  <TableCell width="25%">Submitted At</TableCell>
                  <TableCell width="20%">Status</TableCell>
                  <TableCell width="15%" align="center">
                    Finished
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((s) => (
                  <TableRow hover key={s.submission_id}>
                    <TableCell>
                      {s.file_name || `Submission #${s.submission_id}`}
                    </TableCell>
                    <TableCell>
                      {new Date(s.submitted_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <SubmissionStatusChip status={s.status} />
                    </TableCell>
                    <TableCell align="center">
                      <SubmissionDoneCell done={s.submission_done} />
                    </TableCell>
                  </TableRow>
                ))}
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
          page={page - 1} // TablePagination 是 0-based
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
