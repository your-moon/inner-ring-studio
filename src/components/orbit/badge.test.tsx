/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import { Badge } from "./badge";
import { CountBadge } from "./count-badge";
import { PriorityIcon } from "./priority-icon";
import { StatusIcon } from "./status-icon";
import { Label } from "./tag";

describe("Badge", () => {
  it("renders its content", () => {
    render(<Badge intent="success">Healthy</Badge>);
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });
});

describe("Label", () => {
  it("shows the category text with a decorative dot", () => {
    render(<Label color="blue">backend</Label>);
    expect(screen.getByText("backend")).toBeInTheDocument();
  });
});

describe("CountBadge", () => {
  it("caps large counts at max+", () => {
    render(<CountBadge count={128} max={99} />);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("shows small counts verbatim", () => {
    render(<CountBadge count={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

describe("StatusIcon", () => {
  it("exposes the state as an accessible name so it never relies on color", () => {
    render(<StatusIcon status="started" />);
    expect(screen.getByRole("img", { name: "In Progress" })).toBeInTheDocument();
  });
});

describe("PriorityIcon", () => {
  it("labels each priority level", () => {
    render(<PriorityIcon priority="urgent" />);
    expect(screen.getByRole("img", { name: "Urgent" })).toBeInTheDocument();
  });
});
