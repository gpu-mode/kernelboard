import {
  Box,
  Card,
  CardContent,
  Divider,
  IconButton,
  Stack,
  styled,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchLeaderBoard } from "../../api/api";
import { fetcherApiCallback } from "../../lib/hooks/useApi";
import { isExpired, toDateUtc } from "../../lib/date/utils";
import RankingsList from "./components/RankingLists";
import CodeBlock from "../../components/codeblock/CodeBlock";
import { ErrorAlert } from "../../components/alert/ErrorAlert";
import { useParams, useSearchParams } from "react-router-dom";
import Loading from "../../components/common/loading";
import { SubmissionMode } from "../../lib/types/mode";
import { useAuthStore } from "../../lib/store/authStore";
import SubmissionHistorySection from "./components/submission-history/SubmissionHistorySection";
import LeaderboardSubmit from "./components/LeaderboardSubmit";

export const CardTitle = styled(Typography)(() => ({
  fontSize: "1.1rem",
  fontWeight: "bold",
}));

const DEFAULT_SIDEBAR_WIDTH = 320;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 800;
const COLLAPSED_WIDTH = 10;

const TAB_KEYS = ["rankings", "reference", "submission"] as const;
type TabKey = (typeof TAB_KEYS)[number];

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
  index: number;
}) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== TAB_KEYS[index]}
      id={`leaderboard-tabpanel-${index}`}
      aria-labelledby={`leaderboard-tab-${index}`}
      {...other}
    >
      {value === TAB_KEYS[index] && <Box sx={{ pt: 1 }}>{children}</Box>}
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

  // Sync tab state with query parameter
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabFromUrl = ((): TabKey => {
    const t = (searchParams.get("tab") || "").toLowerCase();
    return (TAB_KEYS as readonly string[]).includes(t)
      ? (t as TabKey)
      : "rankings";
  })();
  const [tab, setTab] = useState<TabKey>(initialTabFromUrl);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const triggerRefresh = () => setRefreshFlag((f) => !f);

  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [prevWidth, setPrevWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const isResizing = useRef(false);

  const startResizing = useCallback(() => {
    if (!isCollapsed) {
      isResizing.current = true;
    }
  }, [isCollapsed]);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing.current && !isCollapsed) {
      const newWidth = e.clientX;
      if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isCollapsed]);

  const toggleCollapse = useCallback(() => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setSidebarWidth(prevWidth);
    } else {
      setPrevWidth(sidebarWidth);
      setIsCollapsed(true);
      setSidebarWidth(COLLAPSED_WIDTH);
    }
  }, [isCollapsed, sidebarWidth, prevWidth]);

  // Double-click to reset to default width
  const handleDoubleClick = useCallback(() => {
    setIsCollapsed(false);
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

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

  if (loading) return <Loading />;
  if (error) return <ErrorAlert status={errorStatus} message={error} />;

  const toDeadlineUTC = (raw: string) => `ended (${toDateUtc(raw)}) UTC`;

  const info_items = [
    { title: "Deadline", content: toDeadlineUTC(data.deadline) },
    { title: "Language", content: data.lang },
    { title: "GPU Types", content: data.gpu_types.join(", ") },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flex: 1,
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Left Sidebar - independent scroll */}
      <Box
        sx={{
          width: sidebarWidth,
          minWidth: isCollapsed ? COLLAPSED_WIDTH : MIN_SIDEBAR_WIDTH,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: isResizing.current ? "none" : "width 0.2s ease",
        }}
      >
        {/* Fixed Tabs Header */}
          <Box
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              flexShrink: 0,
              px: 3,
            }}
          >
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {data.name}
            </Typography>

            <Divider sx={{ my: 2 }} />

            {/* Info Items */}
            <Stack spacing={2}>
              {info_items.map((info, idx) => (
                <Box key={idx}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.65rem" }}
                  >
                    {info.title}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>{info.content}</Typography>
                </Box>
              ))}
            </Stack>

            <Divider sx={{ my: 2 }} />

            {/* Description */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.65rem" }}
            >
              Description
            </Typography>
            <Typography
              variant="body2"
              component="div"
              sx={{ whiteSpace: "pre-line", mt: 1, fontSize: "0.8rem" }}
            >
              {data.description}
            </Typography>
          </Box>
      </Box>

      {/* Resizable Divider with Toggle Button - LeetCode style */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <Box
          onMouseDown={startResizing}
          onDoubleClick={handleDoubleClick}
          sx={{
            width: "8px",
            height: "100%",
            cursor: isCollapsed ? "default" : "col-resize",
            backgroundColor: "action.hover",
            transition: "background-color 0.2s",
            "&:hover": {
              backgroundColor: isCollapsed ? "action.hover" : "primary.main",
            },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Toggle Button */}
          <Tooltip title={isCollapsed ? "Expand panel" : "Collapse panel"}>
            <IconButton
              onClick={toggleCollapse}
              size="small"
              sx={{
                position: "absolute",
                backgroundColor: "background.paper",
                border: 1,
                borderColor: "divider",
                borderRadius: "50%",
                width: 24,
                height: 24,
                zIndex: 10,
                "&:hover": {
                  backgroundColor: "action.hover",
                },
              }}
            >
              {isCollapsed ? (
                <ChevronRightIcon sx={{ fontSize: 16 }} />
              ) : (
                <ChevronLeftIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Main Content Area - independent scroll */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* Fixed Tabs Header */}
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            flexShrink: 0,
            px: 3,
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v: TabKey) => setTab(v)}
            aria-label="Leaderboard Tabs"
            centered
            sx={{
              minHeight: 36,
              mt: 0,
              "& .MuiTab-root": {
                fontSize: "0.8rem",
                minHeight: 36,
                py: 0.5,
                px: 1.5,
                textTransform: "none",
              },
            }}
          >
            <Tab label="Rankings" value="rankings" {...a11yProps(0)} />
            <Tab label="Reference" value="reference" {...a11yProps(1)} />
            <Tab label="Submission" value="submission" {...a11yProps(2)} />
          </Tabs>
        </Box>

        {/* Scrollable Tab Content */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            px: 3,
            py: 1,
          }}
        >

        {/* Ranking Tab */}
        <TabPanel value={tab} index={0}>
          <Box>
            {Object.entries(data.rankings).length > 0 ? (
              <RankingsList rankings={data.rankings} leaderboardId={id} />
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
        <TabPanel value={tab} index={1}>
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
        <TabPanel value={tab} index={2}>
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
        </Box>
      </Box>
    </Box>
  );
}
