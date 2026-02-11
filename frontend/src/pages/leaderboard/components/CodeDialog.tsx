import { Typography } from "@mui/material";

export function CodeDialog({
  fileName = "file",
}: {
  fileName?: string;
  rank?: number;
  userName?: string;
  problemName?: string;
}) {
  return (
    <Typography variant="body2" sx={{ fontSize: "0.8125rem" }}>
      {fileName}
    </Typography>
  );
}
