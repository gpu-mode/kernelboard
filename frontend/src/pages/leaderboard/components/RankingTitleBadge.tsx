import { Box, Typography } from "@mui/material";

interface RankingTitleBadgeProps {
  name: string;
  colorHash: string;
}

export default function RankingTitleBadge({
  name,
  colorHash,
}: RankingTitleBadgeProps) {
  function stringToIndex(str: string, range: number): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash; // convert to 32-bit int
    }
    return Math.abs(hash) % range;
  }

  const rainbowGradients = [
    "linear-gradient(90deg, #f6d365 0%, #fda085 100%)", // warm peach
    "linear-gradient(90deg,rgb(134, 179, 250) 0%,rgb(140, 211, 244) 100%)", // calm blue
    "linear-gradient(90deg, #fbc2eb 0%,rgb(252, 154, 216) 100%)", // pink to lavender
    "linear-gradient(90deg,rgb(176, 208, 101) 0%,rgb(119, 176, 127) 100%)", // green mint
    "linear-gradient(90deg, #e0c3fc 0%, #8ec5fc 100%)", // soft purple to blue
  ];

  const gradient =
    rainbowGradients[stringToIndex(colorHash, rainbowGradients.length)];
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 1,
        borderRadius: "200px",
        background: gradient,
        color: "white",
        fontWeight: "bold",
        fontSize: "1rem",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        width: "fit-content",
      }}
    >
      <Typography component="span" sx={{ fontWeight: "bold", fontSize: 18 }}>
        {name}
      </Typography>
    </Box>
  );
}
