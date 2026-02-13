import type { NewsPost } from "../../api/api";
import { ErrorAlert } from "../../components/alert/ErrorAlert";
import { fetcherApiCallback } from "../../lib/hooks/useApi";
import { fetchAllNews } from "../../api/api";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { NewsIndex } from "./components/NewsIndex";
import { NewsSinglePost } from "./components/NewsSinglePost";
import Loading from "../../components/common/loading";

export default function News() {
  const { data, loading, error, errorStatus, call } =
    fetcherApiCallback(fetchAllNews);
  const { slug } = useParams<{ slug?: string }>();

  useEffect(() => {
    call();
  }, [call]);

  if (loading) return <Loading />;
  if (error) return <ErrorAlert status={errorStatus} message={error} />;

  // If slug is provided, find and show that specific post
  if (slug) {
    const post = data?.find((item: NewsPost) => item.id === slug);
    if (!post) {
      return <ErrorAlert status={404} message="Post not found" />;
    }
    return <NewsSinglePost post={post} />;
  }

  // Otherwise show the index
  return <NewsIndex data={data || []} />;
}
