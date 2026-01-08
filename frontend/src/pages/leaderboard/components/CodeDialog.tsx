import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import CodeBlock from "../../../components/codeblock/CodeBlock";
import { onDeleteSubmission } from "../../../api/api";

export function CodeDialog({
  code,
  submissionId = undefined,
  fileName = "file",
  title = "Submission",
}: {
  code: any;
  title?: string;
  submissionId?: number;
  fileName?: string;
}) {
  const [open, setOpen] = useState(false);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleConfirmDelete = () => {
     onDeleteSubmission(submissionId);
    setConfirmDeleteOpen(false);
  };

  if (!code) return <Box>{fileName}</Box>;

  return (
    <>
      <Button
        variant="text"
        size="small"
        onClick={() => setOpen(true)}
        sx={{ textTransform: "none" }}
      >
        {fileName}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogContent dividers>
          <Box>
            <Typography variant="h6">
              Information
            </Typography>
            <Stack direction="row" spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  File Name
                </Typography>
                <Typography variant="body1" fontWeight={200}>
                  {fileName}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Submission ID
                </Typography>
                <Typography variant="body1" fontWeight={200}>
                  {submissionId}
                </Typography>
              </Box>
            </Stack>
            <Box marginBottom={1}>
              <Typography variant="h6">
                Admin Operations
              </Typography>
              <Stack direction="row" spacing={2}>
                <Box> Delete submission:</Box>
                <Button
                  color="error"
                  size="small"
                  variant="outlined"
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  delete
                </Button>
              </Stack>
            </Box>
          </Box>
          <Box>
            <CodeBlock code={code} />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
      >
        <DialogTitle>Delete submission?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure to delete submission {submissionId}, file {fileName}?
            This action cannot be undone. The submission and all related data
            will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
