import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  ToggleButton,
  ToggleButtonGroup,
  Drawer,
  Divider,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import HistoryIcon from "@mui/icons-material/History";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CodeIcon from "@mui/icons-material/Code";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TerminalIcon from "@mui/icons-material/Terminal";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchLeaderBoard,
  submitCode,
  submitFile,
  fetchSubmissionStatus,
  type SubmissionStatusResponse,
} from "../../api/api";
import { fetcherApiCallback } from "../../lib/hooks/useApi";
import { ConstrainedContainer } from "../../components/app-layout/ConstrainedContainer";
import Loading from "../../components/common/loading";
import { ErrorAlert } from "../../components/alert/ErrorAlert";
import MarkdownRenderer from "../../components/markdown-renderer/MarkdownRenderer";
import { SubmissionMode } from "../../lib/types/mode";
import { useAuthStore } from "../../lib/store/authStore";
import SubmissionHistorySection from "./components/submission-history/SubmissionHistorySection";
import { SubmissionRunsTable } from "./components/submission-history/SubmissionRunsTable";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { useThemeStore } from "../../lib/store/themeStore";

const DEFAULT_CODE = "# Write your Python code here\n";

const styles = {
  root: {
    py: 3,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    mb: 2,
  },
  editorCard: {
    mb: 2,
  },
  editorWrapper: {
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 1,
    overflow: "hidden",
  },
  controlsRow: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    flexWrap: "wrap",
  },
  submitBtn: {
    borderRadius: 2,
    px: 3,
    py: 1,
    fontWeight: "bold",
    textTransform: "none",
    background: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
    "&:hover": {
      background: "linear-gradient(90deg, #059669 0%, #047857 100%)",
    },
  },
  historyBtn: {
    borderRadius: 2,
    textTransform: "none",
  },
  statusCard: {
    mt: 2,
  },
  statusHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    mb: 1,
  },
  uploadArea: {
    border: "2px dashed",
    borderColor: "divider",
    borderRadius: 2,
    p: 4,
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    "&:hover": {
      borderColor: "primary.main",
      bgcolor: "action.hover",
    },
  },
  uploadAreaDragging: {
    borderColor: "primary.main",
    bgcolor: "action.hover",
    transform: "scale(1.01)",
  },
} as const;

type SubmitStatus =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "polling"; submissionId: number; result?: SubmissionStatusResponse }
  | { kind: "done"; submissionId: number; result: SubmissionStatusResponse }
  | { kind: "error"; msg: string };

type SubmitMode = "editor" | "upload";

export default function LeaderboardEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const resolvedMode = useThemeStore((s) => s.resolvedMode);

  const { data, loading, error, errorStatus, call } =
    fetcherApiCallback(fetchLeaderBoard);
  const me = useAuthStore((s) => s.me);
  const isAuthed = !!(me && me.authenticated);
  const userId = me?.user?.identity ?? null;

  // Editor state
  const [code, setCode] = useState(DEFAULT_CODE);
  const [editorStatus, setEditorStatus] = useState<SubmitStatus>({ kind: "idle" });
  const editorPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const editorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Submit mode switch
  const [submitMode, setSubmitMode] = useState<SubmitMode>("editor");

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<SubmitStatus>({ kind: "idle" });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uploadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Polling timeout (20 minutes)
  const POLLING_TIMEOUT_MS = 20 * 60 * 1000;

  // Common state
  const [gpuType, setGpuType] = useState<string>("");
  const [mode, setMode] = useState<string>(SubmissionMode.LEADERBOARD);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(false);

  // Job result drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState(300);

  const modes = useMemo(
    () => [SubmissionMode.LEADERBOARD, SubmissionMode.BENCHMARK, SubmissionMode.TEST],
    []
  );

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

      poll();
      editorPollingRef.current = setInterval(poll, 5000);
    },
    [stopEditorPolling, id]
  );

  // Upload polling
  const stopUploadPolling = useCallback(() => {
    if (uploadPollingRef.current) {
      clearInterval(uploadPollingRef.current);
      uploadPollingRef.current = null;
    }
  }, []);

  const startUploadPolling = useCallback(
    (submissionId: number) => {
      if (!id) return;
      stopUploadPolling();

      const poll = async () => {
        try {
          const status = await fetchSubmissionStatus(id, submissionId);
          if (!status) return;
          if (status.submission_done) {
            stopUploadPolling();
            setUploadStatus({ kind: "done", submissionId, result: status });
          } else {
            // Show intermediate status with runs while polling
            setUploadStatus({ kind: "polling", submissionId, result: status });
          }
        } catch (err) {
          console.error("Upload polling error:", err);
        }
      };

      poll();
      uploadPollingRef.current = setInterval(poll, 5000);
    },
    [stopUploadPolling, id]
  );

  useEffect(() => {
    return () => {
      stopEditorPolling();
      stopUploadPolling();
    };
  }, [stopEditorPolling, stopUploadPolling]);

  // Editor submit
  const handleEditorSubmit = async () => {
    if (!data || !id) return;

    if (!code.trim()) {
      setEditorStatus({ kind: "error", msg: "Please write some code before submitting." });
      return;
    }

    setEditorStatus({ kind: "submitting" });
    setDrawerOpen(true);

    try {
      const result = await submitCode(id, data.name, gpuType, mode, code);
      if (result?.submission_id) {
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

  // Upload submit
  const handleUploadSubmit = async () => {
    if (!data || !id || !file) return;

    setUploadStatus({ kind: "submitting" });
    setUploadError(null);
    setDrawerOpen(true);

    try {
      const form = new FormData();
      form.set("leaderboard_id", id);
      form.set("leaderboard", data.name);
      form.set("gpu_type", gpuType);
      form.set("submission_mode", mode);
      form.set("file", file, file.name);
      const res = await submitFile(form);
      const submissionId = (res.data as Record<string, unknown>)?.submission_id as number ||
                           (res as Record<string, unknown>)?.submission_id as number || 0;

      if (submissionId) {
        startUploadPolling(submissionId);
      } else {
        setUploadStatus({ kind: "error", msg: "Submission accepted but no ID returned." });
      }
    } catch (err) {
      setUploadStatus({
        kind: "error",
        msg: err instanceof Error ? err.message : "Submission failed",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    validateAndSetFile(f);
  };

  const validateAndSetFile = (f: File) => {
    // Clear previous errors and status
    setUploadError(null);
    setUploadStatus({ kind: "idle" });

    const name = f.name.toLowerCase();
    if (!name.endsWith(".py")) {
      setUploadError("Please select a .py file.");
      setFile(null);
      return;
    }
    if (f.size > 1 * 1024 * 1024) {
      setUploadError("File too large (> 1 MB)");
      setFile(null);
      return;
    }
    setFile(f);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const canEditorSubmit = useMemo(() => {
    if (!gpuType || !mode) return false;
    return code.trim().length > 0;
  }, [code, gpuType, mode]);

  const canUploadSubmit = useMemo(() => {
    if (!gpuType || !mode) return false;
    return !!file;
  }, [file, gpuType, mode]);

  const renderEditorStatusChip = () => {
    switch (editorStatus.kind) {
      case "submitting":
        return (
          <Chip
            icon={<CircularProgress size={14} />}
            label="Submitting..."
            color="info"
            size="small"
          />
        );
      case "polling":
        return (
          <Chip
            icon={<HourglassEmptyIcon />}
            label="Running..."
            color="warning"
            size="small"
          />
        );
      case "done":
        return (
          <Chip
            icon={<CheckCircleIcon />}
            label="Completed"
            color="success"
            size="small"
          />
        );
      case "error":
        return <Chip label="Error" color="error" size="small" />;
      default:
        return null;
    }
  };

  const renderUploadStatusChip = () => {
    switch (uploadStatus.kind) {
      case "submitting":
        return (
          <Chip
            icon={<CircularProgress size={14} />}
            label="Submitting..."
            color="info"
            size="small"
          />
        );
      case "polling":
        return (
          <Chip
            icon={<HourglassEmptyIcon />}
            label="Running..."
            color="warning"
            size="small"
          />
        );
      case "done":
        return (
          <Chip
            icon={<CheckCircleIcon />}
            label="Completed"
            color="success"
            size="small"
          />
        );
      case "error":
        return <Chip label="Error" color="error" size="small" />;
      default:
        return null;
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorAlert status={errorStatus} message={error} />;
  if (!data) return null;

  if (!isAuthed) {
    return (
      <ConstrainedContainer>
        <Box sx={{ ...styles.root, textAlign: "center", py: 8 }}>
          <Typography variant="h5" gutterBottom>
            Submit Code
          </Typography>
          <Alert severity="warning" sx={{ maxWidth: 400, mx: "auto" }}>
            Please login to submit your code.
          </Alert>
        </Box>
      </ConstrainedContainer>
    );
  }

  return (
    <ConstrainedContainer>
      <Box sx={styles.root}>
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
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => setHistoryOpen(true)}
              sx={styles.historyBtn}
            >
              History
            </Button>
            <Button variant="outlined" onClick={() => navigate(`/leaderboard/${id}`)}>
              Back
            </Button>
          </Stack>
        </Box>

        {/* Description */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <details>
              <summary style={{ cursor: "pointer", fontWeight: "bold", fontSize: "1.1rem" }}>
                Challenge Description
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
                        <code>
                          {JSON.stringify(
                            Object.fromEntries(Object.entries(b).filter(([k]) => k !== "seed"))
                          )}
                        </code>
                      </li>
                    ))}
                </ul>
                </details>
              )}
            </details>
          </CardContent>
        </Card>

        {/* Submission Section with Toggle */}
        <Card sx={styles.editorCard}>
          <CardContent>
            {/* Toggle between Editor and Upload */}
            <Stack direction="row" justifyContent="flex-start" alignItems="center" mb={2}>
              <ToggleButtonGroup
                value={submitMode}
                exclusive
                onChange={(_, v) => v && setSubmitMode(v)}
                size="small"
              >
                <ToggleButton value="editor">
                  <CodeIcon sx={{ mr: 0.5 }} />
                  Code Editor
                </ToggleButton>
                <ToggleButton value="upload">
                  <UploadFileIcon sx={{ mr: 0.5 }} />
                  Upload File
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            {/* Editor Mode */}
            {submitMode === "editor" && (
              <>
                <Box sx={styles.editorWrapper}>
                  <CodeMirror
                    value={code}
                    height="400px"
                    theme={resolvedMode === "dark" ? oneDark : undefined}
                    extensions={[python()]}
                    onChange={(value: string) => setCode(value)}
                    basicSetup={{
                      lineNumbers: true,
                      highlightActiveLineGutter: true,
                      highlightActiveLine: true,
                      bracketMatching: true,
                      closeBrackets: true,
                      autocompletion: true,
                      indentOnInput: true,
                    }}
                  />
                </Box>

                {/* Editor Controls */}
                <Stack direction="row" spacing={2} sx={{ mt: 2 }} alignItems="center">
                  <FormControl size="small" sx={{ width: 180 }}>
                    <InputLabel id="editor-gpu-type-label">GPU Type</InputLabel>
                    <Select
                      labelId="editor-gpu-type-label"
                      value={gpuType}
                      label="GPU Type"
                      onChange={(e) => setGpuType(e.target.value)}
                      MenuProps={{ disableScrollLock: true }}
                    >
                      {data.gpu_types.map((g) => (
                        <MenuItem key={g} value={g}>
                          {g}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ width: 180 }}>
                    <InputLabel id="editor-mode-label">Mode</InputLabel>
                    <Select
                      labelId="editor-mode-label"
                      value={mode}
                      label="Mode"
                      onChange={(e) => setMode(e.target.value)}
                      MenuProps={{ disableScrollLock: true }}
                    >
                      {modes.map((m) => (
                        <MenuItem key={m} value={m}>
                          {m}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    startIcon={
                      editorStatus.kind === "submitting" ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <PlayArrowIcon />
                      )
                    }
                    onClick={handleEditorSubmit}
                      disabled={!canEditorSubmit || editorStatus.kind === "submitting" || editorStatus.kind === "polling"}
                    sx={styles.submitBtn}
                  >
                    {editorStatus.kind === "submitting" ? "Submitting..." : "Run"}
                  </Button>

                  {renderEditorStatusChip()}

                  {editorStatus.kind === "polling" && (
                    <Tooltip title="Refresh status">
                      <IconButton size="small" onClick={() => startEditorPolling(editorStatus.submissionId)}>
                        <RefreshIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>

                {/* Editor Status Messages */}
                {editorStatus.kind === "error" && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {editorStatus.msg}
                  </Alert>
                )}

                {editorStatus.kind === "done" && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Submission completed! Check the history for results.
                  </Alert>
                )}
              </>
            )}

            {/* Upload Mode */}
            {submitMode === "upload" && (
              <>
                {file ? (
                  <Box
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      p: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <UploadFileIcon sx={{ color: "primary.main" }} />
                      <Box>
                        <Typography variant="body1">{file.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(file.size / 1024).toFixed(1)} KB
                        </Typography>
                      </Box>
                    </Stack>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setFile(null);
                        setUploadError(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      sx={{ color: "text.secondary" }}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      ...styles.uploadArea,
                      ...(isDragging ? styles.uploadAreaDragging : {}),
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".py"
                      hidden
                      onChange={handleFileSelect}
                    />
                    <UploadFileIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
                    <Typography variant="body1" color="text.secondary">
                      Drag & drop or click to select a .py file
                    </Typography>
                  </Box>
                )}

                {/* Upload Error */}
                {uploadError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {uploadError}
                  </Alert>
                )}

                {/* Upload Controls */}
                <Stack direction="row" spacing={2} sx={{ mt: 2 }} alignItems="center">
                  <FormControl size="small" sx={{ width: 180 }}>
                    <InputLabel id="upload-gpu-type-label">GPU Type</InputLabel>
                    <Select
                      labelId="upload-gpu-type-label"
                      value={gpuType}
                      label="GPU Type"
                      onChange={(e) => setGpuType(e.target.value)}
                      MenuProps={{ disableScrollLock: true }}
                    >
                      {data.gpu_types.map((g) => (
                        <MenuItem key={g} value={g}>
                          {g}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ width: 180 }}>
                    <InputLabel id="upload-mode-label">Mode</InputLabel>
                    <Select
                      labelId="upload-mode-label"
                      value={mode}
                      label="Mode"
                      onChange={(e) => setMode(e.target.value)}
                      MenuProps={{ disableScrollLock: true }}
                    >
                      {modes.map((m) => (
                        <MenuItem key={m} value={m}>
                          {m}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    startIcon={
                      uploadStatus.kind === "submitting" ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <PlayArrowIcon />
                      )
                    }
                    onClick={handleUploadSubmit}
                      disabled={!canUploadSubmit || uploadStatus.kind === "submitting" || uploadStatus.kind === "polling"}
                    sx={styles.submitBtn}
                  >
                    {uploadStatus.kind === "submitting" ? "Submitting..." : "Run"}
                  </Button>

                  {renderUploadStatusChip()}

                  {uploadStatus.kind === "polling" && (
                    <Tooltip title="Refresh status">
                      <IconButton size="small" onClick={() => startUploadPolling(uploadStatus.submissionId)}>
                        <RefreshIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>

                {/* Upload Status Messages */}
                {uploadStatus.kind === "error" && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {uploadStatus.msg}
                  </Alert>
                )}

                {uploadStatus.kind === "done" && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Submission completed! Check the history for results.
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>

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

        {/* Job Result Drawer - Fixed Bottom Panel */}
        <Drawer
          anchor="bottom"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          variant="persistent"
          sx={{
            "& .MuiDrawer-paper": {
              height: drawerHeight,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" alignItems="center" spacing={1}>
                <TerminalIcon />
                <Typography variant="h6" fontWeight="bold">
                  Job Output
                </Typography>
                {(editorStatus.kind === "polling" || uploadStatus.kind === "polling") && (
                  <Chip
                    icon={<CircularProgress size={12} />}
                    label="Running..."
                    color="warning"
                    size="small"
                  />
                )}
                {(editorStatus.kind === "done" || uploadStatus.kind === "done") && (
                  <Chip icon={<CheckCircleIcon />} label="Completed" color="success" size="small" />
                )}
              </Stack>
              <Stack direction="row" spacing={1}>
                <IconButton
                  size="small"
                  onClick={() => setDrawerHeight(drawerHeight === 300 ? 500 : 300)}
                >
                  {drawerHeight === 300 ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
                <IconButton size="small" onClick={() => setDrawerOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Stack>
            </Stack>
            <Divider sx={{ my: 1 }} />
            <Box
              sx={{
                height: drawerHeight - 80,
                overflow: "auto",
                bgcolor: "background.paper",
                borderRadius: 1,
                p: 2,
              }}
            >
              {/* Show current job result */}
              {editorStatus.kind === "done" && editorStatus.result && (
                <>
                  <Typography variant="body2" sx={{ color: "success.main", mb: 1 }}>
                    ✓ Submission #{editorStatus.submissionId} - {editorStatus.result.status}
                  </Typography>
                  {editorStatus.result.error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {editorStatus.result.error}
                    </Alert>
                  )}
                  {editorStatus.result.runs && editorStatus.result.runs.length > 0 && (
                    <SubmissionRunsTable runs={editorStatus.result.runs} />
                  )}
                </>
              )}
              {uploadStatus.kind === "done" && uploadStatus.result && (
                <>
                  <Typography variant="body2" sx={{ color: "success.main", mb: 1 }}>
                    ✓ Submission #{uploadStatus.submissionId} - {uploadStatus.result.status}
                  </Typography>
                  {uploadStatus.result.error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {uploadStatus.result.error}
                    </Alert>
                  )}
                  {uploadStatus.result.runs && uploadStatus.result.runs.length > 0 && (
                    <SubmissionRunsTable runs={uploadStatus.result.runs} />
                  )}
                </>
              )}
              {(editorStatus.kind === "submitting" || uploadStatus.kind === "submitting") && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Submitting...
                  </Typography>
                </Stack>
              )}
              {(editorStatus.kind === "polling" || uploadStatus.kind === "polling") && (
                <>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">
                      Running...
                    </Typography>
                  </Stack>
                  {/* Show intermediate runs while polling */}
                  {editorStatus.kind === "polling" && editorStatus.result?.runs && editorStatus.result.runs.length > 0 && (
                    <SubmissionRunsTable runs={editorStatus.result.runs} />
                  )}
                  {uploadStatus.kind === "polling" && uploadStatus.result?.runs && uploadStatus.result.runs.length > 0 && (
                    <SubmissionRunsTable runs={uploadStatus.result.runs} />
                  )}
                </>
              )}
              {editorStatus.kind === "idle" && uploadStatus.kind === "idle" && (
                <Typography variant="body2" color="text.secondary">
                  No job running. Submit code to see output here.
                </Typography>
              )}
              {editorStatus.kind === "error" && (
                <Alert severity="error">{editorStatus.msg}</Alert>
              )}
              {uploadStatus.kind === "error" && (
                <Alert severity="error">{uploadStatus.msg}</Alert>
              )}
            </Box>
          </Box>
        </Drawer>

        {/* Floating button to open drawer */}
        {!drawerOpen && (editorStatus.kind !== "idle" || uploadStatus.kind !== "idle") && (
          <Box
            sx={{
              position: "fixed",
              bottom: 16,
              right: 16,
              zIndex: 1000,
            }}
          >
            <Button
              variant="contained"
              startIcon={<TerminalIcon />}
              onClick={() => setDrawerOpen(true)}
              sx={{
                borderRadius: 2,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              Job Output
              {(editorStatus.kind === "polling" || uploadStatus.kind === "polling") && (
                <CircularProgress size={16} sx={{ ml: 1, color: "inherit" }} />
              )}
            </Button>
          </Box>
        )}
      </Box>
    </ConstrainedContainer>
  );
}
