import { Snackbar, type AlertColor } from "@mui/material";
import BasicAlert from "./BasicAlert";

export type AlertBarNotice = {
  open: boolean;
  message: string;
  title?: string;
  severity?: AlertColor;
  status?: number | null; // optional: map to severity if severity not provided
};

const statusToSeverity = (status?: number | null): AlertColor => {
  if (status == null) return "info";
  if (status >= 200 && status < 300) return "success";
  if (status >= 400 && status < 500) return "warning";
  if (status >= 500) return "error";
  return "info";
};

export default function AlertBar({
  notice,
  onClose,
  autoHideDuration = 4000,
  anchorOrigin = { vertical: "top", horizontal: "center" },
}: {
  notice: AlertBarNotice;
  onClose: () => void;
  autoHideDuration?: number | null;
  anchorOrigin?: {
    vertical: "top" | "bottom";
    horizontal: "left" | "center" | "right";
  };
}) {
  const { open, message, title, severity, status } = notice;
  const sev = severity ?? statusToSeverity(status);

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration ?? undefined}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
    >
      {/* BasicAlert handles the actual alert UI */}
      <div style={{ width: "100%" }}>
        <BasicAlert
          severity={sev}
          title={title}
          message={message}
          onClose={onClose}
        />
      </div>
    </Snackbar>
  );
}
