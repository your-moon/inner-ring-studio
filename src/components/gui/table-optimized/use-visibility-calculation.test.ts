/** @jest-environment node */
// The column half of the result grid's windowing. Rows already overscan by
// `renderAhead`; columns must overscan too, or a fast horizontal scroll (and
// the gap between the scroll event and React's re-render) exposes blank cells
// at the left/right viewport edges before the new window paints.
import { getVisibleCellRange } from "./use-visibility-calculation";

function makeContainer({
  scrollTop = 0,
  scrollLeft = 0,
  width = 300,
  height = 300,
}: {
  scrollTop?: number;
  scrollLeft?: number;
  width?: number;
  height?: number;
}): HTMLDivElement {
  return {
    scrollTop,
    scrollLeft,
    getBoundingClientRect: () => ({ width, height }) as DOMRect,
  } as unknown as HTMLDivElement;
}

describe("getVisibleCellRange — column window", () => {
  // 10 columns, each 100px wide, behind a 40px gutter.
  const headerSizes = new Array(10).fill(100);
  const GUTTER = 40;

  it("overscans columns past both viewport edges", () => {
    // scrollLeft 300, width 300 → viewport spans content x [300, 600].
    // Column left edges are 40,140,240,340,440,540,... so the columns actually
    // touching the viewport are 2..5. With overscan the window extends beyond.
    const el = makeContainer({ scrollLeft: 300, width: 300 });
    const { colStart, colEnd } = getVisibleCellRange(
      el,
      headerSizes,
      100,
      36,
      20,
      GUTTER
    );

    expect(colStart).toBeGreaterThanOrEqual(0);
    expect(colStart).toBeLessThan(2); // at least one column of left overscan
    expect(colEnd).toBeGreaterThan(5); // at least one column of right overscan
    expect(colEnd).toBeLessThanOrEqual(headerSizes.length - 1);
  });

  it("clamps the overscanned window to the real column bounds", () => {
    // Scrolled hard right: the window must never run past the last column.
    const el = makeContainer({ scrollLeft: 700, width: 300 });
    const { colStart, colEnd } = getVisibleCellRange(
      el,
      headerSizes,
      100,
      36,
      20,
      GUTTER
    );

    expect(colStart).toBeGreaterThanOrEqual(0);
    expect(colEnd).toBeLessThanOrEqual(headerSizes.length - 1);
    expect(colEnd).toBeGreaterThanOrEqual(colStart);
  });
});
