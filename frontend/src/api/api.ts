export async function fetchAboutInfo(): Promise<string> {
  const res = await fetch("/api/about");
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  const r = await res.json();
  return r.data.message;
}
