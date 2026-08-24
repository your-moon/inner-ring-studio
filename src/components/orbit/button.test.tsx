/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import { Button } from "./button";
import { ButtonGroup, ButtonGroupItem } from "./button-group";
import IconButton from "./icon-button";
import { SplitButton } from "./split-button";

describe("Button", () => {
  it("renders its backwards-compatible title as the accessible label", () => {
    render(<Button title="Run query" />);

    expect(screen.getByRole("button", { name: "Run query" })).toBeEnabled();
  });

  it("supports text children and click handlers", () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Create connection</Button>);

    fireEvent.click(
      screen.getByRole("button", { name: "Create connection" }),
    );
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("exposes toggle state to assistive technology", () => {
    render(<Button title="Inspector" toggled />);

    expect(screen.getByRole("button", { name: "Inspector" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("announces loading and prevents activation", () => {
    const onClick = jest.fn();
    render(
      <Button
        title="Save changes"
        loading
        loadingLabel="Saving changes"
        onClick={onClick}
      />,
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Saving changes");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("uses link semantics for navigational actions", () => {
    render(
      <Button as="link" href="/storybook/foundations" title="Foundation" />,
    );

    expect(screen.getByRole("link", { name: "Foundation" })).toHaveAttribute(
      "href",
      "/storybook/foundations",
    );
  });

  it("gives icon buttons an accessible pressed state", () => {
    render(
      <IconButton aria-label="Toggle inspector" toggled>
        <svg />
      </IconButton>,
    );

    expect(
      screen.getByRole("button", { name: "Toggle inspector" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("supports link composition for icon buttons", () => {
    render(
      <IconButton asChild aria-label="Open settings">
        <a href="/settings">
          <svg />
        </a>
      </IconButton>,
    );

    expect(screen.getByRole("link", { name: "Open settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("exposes grouped choices as pressed buttons", () => {
    render(
      <ButtonGroup aria-label="Layout">
        <ButtonGroupItem selected>List</ButtonGroupItem>
        <ButtonGroupItem>Chart</ButtonGroupItem>
      </ButtonGroup>,
    );

    expect(screen.getByRole("group", { name: "Layout" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("keeps split-button actions separately focusable", () => {
    render(
      <SplitButton title="Save view" menuLabel="More save options" menu={null} />,
    );

    expect(screen.getByRole("button", { name: "Save view" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "More save options" }),
    ).toBeEnabled();
  });
});
