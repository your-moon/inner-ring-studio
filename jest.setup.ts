import crypto from "crypto";

Object.defineProperty(window, "crypto", {
  value: {
    randomUUID: crypto.randomUUID,
  },
});

// jsdom 20 has no PointerEvent constructor at all, so `fireEvent.pointerDown`
// falls back to a plain Event with no real `button`/`clientX` -- Radix's
// trigger checks `event.button === 0` and silently no-ops otherwise. A
// MouseEvent-backed PointerEvent (the standard workaround) gives it a real one.
if (typeof window !== "undefined" && window.MouseEvent && !window.PointerEvent) {
  // @ts-expect-error -- MouseEvent is a compatible enough stand-in for tests.
  window.PointerEvent = window.MouseEvent;
}

// jsdom doesn't implement the Pointer Capture APIs Radix UI's interactive
// primitives (DropdownMenu, Popover, ContextMenu, ...) call internally --
// without these, a test that fires pointer/click events at a Radix trigger
// silently fails to open anything, with no error to point at why. This file
// runs for every test regardless of its own @jest-environment, and plenty of
// this project's tests declare `node` (no `Element` global at all) -- guard
// on the real jsdom Element, not a bare reference.
const ElementCtor =
  typeof window !== "undefined"
    ? (window as unknown as { Element?: typeof Element }).Element
    : undefined;
if (ElementCtor) {
  if (!ElementCtor.prototype.hasPointerCapture) {
    ElementCtor.prototype.hasPointerCapture = () => false;
  }
  if (!ElementCtor.prototype.setPointerCapture) {
    ElementCtor.prototype.setPointerCapture = () => {};
  }
  if (!ElementCtor.prototype.releasePointerCapture) {
    ElementCtor.prototype.releasePointerCapture = () => {};
  }
  // Radix menus scroll the highlighted item into view on open/navigate.
  if (!ElementCtor.prototype.scrollIntoView) {
    ElementCtor.prototype.scrollIntoView = () => {};
  }
}
