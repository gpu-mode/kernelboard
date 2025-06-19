export async function fetchAboutInfo(): Promise<string> {
  const res = await fetch("/api/about_info");
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  const data = await res.json();
  return data.message;
}
