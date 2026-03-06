import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  useMediaQuery,
  useTheme,
  Stack,
  CircularProgress,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import HistoryIcon from "@mui/icons-material/History";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchLeaderBoard,
  submitCode,
  fetchSubmissionStatus,
} from "../../api/api";
import { fetcherApiCallback } from "../../lib/hooks/useApi";
import Loading from "../../components/common/loading";
import { ErrorAlert } from "../../components/alert/ErrorAlert";
import MarkdownRenderer from "../../components/markdown-renderer/MarkdownRenderer";
import { SubmissionMode } from "../../lib/types/mode";
import { useAuthStore } from "../../lib/store/authStore";
import SubmissionHistorySection from "./components/submission-history/SubmissionHistorySection";
import { useThemeStore } from "../../lib/store/themeStore";
import {
  CodeEditorPanel,
  JobOutputPanel,
  EditorControls,
  ResizableSplitPanel,
  DEFAULT_CODE,
  editorStyles as styles,
  type SubmitStatus,
} from "./components/editor";

export default function LeaderboardEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const resolvedMode = useThemeStore((s) => s.resolvedMode);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const { data, loading, error, errorStatus, call } =
    fetcherApiCallback(fetchLeaderBoard);
  const me = useAuthStore((s) => s.me);
  const isAuthed = !!(me && me.authenticated);
  const userId = me?.user?.identity ?? null;

  // Resizable side panel state (for desktop)
  const [sidePanelWidth, setSidePanelWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Editor state
  const [code, setCode] = useState("");
  const [isEditorDirty, setIsEditorDirty] = useState(true);
  const [editorStatus, setEditorStatus] = useState<SubmitStatus>({ kind: "idle" });
  const editorPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const editorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Polling timeout (20 minutes)
  const POLLING_TIMEOUT_MS = 20 * 60 * 1000;

  // Common state
  const [gpuType, setGpuType] = useState<string>("");
  const [mode, setMode] = useState<string>(SubmissionMode.LEADERBOARD);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [refreshFlag] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const modes = useMemo(
    () => [SubmissionMode.LEADERBOARD, SubmissionMode.BENCHMARK, SubmissionMode.TEST],
    []
  );

  // Handle panel resize
  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
  }, []);

  useEffect(() => {
    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = e.clientX - containerRect.left;
        // Clamp between 250 and 600
        setSidePanelWidth(Math.max(250, Math.min(600, newWidth)));
      });
    };

    const handleMouseUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    if (isResizing) {
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (id) call(id);
  }, [id, call]);

  useEffect(() => {
    if (data?.gpu_types?.length && !gpuType) {
      setGpuType(data.gpu_types[0]);
    }
  }, [data?.gpu_types, gpuType]);

  // Editor polling
  const stopEditorPolling = useCallback(() => {
    if (editorPollingRef.current) {
      clearInterval(editorPollingRef.current);
      editorPollingRef.current = null;
    }
    if (editorTimeoutRef.current) {
      clearTimeout(editorTimeoutRef.current);
      editorTimeoutRef.current = null;
    }
  }, []);

  const startEditorPolling = useCallback(
    (submissionId: number) => {
      if (!id) return;
      stopEditorPolling();

      const poll = async () => {
        try {
          const status = await fetchSubmissionStatus(id, submissionId);
          if (!status) return;
          if (status.submission_done) {
            stopEditorPolling();
            setEditorStatus({ kind: "done", submissionId, result: status });
          } else {
            // Show intermediate status with runs while polling
            setEditorStatus({ kind: "polling", submissionId, result: status });
          }
        } catch (err) {
          console.error("Editor polling error:", err);
        }
      };

      // Set timeout (20 minutes)
      editorTimeoutRef.current = setTimeout(() => {
        stopEditorPolling();
        setEditorStatus({
          kind: "error",
          msg: "Job timed out after 20 minutes. Please try again.",
        });
      }, POLLING_TIMEOUT_MS);

      poll();
      editorPollingRef.current = setInterval(poll, 5000);
    },
    [stopEditorPolling, id, POLLING_TIMEOUT_MS]
    );

  useEffect(() => {
    return () => {
      stopEditorPolling();
    };
  }, [stopEditorPolling]);

  // Editor submit - check if job is running first
  const handleEditorSubmitClick = () => {
    if (!data || !id) return;

    if (!code.trim()) {
      setEditorStatus({ kind: "error", msg: "Please write some code before submitting." });
      return;
    }

    // If a job is currently running, show confirmation dialog
    if (editorStatus.kind === "polling") {
      setConfirmSubmitOpen(true);
      return;
    }

    // Otherwise, submit directly
    doEditorSubmit();
  };

  const doEditorSubmit = async () => {
    if (!data || !id) return;

    setConfirmSubmitOpen(false);
    setEditorStatus({ kind: "submitting" });

    try {
      const result = await submitCode(id, data.name, gpuType, mode, code);
      if (result?.submission_id) {
        setIsEditorDirty(false);
        startEditorPolling(result.submission_id);
      } else {
        setEditorStatus({ kind: "error", msg: "Submission accepted but no ID returned." });
      }
    } catch (err) {
      setEditorStatus({
        kind: "error",
        msg: err instanceof Error ? err.message : "Submission failed",
      });
    }
    };

  const canEditorSubmit = useMemo(() => {
    if (!gpuType || !mode) return false;
    if (!code.trim()) return false;
    // Only enable if editor has been modified
    if (!isEditorDirty) return false;
    return true;
  }, [code, gpuType, mode, isEditorDirty]);

  if (loading) return <Loading />;
  if (error) return <ErrorAlert status={errorStatus} message={error} />;
  if (!data) return null;

  if (!isAuthed) {
    return (
      <Box sx={{ width: "100%", px: { xs: 2, sm: 3, lg: 4 } }}>
        <Box sx={{ ...styles.root, textAlign: "center", py: 8 }}>
          <Typography variant="h5" gutterBottom>
            Submit Code
          </Typography>
          <Alert severity="warning" sx={{ maxWidth: 400, mx: "auto" }}>
            Please login to submit your code.
          </Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", px: { xs: 2, sm: 3, lg: 4 } }}>
      <Box sx={styles.root} ref={containerRef}>
        {/* Header */}
        <Box sx={styles.header}>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {data.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Submit your Python code
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {/* Show user's best rank and score */}
            {(() => {
              const priorityGpu = data.gpu_types?.[0] || "";
              const rankings = data.rankings?.[priorityGpu] || [];
              const myBest = rankings.find(
                (r) => r.user_name === me?.user?.display_name
              );
              if (myBest) {
                return (
                  <Chip
                    icon={<EmojiEventsIcon />}
                    label={`Rank #${myBest.rank} • Score: ${myBest.score.toFixed(2)}`}
                    color="primary"
                    variant="outlined"
                  />
                );
              }
              return null;
            })()}
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => setHistoryOpen(true)}
              sx={styles.historyBtn}
              size="small"
            >
              History
            </Button>
            <Button variant="outlined" onClick={() => navigate(`/leaderboard/${id}`)} size="small">
              Back
            </Button>
          </Stack>
        </Box>

        {/* Main Content - Side by side on desktop, stacked on mobile */}
        <Box sx={{
          display: "flex",
          flexDirection: isDesktop ? "row" : "column",
          gap: 2,
          position: "relative",
        }}>
          {/* Description Panel */}
          <Box sx={{
            width: isDesktop ? sidePanelWidth : "100%",
            minWidth: isDesktop ? 250 : undefined,
            maxWidth: isDesktop ? 600 : undefined,
            flexShrink: 0,
          }}>
            <Card sx={{ height: isDesktop ? "calc(100vh - 200px)" : "auto", overflow: "auto" }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                  Challenge Description
                </Typography>
                <MarkdownRenderer content={data.description} />
                {data.benchmarks && data.benchmarks.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                      Benchmark Shapes
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {data.benchmarks.map((b, i) => (
                        <li key={i}>
                          <code>
                            {JSON.stringify(
                              Object.fromEntries(Object.entries(b).filter(([k]) => k !== "seed"))
                            )}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* Resize Handle (desktop only) */}
          {isDesktop && (
            <Box
              onMouseDown={handleMouseDown}
              sx={{
                width: 8,
                cursor: "col-resize",
                bgcolor: isResizing ? "primary.main" : "transparent",
                "&:hover": {
                  bgcolor: "action.hover",
                },
                borderRadius: 1,
                transition: "background-color 0.2s",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box sx={{
                width: 4,
                height: 40,
                bgcolor: "divider",
                borderRadius: 1,
              }} />
            </Box>
          )}

          {/* Editor Panel */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Submission Section */}
            <Card sx={styles.editorCard}>
              <CardContent>
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".py"
                  hidden
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (!selectedFile) return;
                    if (!selectedFile.name.endsWith(".py")) {
                      setEditorStatus({ kind: "error", msg: "Please select a .py file" });
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const content = event.target?.result as string;
                      setCode(content);
                      setIsEditorDirty(true);
                    };
                    reader.onerror = () => {
                      setEditorStatus({ kind: "error", msg: "Failed to read file" });
                    };
                    reader.readAsText(selectedFile);
                  }}
                />

            {/* Editor + Output split panel */}
            <ResizableSplitPanel
              topPanel={
                <CodeEditorPanel
                  code={code}
                  onChange={(value: string) => {
                    setCode(value);
                    setIsEditorDirty(true);
                  }}
                  resolvedMode={resolvedMode}
                />
              }
              bottomPanel={
                <JobOutputPanel
                  editorStatus={editorStatus}
                  uploadStatus={{ kind: "idle" }}
                />
              }
            />

            {/* Controls */}
            <EditorControls
              gpuType={gpuType}
              setGpuType={setGpuType}
              gpuTypes={data.gpu_types}
              mode={mode}
              setMode={setMode}
              modes={modes}
              canSubmit={canEditorSubmit}
              isSubmitting={editorStatus.kind === "submitting"}
              onSubmit={handleEditorSubmitClick}
              onHistoryClick={() => setHistoryOpen(true)}
              onUploadClick={() => fileInputRef.current?.click()}
            />

            {/* Status Messages */}
            {editorStatus.kind === "error" && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {editorStatus.msg}
              </Alert>
            )}

            {editorStatus.kind === "done" && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Submission completed!
              </Alert>
            )}
          </CardContent>
        </Card>
        </Box>
        </Box>

        {/* History Dialog */}
        <Dialog
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Submission History
            <IconButton onClick={() => setHistoryOpen(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <SubmissionHistorySection
              leaderboardId={id!}
              leaderboardName={data.name}
              userId={userId!}
              refreshFlag={refreshFlag}
            />
          </DialogContent>
        </Dialog>

        {/* Confirm Submit Dialog */}
        <Dialog
          open={confirmSubmitOpen}
          onClose={() => setConfirmSubmitOpen(false)}
        >
          <DialogTitle>Submit New Code?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              A job is currently running. Are you sure you want to submit new code?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmSubmitOpen(false)}>Cancel</Button>
            <Button onClick={doEditorSubmit} variant="contained" autoFocus>
              Submit Anyway
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    </Box>
  );
}
