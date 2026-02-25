import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CodeBlock from "./CodeBlock";

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

// Mock ResizeObserver (jsdom doesn't implement it)
beforeEach(() => {
  window.ResizeObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn((element: Element) => {
      // Simulate measurement on next microtask
      Promise.resolve().then(() =>
        callback(
          [{ target: element, contentRect: { height: 600, width: 800 } }],
          {} as ResizeObserver,
        ),
      );
    }),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as unknown as typeof ResizeObserver;
});

function generateLongCode(lines: number): string {
  return Array.from(
    { length: lines },
    (_, i) => `x = ${i}  # line ${i + 1}`,
  ).join("\n");
}

describe("CodeBlock", () => {
  const sampleCode = `function hello() {
  console.log("Hello, world!");
}`;

  it("renders code content", () => {
    render(<CodeBlock code={sampleCode} />);
    expect(screen.getByText(/Hello, world!/)).toBeInTheDocument();
  });

  it("renders with Python syntax highlighting", () => {
    render(<CodeBlock code={sampleCode} />);
    // Check that syntax highlighter is applied - it should create a pre element
    const preElement =
      screen.getByRole("button").closest("[data-testid]") ||
      document.querySelector("pre");
    expect(
      preElement || screen.getByText(/Hello, world!/).closest("pre"),
    ).toBeInTheDocument();
  });

  it("copies code to clipboard when copy button is clicked", async () => {
    const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText");

    render(<CodeBlock code={sampleCode} />);

    const copyButton = screen.getByRole("button");
    fireEvent.click(copyButton);

    expect(writeTextSpy).toHaveBeenCalledWith(sampleCode);

    // Check tooltip changes to "Copied!" - it's in aria-label
    await waitFor(() => {
      expect(copyButton).toHaveAttribute("aria-label", "Copied!");
    });
  });

  it("handles Python code properly", () => {
    render(<CodeBlock code="print('Hello')" />);
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
  });

  describe("virtualization", () => {
    it("does not virtualize short code", async () => {
      render(<CodeBlock code={sampleCode} />);
      // Wait for rAF
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      // Short code should use a <pre> or standard SyntaxHighlighter, not FixedSizeList
      expect(document.querySelector("pre")).toBeInTheDocument();
    });

    it("virtualizes code with more than 200 lines", async () => {
      const longCode = generateLongCode(300);
      render(<CodeBlock code={longCode} />);

      // Wait for rAF + ResizeObserver
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // FixedSizeList renders a container with explicit height
      await waitFor(() => {
        const listContainer = document.querySelector(
          '[style*="height: 600px"]',
        );
        expect(listContainer).toBeInTheDocument();
      });
    });

    it("does not virtualize when bordered is true", async () => {
      const longCode = generateLongCode(300);
      render(<CodeBlock code={longCode} bordered />);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Should not have a FixedSizeList container
      const listContainer = document.querySelector(
        '[style*="height: 600px"]',
      );
      expect(listContainer).not.toBeInTheDocument();
    });

    it("copy button works with virtualized code", async () => {
      const longCode = generateLongCode(300);
      const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText");
      render(<CodeBlock code={longCode} />);

      const copyButton = screen.getByRole("button");
      fireEvent.click(copyButton);

      expect(writeTextSpy).toHaveBeenCalledWith(longCode);
    });
  });
});
