const GoogleIconSvg =
  "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/google.svg";

export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <img
      src={GoogleIconSvg}
      alt="Google"
      width={size}
      height={size}
      style={{ display: "block" }}
    />
  );
}
