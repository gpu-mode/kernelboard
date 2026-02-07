import { Box, Button, Dialog, DialogContent, DialogTitle } from "@mui/material";
import { useState } from "react";
import { Link } from "react-router-dom";
import CodeBlock from "../../../components/codeblock/CodeBlock";

export function CodeDialog({
  code,
  fileName = "file",
}: {
  code: any;
  fileName?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!code)
    return (
      <Button
        component={Link}
        to="/login"
        variant="text"
        size="small"
        sx={{ textTransform: "none" }}
      >
        {fileName}
      </Button>
    );

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
        <DialogTitle>Report JSON</DialogTitle>
        <DialogContent dividers>
          <Box>
            <CodeBlock code={code} />
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
