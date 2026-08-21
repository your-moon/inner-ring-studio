import { selectArrayFromIndexList } from "@/lib/export-helper";
import { scopedStore, type ScopedStore } from "@/lib/scoped-store";
import { OptimizeTableHeaderProps, TableCellDecorator } from ".";
import * as SelectionRanges from "./selection-ranges";
import { nextRowChange } from "./row-change";

export interface OptimizeTableRowValue {
  raw: Record<string, unknown>;
  change?: Record<string, unknown>;
  changeKey?: number;
  isNewRow?: boolean;
  isRemoved?: boolean;
}

type TableChangeEventCallback = (state: OptimizeTableState) => void;

export interface TableSelectionRange {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export default class OptimizeTableState<HeaderMetadata = unknown> {
  protected focus: [number, number] | null = null;
  protected data: OptimizeTableRowValue[] = [];

  // last move is used to track cell where user use arrow key to move on using shift key
  protected lastMove: [number, number] | null = null;

  // Selelection range will be replaced our old selected rows implementation
  // It offers better flexiblity and allow us to implement more features
  protected selectionRanges: TableSelectionRange[] = [];

  // Gutter is a sticky column on the left side of the table
  // We primary use it to display row number at the moment
  public gutterColumnWidth = 40;

  protected headers: OptimizeTableHeaderProps<HeaderMetadata>[] = [];
  public headerRevision = 1;
  protected headerWidth: number[] = [];

  protected editMode = false;
  protected readOnlyMode = false;
  protected container: HTMLDivElement | null = null;

  protected changeCallback: TableChangeEventCallback[] = [];
  protected changeDebounceTimerId: NodeJS.Timeout | null = null;

  protected changeCounter = 1;
  protected changeLogs: Record<number, OptimizeTableRowValue> = {};
  protected sql: string = "";

  // When set (via enableWidthPersistence), column widths are saved to and
  // restored from a scoped store, keyed by column name so they survive schema
  // changes / reordering. Only the table browser opts in; query results don't.
  protected widthStore?: ScopedStore<Record<string, number>>;

  constructor(
    headers: OptimizeTableHeaderProps<HeaderMetadata>[],
    data: Record<string, unknown>[]
  ) {
    this.headers = headers;
    this.data = data.map((row) => ({
      raw: row,
    }));
    this.headerWidth = headers.map((h) => h.display.initialSize);
  }

  /**
   * Append fetched rows to the end of the grid (lazy pagination "load more").
   * These are clean, persisted rows — not edits — so they carry no change flag.
   * Preserves scroll position because it mutates in place and re-renders via the
   * change listener rather than replacing the whole state.
   */
  appendData(rows: Record<string, unknown>[]) {
    if (rows.length === 0) return;
    for (const row of rows) this.data.push({ raw: row });
    this.broadcastChange(true);
  }

  setReadOnlyMode(readOnly: boolean) {
    this.readOnlyMode = readOnly;
  }

  getReadOnlyMode() {
    return this.readOnlyMode;
  }

  setContainer(div: HTMLDivElement | null) {
    this.container = div;
  }

  // ------------------------------------------------
  // Event Handlers
  // ------------------------------------------------
  addChangeListener(cb: TableChangeEventCallback) {
    this.changeCallback.push(cb);
  }

  removeChangeListener(cb: TableChangeEventCallback) {
    this.changeCallback = this.changeCallback.filter((c) => c !== cb);
  }

  protected broadcastChange(instant?: boolean) {
    // Iterate a copy: listeners registered during a broadcast (or the array
    // being reversed) must not perturb this pass. (Previously used
    // `.reverse()`, which mutated the array in place and flip-flopped the
    // listener order on every broadcast.)
    const notify = () => this.changeCallback.slice().forEach((cb) => cb(this));

    if (instant) {
      if (this.changeDebounceTimerId) clearTimeout(this.changeDebounceTimerId);
      notify();
    }

    if (this.changeDebounceTimerId) return false;
    this.changeDebounceTimerId = setTimeout(() => {
      this.changeDebounceTimerId = null;
      notify();
    }, 5);

    return true;
  }

  // ------------------------------------------------
  // Handle headers and data
  // ------------------------------------------------
  getHeaders() {
    return this.headers;
  }

  updateHeaderDecorator(
    header: OptimizeTableHeaderProps,
    decorator: TableCellDecorator | undefined
  ) {
    const idx = this.headers.findIndex((h) => h.name === header.name);

    if (idx >= 0) {
      this.headers = this.headers.map((h) => {
        if (h.name === header.name) {
          return {
            ...h,
            decorator,
          };
        }
        return h;
      });

      this.headerRevision++;
      this.broadcastChange();
    }
  }

  getValue(y: number, x: number): unknown {
    const rowChange = this.data[y]?.change;
    if (rowChange) {
      const currentHeaderName = this.headers[x]?.name ?? "";
      if (currentHeaderName in rowChange) {
        return rowChange[currentHeaderName];
      }

      return this.getOriginalValue(y, x);
    }
    return this.getOriginalValue(y, x);
  }

  hasCellChange(y: number, x: number) {
    const changeLog = this.data[y]?.change;
    if (!changeLog) return false;

    const currentHeaderName = this.headers[x]?.name ?? "";
    return currentHeaderName in changeLog;
  }

  getOriginalValue(y: number, x: number): unknown {
    const currentHeaderName = this.headers[x]?.name ?? "";
    return this.data[y]?.raw[currentHeaderName];
  }

  changeValue(y: number, x: number, newValue: unknown) {
    if (this.readOnlyMode) return;
    if (this.headers[x]?.setting.readonly) return;

    const row = this.data[y];
    if (!row) return;

    const oldValue = this.getOriginalValue(y, x);
    const headerName = this.headers[x]?.name ?? "";
    const wasTracked = row.change !== undefined;

    const next = nextRowChange(row.change, headerName, oldValue, newValue);

    if (next === undefined) {
      // Fully reverted — the row is clean again; drop it from the change log.
      if (row.changeKey) {
        delete this.changeLogs[row.changeKey];
        delete row.changeKey;
      }
      delete row.change;
    } else {
      row.change = next;
      if (!wasTracked) {
        row.changeKey = ++this.changeCounter;
        this.changeLogs[row.changeKey] = row;
      }
    }

    this.broadcastChange();
  }

  getChangedRows() {
    return Object.values(this.changeLogs);
  }

  getRowsCount() {
    return this.data.length;
  }

  getHeaderCount() {
    return this.headers.length;
  }

  discardAllChange() {
    const newRows: OptimizeTableRowValue[] = [];

    for (const row of Object.values(this.changeLogs)) {
      if (row.isNewRow) {
        newRows.push(row);
        delete row.change;
        delete row.changeKey;
        delete row.isNewRow;
      } else {
        delete row.change;
        delete row.changeKey;
        delete row.isRemoved;
      }
    }

    // Remove all new rows
    this.data = this.data.filter((row) => !newRows.includes(row));
    this.changeLogs = {};

    this.broadcastChange(true);
  }

  applyChanges(
    updatedRows: {
      row: OptimizeTableRowValue;
      updated: Record<string, unknown>;
    }[]
  ) {
    const rowChanges = this.getChangedRows();
    const removedRows = rowChanges.filter((row) => row.isRemoved);

    for (const row of rowChanges) {
      const updated = updatedRows.find((updateRow) => updateRow.row === row);
      row.raw = { ...row.raw, ...row.change, ...updated?.updated };
      delete row.changeKey;
      delete row.change;
      delete row.isNewRow;
      delete row.isRemoved;
    }

    if (removedRows.length > 0) {
      this.data = this.data.filter((row) => !removedRows.includes(row));
      // after rows were removed, we need to deselect them
      this.selectionRanges = [];
    }

    this.changeLogs = {};
    this.broadcastChange();
  }

  insertNewRow(index = -1, initialData: Record<string, unknown> = {}) {
    if (index === -1) {
      const focus = this.getFocus();
      if (focus) index = focus.y;
    }

    if (index < 0) index = 0;

    const newRow = {
      isNewRow: true,
      raw: {},
      change: initialData,
      changeKey: ++this.changeCounter,
    };

    this.data.splice(index, 0, newRow);
    this.changeLogs[newRow.changeKey] = newRow;
    this.broadcastChange();
  }

  isNewRow(index: number) {
    return !!this.data[index]?.isNewRow;
  }

  removeRow(index = -1) {
    if (index === -1) {
      // Remove the row at focus
      const focus = this.getFocus();
      if (focus) index = focus.y;
    }

    const row = this.data[index];

    if (row) {
      if (row.isNewRow && row.changeKey) {
        delete this.changeLogs[row.changeKey];
        this.data = this.data.filter((dataRow) => dataRow != row);
      } else {
        row.isRemoved = true;
        if (!row.changeKey) {
          row.change = {};
          row.changeKey = ++this.changeCounter;
          this.changeLogs[row.changeKey] = row;
        }
      }
    }

    this.broadcastChange();
  }

  isRemovedRow(index: number) {
    return !!this.data[index]?.isRemoved;
  }

  getAllRows() {
    return this.data;
  }

  getRowByIndex(idx: number) {
    return this.data[idx];
  }

  getLastMove() {
    return this.lastMove
      ? {
          x: this.lastMove[1],
          y: this.lastMove[0],
        }
      : null;
  }

  setLastMove(y: number, x: number) {
    this.lastMove = [y, x];
  }

  clearLastMove() {
    this.lastMove = null;
  }

  // ------------------------------------------------
  // Handle focus logic
  // ------------------------------------------------
  getFocus(): { x: number; y: number } | null {
    return this.focus
      ? {
          x: this.focus[1],
          y: this.focus[0],
        }
      : null;
  }

  getFocusValue(): unknown {
    const focusCell = this.getFocus();
    if (focusCell) {
      return this.getValue(focusCell.y, focusCell.x);
    }

    return undefined;
  }

  setFocusValue(newValue: unknown) {
    const focusCell = this.getFocus();
    if (focusCell) {
      this.changeValue(focusCell.y, focusCell.x, newValue);
    }
  }

  hasFocus(y: number, x: number): boolean {
    if (!this.focus) return false;
    return this.focus[0] === y && this.focus[1] === x;
  }

  setFocus(y: number, x: number) {
    this.focus = [y, x];
    this.clearLastMove();
    this.broadcastChange();
  }

  isInEditMode() {
    return this.editMode;
  }

  enterEditMode() {
    this.editMode = true;
    this.broadcastChange();
  }

  exitEditMode() {
    this.editMode = false;

    if (this.container) {
      this.container.focus();
    }

    this.broadcastChange();
  }

  clearFocus() {
    this.focus = null;
    this.broadcastChange();
  }

  setHeaderWidth(idx: number, newWidth: number) {
    this.headerWidth[idx] = newWidth;
    this.persistWidths();
  }

  getHeaderWidth() {
    return this.headerWidth;
  }

  /** Persist this table's column widths under the scoped store `name`, and
   *  restore any previously-saved widths onto the current columns (by name).
   *  Call once, right after construction, before the first render. */
  enableWidthPersistence(name: string) {
    this.widthStore = scopedStore<Record<string, number>>(name, {});
    const saved = this.widthStore.read();
    this.headers.forEach((h, i) => {
      const w = saved[h.name];
      if (typeof w === "number" && w > 0) this.headerWidth[i] = w;
    });
  }

  protected persistWidths() {
    if (!this.widthStore) return;
    const map: Record<string, number> = {};
    this.headers.forEach((h, i) => {
      map[h.name] = this.headerWidth[i];
    });
    this.widthStore.write(map);
  }

  scrollToCell(
    horizontal: "left" | "right",
    vertical: "top" | "bottom",
    cell: { x: number; y: number }
  ) {
    if (this.container && cell) {
      const cellX = cell.x;
      const cellY = cell.y;
      let cellLeft = 38;
      let cellRight = 0;
      const cellTop = (cellY + 1) * 38;
      const cellBottom = cellTop + 38;

      for (let i = 0; i < cellX; i++) {
        cellLeft += this.headerWidth[i] ?? 0;
      }
      cellRight = cellLeft + (this.headerWidth[cellX] ?? 0);

      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      const containerLeft = this.container.scrollLeft;
      const containerRight = containerLeft + this.container.clientWidth;
      const containerTop = this.container.scrollTop;
      const containerBottom = containerTop + height;

      if (horizontal === "right") {
        if (cellRight - 38 > containerRight) {
          this.container.scrollLeft = Math.max(0, cellRight - width);
        }
      } else {
        if (cellLeft < containerLeft) {
          this.container.scrollLeft = cellLeft;
        }
      }

      if (vertical === "bottom") {
        if (cellBottom > containerBottom) {
          this.container.scrollTop = Math.max(0, cellBottom - height);
        }
      } else {
        if (cellTop - 38 < containerTop) {
          this.container.scrollTop = Math.max(0, cellTop - 38);
        }
      }
    }
  }

  clearSelect() {
    this.selectionRanges = [];
    this.broadcastChange();
  }

  getSelectionRanges() {
    return this.selectionRanges;
  }

  setSelectionRanges(ranges: TableSelectionRange[]) {
    this.selectionRanges = ranges;
    this.broadcastChange();
  }

  getSelectedRowCount() {
    return this.getSelectedRowIndex().length;
  }

  getSelectedRowsArray(): unknown[][] {
    return selectArrayFromIndexList(this.data, this.getSelectedRowIndex()).map(
      (row) => this.headers.map((header) => row.raw[header.name])
    );
  }

  getSelectedRowIndex() {
    return SelectionRanges.selectedRowIndexes(this.selectionRanges);
  }

  getSelectedColIndex() {
    return SelectionRanges.selectedColIndexes(this.selectionRanges);
  }

  isFullSelectionRow(y: number) {
    return SelectionRanges.isFullSelectionRow(
      this.selectionRanges,
      y,
      this.getHeaderCount()
    );
  }

  getFullSelectionRowsIndex() {
    return SelectionRanges.fullSelectionRowIndexes(
      this.selectionRanges,
      this.getHeaderCount()
    );
  }

  getFullSelectionColsIndex() {
    return SelectionRanges.fullSelectionColIndexes(
      this.selectionRanges,
      this.getRowsCount()
    );
  }

  isFullSelectionCol(x: number) {
    return SelectionRanges.isFullSelectionCol(
      this.selectionRanges,
      x,
      this.getRowsCount()
    );
  }

  selectRow(y: number) {
    this.selectionRanges = [
      { x1: 0, y1: y, x2: this.headers.length - 1, y2: y },
    ];

    this.broadcastChange();
  }

  selectColumn(x: number) {
    this.selectionRanges = [
      { x1: x, y1: 0, x2: x, y2: this.getRowsCount() - 1 },
    ];

    this.broadcastChange();
  }

  selectCell(y: number, x: number, focus = true) {
    this.selectionRanges = [{ x1: x, y1: y, x2: x, y2: y }];

    if (focus) this.setFocus(y, x);
    else this.broadcastChange();
  }

  selectCellRange(y1: number, x1: number, y2: number, x2: number) {
    this.selectionRanges = [
      {
        x1: Math.min(x1, x2),
        y1: Math.min(y1, y2),
        x2: Math.max(x1, x2),
        y2: Math.max(y1, y2),
      },
    ];
    this.broadcastChange();
  }

  findSelectionRange(range: TableSelectionRange) {
    return SelectionRanges.findContainingRangeIndex(this.selectionRanges, range);
  }

  addSelectionRange(y1: number, x1: number, y2: number, x2: number) {
    this.selectionRanges = SelectionRanges.addRange(
      this.selectionRanges,
      SelectionRanges.normalizeRange(y1, x1, y2, x2)
    );
    this.broadcastChange();
  }

  addSelectionRow(y: number) {
    const newRange = {
      x1: 0,
      y1: y,
      x2: this.headers.length - 1,
      y2: y,
    };

    this.addSelectionRange(newRange.y1, newRange.x1, newRange.y2, newRange.x2);
  }

  addSelectionCol(x: number) {
    const newRange = {
      x1: x,
      y1: 0,
      x2: x,
      y2: this.getRowsCount() - 1,
    };

    this.addSelectionRange(newRange.y1, newRange.x1, newRange.y2, newRange.x2);
  }

  selectRowRange(y1: number, y2: number) {
    const newRange = {
      x1: 0,
      y1: Math.min(y1, y2),
      x2: this.headers.length - 1,
      y2: Math.max(y1, y2),
    };
    this.selectionRanges = [newRange];
    this.broadcastChange();
  }

  selectColRange(x1: number, x2: number) {
    const newRange = {
      x1: Math.min(x1, x2),
      y1: 0,
      x2: Math.max(x1, x2),
      y2: this.getRowsCount() - 1,
    };
    this.selectionRanges = [newRange];
    this.broadcastChange();
  }

  isRowSelected(y: number) {
    return SelectionRanges.isRowSelected(this.selectionRanges, y);
  }

  getSelectionRange(y: number, x: number) {
    return SelectionRanges.getContainingRange(this.selectionRanges, y, x);
  }

  getCellStatus(y: number, x: number) {
    const focus = this.getFocus();
    const isFocus = !!focus && focus.y === y && focus.x === x;
    const { isSelected, isBorderRight, isBorderBottom } =
      SelectionRanges.cellSelectionStatus(this.selectionRanges, y, x);
    return { isFocus, isSelected, isBorderBottom, isBorderRight };
  }

  setSql(sql: string) {
    this.sql = sql;
  }
  getSql() {
    return this.sql;
  }
}
