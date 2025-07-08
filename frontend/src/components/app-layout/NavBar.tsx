// components/NavBar.tsx
import React from "react";
import { AppBar, Toolbar, Link, Box, styled } from "@mui/material";

export interface NavLink {
  label: string;
  href: string;
  external?: boolean; // 是否外链（新窗口打开）
}

const MainAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: "white",
  color: "black",
  boxShadow: "none",
  borderBottom: "1px solid #ddd",
}));

const MainToolbar = styled(Toolbar)({
  gap: 16, // 2 * 8px spacing unit
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
      sx={{ display: "flex", alignItems: "center", fontWeight: "bold" }}
    >
      ⚡ <Box ml={1}>GPU MODE</Box>
    </Link>
  );
  
  return (
    <MainAppBar position="static">
      <MainToolbar>
        {brand}
        {links.map(({ label, href, external }) => (
          <Link
            key={label}
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener" : undefined}
            underline="none"
            color="inherit"
          >
            {label}
          </Link>
        ))}
      </MainToolbar>
    </MainAppBar>
  );
}
