/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { ConnectionStatus, VaultSyncStatus } from "./connection";
import { ColumnTypeBadge } from "./db";
import { QueryTabBar, ResultStatusBar } from "./query";

describe("ConnectionStatus", () => {
  it("labels the liveness state", () => {
    render(<ConnectionStatus state="connecting" />);
    expect(screen.getByText("Connecting")).toBeInTheDocument();
  });
});

describe("VaultSyncStatus", () => {
  it("shows the sync label and time", () => {
    render(<VaultSyncStatus state="synced" at="just now" />);
    expect(screen.getByText("Vault synced")).toBeInTheDocument();
    expect(screen.getByText(/just now/)).toBeInTheDocument();
  });
});

describe("ColumnTypeBadge", () => {
  it("renders the type text", () => {
    render(<ColumnTypeBadge type="timestamptz" />);
    expect(screen.getByText("timestamptz")).toBeInTheDocument();
  });
});

describe("QueryTabBar", () => {
  it("selects and closes tabs", () => {
    function Harness() {
      const [active, setActive] = useState("q1");
      const [tabs, setTabs] = useState([
        { id: "q1", label: "a.sql" },
        { id: "q2", label: "b.sql" },
      ]);
      return (
        <QueryTabBar
          tabs={tabs}
          activeId={active}
          onSelect={setActive}
          onClose={(id) => setTabs((t) => t.filter((x) => x.id !== id))}
        />
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole("tab", { name: "b.sql" }));
    expect(screen.getByRole("tab", { name: "b.sql" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Close tab" })[0]);
    expect(screen.queryByText("a.sql")).not.toBeInTheDocument();
  });
});

describe("ResultStatusBar", () => {
  it("formats rows and elapsed time", () => {
    render(<ResultStatusBar rows={482} elapsedMs={42} />);
    expect(screen.getByText("482 rows")).toBeInTheDocument();
    expect(screen.getByText("42 ms")).toBeInTheDocument();
  });

  it("renders seconds for long queries", () => {
    render(<ResultStatusBar rows={1} elapsedMs={2400} />);
    expect(screen.getByText("1 row")).toBeInTheDocument();
    expect(screen.getByText("2.40 s")).toBeInTheDocument();
  });
});
