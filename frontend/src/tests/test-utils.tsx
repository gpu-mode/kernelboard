import { CssBaseline, ThemeProvider } from "@mui/material";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { appTheme } from "../components/common/styles/theme";

export function renderWithRouter(ui: React.ReactElement, options = {}) {
  return render(ui, { wrapper: MemoryRouter, ...options });
}

export function renderWithProviders(ui: ReactNode, route = "/kb") {
  return render(
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </ThemeProvider>,
  );
}
