import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

export function renderWithRouter(ui: React.ReactElement, options = {}) {
  return render(ui, { wrapper: MemoryRouter, ...options });
}
