// components/NavBar.tsx
import { AppBar, Toolbar, Link, Box, IconButton, Tooltip } from "@mui/material";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
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
    { label: "Events", href: "/events" },
    { label: "Projects", href: "/working-groups" },
  ];

  const Brand = () => (
    <Box
      sx={{
        ...brandStyle,
        position: { xs: "sticky", sm: "static" },
        left: 0,
        zIndex: 1,
        bgcolor: "background.paper",
      }}
    >
      <Link
        href="/home"
        aria-label="GPU MODE home"
        underline="none"
        color="inherit"
        sx={{ display: "block" }}
      >
        <Box
          sx={{
            ...flexRowCenter,
            display: { xs: "flex", sm: "none" },
            minHeight: 44,
            px: 0.5,
            fontSize: "1rem",
            fontWeight: 600,
          }}
        >
          <HomeRoundedIcon sx={{ fontSize: 22 }} />
          Home
        </Box>
        <Box sx={{ display: { xs: "none", sm: "flex" } }}>
          <Box
            component="img"
            src={logoSrc}
            alt=""
            sx={{
              height: 32,
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
        <Toolbar sx={{ px: 0, gap: { xs: 1, sm: 2 }, overflowX: "auto" }}>
          {/* Left: Brand */}
          <Brand />

          {/* Middle: Links */}
          <Box
            sx={{
              ...flexRowCenterMediumGap,
              gap: { xs: 2.5, sm: 5 },
              ml: { xs: 0, sm: 3 },
              flexShrink: 0,
            }}
          >
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

          <Box
            sx={{
              ml: "auto",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
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
