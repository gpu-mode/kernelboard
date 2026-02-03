import { Box } from "@mui/material";
import type { ReactNode } from "react";
import NavBar from "./NavBar";
import Footer from "./Footer";

interface Props {
  children: ReactNode;
}

// Navbar height constants (MUI default Toolbar heights)
const NAVBAR_HEIGHT = { xs: 56, sm: 64, md: 64 };

export default function AppLayout({ children }: Props) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <NavBar />
      {/* main content - fills space between navbar and footer */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          // Account for fixed navbar height
          mt: { xs: `${NAVBAR_HEIGHT.xs}px`, sm: `${NAVBAR_HEIGHT.sm}px`, md: `${NAVBAR_HEIGHT.md}px` },
        }}
      >
        {children}
      </Box>
      <Footer />
    </Box>
  );
}
