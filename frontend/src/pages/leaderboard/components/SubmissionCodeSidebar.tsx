import { Link } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  Typography,
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
}: SubmissionCodeSidebarProps) {
  const handlePrevious = () => {
    const newIndex =
      (navigationIndex - 1 + navigationItems.length) % navigationItems.length;
    onNavigate(newIndex, navigationItems[newIndex]);
  };

  const handleNext = () => {
    const newIndex = (navigationIndex + 1) % navigationItems.length;
    onNavigate(newIndex, navigationItems[newIndex]);
  };

  return (
    <Drawer
      anchor="right"
      open={!!selectedSubmission}
      onClose={onClose}
      variant="persistent"
      sx={{
        width: selectedSubmission ? width : 0,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: width,
          boxSizing: "border-box",
          position: "fixed",
          right: 0,
          top: 0,
          height: "100vh",
          borderLeft: 1,
          borderColor: "divider",
        },
      }}
    >
      {selectedSubmission && (
        <Box
          sx={{
            height: "100%",
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
              p: 2,
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
                <Button component={Link} to="/login" variant="contained">
                  Log in
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Drawer>
  );
}
