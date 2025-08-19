import { Alert, AlertTitle, Stack, type AlertColor } from "@mui/material";

export default function BasicAlert({
  severity = "info",
  title,
  message,
  onClose,
}: {
  severity?: AlertColor; // "success" | "info" | "warning" | "error"
  title?: string;
  message: string;
  onClose?: () => void;
}) {
  return (
    <Stack sx={{ width: "100%" }}>
      <Alert severity={severity} onClose={onClose}>
        {title && <AlertTitle>{title}</AlertTitle>}
        {message}
      </Alert>
    </Stack>
  );
}
