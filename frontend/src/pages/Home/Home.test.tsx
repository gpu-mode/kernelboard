import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material";
import { appTheme } from "../../components/common/styles/theme";
import Home from "./Home";
import * as apiHook from "../../lib/hooks/useApi";
import { vi } from "vitest";

// Mock the API hook
vi.mock("../../lib/hooks/useApi");

const mockCall = vi.fn();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={appTheme}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </ThemeProvider>
  );
};

describe("Home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    const mockHookReturn = {
      data: null,
      loading: true,
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    renderWithProviders(<Home />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows leaderboards when data is loaded", () => {
    const mockData = {
      leaderboards: [
        {
          id: 1,
          name: "test-leaderboard",
          deadline: "2025-12-31T23:59:59Z",
          gpu_types: ["T4", "L4"],
          priority_gpu_type: "L4",
          top_users: [
            {
              rank: 1,
              score: 0.123,
              user_name: "alice",
            },
          ],
        },
      ],
      now: "2025-01-01T00:00:00Z",
    };

    const mockHookReturn = {
      data: mockData,
      loading: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    renderWithProviders(<Home />);

    expect(screen.getByText("Leaderboards")).toBeInTheDocument();
    expect(screen.getByText("test-leaderboard")).toBeInTheDocument();
    expect(screen.getByText("T4, L4")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("shows no leaderboards message when empty", () => {
    const mockData = {
      leaderboards: [],
      now: "2025-01-01T00:00:00Z",
    };

    const mockHookReturn = {
      data: mockData,
      loading: false,
      error: null,
      errorStatus: null,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    renderWithProviders(<Home />);

    expect(screen.getByText("No active leaderboards found.")).toBeInTheDocument();
  });
});
