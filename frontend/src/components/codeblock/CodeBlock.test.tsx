import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CodeBlock from "./CodeBlock";

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

describe("CodeBlock", () => {
  const sampleCode = `function hello() {
  console.log("Hello, world!");
}`;

  it("renders code content", () => {
    render(<CodeBlock code={sampleCode} />);
    expect(screen.getByText(/Hello, world!/)).toBeInTheDocument();
  });

  it("renders with syntax highlighting", () => {
    render(<CodeBlock code={sampleCode} language="javascript" />);
    // Check that syntax highlighter is applied - it should create a pre element
    const preElement = screen.getByRole("button").closest("[data-testid]") || document.querySelector("pre");
    expect(preElement || screen.getByText(/Hello, world!/).closest("pre")).toBeInTheDocument();
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

  it("accepts language prop for syntax highlighting", () => {
    render(<CodeBlock code="print('Hello')" language="python" />);
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
  });

  it("defaults to text language when no language specified", () => {
    render(<CodeBlock code="plain text" />);
    expect(screen.getByText("plain text")).toBeInTheDocument();
  });
});
