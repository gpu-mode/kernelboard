import { useEffect, useState } from "react";
import { fetcherApiCallback } from "../../lib/hooks/useApi";
import { getMe, login, logout } from "../../api/api";
import { ErrorAlert } from "../error-alert/ErrorAlert";
import { Avatar, Button, Divider, IconButton, ListItemIcon, Menu, MenuItem, Tooltip } from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";

export type MeResponse = {
  authenticated: boolean;
  user: {
    id: string | null;
    provider: string | null;
    identity: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  login_url: string;   // e.g. /api/auth/discord
  logout_url: string;  // e.g. /api/logout (POST)
};


export default function NavUserProfile() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const { data, loading, error, errorStatus, call } = fetcherApiCallback(getMe);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  useEffect(() => {
    call();
  }, []);

  if (loading) return <div></div>;
  if (error) return <ErrorAlert status={errorStatus} message={error} />;
  const me = data as MeResponse;

  const nextParam = encodeURIComponent(window.location.pathname + window.location.search);


  const onLogout = async () => {
    try {
        await logout();
    } catch (e) {
        // optional: surface error toast
        console.error(e);
    } finally {
        handleClose();
        // Refresh auth state so the UI switches to "Login"
        await call?.();      // if you're using fetcherApiCallback(getMe)
        // or: await refresh?.();
        // or: window.location.assign("/kb/?logout=ok");
    }
};


  if (!me.authenticated) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    const loginHref = `/api/auth/discord?next=${next}`;
    return (
      <Tooltip title="Login with Discord">
        <Button
          variant="outlined"
          
          size="small"
          sx={{ borderRadius: 999 }}
          startIcon={
            <img
              src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/discord.svg"
              alt="Discord"
              width={18}
              height={18}
              style={{ display: "block" }}
            />
          }
        >
          Login
        </Button>
      </Tooltip>
    );
  }

  const name = me.user.display_name ?? "Profile";
  const avatarUrl = me.user.avatar_url ?? undefined;
  return (
    <>
      <Tooltip title={name}>
        <IconButton onClick={handleOpen} size="small" sx={{ ml: 1 }} aria-controls={open ? "user-menu" : undefined} aria-haspopup="true" aria-expanded={open ? "true" : undefined}>
          <Avatar src={avatarUrl} alt={name} sx={{ width: 32, height: 32 }}>
            {name?.[0]}
          </Avatar>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        id="user-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <MenuItem component="a" href="/kb/profile">
          <ListItemIcon>
            <AccountCircleIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <Divider />
        <MenuItem onClick={onLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </>
  );
}
