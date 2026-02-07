import { CssBaseline, ThemeProvider } from "@mui/material";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { createAppTheme } from "../components/common/styles/theme";

export function renderWithRouter(ui: React.ReactElement, options = {}) {
  return render(ui, { wrapper: MemoryRouter, ...options });
}

export function renderWithProviders(ui: ReactNode, route = "/") {
  const theme = createAppTheme("light");
  return render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </ThemeProvider>,
  );
}
