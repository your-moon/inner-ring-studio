/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandMenu,
} from "./command-menu";
import {
  SidebarFavorite,
  SidebarNavItem,
  SidebarSection,
} from "./sidebar-nav";
import { SubscribeToggle } from "./subscribe";

describe("SidebarNavItem", () => {
  it("marks the active row and fires onClick", () => {
    const onClick = jest.fn();
    render(<SidebarNavItem label="Inbox" count={3} active onClick={onClick} />);
    const row = screen.getByRole("button", { name: /Inbox/ });
    expect(row).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("3")).toBeInTheDocument();
    fireEvent.click(row);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders as a link when href is given", () => {
    render(<SidebarNavItem label="My issues" href="/x" />);
    expect(screen.getByRole("link", { name: /My issues/ })).toHaveAttribute(
      "href",
      "/x",
    );
  });
});

describe("SidebarSection", () => {
  it("collapses and expands its body", () => {
    render(
      <SidebarSection title="Favorites">
        <div>child row</div>
      </SidebarSection>,
    );
    expect(screen.getByText("child row")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Favorites/ }));
    expect(screen.queryByText("child row")).not.toBeInTheDocument();
  });
});

describe("SidebarFavorite", () => {
  it("toggles the star", () => {
    const onToggle = jest.fn();
    render(
      <SidebarFavorite label="Proxy" favorited onToggleFavorite={onToggle} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove from favorites" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe("CommandMenu", () => {
  it("renders groups, rows and the empty state", () => {
    render(
      <CommandMenu footer={<CommandFooter />}>
        <CommandGroup heading="Issue">
          <button type="button">Create new issue</button>
        </CommandGroup>
        <CommandEmpty>No results for “x”.</CommandEmpty>
      </CommandMenu>,
    );
    expect(screen.getByRole("dialog", { name: "Command menu" })).toBeInTheDocument();
    expect(screen.getByText("Issue")).toBeInTheDocument();
    expect(screen.getByText(/No results/)).toBeInTheDocument();
    expect(screen.getByText("Navigate")).toBeInTheDocument();
  });
});

describe("SubscribeToggle", () => {
  it("reflects state and toggles", () => {
    const onToggle = jest.fn();
    render(<SubscribeToggle subscribed onToggle={onToggle} />);
    const btn = screen.getByRole("button", { name: "Unsubscribe from issue" });
    expect(btn).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
