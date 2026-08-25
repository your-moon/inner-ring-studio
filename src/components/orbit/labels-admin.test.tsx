/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  ColorSwatchPicker,
  LabelForm,
  LabelGroupRow,
  LabelRow,
} from "./labels-admin";
import { SettingsListHeader, TemplateRow } from "./settings-list";
import { WorkflowStatusRow } from "./statuses-admin";

describe("LabelRow", () => {
  it("renders name and description", () => {
    render(<LabelRow name="Bug" color="red" description="broken" />);
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("broken")).toBeInTheDocument();
  });
});

describe("LabelGroupRow", () => {
  it("collapses its member labels", () => {
    render(
      <LabelGroupRow name="Priority" count={1}>
        <LabelRow name="Urgent" color="orange" />
      </LabelGroupRow>,
    );
    expect(screen.getByText("Urgent")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Priority/ }));
    expect(screen.queryByText("Urgent")).not.toBeInTheDocument();
  });
});

describe("ColorSwatchPicker", () => {
  it("marks the selected colour and changes it", () => {
    const onChange = jest.fn();
    render(<ColorSwatchPicker value="indigo" onChange={onChange} />);
    expect(screen.getByRole("radio", { name: "indigo" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    fireEvent.click(screen.getByRole("radio", { name: "green" }));
    expect(onChange).toHaveBeenCalledWith("green");
  });
});

describe("LabelForm", () => {
  it("disables submit until named, then submits", () => {
    const onSubmit = jest.fn();
    const { rerender } = render(
      <LabelForm
        name=""
        onNameChange={() => {}}
        color="red"
        onColorChange={() => {}}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByRole("button", { name: "Create label" })).toBeDisabled();
    rerender(
      <LabelForm
        name="Regression"
        onNameChange={() => {}}
        color="red"
        onColorChange={() => {}}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Create label" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe("WorkflowStatusRow", () => {
  it("renders the status icon and name", () => {
    render(<WorkflowStatusRow name="In Progress" status="started" count={3} />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "In Progress" })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

describe("SettingsListHeader / TemplateRow", () => {
  it("shows a titled count and a template row", () => {
    render(
      <>
        <SettingsListHeader title="Labels" count={5} />
        <TemplateRow name="Bug report" description="repro" />
      </>,
    );
    expect(screen.getByText("Labels")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Bug report")).toBeInTheDocument();
  });
});
