import "./App.css";

// client/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/app-layout/AppLayout";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { createAppTheme } from "./components/common/styles/theme";
import Home from "./pages/home/Home";
import ErrorPage from "./pages/Error";
import Loading from "./components/common/loading";
import { useAuthStore } from "./lib/store/authStore";
import { useThemeStore } from "./lib/store/themeStore";
import { lazy, Suspense, useEffect, useMemo } from "react";

const Leaderboard = lazy(() => import("./pages/leaderboard/Leaderboard"));
const LeaderboardEditor = lazy(
  () => import("./pages/leaderboard/LeaderboardEditor"),
);
const News = lazy(() => import("./pages/news/News"));
const WorkingGroups = lazy(
  () => import("./pages/working-groups/WorkingGroups"),
);
const Lectures = lazy(() => import("./pages/lectures/Lectures"));
const Live = lazy(() => import("./pages/live/Live"));
const Login = lazy(() => import("./pages/login/login"));
const Privacy = lazy(() => import("./pages/privacy/Privacy"));

const errorRoutes = [
  {
    path: "/401",
    code: 401,
    title: "Unauthorized",
    description: "You don't have access to this page.",
  },
  {
    path: "/500",
    code: 500,
    title: "Internal Server Error",
    description: "Something went wrong on our side.",
  },
  {
    path: "*",
    code: 404,
    title: "Page Not Found",
    description: "The page you're looking for doesn't exist.",
  },
];

function App() {
  // fetch user info on app
  const fetchMe = useAuthStore((s) => s.fetchMe);
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const resolvedMode = useThemeStore((s) => s.resolvedMode);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const theme = useMemo(() => createAppTheme(resolvedMode), [resolvedMode]);

  // Listen for OS-level dark mode changes when mode is "system"
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setMode("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode, setMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter basename="">
        <AppLayout>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<Home />} />
              <Route path="/leaderboard/:id" element={<Leaderboard />} />
              <Route
                path="/leaderboard/:id/editor"
                element={<LeaderboardEditor />}
              />
              <Route path="/news" element={<News />} />
              <Route path="/news/:slug" element={<News />} />
              <Route path="/working-groups" element={<WorkingGroups />} />
              <Route path="/events" element={<Lectures />} />
              <Route path="/lectures" element={<Lectures />} />
              <Route path="/live" element={<Live />} />
              <Route path="/login" element={<Login />} />
              <Route path="/privacy" element={<Privacy />} />
              {/* error handling page */}
              {errorRoutes.map(({ path, code, title, description }) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    <ErrorPage
                      code={code}
                      title={title}
                      description={description}
                    />
                  }
                />
              ))}
            </Routes>
          </Suspense>
        </AppLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
