/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import {
  Divider,
  Grid,
  Inline,
  Stack,
  VisuallyHidden,
} from "./layout";

describe("Stack / Inline", () => {
  it("maps the gap scale to a spacing class", () => {
    const { container } = render(
      <Stack gap="lg">
        <span>a</span>
      </Stack>,
    );
    expect(container.firstChild).toHaveClass("flex", "flex-col", "gap-4");
  });

  it("composes onto its child with asChild", () => {
    render(
      <Inline asChild>
        <section aria-label="toolbar">
          <span>x</span>
        </section>
      </Inline>,
    );
    const el = screen.getByLabelText("toolbar");
    expect(el.tagName).toBe("SECTION");
    expect(el).toHaveClass("flex", "flex-row");
  });
});

describe("Grid", () => {
  it("sets an explicit column template", () => {
    const { container } = render(<Grid columns={4} />);
    expect(container.firstChild).toHaveStyle({
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    });
  });
});

describe("Divider", () => {
  it("exposes separator semantics with orientation", () => {
    render(<Divider orientation="vertical" />);
    const sep = screen.getByRole("separator");
    expect(sep).toHaveAttribute("aria-orientation", "vertical");
  });
});

describe("VisuallyHidden", () => {
  it("keeps content in the accessibility tree", () => {
    render(<VisuallyHidden>screen-reader only</VisuallyHidden>);
    expect(screen.getByText("screen-reader only")).toHaveClass("sr-only");
  });
});
