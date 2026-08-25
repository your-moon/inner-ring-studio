/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  InviteField,
  MemberRow,
  PendingInviteRow,
  RoleBadge,
} from "./members";
import { PersonChip, PresenceAvatar, PresenceDot } from "./presence";

describe("PresenceDot / PresenceAvatar", () => {
  it("labels presence for a11y", () => {
    render(
      <>
        <PresenceDot presence="online" />
        <PresenceAvatar name="Alex" presence="away" />
      </>,
    );
    expect(screen.getByRole("img", { name: "Online" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Away" })).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});

describe("PersonChip", () => {
  it("removes when asked", () => {
    const onRemove = jest.fn();
    render(<PersonChip name="Bru" onRemove={onRemove} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Bru" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe("MemberRow / RoleBadge", () => {
  it("renders identity, role and email", () => {
    render(
      <MemberRow
        name="Munkherdene"
        email="m@moon.dev"
        role={<RoleBadge role="admin" />}
      />,
    );
    expect(screen.getByText("Munkherdene")).toBeInTheDocument();
    expect(screen.getByText("m@moon.dev")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });
});

describe("PendingInviteRow", () => {
  it("shows the email and a status pill", () => {
    render(<PendingInviteRow email="cy@moon.dev" />);
    expect(screen.getByText("cy@moon.dev")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});

describe("InviteField", () => {
  it("disables invite until an email is typed, then fires", () => {
    const onInvite = jest.fn();
    const onChange = jest.fn();
    const { rerender } = render(
      <InviteField value="" onChange={onChange} onInvite={onInvite} />,
    );
    expect(screen.getByRole("button", { name: "Invite" })).toBeDisabled();
    rerender(
      <InviteField value="a@b.co" onChange={onChange} onInvite={onInvite} />,
    );
    const btn = screen.getByRole("button", { name: "Invite" });
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    expect(onInvite).toHaveBeenCalledTimes(1);
  });
});
