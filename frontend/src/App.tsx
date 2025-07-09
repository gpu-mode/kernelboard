import "./App.css";

// client/src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import About from "./pages/About";
import AppLayout from "./components/app-layout/AppLayout";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { appTheme } from "./components/common/styles/theme";

function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <BrowserRouter basename="/kb">
        <AppLayout>
          <Routes>
            <Route path="/about" element={<About />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
