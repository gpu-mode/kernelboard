import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchLeaderboardSummaries } from "../../api/api";
import { fetcherApiCallback } from "../../lib/hooks/useApi";
import { ErrorAlert } from "../../components/alert/ErrorAlert";
import LeaderboardTile from "./components/LeaderboardTile";
import Loading from "../../components/common/loading";
import { ConstrainedContainer } from "../../components/app-layout/ConstrainedContainer";
import MarkdownRenderer from "../../components/markdown-renderer/MarkdownRenderer";
import quickStartMarkdown from "./quick-start.md?raw";

interface TopUser {
  rank: number;
  score: number;
  user_name: string;
}

interface LeaderboardData {
  id: number;
  name: string;
  deadline: string;
  gpu_types: string[];
  priority_gpu_type: string;
  top_users: TopUser[] | null;
}

interface LeaderboardSummaries {
  leaderboards: LeaderboardData[];
  now: string;
}

export default function Home() {
  const [searchParams] = useSearchParams();
  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);
  const useV1 = searchParams.has("v1_query");
  const forceRefresh = searchParams.has("force_refresh");

  const { data, loading, error, errorStatus, call } = fetcherApiCallback<
    LeaderboardSummaries,
    [boolean, boolean]
  >(fetchLeaderboardSummaries);

  useEffect(() => {
    call(useV1, forceRefresh);
  }, [call, useV1, forceRefresh]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorAlert status={errorStatus} message={error} />;
  }

  const leaderboards = data?.leaderboards || [];

  return (
    <ConstrainedContainer>
      <Box>
        <Typography variant="h1" component="h1" sx={{ mb: 3 }}>
          Leaderboards
        </Typography>

        <Box sx={{ mb: 4 }}>
          <Button
            variant="contained"
            onClick={() => setIsQuickStartOpen(true)}
            sx={{
              textTransform: "none",
              fontWeight: 500,
              px: 3,
              py: 1.5,
            }}
          >
            Submit your first kernel
          </Button>
        </Box>

        <Dialog
          open={isQuickStartOpen}
          onClose={() => setIsQuickStartOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Submit Your First Kernel</DialogTitle>
          <DialogContent dividers>
            <MarkdownRenderer content={quickStartMarkdown} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsQuickStartOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {leaderboards.length > 0 ? (
          <Grid container spacing={3}>
            {leaderboards.map((leaderboard) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }} key={leaderboard.id}>
                <LeaderboardTile leaderboard={leaderboard} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body1" color="text.secondary">
            No active leaderboards found.
          </Typography>
        )}
      </Box>
    </ConstrainedContainer>
  );
}
