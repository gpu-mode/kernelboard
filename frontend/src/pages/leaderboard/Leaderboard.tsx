import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  styled,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { useEffect, useState } from "react";
import { fetchLeaderBoard } from "../../api/api";
import { fetcherApiCallback } from "../../lib/hooks/useApi";
import { isExpired, toDateUtc } from "../../lib/date/utils";
import RankingsList from "./components/RankingLists";
import CodeBlock from "../../components/codeblock/CodeBlock";
import { ErrorAlert } from "../../components/alert/ErrorAlert";
import { useParams, useSearchParams } from "react-router-dom";
import Loading from "../../components/common/loading";
import { ConstrainedContainer } from "../../components/app-layout/ConstrainedContainer";
import { SubmissionMode } from "../../lib/types/mode";
import { useAuthStore } from "../../lib/store/authStore";
import SubmissionHistorySection from "./components/submission-history/SubmissionHistorySection";
import LeaderboardSubmit from "./components/LeaderboardSubmit";
export const CardTitle = styled(Typography)(() => ({
  fontSize: "1.5rem",
  fontWeight: "bold",
}));

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
      {value === TAB_KEYS[index] && <Box sx={{ pt: 2 }}>{children}</Box>}
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

  const descriptionText = (text: string) => (
    <Typography component="div" sx={{ whiteSpace: "pre-line" }}>
      {text}
    </Typography>
  );

  const toDeadlineUTC = (raw: string) => `ended (${toDateUtc(raw)}) UTC`;

  const info_items = [
    { title: "Deadline", content: <span>{toDeadlineUTC(data.deadline)}</span> },
    { title: "Language", content: <span>{data.lang}</span> },
    { title: "GPU types", content: <span>{data.gpu_types.join(", ")}</span> },
  ];
  return (
    <ConstrainedContainer>
      <Box>
        <h1>{data.name}</h1>
        {/* Header info cards shown above tabs */}
        <Grid container spacing={2} marginBottom={2}>
          {info_items.map((info, idx) => (
            <Grid size={{ xs: 12, md: 4 }} key={idx}>
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
              {descriptionText(data.description)}
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
        <TabPanel value={tab} index={0}>
          <Box>
            {Object.entries(data.rankings).length > 0 ? (
              <RankingsList rankings={data.rankings} />
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
                <CodeBlock code={data.reference} language="cpp" />
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
    </ConstrainedContainer>
  );
}
