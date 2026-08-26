/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import {
  BarChart,
  BreakdownBar,
  ChartEmpty,
  ChartLegend,
  DonutChart,
  Sparkline,
  StatDelta,
  TrendBadge,
} from "./charts";

const data = [
  { label: "A", value: 3 },
  { label: "B", value: 6 },
];

describe("BarChart / DonutChart / BreakdownBar", () => {
  it("render labelled chart regions", () => {
    render(
      <>
        <BarChart data={data} />
        <DonutChart data={data} />
        <BreakdownBar data={data} />
      </>,
    );
    expect(screen.getByRole("img", { name: "Bar chart" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Donut chart" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Distribution" })).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});

describe("Sparkline", () => {
  it("renders a trend path", () => {
    const { container } = render(<Sparkline values={[1, 4, 2, 8]} />);
    const path = container.querySelector("path");
    expect(path).toBeInTheDocument();
    expect(path?.getAttribute("d")).toMatch(/^M/);
  });
});

describe("TrendBadge", () => {
  it("shows the direction arrow and value", () => {
    render(<TrendBadge value="18%" direction="up" />);
    expect(screen.getByText("↑")).toBeInTheDocument();
    expect(screen.getByText("18%")).toBeInTheDocument();
  });
});

describe("StatDelta", () => {
  it("renders label, value and delta", () => {
    render(<StatDelta label="Done" value="21" delta="18%" direction="up" />);
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("21")).toBeInTheDocument();
    expect(screen.getByText("18%")).toBeInTheDocument();
  });
});

describe("ChartLegend / ChartEmpty", () => {
  it("renders legend items and the empty state", () => {
    render(
      <>
        <ChartLegend items={[{ label: "Backlog", color: "#4ea7fc", value: 12 }]} />
        <ChartEmpty />
      </>,
    );
    expect(screen.getByText("Backlog")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText(/No data/)).toBeInTheDocument();
  });
});
