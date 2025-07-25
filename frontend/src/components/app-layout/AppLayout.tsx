import { Box } from "@mui/material";
import type { ReactNode } from "react";
import NavBar from "./NavBar";
import Footer from "./Footer";
import { ConstrainedContainer } from "./ConstrainedContainer.js";

interface Props {
  children: ReactNode;
}

export default function AppLayout({ children }: Props) {
  return (
    <Box display="flex" flexDirection="column" minHeight="100vh">
      <NavBar />
      {/* main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: 4,
          pb: 2,
          // Account for fixed navbar height. Fixed navbar height removes it
          // from the document flow. We push the main content down so it isn't
          // covered by the navbar.
          mt: { xs: 4, sm: 5, md: 6 },
        }}
      >
        <ConstrainedContainer>{children}</ConstrainedContainer>
      </Box>
      <Footer />
    </Box>
  );
}
