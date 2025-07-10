import { fetchLeaderBoard } from "../../api/api";
import { fetcherApiCallback } from "./useApi";

/**
 * Custom hook for fetching leaderboard data
 * This wrapper makes it easier to mock in tests
 */
export function useLeaderboardApi() {
  return fetcherApiCallback(fetchLeaderBoard);
}
