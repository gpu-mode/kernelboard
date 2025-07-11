import { Box, Container } from "@mui/material";
import type { ReactNode } from "react";
import NavBar from "./NavBar";
import Footer from "./Footer";

interface Props {
  children: ReactNode;
}

export default function AppLayout({ children }: Props) {
  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
      <NavBar />
      {/* main content */}
      <Box sx={{ flexGrow: 1, mt: 10, mb: 2 }}>{children}</Box>
      <Footer />
    </Box>
  );
}
