import type { User } from "../lib/types/user";

export class APIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "APIError";
    this.status = status;
  }
}

export async function fetchAboutInfo(): Promise<string> {
  const res = await fetch("/api/about");
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  const r = await res.json();
  return r.data.message;
}

export interface LeaderboardDetail {
  deadline: string;
  description: string;
  name: string;
  reference: string;
  benchmarks: Record<string, unknown>[];
  gpu_types: string[];
  rankings: Record<
    string,
    Array<{
      file_name: string;
      prev_score: number;
      rank: number;
      score: number;
      user_name: string;
      submission_id: number;
    }>
  >;
}

export interface CodesResponse {
  results: Array<{
    submission_id: number;
    code: string;
  }>;
}

export interface NewsPost {
  id: string;
  title: string;
  content: string;
  [key: string]: unknown;
}

export interface LeaderboardSummary {
  id: number;
  name: string;
  visibility?: string;
  deadline: string;
  gpu_types: string[];
  priority_gpu_type: string;
  top_users: Array<{ rank: number; score: number; user_name: string }> | null;
}

export interface LeaderboardSummariesResponse {
  leaderboards: LeaderboardSummary[];
  now: string;
}

export interface UserSubmissionsResponse {
  items: Array<{
    submission_id: number;
    file_name?: string | null;
    submitted_at: string;
    status?: string | null;
    submission_done: boolean;
    runs?: Array<{
      start_time: string;
      end_time: string | null;
      mode: string;
      passed: boolean;
      score: number | null;
      meta: Record<string, unknown> | null;
      report: Record<string, unknown> | null;
    }>;
  }>;
  total: number;
  limit: number;
}

export async function fetchLeaderBoard(id: string): Promise<LeaderboardDetail> {
  const start = performance.now();
  const res = await fetch(`/api/leaderboard/${id}`);
  const fetchTime = performance.now() - start;

  const parseStart = performance.now();
  if (!res.ok) {
    const json = await res.json();
    const message = json?.message || "Unknown error";
    throw new APIError(`Failed to fetch leaderboard: ${message}`, res.status);
  }
  const r = await res.json();
  const parseTime = performance.now() - parseStart;

  const totalTime = performance.now() - start;
  console.log(
    `[Perf] fetchLeaderBoard id=${id} | fetch=${fetchTime.toFixed(2)}ms | parse=${parseTime.toFixed(2)}ms | total=${totalTime.toFixed(2)}ms`,
  );

  return r.data;
}

export async function fetchCodes(
  leaderboardId: number | string,
  submissionIds: (number | string)[],
): Promise<CodesResponse> {
  const res = await fetch("/api/codes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      leaderboard_id: leaderboardId,
      submission_ids: submissionIds,
    }),
  });

  if (!res.ok) {
    const json = await res.json();
    const message = json?.message || "Unknown error";
    throw new APIError(`Failed to fetch news contents: ${message}`, res.status);
  }
  const r = await res.json();
  return r.data;
}

export async function fetchAllNews(): Promise<NewsPost[]> {
  const res = await fetch("/api/news");
  if (!res.ok) {
    const json = await res.json();
    const message = json?.message || "Unknown error";
    throw new APIError(`Failed to fetch news contents: ${message}`, res.status);
  }
  const r = await res.json();
  return r.data;
}

export async function fetchLeaderboardSummaries(
  useBeta: boolean = false,
  forceRefreshCache: boolean = false,
): Promise<LeaderboardSummariesResponse> {
  const start = performance.now();

  // Build URL with query params
  const params = new URLSearchParams();
  if (useBeta) params.append("use_beta", "");
  if (forceRefreshCache) params.append("force_refresh_cache", "");

  const queryString = params.toString();
  const url = queryString
    ? `/api/leaderboard-summaries?${queryString}`
    : "/api/leaderboard-summaries";

  const res = await fetch(url);
  const fetchTime = performance.now() - start;

  const parseStart = performance.now();
  if (!res.ok) {
    const json = await res.json();
    const message = json?.message || "Unknown error";
    throw new APIError(
      `Failed to fetch leaderboard summaries: ${message}`,
      res.status,
    );
  }
  const r = await res.json();
  const parseTime = performance.now() - parseStart;

  const totalTime = performance.now() - start;
  const version = useBeta ? "beta" : "original";
  console.log(
    `[Perf] fetchLeaderboardSummaries (${version}| ${forceRefreshCache})( | fetch=${fetchTime.toFixed(2)}ms | parse=${parseTime.toFixed(2)}ms | total=${totalTime.toFixed(2)}ms`,
  );

  return r.data;
}

export async function getMe(): Promise<User> {
  const res = await fetch("/api/me");
  if (!res.ok) {
    const json = await res.json();
    const message = json?.message || "Unknown error";
    throw new APIError(`Failed to fetch news contents: ${message}`, res.status);
  }
  const r = await res.json();
  return r.data;
}

export async function logout(): Promise<void> {
  const res = await fetch("/api/logout");
  if (!res.ok) {
    const json = await res.json();
    const message = json?.message || "Unknown error";
    throw new APIError(`Failed to fetch news contents: ${message}`, res.status);
  }
  await res.json();
}

export async function submitFile(form: FormData) {
  const resp = await fetch("/api/submission", {
    method: "POST",
    body: form,
  });

  const text = await resp.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!resp.ok) {
    const msg = (data?.detail as string) || (data?.message as string) || "Submission failed";
    throw new Error(msg);
  }

  return data; // e.g. { submission_id, message, ... }
}

export async function fetchUserSubmissions(
  leaderboardId: number | string,
  userId: number | string,
  page: number = 1,
  pageSize: number = 10,
): Promise<UserSubmissionsResponse> {
  const offset = (page - 1) * pageSize;
  const res = await fetch(
    `/api/submissions?leaderboard_id=${leaderboardId}&offset=${offset}&limit=${pageSize}`,
  );
  if (!res.ok) {
    let message = "Unknown error";
    try {
      const json = await res.json();
      message = json?.detail || json?.message || message;
    } catch {
      /* ignore */
    }
    throw new APIError(`Failed to fetch submissions: ${message}`, res.status);
  }
  const r = await res.json();
  return r.data;
}

export interface DiscordEvent {
  id: string;
  name: string;
  description: string;
  scheduled_start_time: string;
  scheduled_end_time?: string;
  event_url: string;
}

export async function fetchEvents(): Promise<DiscordEvent[]> {
  const res = await fetch("/api/events");
  if (!res.ok) {
    const json = await res.json();
    const message = json?.message || "Unknown error";
    throw new APIError(`Failed to fetch events: ${message}`, res.status);
  }
  const r = await res.json();
  return r.data;
}

export interface CustomTrendDataPoint {
  score: string;
  submission_id: number;
  submission_time: string;
  gpu_type: string;
  user_id?: string;
  user_name?: string;
  model?: string;
}

export interface CustomTrendTimeSeries {
  [gpuType: string]: {
    [model: string]: CustomTrendDataPoint[];
  };
}

export interface CustomTrendResponse {
  leaderboard_id: number;
  time_series: CustomTrendTimeSeries;
}

export async function fetchCustomTrend(leaderboardId: string): Promise<CustomTrendResponse> {
  const res = await fetch(`/api/leaderboard/${leaderboardId}/custom_trend`);
  if (!res.ok) {
    const json = await res.json();
    const message = json?.message || "Unknown error";
    throw new APIError(`Failed to fetch custom trend: ${message}`, res.status);
  }
  const r = await res.json();
  return r.data;
}

export interface FastestTrendDataPoint {
  score: number;
  submission_id: number;
  submission_time: string;
  gpu_type: string;
  user_id: string | null;
  user_name: string;
}

export interface FastestTrendTimeSeries {
  [gpuType: string]: {
    fastest: FastestTrendDataPoint[];
  };
}

export interface FastestTrendResponse {
  leaderboard_id: number;
  time_series: FastestTrendTimeSeries;
}

export async function fetchFastestTrend(leaderboardId: string): Promise<FastestTrendResponse> {
  const res = await fetch(`/api/leaderboard/${leaderboardId}/fastest_trend`);
  if (!res.ok) {
    const json = await res.json();
    const message = json?.message || "Unknown error";
    throw new APIError(`Failed to fetch fastest trend: ${message}`, res.status);
  }
  const r = await res.json();
  return r.data;
}

export interface UserTrendResponse {
  leaderboard_id: number;
  user_ids: string[];
  time_series: CustomTrendTimeSeries;
}

export async function fetchUserTrend(
  leaderboardId: string,
  userIds: string[]
): Promise<UserTrendResponse> {
  if (!userIds || userIds.length === 0) {
    throw new Error("At least one user ID is required");
  }
  const url = `/api/leaderboard/${leaderboardId}/user_trend?user_id=${userIds.join(",")}`;
  const res = await fetch(url);
  if (!res.ok) {
    const json = await res.json();
    const message = json?.message || "Unknown error";
    throw new APIError(`Failed to fetch user trend: ${message}`, res.status);
  }
  const r = await res.json();
  return r.data;
}

export interface UserSearchResult {
  user_id: string;
  username: string;
}

export interface SearchUsersResponse {
  leaderboard_id: number;
  users: UserSearchResult[];
}

export async function searchUsers(
  leaderboardId: string,
  query: string = "",
  limit?: number
): Promise<SearchUsersResponse> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (limit) params.set("limit", limit.toString());

  const url = `/api/leaderboard/${leaderboardId}/users?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const json = await res.json();
    const message = json?.message || "Unknown error";
    throw new APIError(`Failed to search users: ${message}`, res.status);
  }
  const r = await res.json();
  return r.data;
}

export interface SubmitCodeResponse {
  sub_id: number;
}

export async function submitCode(
  leaderboardId: string,
  leaderboardName: string,
  gpuType: string,
  mode: string,
  code: string,
  fileName: string = "submission.py"
): Promise<SubmitCodeResponse> {
  const blob = new Blob([code], { type: "text/plain" });
  const file = new File([blob], fileName, { type: "text/x-python" });

  const form = new FormData();
  form.set("leaderboard_id", leaderboardId);
  form.set("leaderboard", leaderboardName);
  form.set("gpu_type", gpuType);
  form.set("submission_mode", mode);
  form.set("file", file, fileName);

  let resp: Response;
  try {
    resp = await fetch("/api/submission", {
      method: "POST",
      body: form,
    });
  } catch (_err) {
    throw new Error("Network error: Unable to connect to server");
  }

  const text = await resp.text();
  if (!text) {
    throw new Error("Server returned empty response. The submission service may be unavailable.");
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`Server error: ${text.slice(0, 200)}`);
  }

  const payloadData = payload?.data as Record<string, unknown> | undefined;

  if (!resp.ok) {
    const msg =
      (payload?.message != null
        ? typeof payload.message === "string"
          ? payload.message
          : JSON.stringify(payload.message)
        : null) ||
      (payloadData?.detail != null
        ? typeof payloadData.detail === "string"
          ? payloadData.detail
          : JSON.stringify(payloadData.detail)
        : null) ||
      "Submission failed";
    throw new Error(msg);
  }

  const details = payloadData?.details as Record<string, unknown> | undefined;
  const sub_id = (details?.id as number) || 0;
  console.log("Submission successful with details", details);
  return {
    sub_id
  };
}

export interface SubmissionStatusResponse {
  submission_id: number;
  status: string | null;
  submission_done: boolean;
  file_name?: string | null;
  submitted_at?: string;
  error?: string | null;
  last_heartbeat?: string | null;
  job_created_at?: string | null;
  runs?: Array<{
    start_time: string;
    end_time: string | null;
    mode: string;
    passed: boolean;
    score: number | null;
    meta: Record<string, unknown> | null;
    report: Record<string, unknown> | null;
  }>;
}

export async function fetchSubmissionStatus(
  leaderboardId: number | string,
  submissionId: number
): Promise<SubmissionStatusResponse | null> {
  const res = await fetch(
    `/api/submissions?leaderboard_id=${leaderboardId}&offset=0&limit=100`
  );
  if (!res.ok) {
    const json = await res.json();
    const message = json?.message || "Unknown error";
    throw new APIError(`Failed to fetch submission status: ${message}`, res.status);
  }
  const r = await res.json();
  const items = r.data?.items || [];
  const submission = items.find(
    (item: SubmissionStatusResponse) => item.submission_id === submissionId
  );
  return submission || null;
}
