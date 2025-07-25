import { Box, CircularProgress, Typography } from "@mui/material";
import { GiRabbit } from "react-icons/gi";
import { HiLightningBolt } from "react-icons/hi";

const styles = {
  root: {
    mt: 6,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  iconRow: {
    display: "flex",
    alignItems: "center",
    gap: 1,
  },
  text: {
    mt: 1,
    color: "text.secondary",
  },
};

export default function Loading() {
  return (
    <Box sx={styles.root}>
      <CircularProgress color="secondary" />
      <Box sx={styles.iconRow}>
        <GiRabbit size={40} color="#f48fb1" />
        <Typography variant="subtitle1" sx={styles.text}>
          Summoning data at lightning speed...
        </Typography>
        <HiLightningBolt size={36} color="#ffd54f" />
      </Box>
    </Box>
  );
}
