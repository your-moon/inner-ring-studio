/** @jest-environment jsdom */
import { render } from "@testing-library/react";
import TableFakeBodyPadding from "./table-fake-body-padding";

// The grid has one track per column PLUS the leading row-number gutter and the
// trailing 1fr filler track (see renderCellList): gutter + colCount + filler =
// colCount + 2. The top/bottom padding rows must span that full width, or CSS
// grid auto-placement shifts every row below the padding left by one column —
// which is only visible once you scroll down (rowStart > 0 renders padding-top).
describe("TableFakeBodyPadding", () => {
  const COL_COUNT = 6;

  function renderPadding() {
    // rowStart > 0 and rowEnd < rowCount so both padding rows render.
    return render(
      <table>
        <TableFakeBodyPadding
          colCount={COL_COUNT}
          rowCount={100}
          rowStart={5}
          rowEnd={20}
          rowHeight={30}
        >
          <tr data-testid="child-row" className="contents" />
        </TableFakeBodyPadding>
      </table>
    );
  }

  it("spans padding rows across the full grid width (gutter + cols + filler)", () => {
    const { container } = renderPadding();
    const paddingCells = container.querySelectorAll("td[style*='grid-column']");

    expect(paddingCells.length).toBe(2); // top + bottom
    paddingCells.forEach((cell) => {
      expect((cell as HTMLElement).style.gridColumn).toBe(
        `span ${COL_COUNT + 2}`
      );
    });
  });
});
