import { Box, Container, Link, styled, Typography } from "@mui/material";
import { ConstrainedContainer } from "./ConstrainedContainer";

export const FooterLinkContainer = styled(Container)(({ theme }) => ({
  maxWidth: "100%",
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap",
  gap: theme.spacing(2),
  alignItems: "center",
}));

export const FooterBox = styled(Box)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`,
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(2),
  textAlign: "center",
}));

export default function Footer() {
  const links = [
    { label: "Discord", href: "https://discord.gg/gpumode" },
    { label: "X", href: "https://x.com/GPU_MODE" },
    { label: "YouTube", href: "https://www.youtube.com/@GPUMODE" },
    { label: "GitHub", href: "https://github.com/gpu-mode/" },
    { label: "Privacy", href: "/privacy" },
  ];

  return (
    <FooterBox>
      <ConstrainedContainer>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Thank you to Modal, Core Automation, and Northflank for supporting us.
          To sponsor GPU MODE, please{" "}
          <Link href="mailto:mark@gpumode.com" fontWeight={600}>
            reach out
          </Link>
          .
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
          }}
        >
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
        </Box>
      </ConstrainedContainer>
    </FooterBox>
  );
}
