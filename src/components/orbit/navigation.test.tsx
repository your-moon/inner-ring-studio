/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  Pagination,
  SegmentedControl,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from "./navigation";

describe("Tabs", () => {
  it("shows only the selected panel and switches on click", () => {
    render(
      <Tabs defaultValue="a">
        <TabList>
          <Tab value="a">A</Tab>
          <Tab value="b">B</Tab>
        </TabList>
        <TabPanel value="a">Panel A</TabPanel>
        <TabPanel value="b">Panel B</TabPanel>
      </Tabs>,
    );
    expect(screen.getByRole("tab", { name: "A" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Panel A")).toBeInTheDocument();
    expect(screen.queryByText("Panel B")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "B" }));
    expect(screen.getByText("Panel B")).toBeInTheDocument();
    expect(screen.queryByText("Panel A")).not.toBeInTheDocument();
  });
});

describe("SegmentedControl", () => {
  it("exposes radio semantics and selects one", () => {
    function Harness() {
      const [v, setV] = useState("table");
      return (
        <SegmentedControl
          aria-label="View"
          value={v}
          onChange={setV}
          options={[
            { value: "table", label: "Table" },
            { value: "json", label: "JSON" },
          ]}
        />
      );
    }
    render(<Harness />);
    expect(screen.getByRole("radiogroup", { name: "View" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "JSON" }));
    expect(screen.getByRole("radio", { name: "JSON" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });
});

describe("Breadcrumb", () => {
  it("marks the current crumb", () => {
    render(
      <Breadcrumb>
        <BreadcrumbItem href="/">Root</BreadcrumbItem>
        <BreadcrumbItem current>Here</BreadcrumbItem>
      </Breadcrumb>,
    );
    expect(screen.getByText("Here")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Root" })).toBeInTheDocument();
  });
});

describe("Pagination", () => {
  it("marks the current page and navigates", () => {
    function Harness() {
      const [p, setP] = useState(3);
      return <Pagination page={p} pageCount={10} onPageChange={setP} />;
    }
    render(<Harness />);
    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByRole("button", { name: "4" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("disables previous on the first page", () => {
    render(<Pagination page={1} pageCount={10} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });
});
