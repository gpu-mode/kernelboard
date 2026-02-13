import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

type Fetcher<T, Args extends any[]> = (...args: Args) => Promise<T>;

export const defaultRedirectMap: Record<number, string> = {
  401: "/401",
  404: "/404",
  500: "/500",
  0: "/500", // uknown error
};
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
 * - Fetching data based on dynamic parameters (e.g., inside `useEffect`)
 * - Re-fetching on user action (e.g., button click)
 * - Delaying fetch until certain conditions are met
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
 * @param fetcher - A function that returns a promise of type `T`
 * @param redirectMap - A map of HTTP status codes to redirect routes (default fallback):
 * ```ts
 * export const defaultRedirectMap: Record<number, string> = {
 *   401: '/401',
 *   404: '/404',
 *   500: '/500',
 *   0: '/500', // 0 indicates unknown error
 * };
 * ```
 * @returns An object with `data`, `loading`, `error`, `errorStatus`, and `call`
 */
export function fetcherApiCallback<T, Args extends any[]>(
  fetcher: Fetcher<T, Args>,
  redirectMap: Record<number, string> = defaultRedirectMap,
) {
  const navigate = useNavigate(); // eslint-disable-line react-hooks/rules-of-hooks
  const [data, setData] = useState<T | null>(null); // eslint-disable-line react-hooks/rules-of-hooks
  const [error, setError] = useState<string | null>(null); // eslint-disable-line react-hooks/rules-of-hooks
  const [errorStatus, setErrorStatus] = useState<number | null>(null); // eslint-disable-line react-hooks/rules-of-hooks
  const [loading, setLoading] = useState(true); // eslint-disable-line react-hooks/rules-of-hooks

  const call = useCallback( // eslint-disable-line react-hooks/rules-of-hooks
    async (...params: Args) => {
      setLoading(true);

      // reset error and status for incoming data
      setError(null);
      setErrorStatus(null);

      try {
        const result = await fetcher(...params);
        setData(result);
        return result;
      } catch (e: any) {
        const status = e.status ? e.status : 0;
        const msg = e.message ? e.message : "";

        // set and logging the error if any
        setError(status);
        setErrorStatus(msg);
        console.log(
          `error status: ${status > 0 ? status : "unkown"}, details: ${msg}`,
        );

        // navigate to config page if the status is found
        // otherwise passes
        const redirectPath = redirectMap[e.status];
        if (redirectPath) {
          navigate(redirectPath);
        }
      } finally {
        // notice navigate() is non-blocking, React will still complete the current
        // render/update cycle unless the route changes synchronously.
        setLoading(false);
      }
    },
    [fetcher, navigate, redirectMap],
  );

  return { data, error, errorStatus, loading, call };
}
