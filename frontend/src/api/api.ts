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
  const res = await fetch(`/api/leaderboard/${id}`);
  if (!res.ok) {
    const json = await res.json();
    const message = json?.message || "Unknown error";
    throw new APIError(`Failed to fetch leaderboard: ${message}`, res.status);
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

export async function fetchLeaderboardSummaries(): Promise<any> {
  const res = await fetch("/api/leaderboard-summaries");
  if (!res.ok) {
    const json = await res.json();
    const message = json?.message || "Unknown error";
    throw new APIError(`Failed to fetch leaderboard summaries: ${message}`, res.status);
  }
  const r = await res.json();
  return r.data;
}
