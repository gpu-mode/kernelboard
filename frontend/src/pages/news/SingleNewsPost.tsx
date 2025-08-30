import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Box, Typography, Button } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { ErrorAlert } from "../../components/alert/ErrorAlert";
import { fetcherApiCallback } from "../../lib/hooks/useApi";
import { fetchNewsItem } from "../../api/api";
import Loading from "../../components/common/loading";
import { NewsContentSection } from "./components/NewsContentSection";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: 2,
  },
  backButton: {
    marginBottom: 2,
    alignSelf: "flex-start",
  },
};

export default function SingleNewsPost() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  
  const { data, loading, error, errorStatus, call } =
    fetcherApiCallback(fetchNewsItem);

  useEffect(() => {
    if (postId) {
      call(postId);
    }
  }, [postId, call]);

  const handleBackClick = () => {
    navigate("/news");
  };

  if (loading) return <Loading />;
  if (error) return <ErrorAlert status={errorStatus} message={error} />;
  if (!data) return <ErrorAlert status={404} message="News post not found" />;

  // Convert single item to array format expected by NewsContentSection
  const newsData = [data];

  return (
    <Box sx={styles.container}>
      <Button
        startIcon={<ArrowBack />}
        onClick={handleBackClick}
        sx={styles.backButton}
        variant="outlined"
      >
        Back to News
      </Button>
      <NewsContentSection data={newsData} sectionRefs={{ current: {} }} showPermalinks={false} />
    </Box>
  );
}