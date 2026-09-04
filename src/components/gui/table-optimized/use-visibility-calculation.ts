import useElementResize from "@/components/hooks/useElementResize";
import { useCallback, useEffect, useState } from "react";
import { OptimizeTableHeaderWithIndexProps } from ".";
import OptimizeTableState from "./optimize-table-state";

// How many columns to render beyond each horizontal edge of the viewport.
// Rows overscan by `renderAhead` (~20); columns are far wider, so a small
// fixed pad is enough to keep the newly-exposed edge columns painted during a
// fast horizontal scroll instead of flashing blank until React re-renders.
const COLUMN_RENDER_AHEAD = 3;

/**
 * Giving the container, we calculate visible rows and column
 *
 * @param e container elements
 * @param headerSizes size of each headers
 * @param totalRowCount total number of rows
 * @param rowHeight fixed height of each row
 * @param renderAhead number of rows that we need to pre-render ahead
 * @returns
 */
export function getVisibleCellRange(
  e: HTMLDivElement,
  headerSizes: number[],
  totalRowCount: number,
  rowHeight: number,
  renderAhead: number,
  gutterWidth: number
) {
  // Clamp the start to the row count as well as to 0: when the result shrinks
  // (e.g. a new query returns fewer rows) while scrolled down, scrollTop can
  // still point past the new end, which would put rowStart above rowEnd and
  // make `new Array(rowEnd - rowStart)` throw "Invalid array length".
  const currentRowStart = Math.min(
    Math.max(0, Math.floor(e.scrollTop / rowHeight) - 1 - renderAhead),
    totalRowCount
  );
  const currentRowEnd = Math.min(
    totalRowCount,
    currentRowStart +
      Math.ceil(e.getBoundingClientRect().height / rowHeight) +
      renderAhead
  );

  let currentColStart = -1;
  let currentColAccumulateSize = gutterWidth;
  let currentColEnd = -1;

  const visibleXStart = e.scrollLeft;
  const visibleXEnd = visibleXStart + e.getBoundingClientRect().width;

  for (let i = 0; i < headerSizes.length; i++) {
    if (currentColAccumulateSize >= visibleXStart && currentColStart < 0) {
      currentColStart = i - 1;
    }

    currentColAccumulateSize += headerSizes[i] ?? 0;

    if (currentColAccumulateSize >= visibleXEnd && currentColEnd < 0) {
      currentColEnd = i;
      break;
    }
  }

  if (currentColEnd < 0) currentColEnd = headerSizes.length - 1;
  if (currentColStart < 0) currentColStart = 0;
  if (currentColEnd >= headerSizes.length)
    currentColEnd = headerSizes.length - 1;

  // Overscan the column window on both sides so horizontal scrolling doesn't
  // expose blank edge cells before the next render commits.
  currentColStart = Math.max(0, currentColStart - COLUMN_RENDER_AHEAD);
  currentColEnd = Math.min(
    headerSizes.length - 1,
    currentColEnd + COLUMN_RENDER_AHEAD
  );

  return {
    colStart: currentColStart,
    colEnd: currentColEnd,
    rowStart: currentRowStart,
    rowEnd: currentRowEnd,
  };
}

export default function useTableVisibilityRecalculation({
  containerRef,
  totalRowCount,
  rowHeight,
  renderAhead,
  headers,
  state,
  onScrollToBottom,
}: {
  containerRef: React.RefObject<HTMLDivElement>;
  totalRowCount: number;
  rowHeight: number;
  renderAhead: number;
  headers: OptimizeTableHeaderWithIndexProps[];
  state: OptimizeTableState;
  onScrollToBottom?: () => void;
}) {
  const [visibleDebounce, setVisibleDebounce] = useState<{
    rowStart: number;
    rowEnd: number;
    colStart: number;
    colEnd: number;
  }>({
    rowStart: 0,
    rowEnd: 0,
    colStart: 0,
    colEnd: 0,
  });

  const recalculateVisible = useCallback(
    (e: HTMLDivElement) => {
      const headerSizes = state.getHeaderWidth();
      setVisibleDebounce(
        getVisibleCellRange(
          e,
          headers.map((header) => headerSizes[header.index]) as number[],
          totalRowCount,
          rowHeight,
          renderAhead,
          state.gutterColumnWidth
        )
      );
    },
    [setVisibleDebounce, totalRowCount, rowHeight, renderAhead, headers, state]
  );

  const onHeaderResize = useCallback(
    (idx: number, newWidth: number) => {
      if (containerRef.current) {
        state.setHeaderWidth(idx, newWidth);
        recalculateVisible(containerRef.current);
      }
    },
    [state, recalculateVisible, containerRef]
  );

  // Recalculate the visibility again when we scroll the container
  useEffect(() => {
    const ref = containerRef.current;
    if (ref) {
      const onContainerScroll = (e: Event) => {
        const el = e.currentTarget as HTMLDivElement;
        recalculateVisible(el);
        // Prefetch the next page a few rows before the very bottom so scrolling
        // stays smooth (lazy pagination). No-op if no handler is provided.
        if (
          onScrollToBottom &&
          el.scrollHeight - el.scrollTop - el.clientHeight < rowHeight * 8
        ) {
          onScrollToBottom();
        }
        e.preventDefault();
        e.stopPropagation();
      };

      containerRef.current.addEventListener("scroll", onContainerScroll);
      return () => ref.removeEventListener("scroll", onContainerScroll);
    }
  }, [containerRef, recalculateVisible, onScrollToBottom, rowHeight]);

  useElementResize<HTMLDivElement>(recalculateVisible, containerRef);

  return { visibileRange: visibleDebounce, onHeaderResize };
}
