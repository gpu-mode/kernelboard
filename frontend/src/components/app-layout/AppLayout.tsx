import {
  AppBar,
  Toolbar,
  Link,
  Box,
  Container,
  Typography,
} from "@mui/material";
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
      <Container
        component="main"
        maxWidth="lg"
        sx={{ flexGrow: 1, mt: 4, mb: 8 }}
      >
        {children}
      </Container>
      <Footer />
    </Box>
  );
}
