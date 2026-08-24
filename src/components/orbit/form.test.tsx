/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { Checkbox } from "./checkbox";
import { Field } from "./field";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Switch } from "./switch";
import { NumberField, PasswordField, TextField } from "./text-field";

describe("Field", () => {
  it("wires the label to the control and marks it required", () => {
    render(
      <Field label="Connection name" required>
        <TextField />
      </Field>,
    );

    const input = screen.getByLabelText(/Connection name/);
    expect(input).toHaveAttribute("aria-required", "true");
  });

  it("announces help text and errors through the control", () => {
    render(
      <Field label="Port" description="1–65535" error="Out of range">
        <TextField />
      </Field>,
    );

    const input = screen.getByLabelText("Port");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    const ids = describedBy.split(" ");
    expect(ids.some((id) => document.getElementById(id)?.textContent === "1–65535")).toBe(true);
    expect(screen.getByRole("alert")).toHaveTextContent("Out of range");
  });
});

describe("PasswordField", () => {
  it("toggles visibility and reveals the value", () => {
    render(
      <Field label="Password">
        <PasswordField defaultValue="secret" />
      </Field>,
    );

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
  });
});

describe("NumberField", () => {
  it("steps the value with the stepper controls", () => {
    render(
      <Field label="Port">
        <NumberField defaultValue={10} step={5} />
      </Field>,
    );

    const input = screen.getByLabelText("Port") as HTMLInputElement;
    fireEvent.click(screen.getByRole("button", { name: "Increase" }));
    expect(input.value).toBe("15");
    fireEvent.click(screen.getByRole("button", { name: "Decrease" }));
    expect(input.value).toBe("10");
  });
});

describe("Checkbox", () => {
  it("reports indeterminate state to assistive technology", () => {
    render(<Checkbox aria-label="All" checked="indeterminate" />);
    expect(screen.getByRole("checkbox", { name: "All" })).toHaveAttribute(
      "aria-checked",
      "mixed",
    );
  });
});

describe("RadioGroup", () => {
  it("selects exactly one option", () => {
    function Harness() {
      const [value, setValue] = useState("a");
      return (
        <RadioGroup value={value} onValueChange={setValue} aria-label="Env">
          <RadioGroupItem value="a" aria-label="a" />
          <RadioGroupItem value="b" aria-label="b" />
        </RadioGroup>
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole("radio", { name: "b" }));
    expect(screen.getByRole("radio", { name: "b" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "a" })).not.toBeChecked();
  });
});

describe("Switch", () => {
  it("exposes switch semantics and flips on click", () => {
    function Harness() {
      const [on, setOn] = useState(false);
      return <Switch aria-label="Live" checked={on} onCheckedChange={setOn} />;
    }
    render(<Harness />);
    const el = screen.getByRole("switch", { name: "Live" });
    expect(el).toHaveAttribute("aria-checked", "false");
    act(() => {
      fireEvent.click(el);
    });
    expect(el).toHaveAttribute("aria-checked", "true");
  });
});
