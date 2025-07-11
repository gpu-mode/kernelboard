import { Box, Typography } from "@mui/material";
import { lazy } from "react";

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
};

export function NewsContentSection({
  data,
  sectionRefs,
}: {
  data: any[];
  sectionRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
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
          <Typography variant="h5" gutterBottom>
            {item.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {item.date} • {item.category}
          </Typography>
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
        </Box>
      ))}
    </Box>
  );
}
