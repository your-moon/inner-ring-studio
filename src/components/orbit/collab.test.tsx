/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  ActivityFeedItem,
  AttachmentRow,
  EmojiPicker,
  MentionMenu,
} from "./collab";
import { HealthBadge, RoadmapBar } from "./project";

describe("MentionMenu", () => {
  it("selects a person", () => {
    const onSelect = jest.fn();
    render(
      <MentionMenu
        onSelect={onSelect}
        people={[
          { id: "a", name: "Alex" },
          { id: "b", name: "Bru" },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("option", { name: /Bru/ }));
    expect(onSelect).toHaveBeenCalledWith("b");
  });
});

describe("EmojiPicker", () => {
  it("selects an emoji", () => {
    const onSelect = jest.fn();
    render(<EmojiPicker emojis={["👍", "🎉"]} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "React 🎉" }));
    expect(onSelect).toHaveBeenCalledWith("🎉");
  });
});

describe("AttachmentRow", () => {
  it("shows name/size and fires remove", () => {
    const onRemove = jest.fn();
    render(<AttachmentRow name="export.csv" size="2.4 MB" onRemove={onRemove} />);
    expect(screen.getByText("export.csv")).toBeInTheDocument();
    expect(screen.getByText("2.4 MB")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove attachment" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe("ActivityFeedItem", () => {
  it("renders the actor and body", () => {
    render(<ActivityFeedItem actor="Alex" time="2h">changed status</ActivityFeedItem>);
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText(/changed status/)).toBeInTheDocument();
  });
});

describe("HealthBadge / RoadmapBar", () => {
  it("labels health and reports progress bounds", () => {
    render(
      <>
        <HealthBadge health="at-risk" />
        <RoadmapBar label="Proj" done={8} total={20} />
      </>,
    );
    expect(screen.getByText("At risk")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "20");
  });
});
