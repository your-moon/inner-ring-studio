/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import {
  DescriptionItem,
  DescriptionList,
  RelativeTime,
  Stat,
  Timestamp,
  TruncatedText,
} from "./data-display";

describe("Stat", () => {
  it("renders label, value, and a trend", () => {
    render(
      <Stat label="Queries" value="1,204" trend={{ direction: "up", label: "8%" }} />,
    );
    expect(screen.getByText("Queries")).toBeInTheDocument();
    expect(screen.getByText("1,204")).toBeInTheDocument();
    expect(screen.getByText(/8%/)).toBeInTheDocument();
  });
});

describe("DescriptionList", () => {
  it("associates each term with its detail", () => {
    render(
      <DescriptionList inline>
        <DescriptionItem term="status">shipped</DescriptionItem>
      </DescriptionList>,
    );
    const term = screen.getByText("status");
    const detail = screen.getByText("shipped");
    expect(term.tagName).toBe("DT");
    expect(detail.tagName).toBe("DD");
  });
});

describe("TruncatedText", () => {
  it("keeps the full text as a title for overflow", () => {
    render(<TruncatedText>a-very-long-value</TruncatedText>);
    expect(screen.getByText("a-very-long-value")).toHaveAttribute(
      "title",
      "a-very-long-value",
    );
  });
});

describe("Timestamp", () => {
  it("emits a machine-readable datetime", () => {
    const iso = "2026-08-24T12:00:00.000Z";
    render(<Timestamp date={iso} />);
    const el = screen.getByText((_, n) => n?.tagName === "TIME");
    expect(el).toHaveAttribute("dateTime", iso);
  });
});

describe("RelativeTime", () => {
  it("formats a fixed diff deterministically", () => {
    const now = new Date("2026-08-24T12:00:00Z").getTime();
    render(<RelativeTime date={now - 3 * 3600 * 1000} now={now} />);
    expect(screen.getByText("3 hours ago")).toBeInTheDocument();
  });

  it("handles the future direction", () => {
    const now = new Date("2026-08-24T12:00:00Z").getTime();
    render(<RelativeTime date={now + 2 * 24 * 3600 * 1000} now={now} />);
    expect(screen.getByText(/in 2 days/)).toBeInTheDocument();
  });
});
