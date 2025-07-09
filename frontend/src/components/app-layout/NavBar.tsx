// components/NavBar.tsx
import { AppBar, Toolbar, Link, Box, styled } from "@mui/material";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import {
  flexRowCenter,
  flexRowCenterMediumGap,
  mediumText,
} from "../common/styles/shared_style";
import FlashOnOutlinedIcon from "@mui/icons-material/FlashOnOutlined";
import { flashIconStyle } from "./styles";

export interface NavLink {
  label: string;
  href: string;
  external?: boolean; // 是否外链（新窗口打开）
}

const MainAppBar = styled(AppBar)(({}) => ({
  backgroundColor: "white",
  color: "black",
  boxShadow: "none",
  borderBottom: "1px solid #ddd",
  width: "100%",
  maxWidth: "100vw",
}));

const MainToolbar = styled(Toolbar)({
  gap: 16, // 2 * 8px spacing unit
});

const MainNavBarTitle = styled(Box)({
  marginRight: 30, // 2 * 8px spacing unit
});

export default function NavBar() {
  const links: NavLink[] = [
    { label: "News", href: "/news" },
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

  const brand = (
    <Link
      href="/"
      underline="none"
      color="inherit"
      sx={{ ...flexRowCenter, ...mediumText, fontWeight: "bold" }}
    >
      <Box sx={{ ...flexRowCenter, ...mediumText }}>
        <FlashOnOutlinedIcon sx={flashIconStyle} /> <Box>GPU MODE</Box>
      </Box>
    </Link>
  );

  return (
    <MainAppBar position="static">
      <MainToolbar>
        <MainNavBarTitle>{brand}</MainNavBarTitle>
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
      </MainToolbar>
    </MainAppBar>
  );
}
