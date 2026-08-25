/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { CommentComposer, Reactions } from "./comments";
import { IssueRow } from "./issue-row";
import { ProgressDonut, SegmentedProgress } from "./progress-viz";

describe("IssueRow", () => {
  it("renders id, title and status", () => {
    render(<IssueRow id="PM-142" title="Pooling" status="started" priority="high" />);
    expect(screen.getByText("PM-142")).toBeInTheDocument();
    expect(screen.getByText("Pooling")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "In Progress" })).toBeInTheDocument();
  });
});

describe("ProgressDonut / SegmentedProgress", () => {
  it("labels the donut and reports progressbar bounds", () => {
    render(
      <>
        <ProgressDonut value={2} total={5} />
        <SegmentedProgress
          total={10}
          segments={[{ value: 4, color: "#000" }]}
        />
      </>,
    );
    expect(screen.getByRole("img", { name: "2 of 5" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "4");
  });
});

describe("Reactions", () => {
  it("toggles a reaction", () => {
    const onToggle = jest.fn();
    render(
      <Reactions
        reactions={[{ emoji: "👍", count: 2 }]}
        onToggle={onToggle}
        onAdd={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /👍/ }));
    expect(onToggle).toHaveBeenCalledWith("👍");
    expect(screen.getByRole("button", { name: "Add reaction" })).toBeInTheDocument();
  });
});

describe("CommentComposer", () => {
  it("submits on the Comment button and clears", () => {
    const onSubmit = jest.fn();
    render(<CommentComposer author="You" onSubmit={onSubmit} />);
    const box = screen.getByLabelText("Comment");
    fireEvent.change(box, { target: { value: "hi" } });
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(onSubmit).toHaveBeenCalledWith("hi");
  });

  it("keeps the button disabled while empty", () => {
    render(<CommentComposer author="You" onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: "Comment" })).toBeDisabled();
  });
});
