import React, { useState } from "react";
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
  type SxProps,
  type Theme,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

interface CodeBlockProps {
  code: string;
  maxHeight?: number | string;
}

const styles = {
  container: {
    position: "relative",
  },
  copyButton: {
    position: "absolute",
    top: 4,
    right: 4,
    zIndex: 1,
  },
  pre: {
    fontFamily: "monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
};

export default function CodeBlock({ code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const theme = useTheme();

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <Box sx={styles.container}>
      {/* Copy Button */}
      <Box sx={styles.copyButton}>
        <Tooltip title={copied ? "Copied!" : "Copy"}>
          <IconButton size="small" onClick={handleCopy}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Scrollable Code */}
      <Box
        component="pre"
        sx={{
          ...styles.pre,
          maxHeight: {
            xs: "40vh", // mobile
            sm: "50vh", // ipad
            md: "60vh", // desktop
          },
          overflowY: "auto", // pass maxHeight to overflowY to enable scrolling
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          p: 1.5,
          fontSize: "0.85rem",
          bgcolor: theme.palette.background.paper,
        }}
      >
        <code>{code}</code>
      </Box>
    </Box>
  );
}
