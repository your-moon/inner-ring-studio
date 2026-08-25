/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import { BoardCard, BoardColumn } from "./board";
import { RelationRow, SubIssueList } from "./issue-detail";
import { MilestoneMarker } from "./pickers2";
import { SlashMenu } from "./slash-menu";

describe("BoardColumn / BoardCard", () => {
  it("renders a column header with count and a clickable card", () => {
    const onClick = jest.fn();
    render(
      <BoardColumn status="started" title="In Progress" count={3}>
        <BoardCard id="PM-1" title="Do the thing" priority="high" onClick={onClick} />
      </BoardColumn>,
    );
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Do the thing/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("SubIssueList", () => {
  it("toggles the child list", () => {
    render(
      <SubIssueList done={1} total={2}>
        <div>child row</div>
      </SubIssueList>,
    );
    expect(screen.getByText("child row")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Sub-issues/ }));
    expect(screen.queryByText("child row")).not.toBeInTheDocument();
  });
});

describe("RelationRow", () => {
  it("labels the relation kind and removes", () => {
    const onRemove = jest.fn();
    render(<RelationRow kind="blocked-by" id="PM-9" title="Dep" onRemove={onRemove} />);
    expect(screen.getByText("Blocked by")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove relation" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe("SlashMenu", () => {
  it("selects a block type", () => {
    const onSelect = jest.fn();
    render(
      <SlashMenu
        onSelect={onSelect}
        commands={[
          { value: "text", label: "Text" },
          { value: "code", label: "Code block" },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("option", { name: "Code block" }));
    expect(onSelect).toHaveBeenCalledWith("code");
  });
});

describe("MilestoneMarker", () => {
  it("renders its label", () => {
    render(<MilestoneMarker label="Beta" reached />);
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });
});
