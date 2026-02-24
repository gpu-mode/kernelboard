import { useCallback, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import CodeBlock from "../../../components/codeblock/CodeBlock";
import { formatMicroseconds } from "../../../lib/utils/ranking";
import type { NavigationItem, SelectedSubmission } from "./submissionTypes";

interface SubmissionCodeSidebarProps {
  selectedSubmission: SelectedSubmission | null;
  navigationItems: NavigationItem[];
  navigationIndex: number;
  codes: Map<number, string>;
  isLoadingCodes?: boolean;
  onClose: () => void;
  onNavigate: (newIndex: number, item: NavigationItem) => void;
  width?: number;
  onWidthChange?: (newWidth: number) => void;
}

export default function SubmissionCodeSidebar({
  selectedSubmission,
  navigationItems,
  navigationIndex,
  codes,
  isLoadingCodes = false,
  onClose,
  onNavigate,
  width = 600,
  onWidthChange,
}: SubmissionCodeSidebarProps) {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isDragging = useRef(false);

  const handlePrevious = () => {
    const newIndex =
      (navigationIndex - 1 + navigationItems.length) % navigationItems.length;
    onNavigate(newIndex, navigationItems[newIndex]);
  };

  const handleNext = () => {
    const newIndex = (navigationIndex + 1) % navigationItems.length;
    onNavigate(newIndex, navigationItems[newIndex]);
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!onWidthChange) return;
      e.preventDefault();
      isDragging.current = true;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [onWidthChange]
  );

  useEffect(() => {
    if (!onWidthChange) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      onWidthChange(window.innerWidth - e.clientX);
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onWidthChange]);

  const drawerWidth = isMobile ? "100vw" : width;

  return (
    <Drawer
      anchor="right"
      open={!!selectedSubmission}
      onClose={onClose}
      variant={isMobile ? "temporary" : "persistent"}
      sx={{
        width: selectedSubmission ? drawerWidth : 0,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          position: "fixed",
          right: 0,
          top: 0,
          height: "100vh",
          borderLeft: isMobile ? 0 : 1,
          borderColor: "divider",
        },
      }}
    >
      {selectedSubmission && (
        <Box
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "row",
          }}
        >
          {/* Drag Handle */}
          {!isMobile && (
            <Box
              onMouseDown={handleMouseDown}
              sx={{
                width: 4,
                flexShrink: 0,
                cursor: "col-resize",
                "&:hover": {
                  backgroundColor: "primary.main",
                },
                transition: "background-color 0.15s",
              }}
            />
          )}

          {/* Main content */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <Box
              sx={{
                p: 2,
                borderBottom: 1,
                borderColor: "divider",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton onClick={onClose} size="small" edge="start">
                  <CloseIcon />
                </IconButton>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {selectedSubmission.isFastest ? "⚡ " : ""}
                  {selectedSubmission.userName}
                </Typography>
              </Box>
              {navigationItems.length > 1 && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <IconButton
                    onClick={handlePrevious}
                    size="small"
                    title="Previous submission"
                  >
                    <ChevronLeftIcon />
                  </IconButton>
                  <Typography variant="body2" color="text.secondary">
                    {navigationIndex + 1} / {navigationItems.length}
                  </Typography>
                  <IconButton
                    onClick={handleNext}
                    size="small"
                    title="Next submission"
                  >
                    <ChevronRightIcon />
                  </IconButton>
                </Box>
              )}
            </Box>

            {/* Metadata */}
            {(selectedSubmission.timestamp ||
              selectedSubmission.originalTimestamp ||
              selectedSubmission.score !== undefined) && (
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: "divider",
                  backgroundColor: "action.hover",
                  flexShrink: 0,
                }}
              >
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                  {selectedSubmission.timestamp &&
                    selectedSubmission.originalTimestamp &&
                    selectedSubmission.timestamp !==
                      selectedSubmission.originalTimestamp && (
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          Chart Date
                        </Typography>
                        <Typography variant="body2">
                          {new Date(
                            selectedSubmission.timestamp
                          ).toLocaleDateString(undefined, { timeZone: "UTC" })}
                        </Typography>
                      </Box>
                    )}
                  {selectedSubmission.originalTimestamp && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        Submission Date
                      </Typography>
                      <Typography variant="body2">
                        {new Date(
                          selectedSubmission.originalTimestamp
                        ).toLocaleString(undefined, { timeZone: "UTC" })}{" "}
                        UTC
                      </Typography>
                    </Box>
                  )}
                  {selectedSubmission.score !== undefined && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        Speed
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                        {formatMicroseconds(selectedSubmission.score)}
                      </Typography>
                    </Box>
                  )}
                </Box>
                {selectedSubmission.fileName && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: "block" }}
                  >
                    {selectedSubmission.fileName}
                  </Typography>
                )}
              </Box>
            )}

            {/* Code Content */}
            <Box
              sx={{
                flex: 1,
                overflow: "auto",
                p: 0,
              }}
            >
              {isLoadingCodes ? (
                <Box
                  display="flex"
                  flexDirection="column"
                  justifyContent="center"
                  alignItems="center"
                  minHeight={200}
                  gap={2}
                >
                  <CircularProgress />
                  <Typography variant="body2" color="text.secondary">
                    Loading code...
                  </Typography>
                </Box>
              ) : codes.get(selectedSubmission.submissionId) ? (
                <CodeBlock
                  code={codes.get(selectedSubmission.submissionId)!}
                />
              ) : (
                  <Box
                    display="flex"
                    flexDirection="column"
                    justifyContent="center"
                    alignItems="center"
                    minHeight={200}
                    gap={2}
                  >
                    <Typography variant="body1" color="text.secondary">
                      Please log in to view submission code
                    </Typography>
                    <Button
                      component={Link}
                      to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
                      variant="contained"
                    >
                      Log in
                    </Button>
                  </Box>
                )}
            </Box>
          </Box>
        </Box>
      )}
    </Drawer>
  );
}
