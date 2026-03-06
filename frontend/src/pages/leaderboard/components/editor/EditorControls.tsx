import {
  Box,
  Stack,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
  CircularProgress,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import HistoryIcon from "@mui/icons-material/History";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { editorStyles } from "./types";

interface EditorControlsProps {
  gpuType: string;
  setGpuType: (value: string) => void;
  gpuTypes: string[];
  mode: string;
  setMode: (value: string) => void;
  modes: string[];
  canSubmit: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  onHistoryClick: () => void;
  onUploadClick: () => void;
}

export function EditorControls({
  gpuType,
  setGpuType,
  gpuTypes,
  mode,
  setMode,
  modes,
  canSubmit,
  isSubmitting,
  onSubmit,
  onHistoryClick,
  onUploadClick,
}: EditorControlsProps) {
  return (
    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
      <FormControl size="small" sx={{ width: 180 }}>
        <InputLabel id="editor-gpu-type-label">GPU Type</InputLabel>
        <Select
          labelId="editor-gpu-type-label"
          value={gpuType}
          label="GPU Type"
          onChange={(e) => setGpuType(e.target.value)}
          MenuProps={{ disableScrollLock: true }}
        >
          {gpuTypes.map((g) => (
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
          isSubmitting ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            <PlayArrowIcon />
          )
        }
        onClick={onSubmit}
        disabled={!canSubmit || isSubmitting}
        sx={editorStyles.submitBtn}
      >
        {isSubmitting ? "Submitting..." : "Submit"}
      </Button>

      <Box sx={{ flex: 1 }} />

      <Tooltip title="Upload .py file">
        <IconButton onClick={onUploadClick} size="small">
          <UploadFileIcon />
        </IconButton>
      </Tooltip>

      <Button
        variant="outlined"
        startIcon={<HistoryIcon />}
        onClick={onHistoryClick}
        sx={editorStyles.historyBtn}
      >
        History
      </Button>
    </Stack>
  );
}
