import {
  AppBar,
  Toolbar,
  Link,
  Box,
  Container,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import NavBar from './NavBar';

interface Props {
  children: ReactNode;
}

export default function AppLayout({ children }: Props) {
  return (
    <>
    <AppBar
    position="static"
    >
    <Toolbar>
        <NavBar />
    </Toolbar>
    </AppBar>

      {/* Toast containers */}
      <Box
        id="toast-container-error"
        sx={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1400,
        }}
      />
      <Box
        id="toast-container-default"
        sx={{
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1400,
        }}
      />

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        {children}
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{ borderTop: '1px solid #ddd', py: 2, textAlign: 'center' }}
      >
        <Container
          maxWidth="md"
          sx={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}
        >
          <Link href="https://discord.gg/gpumode" underline="hover" color="text.secondary">
            Discord
          </Link>
          <Link href="https://x.com/GPU_MODE" underline="hover" color="text.secondary">
            X
          </Link>
          <Link href="https://www.youtube.com/@GPUMODE" underline="hover" color="text.secondary">
            YouTube
          </Link>
          <Link href="https://github.com/gpu-mode/" underline="hover" color="text.secondary">
            GitHub
          </Link>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
            © 2025 GPU MODE
          </Typography>
        </Container>
      </Box>
    </>
  );
}
