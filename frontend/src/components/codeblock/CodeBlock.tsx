import React, { useState, useEffect, useMemo } from "react";
import { Box, IconButton, Tooltip, useTheme } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FixedSizeList } from "react-window";
import { useContainerHeight } from "../../lib/hooks/useContainerHeight";
import type { rendererNode } from "react-syntax-highlighter";

function renderNode(
  node: rendererNode,
  stylesheet: { [key: string]: React.CSSProperties },
  useInlineStyles: boolean,
  key: React.Key,
): React.ReactNode {
  if (node.type === "text") return node.value;
  if (!node.tagName) return null;

  const classNames = node.properties?.className ?? [];
  let props: Record<string, unknown>;
  if (useInlineStyles) {
    const nonToken = classNames.filter((c: string) => c !== "token");
    const style: React.CSSProperties = {};
    for (const cls of nonToken) {
      if (stylesheet[cls]) Object.assign(style, stylesheet[cls]);
    }
    // Handle compound selectors (e.g. "keyword.control")
    if (nonToken.length >= 2) {
      const a = nonToken.join(".");
      if (stylesheet[a]) Object.assign(style, stylesheet[a]);
      const b = nonToken.slice().reverse().join(".");
      if (stylesheet[b]) Object.assign(style, stylesheet[b]);
    }
    props = { key, style };
  } else {
    props = { key, className: classNames.join(" ") };
  }

  const children = node.children?.map((child, i) =>
    renderNode(child, stylesheet, useInlineStyles, `${key}-${i}`),
  );
  return React.createElement(node.tagName, props, children);
}

const VIRTUALIZATION_LINE_THRESHOLD = 200;
const LINE_HEIGHT_PX = 20;

interface CodeBlockProps {
  code: string;
  maxHeight?: number | string;
  bordered?: boolean;
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

export default React.memo(function CodeBlock({ code, bordered = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [highlighted, setHighlighted] = useState(false);
  const theme = useTheme();
  const syntaxTheme = theme.palette.mode === "dark" ? oneDark : oneLight;
  const { containerRef, height: containerHeight } = useContainerHeight();

  useEffect(() => {
    setHighlighted(false);
    const id = requestAnimationFrame(() => setHighlighted(true));
    return () => cancelAnimationFrame(id);
  }, [code]);

  const lineCount = useMemo(() => {
    let count = 1;
    for (let i = 0; i < code.length; i++) {
      if (code[i] === "\n") count++;
    }
    return count;
  }, [code]);

  const canVirtualize =
    !bordered && lineCount > VIRTUALIZATION_LINE_THRESHOLD;
  const shouldVirtualize = canVirtualize && containerHeight > 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const virtualizedRenderer = useMemo(() => {
    if (!shouldVirtualize) return undefined;

    return ({
      rows,
      stylesheet,
      useInlineStyles,
    }: {
      rows: rendererNode[];
      stylesheet: { [key: string]: React.CSSProperties };
      useInlineStyles: boolean;
    }): React.ReactNode => (
      <FixedSizeList
        height={containerHeight}
        itemCount={rows.length}
        itemSize={LINE_HEIGHT_PX}
        width="100%"
        style={{ paddingTop: 12, boxSizing: "content-box" }}
      >
        {({
          index,
          style,
        }: {
          index: number;
          style: React.CSSProperties;
        }) => (
          <div
            style={{
              ...style,
              top: ((style.top as number) || 0) + 12,
              lineHeight: `${LINE_HEIGHT_PX}px`,
              whiteSpace: "pre",
              padding: "0 12px",
            }}
          >
            {renderNode(
              rows[index],
              stylesheet,
              useInlineStyles,
              `line-${index}`,
            )}
          </div>
        )}
      </FixedSizeList>
    );
  }, [shouldVirtualize, containerHeight]);

  return (
    <Box
      sx={{
        ...styles.container,
        ...(canVirtualize && {
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }),
      }}
    >
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
        ref={canVirtualize ? containerRef : undefined}
        sx={{
          ...(canVirtualize
            ? { flex: 1, minHeight: 0, overflow: "hidden" }
            : { overflowY: "auto" }),
          ...(bordered && {
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            bgcolor: theme.palette.background.paper,
          }),
          "& pre": {
            margin: "0 !important",
            padding: "12px !important",
            fontSize: "0.85rem !important",
            fontFamily: "monospace !important",
            background: "transparent !important",
          },
          "& code, & div[class*='language-']": {
            background: "transparent !important",
          },
        }}
      >
        {highlighted && (!canVirtualize || shouldVirtualize) ? (
          <SyntaxHighlighter
            language="python"
            style={syntaxTheme}
            customStyle={{
              margin: 0,
              padding: shouldVirtualize ? 0 : 12,
              fontSize: "0.85rem",
              fontFamily: "monospace",
              background: "transparent",
            }}
            wrapLines={shouldVirtualize ? true : undefined}
            wrapLongLines={!shouldVirtualize}
            renderer={virtualizedRenderer}
            PreTag={shouldVirtualize ? "div" : "pre"}
            CodeTag={shouldVirtualize ? "div" : "code"}
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
});
