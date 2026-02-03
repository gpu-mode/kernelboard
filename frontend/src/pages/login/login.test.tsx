import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "./login";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../components/alert/AlertBar", () => ({
  default: ({ notice }: { notice: any }) => (
    <div
      data-testid="alert"
      data-open={String(!!notice.open)}
      data-title={notice.title ?? ""}
      data-message={notice.message ?? ""}
      data-status={notice.status ?? ""}
    />
  ),
}));

function renderLogin(initialUrl = "/login") {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Login />
    </MemoryRouter>,
  );
}

describe("<Login />", () => {
  it("renders Discord login button with correct href", () => {
    renderLogin();
    const discordBtn = screen.getByRole("link", {
      name: /continue with discord/i,
    });
    expect(discordBtn).toHaveAttribute("href", "/api/auth/discord?next=/");
  });

  it("shows error when URL has error and message", async () => {
    renderLogin("/login?error=BadAuth&message=nope");
    const alert = await screen.findByTestId("alert");
    await waitFor(() => {
      expect(alert).toHaveAttribute("data-open", "true");
      expect(alert).toHaveAttribute("data-title", "Failed to login");
      expect(alert).toHaveAttribute("data-message", "BadAuth: nope");
      expect(alert).toHaveAttribute("data-status", "401");
    });
  });

  it("stays closed when no error param", () => {
    renderLogin();
    const alert = screen.getByTestId("alert");
    expect(alert).toHaveAttribute("data-open", "false");
  });
});
