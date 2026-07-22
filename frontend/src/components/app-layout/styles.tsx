import type { SxProps, Theme } from "@mui/material";
import { flexRowCenter, mediumText } from "../common/styles/shared_style";

export const appBarStyle: SxProps<Theme> = {
  backgroundColor: "background.paper",
  color: "text.primary",
  boxShadow: "none",
  borderBottom: 1,
  borderColor: "divider",
  width: "100%",
  maxWidth: "100vw",
};

export const brandStyle: SxProps<Theme> = {
  ...flexRowCenter,
  ...mediumText,
  fontWeight: "bold",
  flexShrink: 0,
  ml: { xs: 0, sm: -2 }, // Keep the mobile home control fully visible
  mr: {
    xs: 1, // margin on extra-small screens
    sm: 4, // margin on small screens
    md: 8, // margin on medium screens
    lg: 16, // margin on large screens
  },
};
