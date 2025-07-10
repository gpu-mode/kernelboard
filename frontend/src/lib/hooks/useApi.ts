import { useCallback, useState } from "react";
import { APIError } from "../../api/api";

type Fetcher<T, Args extends any[]> = (...args: Args) => Promise<T>;

export function fetcherApiCallback<T, Args extends any[]>(
  fetcher: Fetcher<T, Args>,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const call = useCallback(
    async (...params: Args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetcher(...params);
        setData(result);
        return result;
      } catch (e: any) {
        if (e instanceof APIError) {
          setError(e.message);
          setErrorStatus(e.status);
        } else {
          setError(e.message);
        }
      } finally {
        setLoading(false);
      }
    },
    [fetcher],
  );

  return { data, error, errorStatus, loading, call };
}
