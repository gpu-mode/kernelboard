import { Box, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { useEffect } from "react";
import { fetchLeaderboardSummaries } from "../../api/api";
import { fetcherApiCallback } from "../../lib/hooks/useApi";
import { ErrorAlert } from "../../components/error-alert/ErrorAlert";
import LeaderboardTile from "./components/LeaderboardTile";

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
  const { data, loading, error, errorStatus, call } =
    fetcherApiCallback<LeaderboardSummaries, any[]>(fetchLeaderboardSummaries);

  useEffect(() => {
    call();
  }, [call]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (error) {
    return <ErrorAlert status={errorStatus} message={error} />;
  }

  const leaderboards = data?.leaderboards || [];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h1" component="h1" sx={{ mb: 3, fontWeight: "bold" }}>
        Leaderboards
      </Typography>

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
  );
}
