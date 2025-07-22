import { Box } from "@mui/material";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

/**
 * ConstrainedContainer implements a responsive layout pattern:
 * - Takes full viewport width when viewport <= 80rem (1280px) (minus responsive padding)
 * - Never exceeds 80rem width, centered with equal margins when viewport > 80rem
 * - Responsive padding that adjusts based on screen size
 */
export function ConstrainedContainer({ children }: Props) {
  return (
    <Box
      sx={{
        marginLeft: "auto",
        marginRight: "auto",
        width: "100%",
        maxWidth: "80rem",
        paddingLeft: {
          xs: "1rem",    // mobile
          sm: "1.5rem",  // small screens
          lg: "2rem",    // large screens
        },
        paddingRight: {
          xs: "1rem",
          sm: "1.5rem",
          lg: "2rem",
        },
      }}
    >
      {children}
    </Box>
  );
}
