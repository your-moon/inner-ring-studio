/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  BulkActionBar,
  CommandRow,
  InspectorPanel,
  NotificationItem,
  PropertyRow,
} from "./panels";

describe("BulkActionBar", () => {
  it("renders when rows are selected and clears", () => {
    const onClear = jest.fn();
    const { rerender } = render(
      <BulkActionBar count={0} onClear={onClear}>
        <button>Move</button>
      </BulkActionBar>,
    );
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    rerender(
      <BulkActionBar count={3} onClear={onClear}>
        <button>Move</button>
      </BulkActionBar>,
    );
    expect(screen.getByRole("toolbar", { name: "3 selected" })).toBeInTheDocument();
    expect(screen.getByText("3 selected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe("InspectorPanel", () => {
  it("shows a title and closes", () => {
    const onClose = jest.fn();
    render(
      <InspectorPanel title="PM-142" onClose={onClose}>
        body
      </InspectorPanel>,
    );
    expect(screen.getByText("PM-142")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("PropertyRow", () => {
  it("pairs a label with its value", () => {
    render(<PropertyRow label="Status">shipped</PropertyRow>);
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("shipped")).toBeInTheDocument();
  });
});

describe("NotificationItem", () => {
  it("renders title, detail and time", () => {
    render(
      <NotificationItem unread title="New comment" detail="on PM-142" time="2h" />,
    );
    expect(screen.getByText("New comment")).toBeInTheDocument();
    expect(screen.getByText("2h")).toBeInTheDocument();
  });
});

describe("CommandRow", () => {
  it("fires its click handler", () => {
    const onClick = jest.fn();
    render(<CommandRow label="Run query" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: /Run query/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
