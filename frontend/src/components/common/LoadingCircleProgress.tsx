import { CircularProgress } from "@mui/material";

export default function LoadingCircleProgress({
  message = "loading...",
}: {
  message: string;
}) {
  return (
    <>
      <CircularProgress size={18} sx={{ mr: 1 }} />
      {message}
    </>
  );
}
