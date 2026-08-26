/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  EditorToolbarButton,
  FloatingFormatToolbar,
  LinkPopover,
} from "./editor";
import {
  CodeBlockHeader,
  ListBlock,
  QuoteBlock,
  TodoItem,
  ToggleBlock,
} from "./editor-blocks";

describe("FloatingFormatToolbar / EditorToolbarButton", () => {
  it("marks the active mark and fires clicks", () => {
    const onClick = jest.fn();
    render(
      <FloatingFormatToolbar>
        <EditorToolbarButton aria-label="Bold" active onClick={onClick}>
          B
        </EditorToolbarButton>
      </FloatingFormatToolbar>,
    );
    expect(screen.getByRole("toolbar", { name: "Text formatting" })).toBeInTheDocument();
    const b = screen.getByRole("button", { name: "Bold" });
    expect(b).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(b);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("LinkPopover", () => {
  it("disables apply until a URL is present, then applies", () => {
    const onApply = jest.fn();
    const { rerender } = render(
      <LinkPopover value="" onChange={() => {}} onApply={onApply} />,
    );
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    rerender(
      <LinkPopover value="https://x.dev" onChange={() => {}} onApply={onApply} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledTimes(1);
  });
});

describe("ToggleBlock", () => {
  it("collapses and expands its body", () => {
    render(
      <ToggleBlock summary="Notes" defaultOpen>
        <span>hidden body</span>
      </ToggleBlock>,
    );
    expect(screen.getByText("hidden body")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Notes/ }));
    expect(screen.queryByText("hidden body")).not.toBeInTheDocument();
  });
});

describe("TodoItem", () => {
  it("reflects and toggles checked state", () => {
    const onChange = jest.fn();
    render(
      <TodoItem checked onCheckedChange={onChange}>
        Do the thing
      </TodoItem>,
    );
    const box = screen.getByRole("checkbox");
    expect(box).toHaveAttribute("aria-checked", "true");
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe("QuoteBlock / ListBlock / CodeBlockHeader", () => {
  it("render their content", () => {
    render(
      <>
        <QuoteBlock>a quote</QuoteBlock>
        <ListBlock>
          <li>one</li>
        </ListBlock>
        <CodeBlockHeader language="sql" />
      </>,
    );
    expect(screen.getByText("a quote")).toBeInTheDocument();
    expect(screen.getByText("one")).toBeInTheDocument();
    expect(screen.getByText("sql")).toBeInTheDocument();
  });
});
