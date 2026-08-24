/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import { Alert, Progress, Spinner } from "./feedback";

describe("Alert", () => {
  it("uses alert semantics for danger and status otherwise", () => {
    const { rerender } = render(<Alert intent="danger" title="Failed" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed");
    rerender(<Alert intent="info" title="Note" />);
    expect(screen.getByRole("status")).toHaveTextContent("Note");
  });

  it("fires onDismiss from the close control", () => {
    const onDismiss = jest.fn();
    render(<Alert intent="info" title="x" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe("Progress", () => {
  it("reports a determinate value", () => {
    render(<Progress value={42} label="Import" />);
    const bar = screen.getByRole("progressbar", { name: "Import" });
    expect(bar).toHaveAttribute("aria-valuenow", "42");
  });

  it("omits value bounds when indeterminate", () => {
    render(<Progress label="Connecting" />);
    const bar = screen.getByRole("progressbar", { name: "Connecting" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
  });

  it("clamps out-of-range values", () => {
    render(<Progress value={140} label="p" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });
});

describe("Spinner", () => {
  it("announces a loading status", () => {
    render(<Spinner label="Running query" />);
    expect(screen.getByRole("status")).toHaveTextContent("Running query");
  });
});
