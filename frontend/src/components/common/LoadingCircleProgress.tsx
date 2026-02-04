import { CircularProgress } from "@mui/material";
import { getRandomGpuJoke } from "./gpuJokes";
import { useMemo } from "react";

export default function LoadingCircleProgress({
  message,
}: {
  message?: string;
}) {
  const displayMessage = useMemo(
    () => message ?? getRandomGpuJoke(),
    [message]
  );

  return (
    <>
      <CircularProgress size={18} sx={{ mr: 1 }} />
      {displayMessage}
    </>
  );
}
