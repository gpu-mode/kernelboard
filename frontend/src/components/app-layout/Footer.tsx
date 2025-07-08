import { Box, Container, Link, styled, Typography } from "@mui/material";

export const FooterLinkContainer = styled(Container)(({ theme }) => ({
  maxWidth: "100%",
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap",
  gap: theme.spacing(2),
  alignItems: "center",
}));

export default function Footer() {
  const links = [
    { label: "Discord", href: "https://discord.gg/gpumode" },
    { label: "X", href: "https://x.com/GPU_MODE" },
    { label: "YouTube", href: "https://www.youtube.com/@GPUMODE" },
    { label: "GitHub", href: "https://github.com/gpu-mode/" },
  ];

  return (
    <Box
      component="footer"
      sx={{
        borderTop: "1px solid #ddd",
        py: 2,
        textAlign: "center",
      }}
    >
      <FooterLinkContainer>
        {links.map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            underline="hover"
            color="text.secondary"
          >
            {label}
          </Link>
        ))}
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          © 2025 GPU MODE
        </Typography>
      </FooterLinkContainer>
    </Box>
  );
}
