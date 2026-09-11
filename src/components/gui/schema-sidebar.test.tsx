/** @jest-environment jsdom
 *
 * Regression test for a real UI bug: the "Tables" sidebar label opened its
 * sort menu ONLY via right-click (a plain <span> wrapped in ContextMenu,
 * with no button role, not even focusable) -- a normal left click did
 * nothing. Confirmed live (right-click worked, left click was silently
 * inert) before fixing by switching to a click-triggered DropdownMenu.
 */
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { noop } from "lodash";
import { StudioContextProvider } from "@/context/driver-provider";
import { StudioExtensionManager } from "@/core/extension-manager";
import type { BaseDriver } from "@/drivers/base-driver";
import SchemaView from "./schema-sidebar";

// The real hook hits a live schema/connection; stub it so the "Tables" label
// and its sort menu -- which render unconditionally, independent of loading
// state -- are the only thing under test.
// A relative path, not the "@/" alias: jest.mock()'s hoisted resolution
// doesn't pick up next/jest's alias mapping the way a plain import does.
jest.mock("../../context/schema-provider", () => ({
  useSchema: () => ({
    schema: {},
    currentSchema: [],
    autoCompleteSchema: {},
    currentSchemaName: "public",
    refresh: jest.fn(),
    loading: true,
    error: undefined,
  }),
}));

function renderSchemaView() {
  const fakeDriver = {
    getFlags: () => ({
      supportCreateUpdateTable: false,
      supportCreateUpdateDatabase: false,
    }),
  } as unknown as BaseDriver;

  return render(
    <StudioContextProvider
      value={{
        databaseDriver: fakeDriver,
        name: "test",
        color: "blue",
        extensions: new StudioExtensionManager([]),
        onBack: noop,
      }}
    >
      <SchemaView />
    </StudioContextProvider>
  );
}

// Radix's DropdownMenuTrigger opens on pointerdown, not a bare "click".
function leftClick(el: Element) {
  fireEvent.pointerDown(el, { button: 0, pointerType: "mouse", isPrimary: true });
  fireEvent.click(el, { button: 0 });
}

describe("SchemaView 'Tables' sort menu", () => {
  it("opens on a plain left click, not just right-click", () => {
    renderSchemaView();

    leftClick(screen.getByText("Tables"));

    expect(
      screen.getByRole("menuitem", { name: "Sort by name (A → Z)" })
    ).toBeVisible();
    expect(
      screen.getByRole("menuitem", { name: "Sort by size (largest first)" })
    ).toBeVisible();
  });

  it("choosing a sort option calls through and closes the menu", () => {
    renderSchemaView();

    leftClick(screen.getByText("Tables"));
    leftClick(screen.getByRole("menuitem", { name: "Sort by size (smallest first)" }));

    expect(
      screen.queryByRole("menuitem", { name: "Sort by size (smallest first)" })
    ).not.toBeInTheDocument();
  });
});
