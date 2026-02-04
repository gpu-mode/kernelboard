import type { SxProps, Theme } from "@mui/material";
import { flexRowCenter, mediumText } from "../common/styles/shared_style";

export const appBarStyle: SxProps<Theme> = {
  backgroundColor: "white",
  color: "black",
  boxShadow: "none",
  borderBottom: "1px solid #ddd",
  width: "100%",
  maxWidth: "100vw",
};

export const brandStyle: SxProps<Theme> = {
  ...flexRowCenter,
  ...mediumText,
  fontWeight: "bold",
  ml: -2, // Negative left margin to reduce space from left edge
  mr: {
    xs: 2, // margin on extra-small screens
    sm: 4, // margin on small screens
    md: 8, // margin on medium screens
    lg: 16, // margin on large screens
  },
};
