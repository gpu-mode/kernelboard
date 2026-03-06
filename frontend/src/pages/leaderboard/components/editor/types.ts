import { type SubmissionStatusResponse } from "../../../../api/api";

export type SubmitStatus =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "polling"; submissionId: number; result?: SubmissionStatusResponse }
  | { kind: "done"; submissionId: number; result: SubmissionStatusResponse }
  | { kind: "error"; msg: string }
  | { kind: "warning"; msg: string };

export const editorStyles = {
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
