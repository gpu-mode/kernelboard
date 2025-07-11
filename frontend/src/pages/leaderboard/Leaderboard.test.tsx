import { render, screen, fireEvent, within } from "@testing-library/react";
import { vi, expect, it, describe } from "vitest";
import Leaderboard from "./Leaderboard";
import * as apiHook from "../../lib/hooks/useApi";

vi.mock("../../lib/hooks/useApi", () => ({
  fetcherApiCallback: vi.fn(),
}));

const mockDeadline = "2025-06-29T17:00:00-07:00";
const mockDescription = "Implement a 2Dthe given specifications";
const mockReference = "import torch";
const mockName = "test-game";

describe("Leaderboard", () => {
  const mockCall = vi.fn();
  it("renders nam, description, gpu types and rankings", async () => {
    // setup
    const mockData = {
      deadline: mockDeadline,
      description: mockDescription,
      name: mockName,
      reference: mockReference,
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

    // render
    render(<Leaderboard />);

    // asserts
    expect(screen.getByText(mockName)).toBeInTheDocument();

    expect(screen.getByText(/reference implementation/i)).toBeInTheDocument();
    expect(screen.getByText(mockReference)).toBeInTheDocument();

    expect(screen.getByText(/description/i)).toBeInTheDocument();
    expect(screen.getByText(mockDescription)).toBeInTheDocument();

    expect(screen.getByText("user1")).toBeInTheDocument();
    expect(screen.getByText("user2")).toBeInTheDocument();
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
    // setup
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

    // render
    render(<Leaderboard />);

    // asserts
    expect(screen.getByText("test-empty")).toBeInTheDocument();
    expect(screen.getByText(/no submissions/i)).toBeInTheDocument();
  });

  it("does not show expand button if ranking is less than 4 items", () => {
    // setup
    const mockData = {
      name: "test-empty",
      description: " ",
      deadline: "",
      gpu_types: ["T1"],
      referece: "",
      rankings: {
        T1: [
          {
            file_name: "test.py",
            prev_score: 0.14689123399999993,
            rank: 1,
            score: 3.250463735,
            user_name: "user1",
          },
          {
            file_name: "test.py",
            prev_score: 0.14689123399999993,
            rank: 2,
            score: 3.250463735,
            user_name: "user2",
          },
          {
            file_name: "test.py",
            prev_score: 0.14689123399999993,
            rank: 3,
            score: 3.250463735,
            user_name: "user3",
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

    // render
    render(<Leaderboard />);

    // asserts
    expect(
      screen.queryByTestId("ranking-show-all-button-0"),
    ).not.toBeInTheDocument();
  });

  it("does show expand button if ranking is more than 3 items", () => {
    // setup
    const mockData = {
      name: "test-empty",
      description: " ",
      deadline: "",
      gpu_types: ["T1"],
      referece: "",
      rankings: {
        T1: [
          {
            file_name: "test.py",
            prev_score: 0.14689123399999993,
            rank: 1,
            score: 3.250463735,
            user_name: "user1",
          },
          {
            file_name: "test.py",
            prev_score: 0.14689123399999993,
            rank: 2,
            score: 3.250463735,
            user_name: "user2",
          },
          {
            file_name: "test.py",
            prev_score: 0.14689123399999993,
            rank: 3,
            score: 3.250463735,
            user_name: "user3",
          },
          {
            file_name: "test.py",
            prev_score: 0.14689123399999993,
            rank: 4,
            score: 3.250463735,
            user_name: "user4",
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

    // render
    render(<Leaderboard />);

    // asserts
    const button = screen.queryByTestId("ranking-show-all-button-0");
    expect(button).toBeInTheDocument();
    expect(screen.queryAllByTestId("ranking-0-row")).toHaveLength(3);
    expect(within(button!).getByText(/Show all/i)).toBeInTheDocument();

    // click button
    fireEvent.click(button!);
    expect(within(button!).getByText(/Hide/i)).toBeInTheDocument();
    expect(screen.queryAllByTestId("ranking-0-row")).toHaveLength(4);
  });

  it("toggles expanded state for codeblock on click", () => {
    // setup
    const mockData = {
      name: "test-empty",
      description: " ",
      deadline: "",
      gpu_types: ["T1"],
      referece: "",
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

    // render
    render(<Leaderboard />);

    // asserts
    const toggle = screen.getByTestId("codeblock-show-all-toggle");
    expect(within(toggle).getByText(/show more/i)).toBeInTheDocument();

    // Click to expand
    fireEvent.click(toggle);
    expect(within(toggle).getByText(/hide/i)).toBeInTheDocument();

    // Click to collapse again
    fireEvent.click(toggle);
    expect(within(toggle).getByText(/show more/i)).toBeInTheDocument();
  });
});
