/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import { CodeBlock } from "./code-block";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { Timeline, TimelineItem } from "./timeline";
import { Tree, TreeItem } from "./tree";

describe("Table", () => {
  it("reflects sort direction with aria-sort and fires onSort", () => {
    const onSort = jest.fn();
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead sort="asc" onSort={onSort}>
              Column
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow selected>
            <TableCell>id</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("columnheader")).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    fireEvent.click(screen.getByRole("button", { name: "Column" }));
    expect(onSort).toHaveBeenCalledTimes(1);
    expect(screen.getByText("id")).toBeInTheDocument();
  });
});

describe("Tree", () => {
  it("expands and collapses a node", () => {
    render(
      <Tree>
        <TreeItem label="public">
          <TreeItem label="orders" />
        </TreeItem>
      </Tree>,
    );
    const node = screen.getByRole("treeitem", { name: /public/ });
    expect(node).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("orders")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(node).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("orders")).toBeInTheDocument();
  });
});

describe("Timeline", () => {
  it("renders events as list items", () => {
    render(
      <Timeline>
        <TimelineItem time="now">First</TimelineItem>
        <TimelineItem last>Second</TimelineItem>
      </Timeline>,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("First")).toBeInTheDocument();
  });
});

describe("CodeBlock", () => {
  it("renders numbered lines when asked", () => {
    render(<CodeBlock code={"a\nb\nc"} showLineNumbers copyable={false} />);
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
