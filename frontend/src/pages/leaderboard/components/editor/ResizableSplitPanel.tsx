import { Box } from "@mui/material";
import { useRef, useState, useCallback, useEffect, type ReactNode } from "react";

interface ResizableSplitPanelProps {
  topPanel: ReactNode;
  bottomPanel: ReactNode;
  middleContent?: ReactNode;
  initialRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  height?: string;
  minHeight?: number;
}

export function ResizableSplitPanel({
  topPanel,
  bottomPanel,
  middleContent,
  initialRatio = 0.6,
  minRatio = 0.2,
  maxRatio = 0.8,
  height = "calc(100vh - 280px)",
  minHeight = 400,
}: ResizableSplitPanelProps) {
  const [ratio, setRatio] = useState(initialRatio);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const startY = useRef<number>(0);
  const startRatio = useRef<number>(0);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      startY.current = e.clientY;
      startRatio.current = ratio;
      setIsResizing(true);
    },
    [ratio]
  );

  useEffect(() => {
    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return;

      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        if (!panelRef.current) return;
        const panelRect = panelRef.current.getBoundingClientRect();
        const deltaY = e.clientY - startY.current;
        const deltaRatio = deltaY / panelRect.height;
        const newRatio = startRatio.current + deltaRatio;
        setRatio(Math.max(minRatio, Math.min(maxRatio, newRatio)));
      });
    };

    const handleMouseUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    if (isResizing) {
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, minRatio, maxRatio]);

  return (
    <Box
      ref={panelRef}
      sx={{
        display: "flex",
        flexDirection: "column",
        height,
        minHeight,
      }}
    >
      {/* Top panel (Editor) */}
      <Box sx={{ flex: ratio, minHeight: 100, overflow: "hidden" }}>{topPanel}</Box>

      {/* Middle content (Controls) + Resize handle */}
      <Box sx={{ flexShrink: 0, py: 1 }}>
        {middleContent}
        <Box
          onMouseDown={handleResizeStart}
          sx={{
            height: 10,
            cursor: "row-resize",
            bgcolor: isResizing ? "primary.main" : "transparent",
            "&:hover": { bgcolor: "action.hover" },
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mt: 1,
          }}
        >
          <Box sx={{ width: 60, height: 4, bgcolor: "divider", borderRadius: 1 }} />
        </Box>
      </Box>

      {/* Bottom panel (Output) */}
      <Box sx={{ flex: 1 - ratio, minHeight: 80, display: "flex", flexDirection: "column" }}>
        {bottomPanel}
      </Box>
    </Box>
  );
}
