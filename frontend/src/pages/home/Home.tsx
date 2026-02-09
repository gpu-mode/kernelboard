import { Box, Button, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchLeaderboardSummaries } from "../../api/api";
import { fetcherApiCallback } from "../../lib/hooks/useApi";
import { ErrorAlert } from "../../components/alert/ErrorAlert";
import LeaderboardTile from "./components/LeaderboardTile";
import Loading from "../../components/common/loading";
import { ConstrainedContainer } from "../../components/app-layout/ConstrainedContainer";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";

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
  const useV2 = searchParams.has("v2");

  const { data, loading, error, errorStatus, call } = fetcherApiCallback<
    LeaderboardSummaries,
    [boolean]
  >(fetchLeaderboardSummaries);

  useEffect(() => {
    call(useV2);
  }, [call, useV2]);

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
            href="https://github.com/gpu-mode/popcorn-cli"
            target="_blank"
            rel="noopener"
            endIcon={<ArrowOutwardIcon />}
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
