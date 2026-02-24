import React, { useState, useEffect } from "react";
import { Box, IconButton, Tooltip, useTheme } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

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
  const [highlighted, setHighlighted] = useState(false);
  const theme = useTheme();
  const syntaxTheme = theme.palette.mode === "dark" ? oneDark : oneLight;

  useEffect(() => {
    setHighlighted(false);
    const id = requestAnimationFrame(() => setHighlighted(true));
    return () => cancelAnimationFrame(id);
  }, [code]);

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

      {/* Scrollable Code with Syntax Highlighting */}
      <Box
        sx={{
          maxHeight: {
            xs: "40vh", // mobile
            sm: "50vh", // ipad
            md: "60vh", // desktop
          },
          overflowY: "auto", // pass maxHeight to overflowY to enable scrolling
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          bgcolor: theme.palette.background.paper,
          "& pre": {
            margin: "0 !important",
            padding: "12px !important",
            fontSize: "0.85rem !important",
            fontFamily: "monospace !important",
            background: "transparent !important",
          },
          "& code": {
            background: "transparent !important",
          },
        }}
      >
        {highlighted ? (
          <SyntaxHighlighter
            language="python"
            style={syntaxTheme}
            customStyle={{
              margin: 0,
              padding: 12,
              fontSize: "0.85rem",
              fontFamily: "monospace",
              background: "transparent",
            }}
            wrapLongLines={true}
          >
            {code}
          </SyntaxHighlighter>
        ) : (
          <pre
            style={{
              margin: 0,
              padding: 12,
              fontSize: "0.85rem",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {code}
          </pre>
        )}
      </Box>
    </Box>
  );
}
