// components/NavBar.tsx
import { AppBar, Toolbar, Link, Box, IconButton, Tooltip } from "@mui/material";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import { useTheme } from "@mui/material/styles";
import {
  flexRowCenter,
  flexRowCenterMediumGap,
  mediumText,
} from "../common/styles/shared_style";
import { appBarStyle, brandStyle } from "./styles";
import { ConstrainedContainer } from "./ConstrainedContainer";
import NavUserProfile from "./NavUserProfile";
import { useThemeStore } from "../../lib/store/themeStore";

export interface NavLink {
  label: string;
  href: string;
  external?: boolean; // 是否外链（新窗口打开）
}

export default function NavBar() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const logoSrc = isDark
    ? "/gpu-mode-logo/white-cropped.svg"
    : "/gpu-mode-logo/black-cropped.svg";

  const cycleMode = () => {
    const next =
      mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
    setMode(next);
  };

  const modeIcon =
    mode === "light" ? (
      <LightModeIcon />
    ) : mode === "dark" ? (
      <DarkModeIcon />
    ) : (
      <SettingsBrightnessIcon />
    );

  const modeLabel =
    mode === "light"
      ? "Switch to dark mode"
      : mode === "dark"
        ? "Switch to system preference"
        : "Switch to light mode";

  const links: NavLink[] = [
    { label: "News", href: "/news" },
    { label: "Lectures", href: "/lectures" },
    { label: "Projects", href: "/working-groups" },
    {
      label: "Resources",
      href: "https://github.com/gpu-mode/resource-stream",
      external: true,
    },
  ];

  const Brand = () => (
    <Box sx={brandStyle}>
      <Link href="/" underline="none" color="inherit">
        <Box sx={{ ...flexRowCenter }}>
          <Box
            component="img"
            src={logoSrc}
            alt="GPU MODE"
            sx={{
              height: { xs: 24, sm: 32 },
              maxWidth: "100%",
            }}
          />
        </Box>
      </Link>
    </Box>
  );

  return (
    <AppBar position="fixed" sx={appBarStyle}>
      <ConstrainedContainer>
        <Toolbar sx={{ px: 0, gap: 2, overflowX: "auto" }}>
          {/* Left: Brand */}
          <Brand />

          {/* Middle: Links */}
          <Box sx={{ ...flexRowCenterMediumGap, ml: 3, flexShrink: 0 }}>
            {links.map(({ label, href, external }) => (
              <Link
                key={label}
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener" : undefined}
                underline="none"
                color="inherit"
                sx={{ whiteSpace: "nowrap" }}
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

          <Box sx={{ ml: "auto", flexShrink: 0, display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title={modeLabel}>
              <IconButton onClick={cycleMode} color="inherit" size="small">
                {modeIcon}
              </IconButton>
            </Tooltip>
            <NavUserProfile />
          </Box>
        </Toolbar>
      </ConstrainedContainer>
    </AppBar>
  );
}
