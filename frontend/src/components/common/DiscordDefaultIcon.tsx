const DiscordIconSvg =
  "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/discord.svg";

export function DiscordIcon({ size = 18 }: { size?: number }) {
  return (
    <img
      src={DiscordIconSvg}
      alt="Discord"
      width={size}
      height={size}
      style={{ display: "block" }}
    />
  );
}
