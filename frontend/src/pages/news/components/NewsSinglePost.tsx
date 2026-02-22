import { Box, Typography, Button } from "@mui/material";
import { lazy, Suspense, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const MarkdownRenderer = lazy(
  () => import("../../../components/markdown-renderer/MarkdownRenderer"),
);

interface NewsItem {
  id: string;
  title: string;
  date: string;
  category: string;
  markdown: string;
}

const styles = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    px: 3,
    py: 2,
  },
  backButton: {
    mb: 3,
  },
  meta: {
    mb: 3,
  },
};

export function NewsSinglePost({ post }: { post: NewsItem }) {
  const navigate = useNavigate();
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    // Retry scrolling until the lazy-loaded markdown renders the target element
    const id = hash.replace("#", "");
    const interval = setInterval(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [hash]);

  return (
    <Box sx={styles.container}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/news")}
        sx={styles.backButton}
      >
        Back to all posts
      </Button>
      <Typography variant="h4" gutterBottom>
        {post.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={styles.meta}>
        {post.date}
      </Typography>
      <Suspense fallback={<div>Loading content...</div>}>
        <MarkdownRenderer
          content={post.markdown}
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
  );
}
