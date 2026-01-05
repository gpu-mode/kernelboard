import { ErrorAlert } from "../../components/alert/ErrorAlert";
import { fetcherApiCallback } from "../../lib/hooks/useApi";
import { fetchAllNews } from "../../api/api";
import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollTo = (id: string) => {
    // Update URL when scrolling to a section
    navigate(`/news/${id}`, { replace: true });
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    call();
  }, []);

  // Scroll to the section when slug changes or data loads
  useEffect(() => {
    if (slug && data && data.length > 0) {
      // Wait a bit for the DOM to be ready
      setTimeout(() => {
        const el = sectionRefs.current[slug];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [slug, data]);

  if (loading) return <Loading />;
  if (error) return <ErrorAlert status={errorStatus} message={error} />;

  return (
    <Box sx={styles.container} id="news">
      <Sidebar data={data} scrollTo={scrollTo} currentSlug={slug} />
      <NewsContentSection data={data} sectionRefs={sectionRefs} />
    </Box>
  );
}
