import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  Autocomplete,
  TextField,
  IconButton,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  fetchLeaderBoard,
  fetchLeaderboardSummaries,
  type LeaderboardDetail,
  type LeaderboardSummary,
} from "../../api/api";
import { formatMicroseconds } from "../../lib/utils/ranking";
import { getMedalIcon } from "../../components/common/medal";
import { isExpired } from "../../lib/date/utils";

const REFRESH_INTERVAL_MS = 30_000;

interface LeaderboardData {
  id: number;
  detail: LeaderboardDetail;
}

export default function Live() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [summaries, setSummaries] = useState<LeaderboardSummary[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [boards, setBoards] = useState<LeaderboardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parse selected IDs from URL
  const idsParam = searchParams.get("ids") || "";
  const selectedIds = idsParam
    .split(",")
    .filter(Boolean)
    .map(Number)
    .filter((n) => !isNaN(n));

  // Load summaries on mount
  useEffect(() => {
    fetchLeaderboardSummaries()
      .then((resp) => {
        // Only show active (non-expired) leaderboards in picker
        const active = resp.leaderboards.filter(
          (lb) => !isExpired(lb.deadline),
        );
        setSummaries(active);
      })
      .catch(console.error)
      .finally(() => setLoadingSummaries(false));
  }, []);

  // Fetch details for all selected leaderboards
  const fetchAll = useCallback(async () => {
    const ids = idsParam
      .split(",")
      .filter(Boolean)
      .map(Number)
      .filter((n) => !isNaN(n));
    if (ids.length === 0) {
      setBoards([]);
      return;
    }
    setLoading(true);
    try {
      const results = await Promise.all(
        ids.map(async (id) => {
          const detail = await fetchLeaderBoard(String(id));
          return { id, detail };
        }),
      );
      setBoards(results);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Failed to fetch leaderboards:", err);
    } finally {
      setLoading(false);
    }
  }, [idsParam]);

  // Fetch on selection change
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-refresh
  useEffect(() => {
    if (selectedIds.length === 0) return;
    intervalRef.current = setInterval(fetchAll, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAll, selectedIds.length]);

  const handleSelectionChange = (
    _: unknown,
    value: LeaderboardSummary[],
  ) => {
    const ids = value.map((v) => v.id).join(",");
    setSearchParams(ids ? { ids } : {}, { replace: true });
  };

  const selectedSummaries = summaries.filter((s) =>
    selectedIds.includes(s.id),
  );

  return (
    <Box sx={{ px: 2, py: 3, maxWidth: "100%", overflow: "hidden" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Live Leaderboards
        </Typography>
        {lastRefresh && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Updated {lastRefresh.toLocaleTimeString()}
          </Typography>
        )}
        {selectedIds.length > 0 && (
          <Tooltip title="Refresh now">
            <IconButton size="small" onClick={fetchAll} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {selectedIds.length > 0 && (
          <Chip
            label={`Auto-refresh ${REFRESH_INTERVAL_MS / 1000}s`}
            size="small"
            color="success"
            variant="outlined"
          />
        )}
      </Box>

      {/* Problem picker */}
      {loadingSummaries ? (
        <CircularProgress size={24} />
      ) : (
        <Autocomplete
          multiple
          options={summaries}
          getOptionLabel={(opt) => opt.name}
          value={selectedSummaries}
          onChange={handleSelectionChange}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select problems"
              placeholder="Search problems..."
              size="small"
            />
          )}
          sx={{ mb: 3, maxWidth: 700 }}
        />
      )}

      {/* Loading indicator */}
      {loading && boards.length === 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Leaderboard columns */}
      {boards.length > 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${boards.length}, 1fr)`,
            gap: 1.5,
            overflow: "auto",
          }}
        >
          {boards.map(({ id, detail }) => (
            <LeaderboardColumn key={id} id={id} detail={detail} />
          ))}
        </Box>
      )}

      {selectedIds.length === 0 && !loadingSummaries && (
        <Typography sx={{ color: "text.secondary", mt: 2 }}>
          Select problems above to display live rankings side by side.
        </Typography>
      )}
    </Box>
  );
}

function LeaderboardColumn({
  id,
  detail,
}: {
  id: number;
  detail: LeaderboardDetail;
}) {
  // Show the priority GPU type rankings (first one), or all if only one
  const gpuTypes = Object.keys(detail.rankings);

  return (
    <Box
      sx={{
        minWidth: 200,
        borderRight: 1,
        borderColor: "divider",
        pr: 1.5,
        "&:last-child": { borderRight: 0 },
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 700,
          mb: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={detail.name}
      >
        <a
          href={`/leaderboard/${id}`}
          style={{ color: "inherit", textDecoration: "none" }}
        >
          {detail.name}
        </a>
      </Typography>

      {gpuTypes.map((gpu) => {
        const items = detail.rankings[gpu] || [];
        return (
          <Box key={gpu} sx={{ mb: 1.5 }}>
            {gpuTypes.length > 1 && (
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: "text.secondary",
                  textTransform: "uppercase",
                  fontSize: "0.65rem",
                  letterSpacing: 0.5,
                }}
              >
                {gpu}
              </Typography>
            )}

            {/* Header row */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "28px 1fr auto",
                gap: 0.5,
                borderBottom: 1,
                borderColor: "divider",
                pb: 0.25,
                mb: 0.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, fontSize: "0.65rem" }}
              >
                #
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, fontSize: "0.65rem" }}
              >
                Name
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.65rem",
                  textAlign: "right",
                }}
              >
                Time
              </Typography>
            </Box>

            {/* Ranking rows */}
            {items.length === 0 ? (
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontStyle: "italic" }}
              >
                No submissions
              </Typography>
            ) : (
              items.map((item) => (
                <Box
                  key={item.submission_id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "28px 1fr auto",
                    gap: 0.5,
                    py: 0.25,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    "&:last-child": { borderBottom: 0 },
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontSize: "0.8rem", fontWeight: 600 }}
                  >
                    {item.rank <= 3 ? getMedalIcon(item.rank) : item.rank}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: "0.8rem",
                      fontWeight: item.rank <= 3 ? 700 : 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={item.user_name}
                  >
                    {item.user_name}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: "0.8rem",
                      fontFamily: "monospace",
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatMicroseconds(item.score)}
                  </Typography>
                </Box>
              ))
            )}
          </Box>
        );
      })}
    </Box>
  );
}
