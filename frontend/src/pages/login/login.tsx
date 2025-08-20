import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { ConstrainedContainer } from "../../components/app-layout/ConstrainedContainer";
import { useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { DiscordIcon } from "../../components/common/DiscordDefaultIcon";
import AlertBar from "../../components/alert/AlertBar";

export default function Login() {
  const [params] = useSearchParams();
  const discordLoginUrl = () => {
    const loginDiscrodHref = `/api/auth/discord?next=/kb/`;
    return loginDiscrodHref;
  };
  const error = params.get("error");

  const [err, setErr] = useState<{
    open: boolean;
    message: string;
    status: number | null;
    title?: string;
  }>({
    open: false,
    message: "",
    status: null,
    title: "",
  });

  const showError = useCallback(
    (title: string, message: unknown, status: number | null = null) => {
      const msg =
        typeof message === "string"
          ? message
          : ((message as any)?.message ?? "Unknown error");
      const t = title ?? "Error";
      setErr({ open: true, message: msg, status, title: t });
    },
    [],
  );

  useEffect(() => {
    if (error) {
      const msg = params.get("message");
      const errorMsg = msg ? error + ": " + msg : error;
      showError("Failed to login", errorMsg, 401);
    }
  }, [error, showError]);

  return (
    <>
      <ConstrainedContainer>
        <Box
          sx={{
            minHeight: "100dvh",
            display: "grid",
            placeItems: "center",
            bgcolor: (t) => (t.palette.mode === "dark" ? "#0b0d12" : "#f6f7fb"),
            p: 2,
          }}
        >
          <Card
            elevation={8}
            sx={{ width: 420, maxWidth: "92vw", borderRadius: 3 }}
          >
            <CardHeader
              title={
                <Typography
                  component="h1"
                  variant="h5"
                  fontWeight={700}
                  textAlign="center"
                >
                  Welcome
                </Typography>
              }
              subheader={
                <Typography
                  variant="body2"
                  color="text.secondary"
                  textAlign="center"
                >
                  Sign in to continue
                </Typography>
              }
            />
            <CardContent>
              <Stack spacing={2.5}>
                <Button
                  variant="outlined"
                  href={discordLoginUrl()}
                  size="small"
                  sx={{ borderRadius: 999 }}
                  startIcon={<DiscordIcon />}
                >
                  Continue with Discord
                </Button>
                <Divider>or</Divider>
                <Stack spacing={1}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    textAlign="center"
                  >
                    More providers coming soon
                  </Typography>
                  <Button variant="outlined" size="large" disabled>
                    GitHub (soon)
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Box>
        <AlertBar
          notice={{
            open: err.open,
            message: err.message,
            title: err.title,
            severity: "error",
            status: err.status,
          }}
          onClose={() => {
            setErr({ ...err, open: false });
          }}
        />
      </ConstrainedContainer>
    </>
  );
}
