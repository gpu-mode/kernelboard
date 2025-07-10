import { useCallback, useState } from "react";
import { APIError } from "../../api/api";

type Fetcher<T, Args extends any[]> = (...args: Args) => Promise<T>;

/**
 * A reusable UI hook for handling API data fetching with loading and error state management.
 *
 * This hook simplifies common fetcher patterns by managing internal state:
 * - `data`: the fetched result
 * - `loading`: whether the request is in progress
 * - `error`: the error message (if any)
 * - `errorStatus`: HTTP status code if the error is an instance of `APIError`
 * - `call`: function to manually trigger the fetch with arguments
 *
 * ### `call`
 * Unlike hooks that fetch automatically on mount, this design exposes a `call` function
 * so users can explicitly decide when and how to fetch data. This is especially useful for:
 * - fetching data based on dynamic parameters (e.g., with `useEffect`)
 * - re-fetching on user action (e.g., button click action)
 * - delaying fetch until certain conditions are met
 *
 * ### Example usage
 * ```ts
 * const { data, loading, error, errorStatus, call } = fetcherApiCallback(fetchLeaderBoard);
 *
 * useEffect(() => {
 *   call(id);
 * }, [id]);
 * ```
 *
 * @template T - The return type of the fetcher function
 * @template Args - The parameter types of the fetcher function
 * @param fetcher - A function that returns a promise of type T
 * @returns An object with `data`, `loading`, `error`, `errorStatus`, and `call`
 */
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
