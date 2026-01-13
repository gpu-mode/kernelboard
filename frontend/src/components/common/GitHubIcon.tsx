const GitHubIconSvg =
  "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/github.svg";

export function GitHubIcon({ size = 18 }: { size?: number }) {
  return (
    <img
      src={GitHubIconSvg}
      alt="GitHub"
      width={size}
      height={size}
      style={{ display: "block" }}
    />
  );
}
