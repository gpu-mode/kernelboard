import { render, screen, waitFor } from "@testing-library/react";
import { vi, expect, it, describe } from "vitest";
import Leaderboard from "./Leaderboard";
import * as apiHook from "../../lib/hooks/useApi";

vi.mock("../../lib/hooks/useApi", () => ({
  fetcherApiCallback: vi.fn(),
}));

describe("Leaderboard", () => {
  const mockCall = vi.fn();

  it("manually triggers call and shows response", async () => {
    const mockData = {
      deadline: "2025-06-29T17:00:00-07:00",
      description: "Implement a 2Dthe given specifications",
      name: "test-game",
      gpu_types: ["T1", "T2"],
      rankings: {
        T1: [
          {
            file_name: "test.py",
            prev_score: 0.14689123399999993,
            rank: 1,
            score: 3.250463735,
            user_name: "user1",
          },
        ],
        T2: [
          {
            file_name: "test2.py",
            prev_score: 0.14689123399999993,
            rank: 1,
            score: 3.250463735,
            user_name: "user2",
          },
        ],
      },
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

    render(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText("test-game")).toBeInTheDocument();
      expect(screen.getByText("user1")).toBeInTheDocument();
      expect(screen.getByText("user2")).toBeInTheDocument();
    });
  });

  it("shows loading state", () => {
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

    render(<Leaderboard />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows error message", () => {
    const mockHookReturn = {
      data: null,
      loading: false,
      error: "Something went wrong",
      errorStatus: 500,
      call: mockCall,
    };

    (apiHook.fetcherApiCallback as ReturnType<typeof vi.fn>).mockReturnValue(
      mockHookReturn,
    );

    render(<Leaderboard />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows no submission message when no rankings are present", () => {
    const mockData = {
      name: "test-empty",
      description: "",
      deadline: "",
      gpu_types: ["T1"],
      rankings: {
        T1: [],
      },
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

    render(<Leaderboard />);
    expect(screen.getByText("test-empty")).toBeInTheDocument();
    expect(screen.getByText(/no submissions/i)).toBeInTheDocument();
  });
});
