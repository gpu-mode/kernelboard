import React, { useEffect, useMemo, useRef, useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import DialogContentText from "@mui/material/DialogContentText";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { submitFile } from "../../../api/api";
import LoadingCircleProgress from "../../../components/common/LoadingCircleProgress";
import AlertBar from "../../../components/alert/AlertBar";

const styles = {
  triggerBtn: { borderRadius: 2, textTransform: "none" },
  title: { fontWeight: 700 },
  hint: { mt: 0.5, mb: 2 },
  stack: { mt: 1 },
  fileBtn: { textTransform: "none", mb: 1 },
  fileText: { "& .MuiInputBase-input": { cursor: "default" } },
  actions: { px: 3, pb: 2 },
  submitBtn: {
    borderRadius: 3,
    px: 3,
    py: 1,
    fontWeight: "bold",
    textTransform: "none",
    background: "linear-gradient(90deg, #a5b4fc 0%, #93c5fd 100%)",
    boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
    transition: "all 0.2s ease-in-out",
  },
} as const;

/**
 * Subcomponent: LeaderboardSubmit
 * Parent provides only: leaderboardId, leaderboardName, gpuTypes, modes
 */
export default function LeaderboardSubmit({
  leaderboardId,
  leaderboardName,
  gpuTypes,
  modes,
  disabled = false,
  onSubmit,
}: {
  leaderboardId: string;
  leaderboardName: string;
  gpuTypes: string[];
  modes: string[];
  disabled?: boolean;
  onSubmit?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [gpuType, setGpuType] = useState<string>(gpuTypes?.[0] ?? "");
  const [mode, setMode] = useState<string>(modes?.[0] ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "uploading" }
    | { kind: "error"; msg: string }
    | { kind: "ok"; msg: string }
  >({ kind: "idle" });

  const [sucessAlert, setSuccessAlert] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canSubmit = useMemo(
    () => !!file && !!gpuType && !!mode,
    [file, gpuType, mode],
  );

  function resetForm() {
    setFile(null);
    setStatus({ kind: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function validatePythonFile(f: File): string | null {
    // set a max file size too
    const MAX_MB = 1;
    const name = f.name.toLowerCase();
    if (!name.endsWith(".py")) return "Please select a .py file.";
    if (f.size > MAX_MB * 1024 * 1024) return `File too large (> ${MAX_MB} MB)`;
    return null;
  }

  function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    const err = validatePythonFile(f);
    if (err) {
      setStatus({ kind: "error", msg: err });
      setFile(null);
      return;
    }
    setStatus({ kind: "idle" });
    setFile(f);
  }

  async function handleSubmit() {
    if (!canSubmit || !file) return;
    setStatus({ kind: "uploading" });
    try {
      const form = new FormData();
      form.set("leaderboard_id", String(leaderboardId));
      form.set("leaderboard", leaderboardName);
      form.set("gpu_type", gpuType);
      form.set("submission_mode", mode); // <-- match backend field name
      form.set("file", file, file.name); // <-- required

      const result = await submitFile(form);

      setStatus({
        kind: "ok",
        msg: result?.message ?? "Submitted successfully.",
      });
      onSubmit?.();

      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 100);
    } catch (e: any) {
      setStatus({ kind: "error", msg: e?.message || "Submission failed" });
    }
  }

  useEffect(() => {
    if (status.kind === "ok") {
      setSuccessAlert(true);
    }
  }, [status]);

  const renderSubmitButton = () => (
    <Button
      variant="contained"
      size="small"
      startIcon={<UploadFileIcon />}
      onClick={(e) => {
        (e.currentTarget as HTMLButtonElement).blur();
        setOpen(true);
      }}
      data-testid="leaderboard-submit-btn"
      sx={styles.submitBtn}
      disabled={disabled}
    >
      Submit
    </Button>
  );
  return (
    <>
      <AlertBar
        data-testid="leaderboard-success-notice"
        notice={{
          open: sucessAlert,
          message:
            "your submission is accepted, please refresh the submission history to see the latest result",
          title: "Submission is accepted",
          severity: "success",
        }}
        onClose={() => {
          setSuccessAlert(false);
        }}
      />
      {renderSubmitButton()}
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          resetForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={styles.title}>Submit to Leaderboard</DialogTitle>
        <DialogContent>
          <DialogContentText sx={styles.hint}>
            Choose a .py file and set GPU type & mode.
          </DialogContentText>
          <Stack spacing={2} sx={styles.stack}>
            <FormControl fullWidth size="small">
              <InputLabel id="gpu-type-label">GPU Type</InputLabel>
              <Select
                labelId="gpu-type-label"
                value={gpuType}
                label="GPU Type"
                onChange={(e) => setGpuType(e.target.value)}
              >
                {gpuTypes.map((g) => (
                  <MenuItem key={g} value={g}>
                    {g}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel id="mode-label">Mode</InputLabel>
              <Select
                labelId="mode-label"
                value={mode}
                label="Mode"
                onChange={(e) => setMode(e.target.value)}
              >
                {modes.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                sx={styles.fileBtn}
                autoFocus
              >
                {file ? file.name : "Choose .py file"}
                <input
                  data-testid="submission-dialog-file-input"
                  ref={fileInputRef}
                  type="file"
                  accept=".py"
                  hidden
                  onChange={handlePickFile}
                />
              </Button>
              <div data-testid="submission-dialog-file-name">
                {file?.name ?? ""}
              </div>
            </Box>
            {status.kind === "error" && (
              <Alert
                severity="error"
                variant="outlined"
                data-testid="submission-dialog-error-alert"
              >
                {status.msg}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={styles.actions}>
          <Button
            onClick={() => {
              setOpen(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || status.kind === "uploading"}
          >
            {status.kind === "uploading" ? (
              <LoadingCircleProgress
                message="submitting"
                data-testid="loading-circle"
              />
            ) : (
              "Submit"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
