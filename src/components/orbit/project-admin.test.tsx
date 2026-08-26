/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import { ActiveCycleHeader, CycleRow } from "./cycle";
import { DueDateBadge, LinkedResourceRow } from "./issue-meta";
import { MilestoneRow, ProjectRow, ProjectUpdateItem } from "./project-admin";
import { SearchResultRow, TriageRow } from "./triage-search";

describe("ProjectRow", () => {
  it("renders name and progress %, and clicks", () => {
    const onClick = jest.fn();
    render(<ProjectRow name="Postgres proxy" done={8} total={20} onClick={onClick} />);
    expect(screen.getByText("Postgres proxy")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Postgres proxy/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("MilestoneRow / ProjectUpdateItem", () => {
  it("shows milestone counts and an update author", () => {
    render(
      <>
        <MilestoneRow name="Pooling MVP" done={5} total={6} />
        <ProjectUpdateItem author="Alex" date="2d">landed pooling</ProjectUpdateItem>
      </>,
    );
    expect(screen.getByText("Pooling MVP")).toBeInTheDocument();
    expect(screen.getByText("5/6")).toBeInTheDocument();
    expect(screen.getByText("Alex")).toBeInTheDocument();
  });
});

describe("CycleRow / ActiveCycleHeader", () => {
  it("marks the active cycle and reports scope", () => {
    render(
      <>
        <CycleRow name="Cycle 7" active completed={9} total={20} />
        <ActiveCycleHeader name="Cycle 7" started={4} completed={9} total={20} />
      </>,
    );
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getByText("20 scope")).toBeInTheDocument();
  });
});

describe("DueDateBadge / LinkedResourceRow", () => {
  it("renders a date and a linked resource with remove", () => {
    const onRemove = jest.fn();
    render(
      <>
        <DueDateBadge date="Sep 30" tone="overdue" />
        <LinkedResourceRow title="PR #482" onRemove={onRemove} />
      </>,
    );
    expect(screen.getByText("Sep 30")).toBeInTheDocument();
    expect(screen.getByText("PR #482")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove link" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe("TriageRow", () => {
  it("renders title and fires accept", () => {
    const onAccept = jest.fn();
    render(<TriageRow id="MOO-42" title="Pool exhausts" onAccept={onAccept} />);
    expect(screen.getByText("Pool exhausts")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });
});

describe("SearchResultRow", () => {
  it("renders as a selectable option with context", () => {
    const onSelect = jest.fn();
    render(<SearchResultRow title="Pool bug" context="MOO · Backlog" active onSelect={onSelect} />);
    const opt = screen.getByRole("option", { name: /Pool bug/ });
    expect(opt).toHaveAttribute("aria-selected", "true");
    fireEvent.click(opt);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
