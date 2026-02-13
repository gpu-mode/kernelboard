import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Typography,
} from "@mui/material";
import { ConstrainedContainer } from "../../components/app-layout/ConstrainedContainer";
import { useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { DiscordIcon } from "../../components/common/DiscordDefaultIcon";
import { GoogleIcon } from "../../components/common/GoogleIcon";
import { GitHubIcon } from "../../components/common/GitHubIcon";
import AlertBar from "../../components/alert/AlertBar";

export default function Login() {
  const [params] = useSearchParams();
  const discordLoginUrl = () => {
    const loginDiscrodHref = `/api/auth/discord?next=/`;
    return loginDiscrodHref;
  };
  const googleLoginUrl = () => {
    const loginGoogleHref = `/api/auth/google?next=/`;
    return loginGoogleHref;
  };
  const githubLoginUrl = () => {
    const loginGithubHref = `/api/auth/github?next=/`;
    return loginGithubHref;
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
          : (message instanceof Error ? message.message : "Unknown error");
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
  }, [error, showError, params]);

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
                <Button
                  variant="outlined"
                  href={googleLoginUrl()}
                  size="small"
                  sx={{ borderRadius: 999 }}
                  startIcon={<GoogleIcon />}
                >
                  Continue with Google
                </Button>
                <Button
                  variant="outlined"
                  href={githubLoginUrl()}
                  size="small"
                  sx={{ borderRadius: 999 }}
                  startIcon={<GitHubIcon />}
                >
                  Continue with GitHub
                </Button>
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
