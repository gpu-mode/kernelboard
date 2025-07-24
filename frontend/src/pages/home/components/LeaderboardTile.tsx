import { Box, Card, CardContent, Chip, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { getMedalIcon } from "../../../components/common/medal.tsx";
import { getTimeLeft } from "../../../lib/date/utils.ts";
import { formatMicroseconds } from "../../../lib/utils/ranking.ts";

const styles = {
  leaderboardCard: {
    textDecoration: "none",
    color: "inherit",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    },
  },
  priorityGpuType: {
    backgroundColor: "#f5f5f5",
    color: "#666",
    fontSize: "0.75rem",
  },
  topUsersList: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    py: 0.5,
  },
  userScore: {
    fontFamily: "monospace",
    fontSize: "0.75rem",
    color: "text.secondary",
  },
};

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

interface LeaderboardTileProps {
  leaderboard: LeaderboardData;
}

export default function LeaderboardTile({ leaderboard }: LeaderboardTileProps) {
  const timeLeft = getTimeLeft(leaderboard.deadline);

  return (
    <Card
      component={Link}
      to={`/leaderboard/${leaderboard.id}`}
      sx={styles.leaderboardCard}
    >
      <CardContent
        sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}
      >
        {/* Leaderboard Name */}
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" component="h3" sx={{ fontWeight: "bold" }}>
            {leaderboard.name}
          </Typography>
        </Box>

        {/* Time Left */}
        <Typography variant="body1" sx={{ mb: 1, color: "text.secondary" }}>
          {timeLeft}
        </Typography>

        {/* GPU Types */}
        <Typography
          variant="body2"
          sx={{ mb: 2, color: "text.secondary", fontSize: "0.875rem" }}
        >
          {leaderboard.gpu_types.join(", ")}
        </Typography>

        {/* Top Users Section */}
        {leaderboard.top_users && leaderboard.top_users.length > 0 && (
          <Box sx={{ mt: "auto" }}>
            {/* Priority GPU Type Chip */}
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
              <Chip
                label={leaderboard.priority_gpu_type}
                size="small"
                sx={styles.priorityGpuType}
              />
            </Box>

            {/* Top Users List */}
            <Box>
              {leaderboard.top_users.map((user) => (
                <Box
                  key={user.rank}
                  sx={{
                    ...styles.topUsersList,
                    borderBottom:
                      user.rank < leaderboard.top_users!.length
                        ? "1px solid #eee"
                        : "none",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: user.rank <= 3 ? "bold" : "normal" }}
                    >
                      {user.user_name || " "}
                    </Typography>
                    {user.rank <= 3 && (
                      <Typography
                        component="span"
                        sx={{ fontSize: "0.875rem" }}
                      >
                        {getMedalIcon(user.rank)}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="body2" sx={styles.userScore}>
                    {formatMicroseconds(user.score)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
