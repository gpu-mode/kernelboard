import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CodeBlock from "../../../components/codeblock/CodeBlock";
import { formatMicroseconds } from "../../../lib/utils/ranking";

export interface NavigationItem {
  submissionId: number;
  userName: string;
  fileName: string;
  timestamp: number;
  score: number;
  originalTimestamp?: number;
}

export interface SelectedSubmission {
  submissionId: number;
  userName: string;
  fileName: string;
  isFastest?: boolean;
  timestamp?: number;
  score?: number;
  originalTimestamp?: number;
}

interface SubmissionCodeModalProps {
  selectedSubmission: SelectedSubmission | null;
  navigationItems: NavigationItem[];
  navigationIndex: number;
  codes: Map<number, string>;
  onClose: () => void;
  onNavigate: (newIndex: number, item: NavigationItem) => void;
}

export default function SubmissionCodeModal({
  selectedSubmission,
  navigationItems,
  navigationIndex,
  codes,
  onClose,
  onNavigate,
}: SubmissionCodeModalProps) {
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
    <Dialog open={!!selectedSubmission} onClose={onClose} maxWidth="lg" fullWidth>
      {selectedSubmission && (
        <>
          <DialogTitle
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              {selectedSubmission.isFastest
                ? `⚡ Fastest Submission by ${selectedSubmission.userName}`
                : `Submission by ${selectedSubmission.userName}`}
            </Box>
            {navigationItems.length > 1 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
          </DialogTitle>
          <DialogContent dividers>
            {/* Submission metadata */}
            {selectedSubmission.timestamp && (
              <Box sx={{ mb: 2, display: "flex", gap: 3, flexWrap: "wrap" }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Chart Date:</strong>{" "}
                  {new Date(selectedSubmission.timestamp).toLocaleDateString(
                    undefined,
                    { timeZone: "UTC" }
                  )}
                </Typography>
                {selectedSubmission.originalTimestamp && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Original Submission:</strong>{" "}
                    {new Date(
                      selectedSubmission.originalTimestamp
                    ).toLocaleString(undefined, { timeZone: "UTC" })}{" "}
                    UTC
                  </Typography>
                )}
                {selectedSubmission.score !== undefined && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Speed:</strong>{" "}
                    {formatMicroseconds(selectedSubmission.score)}
                  </Typography>
                )}
              </Box>
            )}
            {codes.get(selectedSubmission.submissionId) ? (
              <Box>
                <CodeBlock
                  code={codes.get(selectedSubmission.submissionId)!}
                />
              </Box>
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
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}
