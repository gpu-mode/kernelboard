// components/NavBar.tsx
import { AppBar, Toolbar, Link, Box } from "@mui/material";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import {
  flexRowCenter,
  flexRowCenterMediumGap,
  mediumText,
} from "../common/styles/shared_style";
import FlashOnOutlinedIcon from "@mui/icons-material/FlashOnOutlined";
import { appBarStyle, brandStyle, flashIconStyle } from "./styles";
import { ConstrainedContainer } from "./ConstrainedContainer";
import NavUserProfile from "./NavUserProfile";

export interface NavLink {
  label: string;
  href: string;
  external?: boolean; // 是否外链（新窗口打开）
}

export default function NavBar() {
  const links: NavLink[] = [
    { label: "News", href: "/v2/news" },
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

  const Brand = () => (
    <Box sx={brandStyle}>
      <Link href="/v2/" underline="none" color="inherit">
        <Box sx={{ ...flexRowCenter }}>
          <FlashOnOutlinedIcon sx={flashIconStyle} />
          <Box>GPU MODE</Box>
        </Box>
      </Link>
    </Box>
  );

  return (
    <AppBar position="fixed" sx={appBarStyle}>
      <ConstrainedContainer>
        <Toolbar sx={{ px: 0, gap: 2 }}>
          {/* Left: Brand */}
          <Brand />

          {/* Middle: Links */}
          <Box sx={{ ...flexRowCenterMediumGap, ml: 3 }}>
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
                  {external && (
                    <ArrowOutwardIcon sx={{ fontSize: 18, ml: 0.5 }} />
                  )}
                </Box>
              </Link>
            ))}
          </Box>
          <Box sx={{ ml: "auto" }}>
            <NavUserProfile />
          </Box>
        </Toolbar>
      </ConstrainedContainer>
    </AppBar>
  );
}
