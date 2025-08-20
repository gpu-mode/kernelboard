import { expect, test } from "vitest";
import { useAuthStore } from "../../lib/store/authStore";
import { renderWithProviders } from "../../tests/test-utils";
import { fireEvent, screen, within } from "@testing-library/react";
import NavUserProfile from "./NavUserProfile";

test("shows Login when unauthenticated", () => {
  useAuthStore.setState({
    ...useAuthStore.getState(),
    loading: false,
    me: {
      authenticated: false,
      user: {
        id: null,
        provider: null,
        identity: null,
        display_name: null,
        avatar_url: null,
      },
    },
  });

  renderWithProviders(<NavUserProfile />);
  expect(screen.getByTestId("login-btn")).toBeInTheDocument();
});

test("shows info when authenticated", () => {
  useAuthStore.setState({
    ...useAuthStore.getState(),
    loading: false,
    me: {
      authenticated: true,
      user: {
        id: "test-id-1",
        provider: "discord",
        identity: "123",
        display_name: "sara",
        avatar_url: "fake.com",
      },
    },
  });

  renderWithProviders(<NavUserProfile />);
  const avatar = screen.getByTestId("profile-avatar");
  const img = within(avatar).getByRole("img", { name: /sara/i });
  expect(img).toHaveAttribute("src", "fake.com");

  fireEvent.click(avatar);

  expect(screen.getByTestId("profile-btn")).toBeInTheDocument();
  expect(screen.getByTestId("logout-btn")).toBeInTheDocument();
});
