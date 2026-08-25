/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { AvatarGroup } from "./avatar-group";
import { FilterChip } from "./filters";
import { StatusPicker } from "./pickers";
import { ViewTabs } from "./view-tabs";

describe("ViewTabs", () => {
  it("marks the active tab and switches", () => {
    function Harness() {
      const [v, setV] = useState("active");
      return (
        <ViewTabs
          value={v}
          onChange={setV}
          tabs={[
            { value: "active", label: "Active", count: 12 },
            { value: "all", label: "All", count: 46 },
          ]}
        />
      );
    }
    render(<Harness />);
    expect(screen.getByRole("tab", { name: /Active/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.click(screen.getByRole("tab", { name: /All/ }));
    expect(screen.getByRole("tab", { name: /All/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

describe("FilterChip", () => {
  it("renders field/value and removes", () => {
    const onRemove = jest.fn();
    render(<FilterChip field="Status" value="In Progress" onRemove={onRemove} />);
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove filter" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe("StatusPicker", () => {
  it("shows the current status on its trigger with menu semantics", () => {
    render(<StatusPicker value="started" onChange={() => {}} />);
    const trigger = screen.getByRole("button", { name: "Change status" });
    expect(trigger).toHaveTextContent("In Progress");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    // opening a Radix menu needs real pointer events; verified in the browser.
  });
});

describe("AvatarGroup", () => {
  it("caps at max and shows the overflow count", () => {
    render(
      <AvatarGroup
        max={2}
        people={[{ name: "Alex" }, { name: "Bru" }, { name: "Cy" }, { name: "Dee" }]}
      />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
  });
});
