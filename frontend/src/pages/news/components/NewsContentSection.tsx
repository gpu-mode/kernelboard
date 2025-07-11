import { Box, Typography } from "@mui/material";
import ReactMarkdown from "react-markdown";

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
          <ReactMarkdown
            components={{
              img: ({ node, ...props }) => (
                <img
                  style={{ maxWidth: "100%", height: "auto" }}
                  {...props}
                  alt={props.alt}
                />
              ),
            }}
          >
            {item.markdown}
          </ReactMarkdown>
        </Box>
      ))}
    </Box>
  );
}
