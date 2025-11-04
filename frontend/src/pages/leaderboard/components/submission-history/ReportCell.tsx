import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TableCell,
} from "@mui/material";

export function ReportCell({ report }: { report: any }) {
  const [open, setOpen] = useState(false);

  return (
    <TableCell>
      {report ? (
        <>
          <Button
            variant="text"
            size="small"
            onClick={() => setOpen(true)}
            sx={{ textTransform: "none" }}
          >
            details
          </Button>
          <Dialog
            open={open}
            onClose={() => setOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>Report JSON</DialogTitle>
            <DialogContent dividers>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1,
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                  fontFamily: "monospace",
                }}
              >
                {report}
              </Box>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        "—"
      )}
    </TableCell>
  );
}
