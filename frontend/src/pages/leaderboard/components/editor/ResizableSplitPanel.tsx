import { Box } from "@mui/material";
import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

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
    (clientY: number) => {
      startY.current = clientY;
      startRatio.current = ratio;
      setIsResizing(true);
    },
    [ratio],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      handleResizeStart(e.clientY);
    },
    [handleResizeStart],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        handleResizeStart(e.touches[0].clientY);
      }
    },
    [handleResizeStart],
  );

  useEffect(() => {
    let rafId: number | null = null;

    const handleMove = (clientY: number) => {
      if (!isResizing || !panelRef.current) return;

      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        if (!panelRef.current) return;
        const panelRect = panelRef.current.getBoundingClientRect();
        const deltaY = clientY - startY.current;
        const deltaRatio = deltaY / panelRect.height;
        const newRatio = startRatio.current + deltaRatio;
        setRatio(Math.max(minRatio, Math.min(maxRatio, newRatio)));
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleMove(e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      if (rafId) cancelAnimationFrame(rafId);
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    if (isResizing) {
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: true,
      });
      document.addEventListener("touchend", handleEnd);
      document.addEventListener("touchcancel", handleEnd);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
      document.removeEventListener("touchcancel", handleEnd);
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
      <Box sx={{ flex: ratio, minHeight: 100, overflow: "hidden" }}>
        {topPanel}
      </Box>

      {/* Middle content (Controls) + Resize handle */}
      <Box sx={{ flexShrink: 0, py: 1 }}>
        {middleContent}
        <Box
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          sx={{
            height: 24,
            cursor: "row-resize",
            bgcolor: isResizing ? "primary.main" : "transparent",
            "&:hover": { bgcolor: "action.hover" },
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mt: 1,
            touchAction: "none",
          }}
        >
          <Box
            sx={{ width: 60, height: 4, bgcolor: "divider", borderRadius: 1 }}
          />
        </Box>
      </Box>

      {/* Bottom panel (Output) */}
      <Box
        sx={{
          flex: 1 - ratio,
          minHeight: 80,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {bottomPanel}
      </Box>
    </Box>
  );
}
