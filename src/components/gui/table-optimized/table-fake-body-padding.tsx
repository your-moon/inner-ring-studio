import { PropsWithChildren } from "react";

export default function TableFakeBodyPadding({
  children,
  colCount,
  rowHeight,
  rowCount,
  rowStart,
  rowEnd,
}: PropsWithChildren<{
  rowHeight: number;
  colCount: number;
  rowCount: number;
  rowStart: number;
  rowEnd: number;
}>) {
  const paddingTop = rowStart * rowHeight;
  const paddingBottom = (rowCount - rowEnd) * rowHeight;

  // A full data row occupies gutter (1) + colCount data tracks + the trailing
  // 1fr filler (1) = colCount + 2 grid tracks. The padding rows must span the
  // same width, or CSS grid auto-placement shifts every row below the padding
  // one track to the left (visible only once scrolled down, when padding-top
  // renders).
  const fullRowSpan = colCount + 2;

  return (
    <tbody className="contents">
      {!!paddingTop && (
        <tr key="padding-top" className="contents">
          <td
            style={{
              height: paddingTop,
              gridColumn: `span ${fullRowSpan}`,
            }}
          />
        </tr>
      )}

      {children}

      {!!paddingBottom && (
        <tr className="contents" key="padding-bottom">
          <td
            style={{
              height: paddingBottom,
              gridColumn: `span ${fullRowSpan}`,
            }}
          ></td>
        </tr>
      )}
    </tbody>
  );
}
