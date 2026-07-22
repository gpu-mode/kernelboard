import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { describe, expect, it } from "vitest";
import { appTheme } from "../common/styles/theme";
import Footer from "./Footer";

describe("Footer", () => {
  it("shows the site-wide sponsor message and contact link", () => {
    render(
      <ThemeProvider theme={appTheme}>
        <Footer />
      </ThemeProvider>,
    );

    expect(
      screen.getByText(/Modal, Core Automation, and Northflank/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "reach out" })).toHaveAttribute(
      "href",
      "mailto:mark@gpumode.com",
    );
  });
});
