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

export async function fetchLeaderBoard(id: string): Promise<any> {
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
): Promise<any> {
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

export async function fetchAllNews(): Promise<any> {
  const res = await fetch("/api/news");
  if (!res.ok) {
    const json = await res.json();
    const message = json?.message || "Unknown error";
    throw new APIError(`Failed to fetch news contents: ${message}`, res.status);
  }
  const r = await res.json();
  return r.data;
}

export async function fetchLeaderboardSummaries(useV1: boolean = false): Promise<any> {
  const start = performance.now();
  const url = useV1
    ? "/api/leaderboard-summaries?v1_query"
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
  const version = useV1 ? "v1" : "v2";
  console.log(
    `[Perf] fetchLeaderboardSummaries (${version}) | fetch=${fetchTime.toFixed(2)}ms | parse=${parseTime.toFixed(2)}ms | total=${totalTime.toFixed(2)}ms`,
  );

  return r.data;
}

export async function getMe(): Promise<any> {
  const res = await fetch("/api/me");
  if (!res.ok) {
    const json = await res.json();
    const message = json?.message || "Unknown error";
    throw new APIError(`Failed to fetch news contents: ${message}`, res.status);
  }
  const r = await res.json();
  return r.data;
}

export async function logout(): Promise<any> {
  const res = await fetch("/api/logout");
  if (!res.ok) {
    const json = await res.json();
    const message = json?.message || "Unknown error";
    throw new APIError(`Failed to fetch news contents: ${message}`, res.status);
  }
  const r = await res.json();
  return r.data;
}

export async function submitFile(form: FormData) {
  const resp = await fetch("/api/submission", {
    method: "POST",
    body: form,
  });

  const text = await resp.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!resp.ok) {
    const msg = data?.detail || data?.message || "Submission failed";
    throw new Error(msg);
  }

  return data; // e.g. { submission_id, message, ... }
}

export async function fetchUserSubmissions(
  leaderboardId: number | string,
  userId: number | string,
  page: number = 1,
  pageSize: number = 10,
): Promise<any> {
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

export interface AiTrendDataPoint {
  score: string;
  submission_id: number;
  submission_time: string;
  gpu_type: string;
  user_id?: string;
  user_name?: string;
  model?: string;
}

export interface AiTrendTimeSeries {
  [gpuType: string]: {
    [model: string]: AiTrendDataPoint[];
  };
}

export interface AiTrendResponse {
  leaderboard_id: number;
  time_series: AiTrendTimeSeries;
}

export async function fetchAiTrend(leaderboardId: string): Promise<AiTrendResponse> {
  const res = await fetch(`/api/leaderboard/${leaderboardId}/ai_trend`);
  if (!res.ok) {
    const json = await res.json();
    const message = json?.message || "Unknown error";
    throw new APIError(`Failed to fetch AI trend: ${message}`, res.status);
  }
  const r = await res.json();
  return r.data;
}

export interface UserTrendResponse {
  leaderboard_id: number;
  user_ids: string[];
  time_series: AiTrendTimeSeries;
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
