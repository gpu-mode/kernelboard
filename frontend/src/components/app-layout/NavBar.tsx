// components/NavBar.tsx
import { AppBar, Toolbar, Link, Box, styled } from "@mui/material";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import {
  flexRowCenter,
  flexRowCenterMediumGap,
  mediumText,
} from "../common/styles/shared_style";
import FlashOnOutlinedIcon from "@mui/icons-material/FlashOnOutlined";
import { appBarStyle, brandStyle, flashIconStyle } from "./styles";

export interface NavLink {
  label: string;
  href: string;
  external?: boolean; // 是否外链（新窗口打开）
}

export default function NavBar() {
  const links: NavLink[] = [
    { label: "News", href: "/kb/news" },
    {
      label: "Lectures",
      href: "https://www.youtube.com/@GPUMODE",
      external: true,
    },
    {
      label: "Resources",
      href: "https://github.com/gpu-mode/resource-stream",
      external: true,
    },
    {
      label: "Docs",
      href: "https://gpu-mode.github.io/discord-cluster-manager/docs/intro",
      external: true,
    },
  ];

  const Brand = () => {
    return (
      <Box sx={brandStyle}>
        <Link href="/" underline="none" color="inherit">
          <Box sx={{ ...flexRowCenter }}>
            <FlashOnOutlinedIcon sx={flashIconStyle} />
            <Box>GPU MODE</Box>
          </Box>
        </Link>
      </Box>
    );
  };

  return (
    <AppBar position="fixed" sx={appBarStyle}>
      <Toolbar>
        <Brand />
        <Box sx={flexRowCenterMediumGap}>
          {links.map(({ label, href, external }) => (
            <Link
              key={label}
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener" : undefined}
              underline="none"
              color="inherit"
            >
              <Box sx={{ ...flexRowCenter, ...mediumText }}>
                {label}
                {external && <ArrowOutwardIcon sx={{ fontSize: 18 }} />}
              </Box>
            </Link>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
