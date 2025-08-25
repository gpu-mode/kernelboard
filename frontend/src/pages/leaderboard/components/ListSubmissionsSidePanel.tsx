import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Pagination,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { fetchUserSubmissions } from "../../../api/api";
import { fetcherApiCallback } from "../../../lib/hooks/useApi";

type Submission = {
  submission_id: number;
  file_name?: string | null;
  submitted_at: string; // ISO
  status?: string | null;
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
  loading: {
    display: "flex",
    justifyContent: "center",
    mt: 3,
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

  console.log(
    "total pages",
    totalPages,
    "total",
    total,
    "items",
    items.length,
    "page",
    page,
    "pageSize",
    pageSize,
  );

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

  const statusColor = (s?: string | null) => {
    const v = (s || "").toLowerCase();
    if (v.includes("run")) return "warning";
    if (v.includes("ok") || v.includes("succ")) return "success";
    if (v.includes("fail") || v.includes("err")) return "error";
    return "default";
  };

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
      {loading && (
        <Box sx={styles.loading}>
          <CircularProgress />
        </Box>
      )}
      {!loading && error && (
        <Alert severity="error" sx={{ my: 2 }}>
          Failed to load submissions{errorStatus ? ` (${errorStatus})` : ""}:{" "}
          {error}
        </Alert>
      )}

      {/* List */}
      <Box sx={styles.listWrapper}>
        {!loading && !error && items.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No submissions.
          </Typography>
        )}
        <List dense>
          {items.map((s) => (
            <ListItemButton key={s.submission_id}>
              <ListItemText
                primary={s.file_name || `Submission #${s.submission_id}`}
                secondary={new Date(s.submitted_at).toLocaleString()}
              />
              <Chip
                size="small"
                variant="outlined"
                color={statusColor(s.status) as any}
                label={s.status || "submitted via cli or discor-bot"}
              />
            </ListItemButton>
          ))}
        </List>
      </Box>

      {/* Footer: pagination + range */}
      <Box sx={styles.footer}>
        <Typography variant="caption" color="text.secondary">
          {showingRange}
        </Typography>
        <Pagination
          page={page}
          count={totalPages}
          size="small"
          onChange={(_, p) => !loading && setPage(p)}
          disabled={loading || totalPages <= 1 || !leaderboardId || !userId}
          showFirstButton
          showLastButton
        />
      </Box>
    </Box>
  );
}
