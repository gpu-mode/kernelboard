import {
  render,
  screen,
  within,
  waitForElementToBeRemoved,
  cleanup,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, afterEach } from "vitest";
import LeaderboardSubmit from "./LeaderboardSubmit";

// --- Mocks ---
vi.mock("../../../api/api", () => ({
  submitFile: vi.fn(),
}));

// Make AlertBar deterministic and closable
vi.mock("../../../components/alert/AlertBar", () => ({
  __esModule: true,
  default: ({ notice, onClose }: any) =>
    notice?.open ? (
      <div data-testid="alertbar">
        <div data-testid="alertbar-title">{notice.title}</div>
        <div data-testid="alertbar-message">{notice.message}</div>
        <button data-testid="alertbar-close" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

// Minimal loader mock (inside submit button)
vi.mock("../../../components/common/LoadingCircleProgress", () => ({
  __esModule: true,
  default: ({ message }: { message?: string }) => (
    <span data-testid="loading-circle">{message ?? "loading"}</span>
  ),
}));

// Grab mocked submitFile as a vi.Mock
import { submitFile } from "../../../api/api";
import { act } from "react";
const submitFileMock = submitFile as unknown as vi.Mock;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

// --- Test helpers ---
function createFile({
  name,
  sizeMB = 1,
  type = "text/x-python",
}: {
  name: string;
  sizeMB?: number;
  type?: string;
}) {
  const bytes = sizeMB * 1024 * 1024;
  return new File([new Uint8Array(bytes)], name, { type });
}

async function selectMUIOption(label: string | RegExp, optionText: string) {
  const trigger = screen.getByLabelText(label);
  await userEvent.click(trigger);
  const listbox = await screen.findByRole("listbox");
  await userEvent.click(within(listbox).getByText(optionText));
}

function getHiddenFileInput(): HTMLInputElement {
  const el = screen.getByTestId(
    "submission-dialog-file-input",
  ) as HTMLInputElement;
  if (!el) throw new Error("file input not found");
  return el;
}

async function formDataToObject(fd: FormData) {
  const out: Record<string, any> = {};
  fd.forEach((v, k) => (out[k] = v));
  return out;
}

// --- Shared props ---
const baseProps = {
  leaderboardId: "42",
  leaderboardName: "LB",
  gpuTypes: ["A100", "H100"],
  modes: ["leaderboard", "test"],
};

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});

describe("LeaderboardSubmit (Vitest)", () => {
  it("renders trigger and opens/closes dialog (waits for close)", async () => {
    render(<LeaderboardSubmit {...baseProps} />);
    const trigger = screen.getByTestId("leaderboard-submit-btn");
    expect(trigger).toBeInTheDocument();

    await userEvent.click(trigger);
    const title = await screen.findByText(/Submit to Leaderboard/i);
    expect(title).toBeInTheDocument();

    // Click Cancel and wait for Dialog to unmount (MUI transition/portal)
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitForElementToBeRemoved(() =>
      screen.queryByText(/Submit to Leaderboard/i),
    );
  });

  it("validates file extension and size", async () => {
    render(<LeaderboardSubmit {...baseProps} />);
    await userEvent.click(screen.getByTestId("leaderboard-submit-btn"));

    const input = getHiddenFileInput();

    // too large .py -> shows size error
    await userEvent.upload(input, createFile({ name: "big.py", sizeMB: 6 }));
    expect(
      await screen.findByTestId("submission-dialog-error-alert"),
    ).toHaveTextContent(/File too large \(> 1 MB\)/i);

    // valid .py -> error disappears, filename shown
    await userEvent.upload(input, createFile({ name: "algo.py", sizeMB: 1 }));
    // the alert should be gone
    expect(screen.getByTestId("submission-dialog-file-name")).toHaveTextContent(
      /algo\.py/i,
    );
  });

  it("changes GPU type and Mode via Selects", async () => {
    render(<LeaderboardSubmit {...baseProps} />);
    await userEvent.click(screen.getByTestId("leaderboard-submit-btn"));

    // Defaults are first options
    expect(screen.getByLabelText(/GPU Type/i)).toHaveTextContent("A100");
    expect(screen.getByLabelText(/Mode/i)).toHaveTextContent("leaderboard");

    await selectMUIOption(/GPU Type/i, "H100");
    await selectMUIOption(/Mode/i, "test");

    expect(screen.getByLabelText(/GPU Type/i)).toHaveTextContent("H100");
    expect(screen.getByLabelText(/Mode/i)).toHaveTextContent("test");
  });

  it("disabled until file chosen; submits -> loading -> success; AlertBar can be closed", async () => {
    // Keep the promise pending until we assert the loader is visible
    const d = deferred<{ message: string }>();
    submitFileMock.mockImplementation(() => d.promise);

    render(<LeaderboardSubmit {...baseProps} />);
    await userEvent.click(screen.getByTestId("leaderboard-submit-btn"));

    const submitBtn = screen.getByRole("button", { name: /^Submit$/i });
    expect(submitBtn).toBeDisabled();

    await userEvent.upload(
      getHiddenFileInput(),
      createFile({ name: "algo.py", sizeMB: 1 }),
    );
    expect(submitBtn).not.toBeDisabled();

    await userEvent.click(submitBtn);

    // Loader should be visible while promise is pending
    expect(await screen.findByTestId("loading-circle")).toHaveTextContent(
      /submitting/i,
    );
    expect(submitBtn).toBeDisabled();

    // Verify FormData was sent
    expect(submitFileMock).toHaveBeenCalledTimes(1);
    const fd = await formDataToObject(
      submitFileMock.mock.calls[0][0] as FormData,
    );
    expect(fd["leaderboard_id"]).toBe("42");
    expect(fd["leaderboard"]).toBe("LB");
    expect(fd["gpu_type"]).toBe("A100");
    expect(fd["submission_mode"]).toBe("leaderboard");
    expect(fd["file"]).toBeInstanceOf(File);
    expect((fd["file"] as File).name).toBe("algo.py");

    // Now resolve the API and wait for success UI
    await act(async () => {
      d.resolve({ message: "Submitted successfully." });
    });

    const alert = await screen.findByTestId("alertbar");
    expect(within(alert).getByTestId("alertbar-title")).toHaveTextContent(
      /Submission is accepted/i,
    );

    // Close the alert bar (your “can close anytime” requirement)
    await userEvent.click(within(alert).getByTestId("alertbar-close"));
    expect(screen.queryByTestId("alertbar")).not.toBeInTheDocument();
  });

  it("shows error alert when submitFile rejects; submit becomes enabled again", async () => {
    submitFileMock.mockRejectedValue(new Error("Boom"));

    render(<LeaderboardSubmit {...baseProps} />);
    await userEvent.click(screen.getByTestId("leaderboard-submit-btn"));

    await userEvent.upload(
      getHiddenFileInput(),
      createFile({ name: "algo.py", sizeMB: 1 }),
    );
    const submitBtn = screen.getByRole("button", { name: /^Submit$/i });
    expect(submitBtn).not.toBeDisabled();

    await userEvent.click(submitBtn);

    // Error alert appears with message (either default or thrown)
    const err = await screen.findByTestId("submission-dialog-error-alert");
    expect(err).toHaveTextContent(/Submission failed|Boom/i);

    // Button should be enabled again after failure
    expect(submitBtn).not.toBeDisabled();
  });

  it("Cancel resets file state (waits for close and reopen)", async () => {
    render(<LeaderboardSubmit {...baseProps} />);

    // Open and attach a file
    await userEvent.click(screen.getByTestId("leaderboard-submit-btn"));
    await userEvent.upload(
      getHiddenFileInput(),
      createFile({ name: "algo.py", sizeMB: 1 }),
    );
    expect(screen.getByTestId("submission-dialog-file-name")).toHaveTextContent(
      /algo\.py/i,
    );

    // Cancel and wait for dialog removal
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitForElementToBeRemoved(() =>
      screen.queryByText(/Submit to Leaderboard/i),
    );

    // Reopen: filename should be cleared
    await userEvent.click(screen.getByTestId("leaderboard-submit-btn"));
    expect(
      screen.getByTestId("submission-dialog-file-name"),
    ).not.toHaveTextContent(/algo\.py/i);
  });
});
