import {
  Box,
  Card,
  CardContent,
  Stack,
  styled,
  Tab,
  Tabs,
  Typography,
  Button,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { memo, useCallback, useEffect, useState } from "react";
import { fetchLeaderBoard, searchUsers } from "../../api/api";
import { fetcherApiCallback } from "../../lib/hooks/useApi";
import { isExpired, toDateUtc } from "../../lib/date/utils";
import RankingsList from "./components/RankingLists";
import CodeBlock from "../../components/codeblock/CodeBlock";
import MarkdownRenderer from "../../components/markdown-renderer/MarkdownRenderer";
import { ErrorAlert } from "../../components/alert/ErrorAlert";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Loading from "../../components/common/loading";
import { ConstrainedContainer } from "../../components/app-layout/ConstrainedContainer";
import { useAuthStore } from "../../lib/store/authStore";
import SubmissionHistorySection from "./components/submission-history/SubmissionHistorySection";
import UserTrendChart from "./components/UserTrendChart";
import {
  SubmissionSidebarProvider,
  useSubmissionSidebarState,
} from "./components/SubmissionSidebarContext";
import SubmissionCodeSidebar from "./components/SubmissionCodeSidebar";
import CodeIcon from "@mui/icons-material/Code";
import TerminalIcon from "@mui/icons-material/Terminal";
import LeaderboardSubmit from "./components/LeaderboardSubmit";
import { SubmissionMode } from "../../lib/types/mode";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import quickStartMarkdown from "../home/quick-start.md?raw";

const DEFAULT_SIDEBAR_WIDTH = 600;

export const CardTitle = styled(Typography)(() => ({
  fontSize: "1.5rem",
  fontWeight: "bold",
}));

type TabKey = "rankings" | "reference" | "submission";

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

// Inner component
const LeaderboardContent = memo(function LeaderboardContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, loading, error, errorStatus, call } =
    fetcherApiCallback(fetchLeaderBoard);
  const me = useAuthStore((s) => s.me);
  const isAuthed = !!(me && me.authenticated);
  const userId = me?.user?.identity ?? null;

  // State for top users (strongest submissions) and default GPU type
  const [defaultUsers, setDefaultUsers] = useState<
    Array<{ userId: string; username: string }>
  >([]);
  const [defaultGpuType, setDefaultGpuType] = useState<string | null>(null);

  // Sync tab state with query parameter
  const [searchParams, setSearchParams] = useSearchParams();

  const TAB_KEYS: TabKey[] = ["rankings", "reference", "submission"];

  const initialTabFromUrl = ((): TabKey => {
    const t = (searchParams.get("tab") || "").toLowerCase();
    return (TAB_KEYS as readonly string[]).includes(t)
      ? (t as TabKey)
      : "rankings";
  })();
  const [tab, setTab] = useState<TabKey>(initialTabFromUrl);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);

  useEffect(() => {
    const current = searchParams.get("tab");
    if (current !== tab) {
      const next = new URLSearchParams(searchParams);
      next.set("tab", tab);
      setSearchParams(next, { replace: true });
    }
  }, [tab, searchParams, setSearchParams]);

  // Fetch leaderboard data
  useEffect(() => {
    if (id) call(id);
  }, [id, call]);

  // Fetch top users (strongest submissions) when rankings are available
  // Select from the GPU with the most unique users
  useEffect(() => {
    const findTopUsers = async () => {
      if (!id || !data?.rankings) return;

      const gpuTypes = Object.keys(data.rankings);
      if (gpuTypes.length === 0) return;

      // Find the GPU type with the most unique users
      const mostActiveGpu = gpuTypes.reduce((currentMax, gpuType) => {
        const rankings = data.rankings[gpuType];
        const userCount = rankings ? rankings.length : 0;
        const maxCount = data.rankings[currentMax]?.length ?? 0;
        return userCount > maxCount ? gpuType : currentMax;
      }, gpuTypes[0]);

      // Set the default GPU type to the one with most users
      setDefaultGpuType(mostActiveGpu);

      const mostActiveGpuRankings = data.rankings[mostActiveGpu];
      if (!mostActiveGpuRankings || mostActiveGpuRankings.length === 0) return;

      // Get top 5 users (sorted by score ascending)
      const topUserNames = mostActiveGpuRankings
        .slice(0, 5)
        .map((r) => r.user_name)
        .filter(Boolean);

      if (topUserNames.length === 0) return;

      try {
        // Search for each user by username to get their user_id
        const userPromises = topUserNames.map((userName: string) =>
          searchUsers(id, userName, 1)
        );
        const results = await Promise.all(userPromises);

        const foundUsers = results
          .filter((result) => result.users && result.users.length > 0)
          .map((result) => ({
            userId: result.users[0].user_id,
            username: result.users[0].username,
          }));

        setDefaultUsers(foundUsers);
      } catch (err) {
        console.error("Failed to fetch top users:", err);
      }
    };

    findTopUsers();
  }, [id, data?.rankings]);

  if (loading || !data) return <Loading />;
  if (error) return <ErrorAlert status={errorStatus} message={error} />;
  if (!data) return null;

  const toDeadlineUTC = (raw: string) => {
    const verb = isExpired(raw) ? "Ended" : "Ends";
    return `${verb} ${toDateUtc(raw)} UTC`;
  };

  return (
    <ConstrainedContainer>
      <Box>
        {/* Header with title, deadline, and Submit button */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Stack direction="row" alignItems="baseline" spacing={2}>
            <h1 style={{ margin: 0 }}>{data.name}</h1>
            <Typography variant="body2" color="text.secondary">
              {toDeadlineUTC(data.deadline)}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<TerminalIcon />}
              onClick={() => setIsQuickStartOpen(true)}
              sx={{
                borderRadius: 2,
                px: 2,
                py: 1,
                fontWeight: "bold",
                textTransform: "none",
              }}
            >
              Submit via CLI
            </Button>
            {searchParams.has("editor") && (
              <Button
                variant="contained"
                size="small"
                startIcon={<CodeIcon />}
                onClick={() => navigate(`/leaderboard/${id}/editor`)}
                sx={{
                  borderRadius: 2,
                  fontWeight: "bold",
                  textTransform: "none",
                }}
              >
                Code Editor (Beta)
              </Button>
            )}
          </Stack>
        </Stack>

        {/* Quick Start Dialog */}
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
        <Grid marginBottom={2}>
          <Card>
            <CardContent>
              <details>
                <summary style={{ cursor: "pointer", fontWeight: "bold", fontSize: "1.5rem" }}>
                  Description
                </summary>
                <MarkdownRenderer content={data.description} />
                {data.benchmarks && data.benchmarks.length > 0 && (
                  <details>
                    <summary style={{ cursor: "pointer", fontWeight: "bold", marginTop: 16 }}>
                      Benchmark Shapes
                    </summary>
                    <ul>
                      {data.benchmarks.map((b, i) => (
                        <li key={i}>
                          <code>{JSON.stringify(Object.fromEntries(Object.entries(b).filter(([k]) => k !== "seed")))}</code>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </details>
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
          </Tabs>
        </Box>

        {/* Ranking Tab */}
        <TabPanel value={tab} tabKey="rankings">
          <Box>
            {Object.entries(data.rankings).length > 0 ? (
              <>
                <RankingsList
                  rankings={data.rankings}
                  leaderboardId={id}
                  deadline={data.deadline}
                />
                <Box sx={{ my: 4, borderTop: 1, borderColor: "divider" }} />
                <Card>
                  <CardContent>
                    <CardTitle fontWeight="bold">Performance Trend</CardTitle>
                    <UserTrendChart leaderboardId={id!} defaultUsers={defaultUsers} defaultGpuType={defaultGpuType} rankings={data.rankings} deadline={data.deadline} />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                <Typography variant="h6" fontWeight="bold">
                  No Submission Yet
                </Typography>
                <Typography variant="body1">
                  Be the first to submit a solution for this challenge!
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => window.open("https://github.com/gpu-mode/kernelboard-cli", "_blank")}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                  }}
                >
                  Submit via CLI
                </Button>
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
                <CodeBlock code={data.reference} bordered />
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
                  <CardTitle fontWeight="bold">Submission History</CardTitle>
                  {!isExpired(data.deadline) && (
                    <LeaderboardSubmit
                      leaderboardId={id!}
                      leaderboardName={data.name}
                      gpuTypes={data.gpu_types}
                      modes={[SubmissionMode.LEADERBOARD, SubmissionMode.BENCHMARK, SubmissionMode.TEST]}
                      onSubmit={() => setRefreshFlag((f) => !f)}
                    />
                  )}
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
                  leaderboardId={id!}
                  leaderboardName={data.name}
                  userId={userId!}
                  refreshFlag={refreshFlag}
                />
              </CardContent>
            </Card>
          )}
        </TabPanel>
      </Box>
    </ConstrainedContainer>
  );
});

// Main wrapper component with sidebar provider and flex layout
export default function Leaderboard() {
  return (
    <SubmissionSidebarProvider>
      <LeaderboardWithSidebar />
    </SubmissionSidebarProvider>
  );
}

// Layout component that uses the sidebar context for flex layout
function LeaderboardWithSidebar() {
  const {
    selectedSubmission,
    navigationItems,
    navigationIndex,
    codes,
    isOpen,
    isLoadingCodes,
    navigate,
    close,
  } = useSubmissionSidebarState();

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);

  const handleWidthChange = useCallback((newWidth: number) => {
    const maxWidth = window.innerWidth * 0.8;
    setSidebarWidth(Math.min(Math.max(newWidth, 300), maxWidth));
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
      }}
    >
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          width: {
            xs: "100%",
            md: isOpen ? `calc(100% - ${sidebarWidth}px)` : "100%",
          },
          transition: "width 0.3s ease",
        }}
      >
        <LeaderboardContent />
      </Box>
      <SubmissionCodeSidebar
        selectedSubmission={selectedSubmission}
        navigationItems={navigationItems}
        navigationIndex={navigationIndex}
        codes={codes}
        isLoadingCodes={isLoadingCodes}
        onClose={close}
        onNavigate={navigate}
        width={sidebarWidth}
        onWidthChange={handleWidthChange}
      />
    </Box>
  );
}
