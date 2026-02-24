import { useState } from "react";
import {
  Box,
  Button,
  Grid,
  Stack,
  type SxProps,
  type Theme,
  Typography,
} from "@mui/material";
import RankingTitleBadge from "./RankingTitleBadge";

import { formatMicroseconds } from "../../../lib/utils/ranking.ts";
import { getMedalIcon } from "../../../components/common/medal.tsx";
import type {
  NavigationItem,
  SelectedSubmission,
} from "./submissionTypes";
import { useSubmissionSidebarActions } from "./SubmissionSidebarContext";
import { isExpired } from "../../../lib/date/utils.ts";
import { useAuthStore } from "../../../lib/store/authStore.ts";

interface RankingItem {
  file_name: string;
  prev_score: number;
  rank: number;
  score: number;
  user_name: string;
  submission_id: number;
  submission_count?: number;
  submission_time?: string;
}

interface RankingsListProps {
  rankings: Record<string, RankingItem[]>;
  leaderboardId?: string;
  deadline?: string;
}

const styles: Record<string, SxProps<Theme>> = {
  rankingListSection: {
    mt: 5,
  },
  rankingRow: {
    borderBottom: 1,
    borderColor: "divider",
    "& > .MuiGrid-root": {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    mb: 1,
  },
  fieldLabel: {
    fontWeight: "bold",
    fontSize: "1.1rem",
    textTransform: "capitalize",
  },
  row: {
    display: "flex",
    gap: 2,
    fontSize: "0.95rem",
    alignItems: "center",
    flexWrap: "wrap",
  },
  name: {
    fontWeight: 800,
    minWidth: "90px",
  },
  score: {
    fontFamily: "monospace",
    minWidth: "100px",
  },
  delta: {
    color: "text.secondary",
    minWidth: "90px",
  },
  submissionId: {
    fontFamily: "monospace",
    color: "text.secondary",
  },
};

export default function RankingsList({
  rankings,
  leaderboardId,
  deadline,
}: RankingsListProps) {
  const expired = !!deadline && isExpired(deadline);
  const me = useAuthStore((s) => s.me);
  const isAdmin = !!me?.user?.is_admin;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [colorHash] = useState<string>(
    Math.random().toString(36).slice(2, 8),
  );
  const { openSubmission } = useSubmissionSidebarActions();

  const toggleExpanded = (field: string) => {
    setExpanded((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleOpenSubmission = (
    item: RankingItem,
    _field: string,
    allItems: RankingItem[],
  ) => {
    const navItems: NavigationItem[] = allItems.map((i) => ({
      submissionId: i.submission_id,
      userName: i.user_name,
      fileName: i.file_name,
      timestamp: i.submission_time ? new Date(i.submission_time).getTime() : 0,
      score: i.score,
      originalTimestamp: i.submission_time
        ? new Date(i.submission_time).getTime()
        : undefined,
    }));
    const index = allItems.findIndex(
      (i) => i.submission_id === item.submission_id,
    );
    const submission: SelectedSubmission = {
      submissionId: item.submission_id,
      userName: item.user_name,
      fileName: item.file_name,
      isFastest: item.rank === 1,
      score: item.score,
      timestamp: item.submission_time
        ? new Date(item.submission_time).getTime()
        : undefined,
      originalTimestamp: item.submission_time
        ? new Date(item.submission_time).getTime()
        : undefined,
    };
    if (leaderboardId) {
      openSubmission(submission, navItems, index >= 0 ? index : 0, leaderboardId);
    }
  };

  return (
    <Stack spacing={3} sx={styles.rankingListSection}>
      {Object.entries(rankings).map(([field, items], ridx) => {
        if (items.length == 0) {
          return (
            <Box key={field}>
              <Box sx={styles.header}>
                <RankingTitleBadge name={field} colorHash={colorHash} />
              </Box>
              <Stack spacing={0.5}>
                <span> no submissions</span>
              </Stack>
            </Box>
          );
        }
        const isExpanded = expanded[field] ?? false;
        const visibleItems = isExpanded ? items : items.slice(0, 3);
        return (
          <Box key={field}>
            <Box sx={styles.header}>
              <RankingTitleBadge name={field} colorHash={colorHash} />
              {items.length > 3 && (
                <Button
                  data-testid={`ranking-show-all-button-${ridx}`}
                  onClick={() => toggleExpanded(field)}
                  size="small"
                >
                  {isExpanded ? "Hide" : `Show all (${items.length})`}
                </Button>
              )}
            </Box>
            <Stack spacing={0.5}>
              {visibleItems.map((item, idx) => (
                <Grid
                  container
                  spacing={2}
                  marginBottom={2}
                  key={idx}
                  sx={styles.rankingRow}
                  data-testid={`ranking-${ridx}-row`}
                >
                  <Grid size={3}>
                    <Typography sx={styles.name}>
                      {item.user_name} {getMedalIcon(item.rank)}
                    </Typography>
                  </Grid>
                  <Grid size={isAdmin ? 2 : 3}>
                    <Typography sx={styles.score}>
                      {formatMicroseconds(item.score)}
                    </Typography>
                  </Grid>
                  <Grid size={isAdmin ? 1 : 3}>
                    <Typography sx={styles.delta}>
                      {item.prev_score > 0 &&
                        `+${formatMicroseconds(item.prev_score)}`}
                    </Typography>
                  </Grid>
                  <Grid size={isAdmin ? 2 : 3}>
                    <Typography
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        "& .MuiButton-root": {
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        },
                      }}
                    >
                      {!expired && !isAdmin ? (
                        <Typography
                          variant="body2"
                          sx={{ fontSize: "0.8125rem" }}
                        >
                          {item.file_name}
                        </Typography>
                      ) : (
                        <Button
                          variant="text"
                          size="small"
                          onClick={() =>
                            handleOpenSubmission(item, field, items)
                          }
                          sx={{ textTransform: "none" }}
                        >
                          {item.file_name}
                        </Button>
                      )}
                    </Typography>
                  </Grid>
                  {isAdmin && (
                    <Grid size={2}>
                      <Typography sx={styles.submissionId}>
                        Subs: {item.submission_count}
                      </Typography>
                    </Grid>
                  )}
                  {isAdmin && (
                    <Grid size={2}>
                      <Typography sx={styles.submissionId}>
                        ID: {item.submission_id}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              ))}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}
