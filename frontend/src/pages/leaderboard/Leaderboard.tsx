import {
  Box,
  Card,
  CardContent,
  Stack,
  styled,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { useEffect, useState, useMemo } from "react";
import { fetchLeaderBoard, searchUsers } from "../../api/api";
import { fetcherApiCallback } from "../../lib/hooks/useApi";
import { isExpired, toDateUtc } from "../../lib/date/utils";
import RankingsList from "./components/RankingLists";
import CodeBlock from "../../components/codeblock/CodeBlock";
import MarkdownRenderer from "../../components/markdown-renderer/MarkdownRenderer";
import { ErrorAlert } from "../../components/alert/ErrorAlert";
import { useParams, useSearchParams } from "react-router-dom";
import Loading from "../../components/common/loading";
import { ConstrainedContainer } from "../../components/app-layout/ConstrainedContainer";
import { SubmissionMode } from "../../lib/types/mode";
import { useAuthStore } from "../../lib/store/authStore";
import SubmissionHistorySection from "./components/submission-history/SubmissionHistorySection";
import LeaderboardSubmit from "./components/LeaderboardSubmit";
import AiTrendChart from "./components/AiTrendChart";
import UserTrendChart from "./components/UserTrendChart";
export const CardTitle = styled(Typography)(() => ({
  fontSize: "1.5rem",
  fontWeight: "bold",
}));

type TabKey = "rankings" | "reference" | "submission" | "ai_trend";

// Tab accessibility props
function a11yProps(index: number) {
  return {
    id: `leaderboard-tab-${index}`,
    "aria-controls": `leaderboard-tabpanel-${index}`,
  };
}

// Panel wrapper for tab content
function TabPanel(props: {
  children?: React.ReactNode;
  value: string;
  tabKey: string;
}) {
  const { children, value, tabKey, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== tabKey}
      id={`leaderboard-tabpanel-${tabKey}`}
      aria-labelledby={`leaderboard-tab-${tabKey}`}
      {...other}
    >
      {value === tabKey && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function Leaderboard() {
  const { id } = useParams<{ id: string }>();

  const { data, loading, error, errorStatus, call } =
    fetcherApiCallback(fetchLeaderBoard);
  const me = useAuthStore((s) => s.me);
  const isAuthed = !!(me && me.authenticated);
  const userId = me?.user?.identity ?? null;

  // State for top user (strongest submission) and default GPU type
  const [topUser, setTopUser] = useState<{
    userId: string;
    username: string;
  } | null>(null);
  const [defaultGpuType, setDefaultGpuType] = useState<string | null>(null);

  // Sync tab state with query parameter
  const [searchParams, setSearchParams] = useSearchParams();

  // Check if AI Trend should be shown
  const showAiTrend = searchParams.get("showAiTrend") === "true";

  // Build tab keys dynamically based on showAiTrend
  const TAB_KEYS: TabKey[] = useMemo(() => {
    const keys: TabKey[] = ["rankings", "reference", "submission"];
    if (showAiTrend) {
      keys.push("ai_trend");
    }
    return keys;
  }, [showAiTrend]);

  const initialTabFromUrl = ((): TabKey => {
    const t = (searchParams.get("tab") || "").toLowerCase();
    return (TAB_KEYS as readonly string[]).includes(t)
      ? (t as TabKey)
      : "rankings";
  })();
  const [tab, setTab] = useState<TabKey>(initialTabFromUrl);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const triggerRefresh = () => setRefreshFlag((f) => !f);

  useEffect(() => {
    const current = searchParams.get("tab");
    if (current !== tab) {
      const next = new URLSearchParams(searchParams);
      next.set("tab", tab);
      setSearchParams(next, { replace: true });
    }
  }, [tab]);

  // Fetch leaderboard data
  useEffect(() => {
    if (id) call(id);
  }, [id]);

  // Fetch top user (strongest submission) when rankings are available
  // Select from the GPU with the most unique users
  useEffect(() => {
    const findTopUser = async () => {
      if (!id || !data?.rankings) return;

      const gpuTypes = Object.keys(data.rankings);
      if (gpuTypes.length === 0) return;

      // Find the GPU type with the most unique users
      let maxUsers = 0;
      let bestGpu = gpuTypes[0];
      for (const gpuType of gpuTypes) {
        const rankings = data.rankings[gpuType];
        const userCount = rankings ? rankings.length : 0;
        if (userCount > maxUsers) {
          maxUsers = userCount;
          bestGpu = gpuType;
        }
      }

      // Set the default GPU type to the one with most users
      setDefaultGpuType(bestGpu);

      const bestGpuRankings = data.rankings[bestGpu];
      if (!bestGpuRankings || bestGpuRankings.length === 0) return;

      // The first item is the top user (sorted by score ascending)
      const topUserName = bestGpuRankings[0].user_name;
      if (!topUserName) return;

      try {
        // Search for the user by username to get their user_id
        const result = await searchUsers(id, topUserName, 1);
        if (result.users && result.users.length > 0) {
          const foundUser = result.users[0];
          setTopUser({
            userId: foundUser.user_id,
            username: foundUser.username,
          });
        }
      } catch (err) {
        console.error("Failed to fetch top user:", err);
      }
    };

    findTopUser();
  }, [id, data?.rankings]);

  if (loading) return <Loading />;
  if (error) return <ErrorAlert status={errorStatus} message={error} />;

  const toDeadlineUTC = (raw: string) => {
    const verb = isExpired(raw) ? "Ended" : "Ends";
    return `${verb} ${toDateUtc(raw)} UTC`;
  };

  const info_items = [
    { title: "Deadline", content: <span>{toDeadlineUTC(data.deadline)}</span> },
    { title: "GPU types", content: <span>{data.gpu_types.join(", ")}</span> },
  ];

  return (
    <ConstrainedContainer>
      <Box>
        <h1>{data.name}</h1>
        {/* Header info cards shown above tabs */}
        <Grid container spacing={2} marginBottom={2}>
          {info_items.map((info, idx) => (
            <Grid size={{ xs: 12, md: 6 }} key={idx}>
              <Card>
                <CardContent>
                  <CardTitle>{info.title}</CardTitle>
                  {info.content}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Grid marginBottom={2}>
          <Card>
            <CardContent>
              <CardTitle fontWeight="bold">Description</CardTitle>
              <MarkdownRenderer content={data.description} />
            </CardContent>
          </Card>
        </Grid>

        {/* Tab navigation */}
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tab}
            onChange={(_, v: TabKey) => setTab(v)}
            aria-label="Leaderboard Tabs"
            variant="scrollable"
            scrollButtons
            allowScrollButtonsMobile
          >
            <Tab label="Rankings" value="rankings" {...a11yProps(0)} />
            <Tab label="Reference" value="reference" {...a11yProps(1)} />
            <Tab label="Submission" value="submission" {...a11yProps(2)} />
            {showAiTrend && (
              <Tab label="AI Trend" value="ai_trend" {...a11yProps(3)} />
            )}
          </Tabs>
        </Box>

        {/* Ranking Tab */}
        <TabPanel value={tab} tabKey="rankings">
          <Box>
            {Object.entries(data.rankings).length > 0 ? (
              <RankingsList
                rankings={data.rankings}
                leaderboardId={id}
                deadline={data.deadline}
              />
            ) : (
              <Box display="flex" flexDirection="column" alignItems="center">
                <Typography variant="h6" fontWeight="bold">
                  No Submission Yet
                </Typography>
                <Typography variant="body1">
                  Be the first to submit a solution for this challenge!
                </Typography>
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Reference Implementation Tab */}
        <TabPanel value={tab} tabKey="reference">
          <Card>
            <CardContent>
              <CardTitle fontWeight="bold">Reference Implementation</CardTitle>
              <Box>
                <CodeBlock code={data.reference} />
              </Box>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Submission Tab */}
        <TabPanel value={tab} tabKey="submission">
          {!isAuthed ? (
            <div> please login to submit</div>
          ) : (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                {/* Header Row */}
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={2}
                >
                  <CardTitle fontWeight="bold">Submission</CardTitle>
                  <LeaderboardSubmit
                    leaderboardId={id!!}
                    leaderboardName={data.name}
                    gpuTypes={data.gpu_types}
                    disabled={isExpired(data.deadline)}
                    modes={[
                      SubmissionMode.LEADERBOARD,
                      SubmissionMode.BENCHMARK,
                      SubmissionMode.TEST,
                    ]}
                    onSubmit={triggerRefresh}
                  />
                </Stack>
                {/* Deadline Passed Message */}
                {isExpired(data.deadline) && (
                  <Box mb={2} data-testid="deadline-passed-text">
                    <Typography variant="body1" color="text.secondary">
                      The submission deadline has passed. You can no longer
                      submit.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      But don't worry — we have more leaderboards!
                    </Typography>
                  </Box>
                )}
                {/* History List */}
                <SubmissionHistorySection
                  leaderboardId={id!!}
                  leaderboardName={data.name}
                  userId={userId!!}
                  refreshFlag={refreshFlag}
                />
              </CardContent>
            </Card>
          )}
        </TabPanel>

        {/* AI Trend Tab - only shown when showAiTrend=true */}
        {showAiTrend && (
          <TabPanel value={tab} tabKey="ai_trend">
            <Card>
              <CardContent>
                <CardTitle fontWeight="bold">
                  AI Model Performance Trend
                </CardTitle>
                <AiTrendChart leaderboardId={id!!} />
              </CardContent>
            </Card>
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <CardTitle fontWeight="bold">User Performance Trend</CardTitle>
                <UserTrendChart leaderboardId={id!!} topUser={topUser} defaultGpuType={defaultGpuType} />
              </CardContent>
            </Card>
          </TabPanel>
        )}
      </Box>
    </ConstrainedContainer>
  );
}
