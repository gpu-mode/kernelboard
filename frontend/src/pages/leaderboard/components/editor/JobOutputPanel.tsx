import { Box, Stack, Typography, Chip, CircularProgress } from "@mui/material";
import TerminalIcon from "@mui/icons-material/Terminal";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { type SubmitStatus } from "./types";

interface JobOutputPanelProps {
  editorStatus: SubmitStatus;
  uploadStatus: SubmitStatus;
}

function isTerminalErrorStatus(status?: string | null) {
  const v = typeof status === "string" ? status.toLowerCase() : "";
  return (
    v.includes("fail") ||
    v.includes("err") ||
    v.includes("hack") ||
    v.includes("timed") ||
    v.includes("timeout")
  );
}

export function JobOutputPanel({ editorStatus, uploadStatus }: JobOutputPanelProps) {
  const completedResult =
    editorStatus.kind === "done"
      ? editorStatus.result
      : uploadStatus.kind === "done"
        ? uploadStatus.result
        : undefined;
  const completedWithError = isTerminalErrorStatus(completedResult?.status);
  const doneLabel = completedWithError
    ? (completedResult?.status ?? "failed")
    : "Done";
  const doneColor = completedWithError ? "error" : "success";

  return (
    <Box sx={{ flex: 1, minHeight: 80, display: "flex", flexDirection: "column" }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, flexShrink: 0 }}>
        <TerminalIcon sx={{ fontSize: 18 }} />
        <Typography variant="subtitle2" fontWeight="bold">
          Job Output
        </Typography>
        {(editorStatus.kind === "polling" || uploadStatus.kind === "polling") && (
          <Chip
            icon={<CircularProgress size={10} />}
            label="Running"
            color="warning"
            size="small"
            sx={{ height: 20, fontSize: "0.7rem" }}
          />
        )}
        {(editorStatus.kind === "done" || uploadStatus.kind === "done") && (
          <Chip
            icon={<CheckCircleIcon />}
            label={doneLabel}
            color={doneColor}
            size="small"
            sx={{ height: 20, fontSize: "0.7rem" }}
          />
        )}
      </Stack>
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          bgcolor: "#1e1e1e",
          borderRadius: 1,
          p: 2,
          fontFamily: "monospace",
          fontSize: "0.8rem",
          color: "#d4d4d4",
        }}
      >
        {/* Log-style output */}
        {editorStatus.kind === "idle" && uploadStatus.kind === "idle" && (
          <div style={{ color: "#808080" }}>$ waiting for submission...</div>
        )}

        {(editorStatus.kind === "submitting" || uploadStatus.kind === "submitting") && (
          <div style={{ color: "#569cd6" }}>Submitting code...</div>
        )}

        {editorStatus.kind === "polling" && (
          <Box>
            <div style={{ color: "#569cd6" }}>
              Submission #{editorStatus.submissionId} started
            </div>
            {editorStatus.result?.runs?.map((run, i) => (
              <Box key={i} sx={{ mt: 1 }}>
                <div>
                  <span style={{ color: "#dcdcaa" }}>[{run.mode.toUpperCase()}]</span>{" "}
                  <span
                    style={{
                      color: run.passed ? "#4ec9b0" : "#f14c4c",
                      fontWeight: "bold",
                    }}
                  >
                    {run.passed ? "✓ PASSED" : "✗ FAILED"}
                  </span>
                  {run.score != null && (
                    <span style={{ color: "#ce9178" }}>
                      {" "}
                      (score: {run.score.toFixed(2)})
                    </span>
                  )}
                </div>
                {run.meta && Object.keys(run.meta).length > 0 && (
                  <Box sx={{ ml: 2 }}>
                    {Object.entries(run.meta).map(([key, value]) => (
                      <div key={key} style={{ color: "#808080", fontSize: "0.75rem" }}>
                        {key}: {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </div>
                    ))}
                  </Box>
                )}
                {run.report && Object.keys(run.report).length > 0 && (
                  <Box sx={{ ml: 2 }}>
                    {Object.entries(run.report).map(([key, value]) => (
                      <div key={key} style={{ color: "#808080", fontSize: "0.75rem" }}>
                        {key}: {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </div>
                    ))}
                  </Box>
                )}
              </Box>
            ))}
            <div style={{ color: "#dcdcaa", marginTop: 8 }}>
              <CircularProgress size={10} sx={{ mr: 1, color: "#dcdcaa" }} />
              Running...
            </div>
          </Box>
        )}

        {editorStatus.kind === "done" && editorStatus.result && (
          <Box>
            <div style={{ color: completedWithError ? "#f14c4c" : "#569cd6" }}>
              Submission #{editorStatus.submissionId} completed
            </div>
            {editorStatus.result.error && (
              <div style={{ color: "#f14c4c" }}>[ERROR] {editorStatus.result.error}</div>
            )}
            {editorStatus.result.runs?.map((run, i) => (
              <Box key={i} sx={{ mt: 1 }}>
                <div>
                  <span style={{ color: "#dcdcaa" }}>[{run.mode.toUpperCase()}]</span>{" "}
                  <span
                    style={{
                      color: run.passed ? "#4ec9b0" : "#f14c4c",
                      fontWeight: "bold",
                    }}
                  >
                    {run.passed ? "✓ PASSED" : "✗ FAILED"}
                  </span>
                  {run.score != null && (
                    <span style={{ color: "#ce9178" }}>
                      {" "}
                      (score: {run.score.toFixed(2)})
                    </span>
                  )}
                </div>
                {run.meta && Object.keys(run.meta).length > 0 && (
                  <Box sx={{ ml: 2 }}>
                    {Object.entries(run.meta).map(([key, value]) => (
                      <div key={key} style={{ color: "#808080", fontSize: "0.75rem" }}>
                        {key}: {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </div>
                    ))}
                  </Box>
                )}
                {run.report && Object.keys(run.report).length > 0 && (
                  <Box sx={{ ml: 2 }}>
                    {Object.entries(run.report).map(([key, value]) => (
                      <div key={key} style={{ color: "#808080", fontSize: "0.75rem" }}>
                        {key}: {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </div>
                    ))}
                  </Box>
                )}
              </Box>
            ))}
            <div
              style={{
                color: completedWithError ? "#f14c4c" : "#4ec9b0",
                marginTop: 8,
              }}
            >
              {completedWithError
                ? `$ ${editorStatus.result.status ?? "failed"}`
                : "$ Done"}
            </div>
          </Box>
        )}

        {editorStatus.kind === "error" && (
          <div style={{ color: "#f14c4c" }}>[ERROR] {editorStatus.msg}</div>
        )}
      </Box>
    </Box>
  );
}
