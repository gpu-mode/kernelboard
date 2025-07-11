import "./App.css";

// client/src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import About from "./pages/About";
import AppLayout from "./components/app-layout/AppLayout";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { appTheme } from "./components/common/styles/theme";
import Leaderboard from "./pages/leaderboard/Leaderboard";

function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <BrowserRouter basename="/kb">
        <AppLayout>
          <Routes>
            <Route path="/about" element={<About />} />
            <Route path="/leaderboard/:id" element={<Leaderboard />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
