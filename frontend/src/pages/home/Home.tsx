import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Chip,
} from "@mui/material";
import CodeIcon from "@mui/icons-material/Code";
import Grid from "@mui/material/Grid";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchLeaderboardSummaries } from "../../api/api";
import { fetcherApiCallback } from "../../lib/hooks/useApi";
import { ErrorAlert } from "../../components/alert/ErrorAlert";
import LeaderboardTile from "./components/LeaderboardTile";
import Loading from "../../components/common/loading";
import { ConstrainedContainer } from "../../components/app-layout/ConstrainedContainer";
import MarkdownRenderer from "../../components/markdown-renderer/MarkdownRenderer";
import quickStartMarkdown from "./quick-start.md?raw";
import { isExpired, getTimeLeft } from "../../lib/date/utils";
import { ColoredSquare } from "../../components/common/ColoredSquare";

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

function isBeginnerProblem(name: string): boolean {
  return /_v2\b/i.test(name);
}

export default function Home() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);
  const [isLeaderboardSelectOpen, setIsLeaderboardSelectOpen] = useState(false);
  const useBeta = searchParams.has("use_beta");
  const forceRefresh = searchParams.has("force_refresh");

  const { data, loading, hasLoaded, error, errorStatus, call } =
    fetcherApiCallback<
      LeaderboardSummaries,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any[]
    >(fetchLeaderboardSummaries, undefined, {
      loadingGracePeriodMs: 200,
    });

  useEffect(() => {
    call(useBeta, forceRefresh);
  }, [call, useBeta, forceRefresh]);

  const leaderboards = data?.leaderboards || [];
  const activeLeaderboards = leaderboards.filter(
    (lb) => !isExpired(lb.deadline)
  );

  const activeCompetitions = leaderboards.filter(
    (lb) => !isExpired(lb.deadline) && !isBeginnerProblem(lb.name)
  );
  const beginnerProblems = leaderboards.filter(
    (lb) => !isExpired(lb.deadline) && isBeginnerProblem(lb.name)
  );
  const closedCompetitions = leaderboards.filter((lb) =>
    isExpired(lb.deadline)
  );

  const handleLeaderboardSelect = (id: number) => {
    setIsLeaderboardSelectOpen(false);
    navigate(`/leaderboard/${id}/editor`);
  };

  return (
    <ConstrainedContainer>
      <Box>
        <Typography variant="h1" component="h1" sx={{ mb: 3 }}>
          Leaderboards
        </Typography>
        {/* Leaderboard Selection Dialog */}
        <Dialog
          open={isLeaderboardSelectOpen}
          onClose={() => setIsLeaderboardSelectOpen(false)}
          maxWidth="sm"
          fullWidth
          sx={{
            "& .MuiDialog-paper": {
              maxHeight: { xs: "80vh", sm: "70vh" },
            },
          }}
        >
          <DialogTitle>Select an active leaderboard</DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            {activeLeaderboards.length > 0 ? (
              <List sx={{ width: "100%", py: 0 }}>
                {activeLeaderboards.map((lb) => (
                  <ListItemButton
                    key={lb.id}
                    onClick={() => handleLeaderboardSelect(lb.id)}
                    sx={{
                      py: 1,
                      px: { xs: 1.5, sm: 2 },
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      "&:last-child": { borderBottom: "none" },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <ColoredSquare name={lb.name} />
                          {lb.name}
                        </Box>
                      }
                      secondary={getTimeLeft(lb.deadline)}
                      slotProps={{
                        primary: {
                          fontWeight: 500,
                          fontSize: { xs: "0.9rem", sm: "0.95rem" },
                          component: "div",
                        },
                        secondary: {
                          fontSize: "0.8rem",
                        },
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography color="text.secondary">
                  No active leaderboards available.
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsLeaderboardSelectOpen(false)}>
              Cancel
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={isQuickStartOpen}
          onClose={() => setIsQuickStartOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Submit Your First Kernel via cli tool!</DialogTitle>
          <DialogContent dividers>
            <MarkdownRenderer content={quickStartMarkdown} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsQuickStartOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {error ? (
          <ErrorAlert status={errorStatus} message={error} />
        ) : !hasLoaded && !loading ? (
          null
        ) : loading ? (
          <Loading />
        ) : leaderboards.length > 0 ? (
          <Box>
            {/* Active Competitions */}
            {activeCompetitions.length > 0 && (
              <Box sx={{ mb: 5 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
                  <Typography variant="h5" component="h2">
                    Active Competitions
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setIsQuickStartOpen(true)}
                    sx={{ textTransform: "none", fontWeight: 500 }}
                  >
                    Submit via cli
                  </Button>
                </Box>
                <Grid container spacing={3}>
                  {activeCompetitions.map((leaderboard) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }} key={leaderboard.id}>
                      <LeaderboardTile leaderboard={leaderboard} />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Getting Started */}
            {beginnerProblems.length > 0 && (
              <Box sx={{ mb: 5 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5, flexWrap: "wrap", gap: 1 }}>
                  <Typography variant="h5" component="h2">
                    Getting Started
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<CodeIcon />}
                    onClick={() => setIsLeaderboardSelectOpen(true)}
                    sx={{ textTransform: "none", fontWeight: 500 }}
                  >
                    Submit via browser
                    <Chip
                      label="beta"
                      size="small"
                      sx={{
                        ml: 1,
                        height: 18,
                        fontSize: "0.65rem",
                        bgcolor: "warning.main",
                        color: "warning.contrastText",
                      }}
                    />
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  New to GPU programming? Start here.
                </Typography>
                <Grid container spacing={3}>
                  {beginnerProblems.map((leaderboard) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }} key={leaderboard.id}>
                      <LeaderboardTile leaderboard={leaderboard} />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Closed Competitions */}
            {closedCompetitions.length > 0 && (
              <Box>
                <Typography variant="h5" component="h2" sx={{ mb: 2, color: "text.secondary" }}>
                  Closed Competitions
                </Typography>
                <Grid container spacing={3}>
                  {closedCompetitions.map((leaderboard) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }} key={leaderboard.id}>
                      <LeaderboardTile leaderboard={leaderboard} expired />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Box>
        ) : (
          <Typography variant="body1" color="text.secondary">
            No active leaderboards found.
          </Typography>
        )}
      </Box>
    </ConstrainedContainer>
  );
}
