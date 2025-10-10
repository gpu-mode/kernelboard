import { ErrorAlert } from "../../components/alert/ErrorAlert";
import { fetcherApiCallback } from "../../lib/hooks/useApi";
import { fetchAllNews } from "../../api/api";
import { useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import { NewsContentSection } from "./components/NewsContentSection";
import { Sidebar } from "./components/NewsSideBar";
import Loading from "../../components/common/loading";

const styles = {
  container: {
    display: "flex",
  },
};
export default function News() {
  const { data, loading, error, errorStatus, call } =
    fetcherApiCallback(fetchAllNews);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // read optional :postId param from URL; if present we'll scroll to it once data loads
  const { postId } = useParams<{ postId?: string }>();

  // scrollTo accepts an optional `smooth` flag. Sidebar clicks use smooth scrolling
  // but when the page initially loads (deep link) we want an immediate jump.
  const scrollTo = (id: string, smooth = true) => {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  };

  useEffect(() => {
    call();
  }, []);

  // when data loads and there's a postId, jump immediately (no animation).
  // We'll also re-jump when the rendered section signals it's finished loading
  // via the onSectionLoad callback (see below).
  const location = useLocation();

  useEffect(() => {
    if (!postId) return;
    // If navigation came from the sidebar we already initiated a smooth scroll
    // there, so skip the immediate jump. We check location.state.fromSidebar
    // to determine that.
    if (location.state && location.state.fromSidebar) return;

    // initial immediate jump once refs attach
    const t = window.setTimeout(() => {
      if (sectionRefs.current[postId]) scrollTo(postId, false);
    }, 0);
    return () => clearTimeout(t);
  }, [postId, data, location]);

  if (loading) return <Loading />;
  if (error) return <ErrorAlert status={errorStatus} message={error} />;

  return (
    <Box sx={styles.container} id="news">
      <Sidebar data={data} scrollTo={scrollTo} />
      <NewsContentSection
        data={data}
        sectionRefs={sectionRefs}
        onSectionLoad={() => {
          // re-jump after content (images/markdown) finished loading.
          // We re-jump whenever any section finishes to handle layout changes
          // caused by images loading above/below the target post.
          if (postId) scrollTo(postId, false);
        }}
      />
    </Box>
  );
}
