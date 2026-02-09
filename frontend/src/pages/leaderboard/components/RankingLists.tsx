import { useEffect, useMemo, useState } from "react";
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
import { fetchCodes } from "../../../api/api.ts";
import { CodeDialog } from "./CodeDialog.tsx";
import { isExpired } from "../../../lib/date/utils.ts";
import { useAuthStore } from "../../../lib/store/authStore.ts";

interface RankingItem {
  file_name: string;
  prev_score: number;
  rank: number;
  score: number;
  user_name: string;
  submission_id: number;
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
  loc: {
    fontFamily: "monospace",
    color: "text.secondary",
    textAlign: "right",
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
  const showLoc = !!deadline && isExpired(deadline);
  const me = useAuthStore((s) => s.me);
  const isAdmin = !!(me?.user?.is_admin);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [colorHash, _] = useState<string>(
    Math.random().toString(36).slice(2, 8),
  );
  const [codes, setCodes] = useState<Map<number, string>>(new Map());

  const submissionIds = useMemo(() => {
    if (!rankings) return [];
    const ids: number[] = [];
    Object.entries(rankings).forEach(([key, value]) => {
      const li = value as any[];
      if (Array.isArray(li) && li.length > 0) {
        li.forEach((item) => {
          if (item?.submission_id) {
            ids.push(item.submission_id);
          }
        });
      }
    });
    return ids;
  }, [rankings]);

  useEffect(() => {
    if (!showLoc) return;
    if (!submissionIds || submissionIds.length === 0 || !leaderboardId) return;
    fetchCodes(leaderboardId, submissionIds)
      .then((data) => {
        const map = new Map<number, string>();
        for (const item of data?.results ?? []) {
          map.set(item.submission_id, item.code);
        }
        setCodes(map);
      })
      .catch((err) => {
        // soft error handle it since it's not critical
        console.warn("[RankingsList] Failed to fetch codes:", err);
      });
  }, [leaderboardId, submissionIds, showLoc]);

  const toggleExpanded = (field: string) => {
    setExpanded((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
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
                  <Grid size={showLoc ? 2 : (isAdmin ? 2 : 3)}>
                    <Typography sx={styles.score}>
                      {formatMicroseconds(item.score)}
                    </Typography>
                  </Grid>
                  <Grid size={showLoc ? (isAdmin ? 1.5 : 2) : (isAdmin ? 2 : 3)}>
                    <Typography sx={styles.delta}>
                      {item.prev_score > 0 &&
                        `+${formatMicroseconds(item.prev_score)}`}
                    </Typography>
                  </Grid>
                  {showLoc && (
                    <Grid size={isAdmin ? 1.5 : 2}>
                      <Typography sx={styles.loc}>
                        {(() => {
                          const code = codes.get(item?.submission_id);
                          if (!code) return "";
                          const lines = code.split("\n").length;
                          return `${lines} LOC`;
                        })()}
                      </Typography>
                    </Grid>
                  )}
                  <Grid size={showLoc ? (isAdmin ? 2.5 : 3) : 3}>
                    <Typography>
                      <CodeDialog
                        code={codes.get(item?.submission_id)}
                        fileName={item.file_name}
                        isActive={!showLoc}
                        rank={item.rank}
                        userName={item.user_name}
                        problemName={field}
                      />
                    </Typography>
                  </Grid>
                  {isAdmin && (
                    <Grid size={showLoc ? 1.5 : 2}>
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
