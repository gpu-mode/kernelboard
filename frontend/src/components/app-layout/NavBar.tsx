// components/NavBar.tsx
import React from 'react';
import { AppBar, Toolbar, Link, Box } from '@mui/material';

export interface NavLink {
  label: string;
  href: string;
  external?: boolean; // 是否外链（新窗口打开）
}

interface NavBarProps {
  brand?: React.ReactNode;
  links?: NavLink[];
}

const defaultLinks: NavLink[] = [
  { label: 'News', href: '/news' },
  { label: 'Lectures', href: 'https://www.youtube.com/@GPUMODE', external: true },
  { label: 'Resources', href: 'https://github.com/gpu-mode/resource-stream', external: true },
  { label: 'Docs', href: 'https://gpu-mode.github.io/discord-cluster-manager/docs/intro', external: true },
];

export default function NavBar({
  brand = (
    <Link
      href="/"
      underline="none"
      color="inherit"
      sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}
    >
      ⚡ <Box ml={1}>GPU MODE</Box>
    </Link>
  ),
  links = defaultLinks,
}: NavBarProps) {
  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: 'white',
        color: 'black',
        boxShadow: 'none',
        borderBottom: '1px solid #ddd',
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        {brand}
        {links.map(({ label, href, external }) => (
          <Link
            key={label}
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener' : undefined}
            underline="none"
            color="inherit"
          >
            {label}
          </Link>
        ))}
      </Toolbar>
    </AppBar>
  );
}
