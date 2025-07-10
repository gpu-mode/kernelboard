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
  maxHeight?: number;
}

export const styles = {
  container: {
    position: 'relative',
    border: '1px solid #ddd',
    borderRadius: 2,
    bgcolor: '#f9f9f9',
    fontFamily: 'monospace',
    overflow: 'hidden',
  },

  copyButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },

  toggleText: {
    cursor: 'pointer',
    color: 'primary.main',
    display: 'inline-flex',
    alignItems: 'center',
    userSelect: 'none',
  },

  fadeOverlay: (theme: Theme): SxProps<Theme> => ({
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    background: `linear-gradient(to bottom, rgba(249,249,249,0), ${theme.palette.background.paper})`,
    pointerEvents: 'none',
  }),

  prestyle(expanded: boolean, maxHeight: number): SxProps<Theme> {
    return {
      m: 0,
      px: 2,
      py: 2,
      maxHeight: expanded ? 'none' : `${maxHeight}px`,
      overflowX: 'auto',
      overflowY: expanded ? 'visible' : 'hidden',
      whiteSpace: 'pre',
      position: 'relative',
    };
  },
};

export default function CodeBlock({ code, maxHeight = 160 }: CodeBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const theme = useTheme();

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  // dynamically render the pre based on the expanded state



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

      {/* Code */}
      <Box component="pre" sx={styles.prestyle(expanded, maxHeight)}>

        <code>{code}</code>
        {!expanded && <Box sx={styles.fadeOverlay(theme)} />}
      </Box>

      {/* Toggle */}
      <Box sx={{ textAlign: "center", py: 1 }}>
        <Typography
          variant="body2"
          sx={styles.toggleText}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Hide" : "Show more"}
          {expanded ? (
            <ExpandLessIcon fontSize="small" />
          ) : (
            <ExpandMoreIcon fontSize="small" />
          )}
        </Typography>
      </Box>
    </Box>
  );
}
