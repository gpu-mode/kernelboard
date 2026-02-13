import { useState } from "react";
import {
  Avatar,
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
  type AlertColor,
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import LoginIcon from "@mui/icons-material/Login";
import AlertBar from "../alert/AlertBar";
import { useAuthStore } from "../../lib/store/authStore";
// Optional: reduce re-renders

const styles = {
  loginButoon: {
    borderRadius: 300,
    padding: "5px 10px", // top/bottom, left/right
  },
};

export default function NavUserProfile() {
  const me = useAuthStore((s) => s.me);
  const loading = useAuthStore((s) => s.loading);
  const logoutAndRefresh = useAuthStore((s) => s.logoutAndRefresh);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    title?: string;
    severity?: AlertColor;
  }>({ open: false, message: "", title: "", severity: "info" });

  const menuOpen = Boolean(anchorEl);
  const handleOpen = (e: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  const onLogout = async () => {
    closeMenu();

    const result = await logoutAndRefresh();
    if (result.ok) {
      setNotification({
        open: true,
        title: "Success",
        message: "Successfully logged out",
        severity: "success",
      });
    } else {
      setNotification({
        open: true,
        title: "Logout failed",
        message: result.error?.message ?? "Unknown error, please try again",
        severity: "error",
      });
    }
  };

  const defaultUser = () => (
    <Tooltip title="Login">
      <Button
        variant="outlined"
        href={"/login"}
        size="small"
        sx={styles.loginButoon}
        startIcon={<LoginIcon />}
        data-testid="login-btn"
      >
        Login
      </Button>
    </Tooltip>
  );

  if (loading) return <div />;

  const isAuthed = !!(me && me.authenticated);
  const name = me?.user?.display_name ?? "unknown";
  const avatarUrl = me?.user?.avatar_url ?? undefined;
  return (
    <>
      {isAuthed ? (
        <>
          <Tooltip title={name}>
            <IconButton
              onClick={handleOpen}
              size="small"
              sx={{ ml: 1 }}
              aria-controls={menuOpen ? "user-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={menuOpen ? "true" : undefined}
              data-testid="profile-avatar"
            >
              {avatarUrl ? (
                <Avatar
                  src={avatarUrl}
                  alt={name}
                  sx={{ width: 32, height: 32 }}
                >
                  {name?.[0]}
                </Avatar>
              ) : (
                <AccountCircleIcon />
              )}
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            id="user-menu"
            open={menuOpen}
            onClose={closeMenu}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <MenuItem disabled data-testid="profile-btn">
              <ListItemIcon>
                <AccountCircleIcon fontSize="small" />
              </ListItemIcon>
              {name} (Coming soon)
            </MenuItem>
            <Divider />
            <MenuItem onClick={onLogout} data-testid="logout-btn">
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </>
      ) : (
        defaultUser()
      )}
      {/* Always render snackbar so it shows even after auth state changes */}
      <AlertBar
        notice={notification}
        onClose={() => setNotification({ ...notification, open: false })}
      />
    </>
  );
}
