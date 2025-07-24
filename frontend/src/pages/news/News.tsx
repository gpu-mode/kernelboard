import { ErrorAlert } from "../../components/error-alert/ErrorAlert";
import { fetcherApiCallback } from "../../lib/hooks/useApi";
import { fetchAllNews } from "../../api/api";
import { useEffect, useRef } from "react";
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

  const scrollTo = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    call();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorAlert status={errorStatus} message={error} />;

  return (
    <Box sx={styles.container} id="news">
      <Sidebar data={data} scrollTo={scrollTo} />
      <NewsContentSection data={data} sectionRefs={sectionRefs} />
    </Box>
  );
}
