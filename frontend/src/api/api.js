export async function fetchAboutInfo() {
  const res = await fetch("/api/about");
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  const data = await res.json();
  return data.message;
}
