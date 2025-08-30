import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import { Link as LinkIcon } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { lazy, Suspense } from "react";

// Lazy-load MarkdownRenderer to avoid large initial JS chunks.
// This helps address the Vite warning:
// "(!) Some chunks are larger than 500 kB after minification."
// ReactMarkdown + rehype plugins + MUI can bloat the bundle,
// so we split this into a separate async chunk.
const MarkdownRenderer = lazy(
  () => import("../../../components/markdown-renderer/MarkdownRenderer"),
);

const styles = {
  content: {
    flex: 1,
    px: 3,
    minWidth: "600px",
  },
  section: {
    scrollMarginTop: "80px",
    borderBottom: "1px solid #ddd",
    pb: 4,
    mb: 4,
  },
  titleContainer: {
    display: "flex",
    alignItems: "center",
    gap: 1,
  },
  permalinkIcon: {
    opacity: 0.6,
    "&:hover": {
      opacity: 1,
    },
  },
};

export function NewsContentSection({
  data,
  sectionRefs,
  showPermalinks = true,
}: {
  data: any[];
  sectionRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  showPermalinks?: boolean;
}) {
  return (
    <Box sx={styles.content} data-testid="news-content">
      <Typography variant="h4" gutterBottom>
        News and Announcements
      </Typography>
      {data.map((item) => (
        <Box
          key={item.id}
          id={item.id}
          ref={(el) => (sectionRefs.current[item.id] = el as any)}
          sx={styles.section}
        >
          <Box sx={styles.titleContainer}>
            <Typography variant="h5" gutterBottom sx={{ mb: 0 }}>
              {item.title}
            </Typography>
            {showPermalinks && (
              <Tooltip title="Permalink to this post">
                <IconButton
                  component={RouterLink}
                  to={`/news/${item.id}`}
                  size="small"
                  sx={styles.permalinkIcon}
                  data-testid={`permalink-${item.id}`}
                >
                  <LinkIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {item.date} • {item.category}
          </Typography>
          <Suspense fallback={<div>Loading content...</div>}>
            <MarkdownRenderer
              content={item.markdown}
              imageProps={{
                maxWidth: "800px",
                width: "100%",
                minWidth: "200px",
                height: "auto",
                align: "center",
              }}
            />
          </Suspense>
        </Box>
      ))}
    </Box>
  );
}
