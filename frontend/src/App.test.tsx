import { describe, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

describe("App", () => {
  it("renders the App component", () => {
    // lead route to /kb/about for unit testing
    <MemoryRouter initialEntries={["/kb/about"]}>
      render(<App />);
    </MemoryRouter>
    screen.debug(); // prints out the jsx in the App component unto the command line
  });
});
